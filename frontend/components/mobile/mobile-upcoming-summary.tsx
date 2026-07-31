import Link from "next/link";
import type { UpcomingDto } from "@/lib/api-client";

export function MobileUpcomingSummary({ upcoming }: { upcoming: UpcomingDto }) {
  const total = upcoming.recurringOccurrences.length + upcoming.installments.length + upcoming.creditCardReminders.length;

  return (
    <Link href="/upcoming" className="mobile-upcoming-strip md:hidden" aria-label={`查看待處理項目，共 ${total} 項`}>
      <span><strong>{upcoming.recurringOccurrences.length}</strong><small>待處理</small></span>
      <span><strong>{upcoming.installments.length}</strong><small>分期</small></span>
      <span><strong>{upcoming.creditCardReminders.length}</strong><small>卡片提醒</small></span>
      <span className="mobile-upcoming-chevron" aria-hidden="true">›</span>
    </Link>
  );
}
