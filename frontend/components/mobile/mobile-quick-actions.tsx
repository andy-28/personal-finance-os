import Link from "next/link";

const actions = [
  { href: "/transactions/new", label: "新增交易", meta: "記一筆" },
  { href: "/credit-cards", label: "信用卡付款", meta: "卡片" },
  { href: "/credit-cards", label: "匯入帳單", meta: "PDF" },
  { href: "/accounts", label: "管理目標", meta: "財務目標" }
];

export function MobileQuickActions() {
  return (
    <section className="mobile-action-strip mobile-reveal" aria-label="快速操作">
      {actions.map((action) => (
        <Link key={`${action.href}-${action.label}`} href={action.href} className="mobile-action-pill">
          <span>{action.label}</span>
          <small>{action.meta}</small>
        </Link>
      ))}
    </section>
  );
}
