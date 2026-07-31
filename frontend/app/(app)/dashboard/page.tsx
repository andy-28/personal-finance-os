"use client";

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { useEffect, useMemo, useState } from "react";
import { DashboardCreditCards } from "@/components/dashboard/dashboard-credit-cards";
import { DashboardFinanceProfile } from "@/components/dashboard/dashboard-finance-profile";
import { DashboardFinancialSummary } from "@/components/dashboard/dashboard-financial-summary";
import { DashboardMissionBoard } from "@/components/dashboard/dashboard-mission-board";
import { DashboardRecentTransactions } from "@/components/dashboard/dashboard-recent-transactions";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { MobileDashboard } from "@/components/mobile/mobile-dashboard";
import { MobileDashboardSkeleton } from "@/components/mobile/mobile-skeletons";
import { AetherEmptyState } from "@/components/ui/aether-management";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState } from "@/components/ui/states";
import { apiFetch, problemMessage, type AccountDto, type AccountSummaryDto, type CreditCardDto, type PagedTransactionsDto, type UpcomingDto } from "@/lib/api-client";
import { financeDataChangedEvent } from "@/lib/app-events";
import { todayInputValue } from "@/lib/formatters";
import { useSettings } from "@/lib/settings/user-settings";
import { useAuth } from "../../auth-context";

function monthRange() {
  const [year, month] = todayInputValue().split("-");
  const start = `${year}-${month}-01`;
  const endDate = new Date(Number(year), Number(month), 0);
  const end = `${year}-${month}-${String(endDate.getDate()).padStart(2, "0")}`;
  return { start, end };
}

const emptySummary: AccountSummaryDto = { currencies: [] };
const emptyUpcoming: UpcomingDto = { recurringOccurrences: [], installments: [], creditCardReminders: [] };
const emptyTransactions: PagedTransactionsDto = { items: [], page: 1, pageSize: 8, totalCount: 0, totalPages: 0 };

export default function DashboardPage() {
  const { accessToken, refreshSession, user } = useAuth();
  const { settings } = useSettings();
  const [accounts, setAccounts] = useState<AccountDto[]>([]);
  const [accountSummary, setAccountSummary] = useState<AccountSummaryDto>(emptySummary);
  const [creditCards, setCreditCards] = useState<CreditCardDto[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<PagedTransactionsDto>(emptyTransactions);
  const [monthlyTransactions, setMonthlyTransactions] = useState<PagedTransactionsDto>({ ...emptyTransactions, pageSize: 200 });
  const [upcoming, setUpcoming] = useState<UpcomingDto>(emptyUpcoming);
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const range = useMemo(() => monthRange(), []);

  async function load() {
    setIsLoading(true);
    const monthlyQuery = new URLSearchParams({ from: range.start, to: range.end, status: "Posted", page: "1", pageSize: "200" });
    const recentQuery = new URLSearchParams({ status: "Posted", page: "1", pageSize: "8" });
    const results = await Promise.allSettled([
      apiFetch<AccountDto[]>("/api/accounts", accessToken, {}, refreshSession),
      apiFetch<AccountSummaryDto>("/api/accounts/summary", accessToken, {}, refreshSession),
      apiFetch<CreditCardDto[]>("/api/credit-cards", accessToken, {}, refreshSession),
      apiFetch<PagedTransactionsDto>(`/api/transactions?${recentQuery}`, accessToken, {}, refreshSession),
      apiFetch<PagedTransactionsDto>(`/api/transactions?${monthlyQuery}`, accessToken, {}, refreshSession),
      apiFetch<UpcomingDto>("/api/recurring-transactions/upcoming", accessToken, {}, refreshSession)
    ]);

    const nextErrors: string[] = [];
    const capture = <T,>(index: number, fallback: T) => {
      const result = results[index];
      if (result.status === "fulfilled") return result.value as T;
      nextErrors.push(problemMessage(result.reason));
      return fallback;
    };

    setAccounts(capture(0, []));
    setAccountSummary(capture(1, emptySummary));
    setCreditCards(capture(2, []));
    setRecentTransactions(capture(3, emptyTransactions));
    setMonthlyTransactions(capture(4, { ...emptyTransactions, pageSize: 200 }));
    setUpcoming(capture(5, emptyUpcoming));
    setErrors([...new Set(nextErrors)]);
    setIsLoading(false);
  }

  useEffect(() => { if (accessToken) void load(); }, [accessToken]);
  useEffect(() => {
    if (!accessToken) return;
    const onFinanceDataChanged = () => { void load(); };
    window.addEventListener(financeDataChangedEvent, onFinanceDataChanged);
    return () => window.removeEventListener(financeDataChangedEvent, onFinanceDataChanged);
  }, [accessToken]);

  return (
    <section className="grid gap-6">
      <div className="hidden md:block">
        <PageHeader title="儀表板" description="總覽資產、負債、信用卡、現金流與即將到來的財務任務。" />
      </div>
      {errors.length > 0 && <ErrorState message={`Dashboard 部分資料載入失敗：${errors.join(" / ")}`} />}
      {isLoading ? (
        <>
          <MobileDashboardSkeleton />
          <div className="hidden md:block"><DashboardSkeleton /></div>
        </>
      ) : accounts.length === 0 && creditCards.length === 0 && recentTransactions.items.length === 0 ? (
        <Card><AetherEmptyState title="尚未建立 Dashboard 資料" description="建立帳戶、信用卡與交易後，這裡會顯示你的財務角色首頁。" /></Card>
      ) : (
        <div className="grid gap-5">
          <MobileDashboard
            accounts={accounts}
            summary={accountSummary}
            creditCards={creditCards}
            monthlyTransactions={monthlyTransactions.items}
            recentTransactions={recentTransactions.items}
            goals={settings.goalSettings.goalBars}
            displayName={user?.displayName ?? "admin"}
          />
          <div className="hidden gap-5 md:grid">
            <DashboardFinanceProfile
              accounts={accounts}
              summary={accountSummary}
              creditCards={creditCards}
              monthlyTransactions={monthlyTransactions.items}
              profileImageSettings={settings.workshopSettings.dashboardProfileImage}
            />
            <DashboardFinancialSummary summary={accountSummary} accounts={accounts} transactions={monthlyTransactions.items} />
            <DashboardCreditCards cards={creditCards} />
            <DashboardMissionBoard upcoming={upcoming} goals={settings.goalSettings.goalBars} accounts={accounts} />
            <DashboardRecentTransactions transactions={recentTransactions.items} accounts={accounts} />
          </div>
        </div>
      )}
    </section>
  );
}
