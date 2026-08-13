export type AetherAssetCategory = "system" | "resource" | "object" | "frame" | "effect";
export type AetherAssetStatus = "custom" | "fallback" | "placeholder";
export type AetherAssetReviewStatus = "integrated" | "visual-review" | "approved" | "revision-required" | "not-reviewed";
export type AetherAssetTone = "cyan" | "emerald" | "amber" | "ruby" | "violet" | "muted";

export type AetherAssetKey =
  | "account"
  | "ledger"
  | "credit-card"
  | "dashboard"
  | "personal-hud"
  | "recurring"
  | "category"
  | "system-status"
  | "workshop"
  | "add"
  | "edit"
  | "search"
  | "filter"
  | "calendar"
  | "statement"
  | "installment"
  | "payment"
  | "warning"
  | "success"
  | "pending"
  | "coin"
  | "asset-crystal"
  | "debt-shard"
  | "net-worth-core"
  | "available-energy"
  | "statement-scroll"
  | "goal-star"
  | "travel-token"
  | "credit-energy"
  | "wallet"
  | "credit-card-richart"
  | "credit-card-esun"
  | "account-vault"
  | "goal-crystal";

export type AetherAssetDefinition = {
  key: AetherAssetKey;
  category: AetherAssetCategory;
  label: string;
  purpose: string;
  fallback: AetherAssetKey;
  tone: AetherAssetTone;
  status: AetherAssetStatus;
  reviewStatus?: AetherAssetReviewStatus;
  expectedSize: "16-24" | "20-32" | "24-48" | "64-160";
  customSrc?: string;
  dimensions?: string;
  format?: string;
  primaryUsage?: string;
  visualDescription?: string;
};

