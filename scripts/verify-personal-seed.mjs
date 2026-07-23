import { spawnSync } from "node:child_process";

const allow = process.env.ALLOW_PERSONAL_SEED === "true";
const email = process.env.PERSONAL_SEED_EMAIL;

if (!allow) {
  console.error("Set ALLOW_PERSONAL_SEED=true before verifying the personal seed.");
  process.exit(1);
}

if (!email) {
  console.error("Set PERSONAL_SEED_EMAIL before verifying the personal seed.");
  process.exit(1);
}

const escapedEmail = email.replaceAll("'", "''");

const sql = `
WITH target_user AS (
  SELECT id FROM users WHERE normalized_email = upper('${escapedEmail}')
),
balances AS (
  SELECT a.name, a.type, cc.credit_limit,
         COALESCE(sum(e.amount) FILTER (WHERE t.status = 'Posted'), 0) AS balance
  FROM accounts a
  LEFT JOIN credit_card_accounts cc ON cc.account_id = a.id
  LEFT JOIN transaction_entries e ON e.account_id = a.id
  LEFT JOIN transactions t ON t.id = e.transaction_id
  WHERE a.user_id = (SELECT id FROM target_user)
  GROUP BY a.id, cc.credit_limit
),
checks AS (
  SELECT 'Richart balance' AS name, 20258::numeric AS expected, (SELECT balance FROM balances WHERE name = 'Richart') AS actual
  UNION ALL SELECT '玉山銀行 balance', 113, (SELECT balance FROM balances WHERE name = '玉山銀行')
  UNION ALL SELECT '現金 balance', 800, (SELECT balance FROM balances WHERE name = '現金')
  UNION ALL SELECT '資產合計', 21171, (SELECT sum(balance) FROM balances WHERE name IN ('Richart','玉山銀行','現金','旅遊基金'))
  UNION ALL SELECT 'Richart GoGo limit', 100000, (SELECT credit_limit FROM balances WHERE name = 'Richart GoGo')
  UNION ALL SELECT 'Richart GoGo outstanding', 16682, (SELECT balance FROM balances WHERE name = 'Richart GoGo')
  UNION ALL SELECT '玉山 Pi limit', 100000, (SELECT credit_limit FROM balances WHERE name = '玉山 Pi 拍錢包')
  UNION ALL SELECT '玉山 Pi pending', 15760, (SELECT balance FROM balances WHERE name = '玉山 Pi 拍錢包')
)
SELECT name, expected, actual,
       CASE WHEN abs(expected - actual) < 0.01 THEN 'PASS' ELSE 'FAIL' END AS status
FROM checks;
`;

const result = spawnSync("docker", ["compose", "exec", "-T", "postgres", "psql", "-U", "pfos", "-d", "personal_finance", "-v", "ON_ERROR_STOP=1"], {
  cwd: new URL("..", import.meta.url),
  input: sql,
  encoding: "utf8"
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.status !== 0) process.exit(result.status ?? 1);
process.exit(result.stdout.includes("FAIL") ? 1 : 0);
