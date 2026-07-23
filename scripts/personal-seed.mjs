import { spawnSync } from "node:child_process";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const allow = process.env.ALLOW_PERSONAL_SEED === "true";
const email = process.env.PERSONAL_SEED_EMAIL;

if (!allow) {
  console.error("Set ALLOW_PERSONAL_SEED=true before running the personal seed.");
  process.exit(1);
}

if (!email) {
  console.error("Set PERSONAL_SEED_EMAIL to the development user that should receive the baseline data.");
  process.exit(1);
}

const escapedEmail = email.replaceAll("'", "''");
const transactionEnd = dryRun ? "ROLLBACK;" : "COMMIT;";

const sql = `
BEGIN;

DO $$
DECLARE
  v_user_id uuid;
  v_now timestamptz := now();
  v_baseline_date date := date '2026-07-23';
  v_item jsonb;
  v_account_id uuid;
  v_payment_account_id uuid;
  v_opening_tx_id uuid;
  v_existing_opening numeric;
  v_non_opening_balance numeric;
  v_target_balance numeric;
  v_category_id uuid;
  v_card jsonb;
  v_card_account_id uuid;
  v_seed_tx_id uuid;
  v_seed_amount numeric;
  v_has_posted_statement boolean;
  v_legacy_seed_id uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM users
  WHERE normalized_email = upper('${escapedEmail}');

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Personal seed user % does not exist. Register the user first, then rerun seed.', '${escapedEmail}';
  END IF;

  FOR v_item IN
    SELECT * FROM jsonb_array_elements('[
      {"name":"薪資","type":"Income","icon":"wallet"},
      {"name":"日常","type":"Expense","icon":"shopping-bag"},
      {"name":"旅行","type":"Expense","icon":"plane"},
      {"name":"訂閱","type":"Expense","icon":"repeat"},
      {"name":"交通","type":"Expense","icon":"train"},
      {"name":"手續費","type":"Expense","icon":"receipt"},
      {"name":"分期","type":"Expense","icon":"calendar"},
      {"name":"待分類","type":"Expense","icon":"tag"}
    ]'::jsonb)
  LOOP
    INSERT INTO categories (id, user_id, name, normalized_name, type, parent_category_id, icon, display_order, is_archived, created_at_utc, updated_at_utc)
    SELECT gen_random_uuid(), v_user_id, v_item->>'name', upper(v_item->>'name'), v_item->>'type', NULL, v_item->>'icon', 100, false, v_now, v_now
    WHERE NOT EXISTS (
      SELECT 1 FROM categories
      WHERE user_id = v_user_id
        AND type = v_item->>'type'
        AND parent_category_id IS NULL
        AND normalized_name = upper(v_item->>'name')
    );
  END LOOP;

  FOR v_item IN
    SELECT * FROM jsonb_array_elements('[
      {"name":"Richart","type":"Checking","currency":"TWD","institution":"Richart","target":20258,"display":1},
      {"name":"玉山銀行","type":"Checking","currency":"TWD","institution":"玉山銀行","target":113,"display":2},
      {"name":"現金","type":"Cash","currency":"TWD","institution":null,"target":800,"display":3},
      {"name":"旅遊基金","type":"Savings","currency":"TWD","institution":"旅遊基金","target":0,"display":4},
      {"name":"Richart GoGo","type":"CreditCard","currency":"TWD","institution":"Richart","target":0,"display":5},
      {"name":"玉山 Pi 拍錢包","type":"CreditCard","currency":"TWD","institution":"玉山銀行","target":0,"display":6}
    ]'::jsonb)
  LOOP
    SELECT id INTO v_account_id
    FROM accounts
    WHERE user_id = v_user_id AND name = v_item->>'name'
    ORDER BY created_at_utc
    LIMIT 1;

    IF v_account_id IS NULL THEN
      v_account_id := gen_random_uuid();
      INSERT INTO accounts (id, user_id, name, type, currency_code, institution_name, display_order, is_archived, created_at_utc, updated_at_utc)
      VALUES (v_account_id, v_user_id, v_item->>'name', v_item->>'type', v_item->>'currency', NULLIF(v_item->>'institution', 'null'), (v_item->>'display')::int, false, v_now, v_now);
    ELSE
      UPDATE accounts
      SET type = v_item->>'type',
          currency_code = v_item->>'currency',
          institution_name = NULLIF(v_item->>'institution', 'null'),
          display_order = (v_item->>'display')::int,
          is_archived = false,
          updated_at_utc = v_now
      WHERE id = v_account_id;
    END IF;

    IF (v_item->>'type') <> 'CreditCard' THEN
      v_target_balance := (v_item->>'target')::numeric;
      SELECT t.id, e.amount
      INTO v_opening_tx_id, v_existing_opening
      FROM transactions t
      JOIN transaction_entries e ON e.transaction_id = t.id
      WHERE t.user_id = v_user_id
        AND t.type = 'OpeningBalance'
        AND t.status = 'Posted'
        AND e.account_id = v_account_id
      ORDER BY t.created_at_utc
      LIMIT 1;

      SELECT COALESCE(sum(e.amount), 0)
      INTO v_non_opening_balance
      FROM transaction_entries e
      JOIN transactions t ON t.id = e.transaction_id
      WHERE t.user_id = v_user_id
        AND t.status = 'Posted'
        AND e.account_id = v_account_id
        AND (v_opening_tx_id IS NULL OR t.id <> v_opening_tx_id);

      v_existing_opening := COALESCE(v_existing_opening, 0);
      v_seed_amount := v_target_balance - COALESCE(v_non_opening_balance, 0);

      IF v_opening_tx_id IS NULL AND v_seed_amount <> 0 THEN
        v_opening_tx_id := gen_random_uuid();
        INSERT INTO transactions (id, user_id, type, status, transaction_date, category_id, payee, note, created_at_utc, updated_at_utc, voided_at_utc)
        VALUES (v_opening_tx_id, v_user_id, 'OpeningBalance', 'Posted', v_baseline_date, NULL, NULL, 'PersonalBaselineSeed', v_now, v_now, NULL);
        INSERT INTO transaction_entries (id, transaction_id, account_id, amount, created_at_utc)
        VALUES (gen_random_uuid(), v_opening_tx_id, v_account_id, v_seed_amount, v_now);
      ELSIF v_opening_tx_id IS NOT NULL THEN
        UPDATE transactions
        SET transaction_date = v_baseline_date, note = 'PersonalBaselineSeed', updated_at_utc = v_now
        WHERE id = v_opening_tx_id;
        UPDATE transaction_entries
        SET amount = v_seed_amount
        WHERE transaction_id = v_opening_tx_id AND account_id = v_account_id;
      END IF;
    END IF;
  END LOOP;

  FOR v_card IN
    SELECT * FROM jsonb_array_elements('[
      {"account":"Richart GoGo","issuer":"Richart","card":"Richart GoGo","last4":"5801","limit":100000,"closing":17,"due":3,"payment":"Richart"},
      {"account":"玉山 Pi 拍錢包","issuer":"玉山銀行","card":"玉山 Pi 拍錢包","last4":"8004","limit":100000,"closing":7,"due":22,"payment":"玉山銀行"}
    ]'::jsonb)
  LOOP
    SELECT id INTO v_card_account_id FROM accounts WHERE user_id = v_user_id AND name = v_card->>'account' LIMIT 1;
    SELECT id INTO v_payment_account_id FROM accounts WHERE user_id = v_user_id AND name = v_card->>'payment' LIMIT 1;

    INSERT INTO credit_card_accounts (id, user_id, account_id, issuer_name, card_name, last_four_digits, credit_limit, statement_closing_day, payment_due_day, payment_account_id, created_at_utc, updated_at_utc)
    SELECT gen_random_uuid(), v_user_id, v_card_account_id, v_card->>'issuer', v_card->>'card', v_card->>'last4', (v_card->>'limit')::numeric, (v_card->>'closing')::int, (v_card->>'due')::int, v_payment_account_id, v_now, v_now
    WHERE NOT EXISTS (SELECT 1 FROM credit_card_accounts WHERE account_id = v_card_account_id);

    UPDATE credit_card_accounts
    SET issuer_name = v_card->>'issuer',
        card_name = v_card->>'card',
        last_four_digits = v_card->>'last4',
        credit_limit = (v_card->>'limit')::numeric,
        statement_closing_day = (v_card->>'closing')::int,
        payment_due_day = (v_card->>'due')::int,
        payment_account_id = v_payment_account_id,
        updated_at_utc = v_now
    WHERE account_id = v_card_account_id;
  END LOOP;

  SELECT id INTO v_category_id
  FROM categories
  WHERE user_id = v_user_id AND type = 'Expense' AND normalized_name = upper('待分類')
  LIMIT 1;

  FOR v_card IN
    SELECT * FROM jsonb_array_elements('[
      {"account":"Richart GoGo","amount":12983,"payee":"PersonalBaselineSeed Richart statement baseline","kind":"statement","statementAmount":12983},
      {"account":"Richart GoGo","amount":3699,"payee":"PersonalBaselineSeed Richart unbilled baseline","kind":"unbilled","statementAmount":12983},
      {"account":"玉山 Pi 拍錢包","amount":15760,"payee":"PersonalBaselineSeed Yushan pending","kind":"unbilled","statementAmount":null}
    ]'::jsonb)
  LOOP
    SELECT id INTO v_card_account_id FROM accounts WHERE user_id = v_user_id AND name = v_card->>'account' LIMIT 1;

    IF v_card->>'account' = 'Richart GoGo' THEN
      SELECT t.id
      INTO v_legacy_seed_id
      FROM transactions t
      JOIN transaction_entries e ON e.transaction_id = t.id
      WHERE t.user_id = v_user_id
        AND e.account_id = v_card_account_id
        AND t.note = 'PersonalBaselineSeed'
        AND t.payee = 'PersonalBaselineSeed Richart baseline'
        AND t.status = 'Posted'
      LIMIT 1;

      IF v_legacy_seed_id IS NOT NULL THEN
        UPDATE transactions
        SET status = 'Voided',
            voided_at_utc = v_now,
            updated_at_utc = v_now
        WHERE id = v_legacy_seed_id;
      END IF;
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM statement_import_batches b
      WHERE b.user_id = v_user_id
        AND b.credit_card_account_id = v_card_account_id
        AND b.status IN ('Completed', 'PartiallyPosted')
        AND b.statement_amount = NULLIF(v_card->>'statementAmount', 'null')::numeric
        AND (
          SELECT COALESCE(sum(e.amount), 0)
          FROM statement_import_rows r
          JOIN transactions t ON t.id = r.created_transaction_id
          JOIN transaction_entries e ON e.transaction_id = t.id
          WHERE r.batch_id = b.id
            AND r.review_status = 'Posted'
            AND t.status = 'Posted'
            AND e.account_id = v_card_account_id
        ) = b.statement_amount
    )
    INTO v_has_posted_statement;

    SELECT t.id INTO v_seed_tx_id
    FROM transactions t
    JOIN transaction_entries e ON e.transaction_id = t.id
    WHERE t.user_id = v_user_id
      AND e.account_id = v_card_account_id
      AND t.note = 'PersonalBaselineSeed'
      AND t.payee = v_card->>'payee'
      AND t.status = 'Posted'
    LIMIT 1;

    IF v_card->>'kind' = 'statement' AND v_has_posted_statement THEN
      IF v_seed_tx_id IS NOT NULL THEN
        UPDATE transactions
        SET status = 'Voided',
            voided_at_utc = v_now,
            updated_at_utc = v_now
        WHERE id = v_seed_tx_id;
      END IF;
      CONTINUE;
    END IF;

    IF v_seed_tx_id IS NULL THEN
      v_seed_tx_id := gen_random_uuid();
      INSERT INTO transactions (id, user_id, type, status, transaction_date, category_id, payee, note, created_at_utc, updated_at_utc, voided_at_utc)
      VALUES (v_seed_tx_id, v_user_id, 'CreditCardPurchase', 'Posted', v_baseline_date, v_category_id, v_card->>'payee', 'PersonalBaselineSeed', v_now, v_now, NULL);
      INSERT INTO transaction_entries (id, transaction_id, account_id, amount, created_at_utc)
      VALUES (gen_random_uuid(), v_seed_tx_id, v_card_account_id, (v_card->>'amount')::numeric, v_now);
    ELSE
      UPDATE transactions
      SET type = 'CreditCardPurchase',
          transaction_date = v_baseline_date,
          category_id = v_category_id,
          payee = v_card->>'payee',
          note = 'PersonalBaselineSeed',
          updated_at_utc = v_now
      WHERE id = v_seed_tx_id;
      UPDATE transaction_entries
      SET amount = (v_card->>'amount')::numeric
      WHERE transaction_id = v_seed_tx_id AND account_id = v_card_account_id;
    END IF;
  END LOOP;
END $$;

SELECT 'accounts' AS section, a.name, a.type, a.currency_code,
       COALESCE(sum(e.amount) FILTER (WHERE t.status = 'Posted'), 0) AS balance
FROM accounts a
LEFT JOIN transaction_entries e ON e.account_id = a.id
LEFT JOIN transactions t ON t.id = e.transaction_id
WHERE a.user_id = (SELECT id FROM users WHERE normalized_email = upper('${escapedEmail}'))
GROUP BY a.id
ORDER BY a.display_order, a.name;

SELECT 'credit_cards' AS section, a.name, cc.credit_limit,
       COALESCE(sum(e.amount) FILTER (WHERE t.status = 'Posted'), 0) AS outstanding
FROM credit_card_accounts cc
JOIN accounts a ON a.id = cc.account_id
LEFT JOIN transaction_entries e ON e.account_id = a.id
LEFT JOIN transactions t ON t.id = e.transaction_id
WHERE cc.user_id = (SELECT id FROM users WHERE normalized_email = upper('${escapedEmail}'))
GROUP BY a.name, cc.credit_limit
ORDER BY a.name;

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