export const aetherAssetRegistry: Record<AetherAssetKey, AetherAssetDefinition> = {
  account: { key: "account", category: "system", label: "Account", purpose: "Accounts navigation and account identity.", fallback: "account", tone: "cyan", status: "fallback", expectedSize: "16-24" },
  ledger: { key: "ledger", category: "system", label: "Ledger", purpose: "Transactions and ledger navigation.", fallback: "ledger", tone: "cyan", status: "fallback", expectedSize: "16-24" },
  "credit-card": { key: "credit-card", category: "system", label: "Credit Card", purpose: "Credit card navigation and generic card identity.", fallback: "credit-card", tone: "cyan", status: "fallback", expectedSize: "16-24" },
  dashboard: { key: "dashboard", category: "system", label: "Dashboard", purpose: "Dashboard and command view navigation.", fallback: "dashboard", tone: "cyan", status: "fallback", expectedSize: "16-24" },
  "personal-hud": { key: "personal-hud", category: "system", label: "Personal HUD", purpose: "Personal interface and HUD navigation.", fallback: "personal-hud", tone: "violet", status: "fallback", expectedSize: "16-24" },
  recurring: { key: "recurring", category: "system", label: "Recurring", purpose: "Recurring templates and scheduling.", fallback: "recurring", tone: "cyan", status: "fallback", expectedSize: "16-24" },
  category: { key: "category", category: "system", label: "Category", purpose: "Taxonomy and category navigation.", fallback: "category", tone: "cyan", status: "fallback", expectedSize: "16-24" },
  "system-status": { key: "system-status", category: "system", label: "System Status", purpose: "Service health and status checks.", fallback: "system-status", tone: "emerald", status: "fallback", expectedSize: "16-24" },
  workshop: { key: "workshop", category: "system", label: "Workshop", purpose: "Aether workshop and experimental tools.", fallback: "workshop", tone: "violet", status: "fallback", expectedSize: "16-24" },
  add: { key: "add", category: "system", label: "Add", purpose: "Create action.", fallback: "add", tone: "cyan", status: "fallback", expectedSize: "16-24" },
  edit: { key: "edit", category: "system", label: "Edit", purpose: "Edit action.", fallback: "edit", tone: "cyan", status: "fallback", expectedSize: "16-24" },
  search: { key: "search", category: "system", label: "Search", purpose: "Search action.", fallback: "search", tone: "muted", status: "fallback", expectedSize: "16-24" },
  filter: { key: "filter", category: "system", label: "Filter", purpose: "Filter action.", fallback: "filter", tone: "muted", status: "fallback", expectedSize: "16-24" },
  calendar: { key: "calendar", category: "system", label: "Calendar", purpose: "Date and schedule UI.", fallback: "calendar", tone: "cyan", status: "fallback", expectedSize: "16-24" },
  statement: { key: "statement", category: "system", label: "Statement", purpose: "Statement import and reconciliation.", fallback: "statement", tone: "amber", status: "fallback", expectedSize: "16-24" },
  installment: { key: "installment", category: "system", label: "Installment", purpose: "Installment plan and schedule identity.", fallback: "installment", tone: "violet", status: "fallback", expectedSize: "16-24" },
  payment: { key: "payment", category: "system", label: "Payment", purpose: "Payment actions and state.", fallback: "payment", tone: "emerald", status: "fallback", expectedSize: "16-24" },
  warning: { key: "warning", category: "system", label: "Warning", purpose: "Warning and attention state.", fallback: "warning", tone: "amber", status: "fallback", expectedSize: "16-24" },
  success: { key: "success", category: "system", label: "Success", purpose: "Success state.", fallback: "success", tone: "emerald", status: "fallback", expectedSize: "16-24" },
  pending: { key: "pending", category: "system", label: "Pending", purpose: "Pending state.", fallback: "pending", tone: "amber", status: "fallback", expectedSize: "16-24" },
  coin: { key: "coin", category: "resource", label: "Coin", purpose: "Cash and currency resource.", fallback: "coin", tone: "amber", status: "custom", reviewStatus: "visual-review", expectedSize: "24-48", customSrc: "/aether/icons/resources/coin.webp", dimensions: "256x256", format: "WebP", primaryUsage: "Dashboard monthly income and cash resource identity.", visualDescription: "Aged brass financial token with a dark steel inset and controlled cyan Aether core." },
  "asset-crystal": { key: "asset-crystal", category: "resource", label: "Asset Crystal", purpose: "Positive asset total and stored value.", fallback: "asset-crystal", tone: "emerald", status: "custom", reviewStatus: "visual-review", expectedSize: "24-48", customSrc: "/aether/icons/resources/asset-crystal.webp", dimensions: "256x256", format: "WebP", primaryUsage: "Accounts asset total resource identity.", visualDescription: "Stable emerald and cyan crystal held by a dark steel arcane cradle." },
  "debt-shard": { key: "debt-shard", category: "resource", label: "Debt Shard", purpose: "Liability and debt resource.", fallback: "debt-shard", tone: "ruby", status: "custom", reviewStatus: "visual-review", expectedSize: "24-48", customSrc: "/aether/icons/resources/debt-shard.webp", dimensions: "256x256", format: "WebP", primaryUsage: "Accounts liability total resource identity.", visualDescription: "Fractured ruby and obsidian liability shard with broken dark steel restraints." },
  "net-worth-core": { key: "net-worth-core", category: "resource", label: "Net Worth Core", purpose: "Net worth and overall financial core.", fallback: "net-worth-core", tone: "amber", status: "custom", reviewStatus: "visual-review", expectedSize: "24-48", customSrc: "/aether/icons/resources/net-worth-core.webp", dimensions: "256x256", format: "WebP", primaryUsage: "Accounts net worth resource identity.", visualDescription: "Amber arcane balance core surrounded by aged brass and dark steel rings." },
  "available-energy": { key: "available-energy", category: "resource", label: "Available Energy", purpose: "Available credit or spendable energy.", fallback: "available-energy", tone: "cyan", status: "placeholder", expectedSize: "24-48" },
  "statement-scroll": { key: "statement-scroll", category: "resource", label: "Statement Scroll", purpose: "Statement document and import artifact.", fallback: "statement-scroll", tone: "amber", status: "placeholder", expectedSize: "24-48" },
  "goal-star": { key: "goal-star", category: "resource", label: "Goal Star", purpose: "Goals and target progress.", fallback: "goal-star", tone: "violet", status: "placeholder", expectedSize: "24-48" },
  "travel-token": { key: "travel-token", category: "resource", label: "Travel Token", purpose: "Travel fund identity.", fallback: "travel-token", tone: "emerald", status: "placeholder", expectedSize: "24-48" },
  "credit-energy": { key: "credit-energy", category: "resource", label: "Credit Energy", purpose: "Credit line and card energy.", fallback: "credit-energy", tone: "cyan", status: "placeholder", expectedSize: "24-48" },
  wallet: { key: "wallet", category: "object", label: "Wallet", purpose: "Cash wallet object art slot.", fallback: "wallet", tone: "amber", status: "placeholder", expectedSize: "64-160" },
  "credit-card-richart": { key: "credit-card-richart", category: "object", label: "Richart Card Face", purpose: "Coin Engine representation of Richart credit card object.", fallback: "credit-card", tone: "cyan", status: "placeholder", expectedSize: "64-160" },
  "credit-card-esun": { key: "credit-card-esun", category: "object", label: "ESUN Card Face", purpose: "Coin Engine representation of ESUN credit card object.", fallback: "credit-card", tone: "emerald", status: "placeholder", expectedSize: "64-160" },
  "account-vault": { key: "account-vault", category: "object", label: "Account Vault", purpose: "Bank account object art slot.", fallback: "account", tone: "cyan", status: "placeholder", expectedSize: "64-160" },
  "goal-crystal": { key: "goal-crystal", category: "object", label: "Goal Crystal", purpose: "Large goal object art slot.", fallback: "goal-star", tone: "violet", status: "placeholder", expectedSize: "64-160" }
};

export function getAetherAssetDefinition(name: AetherAssetKey) {
  return aetherAssetRegistry[name];
}

export function getP0AetherResourceAssets() {
  return [aetherAssetRegistry.coin, aetherAssetRegistry["asset-crystal"], aetherAssetRegistry["debt-shard"], aetherAssetRegistry["net-worth-core"]];
}

export function creditCardAssetForIssuer(issuerName?: string | null): AetherAssetKey {
  const normalized = issuerName?.toLowerCase() ?? "";
  if (normalized.includes("玉山") || normalized.includes("esun")) return "credit-card-esun";
  if (normalized.includes("richart") || normalized.includes("台新") || normalized.includes("taishin")) return "credit-card-richart";
  return "credit-card";
}
