import { spawnSync } from "node:child_process";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const allow = process.env.ALLOW_PERSONAL_SEED === "true";
const email = process.env.PERSONAL_SEED_EMAIL;

if (!allow) {
  console.error("Set ALLOW_PERSONAL_SEED=true before running the personal baseline repair.");
  process.exit(1);
}

if (!email) {
  console.error("Set PERSONAL_SEED_EMAIL before running the personal baseline repair.");
  process.exit(1);
}

const escapedEmail = email.replaceAll("'", "''");
const transactionEnd = dryRun ? "ROLLBACK;" : "COMMIT;";

const sql = `
BEGIN;

CREATE TEMP TABLE personal_repair_target ON COMMIT DROP AS
SELECT u.id AS user_id,
       a.id AS account_id,
       (
         SELECT b.id
         FROM statement_import_batches b
         WHERE b.user_id = u.id
           AND b.credit_card_account_id = a.id
           AND b.statement_amount = 12983
           AND b.status IN ('Completed', 'PartiallyPosted')
         ORDER BY b.statement_period_end DESC NULLS LAST, b.created_at_utc DESC
         LIMIT 1
       ) AS batch_id
FROM users u
JOIN accounts a ON a.user_id = u.id AND a.name = 'Richart GoGo'
WHERE u.normalized_email = upper('${escapedEmail}');

WITH void_legacy_baselines AS (
  UPDATE transactions t
  SET status = 'Voided',
      voided_at_utc = now(),
      updated_at_utc = now()
  WHERE t.user_id = (SELECT user_id FROM personal_repair_target)
    AND t.status = 'Posted'
    AND t.note = 'PersonalBaselineSeed'
    AND t.payee IN (
      'PersonalBaselineSeed Richart baseline',
      'PersonalBaselineSeed Richart statement baseline'
    )
    AND EXISTS (
      SELECT 1
      FROM transaction_entries e
      WHERE e.transaction_id = t.id
        AND e.account_id = (SELECT account_id FROM personal_repair_target)
    )
  RETURNING t.id
),
void_statement_payment_rows AS (
  UPDATE transactions t
  SET status = 'Voided',
      voided_at_utc = now(),
      updated_at_utc = now()
  WHERE t.user_id = (SELECT user_id FROM personal_repair_target)
    AND t.status = 'Posted'
    AND t.type = 'CreditCardPayment'
    AND t.id IN (
      SELECT r.created_transaction_id
      FROM statement_import_rows r
      WHERE r.batch_id = (SELECT batch_id FROM personal_repair_target)
        AND r.type = 'Payment'
        AND r.created_transaction_id IS NOT NULL
    )
  RETURNING t.id
),
mark_payment_rows_ignored AS (
  UPDATE statement_import_rows r
  SET review_status = 'Ignored',
      failure_reason = 'Personal baseline repair: statement payment row excluded from current statement liability.'
  WHERE r.batch_id = (SELECT batch_id FROM personal_repair_target)
    AND r.type = 'Payment'
  RETURNING r.id
),
expense_category AS (
  SELECT id
  FROM categories
  WHERE user_id = (SELECT user_id FROM personal_repair_target)
    AND type = 'Expense'
    AND is_archived = false
  ORDER BY display_order, name
  LIMIT 1
),
existing_unbilled AS (
  SELECT t.id
  FROM transactions t
  JOIN transaction_entries e ON e.transaction_id = t.id
  WHERE t.user_id = (SELECT user_id FROM personal_repair_target)
    AND t.status = 'Posted'
    AND t.note = 'PersonalBaselineSeed'
    AND t.payee = 'PersonalBaselineSeed Richart unbilled baseline'
    AND e.account_id = (SELECT account_id FROM personal_repair_target)
  LIMIT 1
),
insert_unbilled AS (
  INSERT INTO transactions (id, user_id, type, status, transaction_date, category_id, payee, note, created_at_utc, updated_at_utc, voided_at_utc)
  SELECT gen_random_uuid(), (SELECT user_id FROM personal_repair_target), 'CreditCardPurchase', 'Posted', date '2026-07-23', (SELECT id FROM expense_category), 'PersonalBaselineSeed Richart unbilled baseline', 'PersonalBaselineSeed', now(), now(), NULL
  WHERE NOT EXISTS (SELECT 1 FROM existing_unbilled)
  RETURNING id
),
insert_unbilled_entry AS (
  INSERT INTO transaction_entries (id, transaction_id, account_id, amount, created_at_utc)
  SELECT gen_random_uuid(), id, (SELECT account_id FROM personal_repair_target), 3699, now()
  FROM insert_unbilled
  RETURNING transaction_id
),
update_unbilled AS (
  UPDATE transactions t
  SET type = 'CreditCardPurchase',
      status = 'Posted',
      transaction_date = date '2026-07-23',
      category_id = (SELECT id FROM expense_category),
      payee = 'PersonalBaselineSeed Richart unbilled baseline',
      note = 'PersonalBaselineSeed',
      voided_at_utc = NULL,
      updated_at_utc = now()
  WHERE t.id IN (SELECT id FROM existing_unbilled)
  RETURNING t.id
),
update_unbilled_entry AS (
  UPDATE transaction_entries e
  SET amount = 3699
  WHERE e.transaction_id IN (SELECT id FROM existing_unbilled)
    AND e.account_id = (SELECT account_id FROM personal_repair_target)
  RETURNING e.transaction_id
)
SELECT 'voided_legacy_baselines' AS action, count(*) AS count FROM void_legacy_baselines
UNION ALL SELECT 'voided_statement_payment_rows', count(*) FROM void_statement_payment_rows
UNION ALL SELECT 'marked_payment_rows_ignored', count(*) FROM mark_payment_rows_ignored
UNION ALL SELECT 'inserted_unbilled_baseline', count(*) FROM insert_unbilled
UNION ALL SELECT 'updated_unbilled_baseline', count(*) FROM update_unbilled;

SELECT a.name,
       COALESCE(sum(e.amount) FILTER (WHERE t.status = 'Posted'), 0) AS outstanding
FROM accounts a
LEFT JOIN transaction_entries e ON e.account_id = a.id
LEFT JOIN transactions t ON t.id = e.transaction_id
WHERE a.id = (SELECT account_id FROM personal_repair_target)
GROUP BY a.name;

SELECT
  COALESCE(sum(e.amount) FILTER (WHERE t.status = 'Posted' AND t.note = 'Statement import'), 0) AS posted_statement_import_amount,
  COALESCE(sum(e.amount) FILTER (WHERE t.status = 'Posted' AND t.note = 'PersonalBaselineSeed'), 0) AS posted_baseline_amount
FROM transaction_entries e
JOIN transactions t ON t.id = e.transaction_id
WHERE e.account_id = (SELECT account_id FROM personal_repair_target);

${transactionEnd}
`;

const result = spawnSync("docker", ["compose", "exec", "-T", "postgres", "psql", "-U", "pfos", "-d", "personal_finance", "-v", "ON_ERROR_STOP=1"], {
  cwd: new URL("..", import.meta.url),
  input: sql,
  encoding: "utf8"
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
process.exit(result.status ?? 1);
