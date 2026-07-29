import type { AccountDto, AccountSummaryDto, CreditCardDto, TransactionDto, UpcomingDto, UserGoalBarDto } from "@/lib/api-client";

export type DashboardData = {
  accounts: AccountDto[];
  accountSummary: AccountSummaryDto;
  creditCards: CreditCardDto[];
  transactions: TransactionDto[];
  monthlyTransactions: TransactionDto[];
  upcoming: UpcomingDto;
  goalBars: UserGoalBarDto[];
};

export type DashboardLoadState = "loading" | "ready" | "error";