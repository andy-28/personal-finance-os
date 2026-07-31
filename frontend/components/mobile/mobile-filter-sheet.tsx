"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { commonLabels, transactionStatusLabels, transactionTypeLabels } from "@/lib/labels";
import type { AccountDto, CategoryChildDto, TransactionStatus, TransactionType } from "@/lib/api-client";

type TransactionFilters = {
  from: string;
  to: string;
  accountId: string;
  categoryId: string;
  type: "" | TransactionType;
  status: TransactionStatus;
  page: number;
};

const transactionTypes: Array<"" | TransactionType> = ["", "Income", "Expense", "Transfer", "OpeningBalance", "CreditCardPurchase", "CreditCardRefund", "CreditCardPayment"];
const statuses: TransactionStatus[] = ["Posted", "Voided"];

export function activeFilterCount(filters: TransactionFilters) {
  return [filters.from, filters.to, filters.accountId, filters.categoryId, filters.type, filters.status !== "Posted" ? filters.status : ""].filter(Boolean).length;
}

export function MobileFilterSheet({
  isOpen,
  filters,
  accounts,
  categories,
  onApply,
  onClose
}: {
  isOpen: boolean;
  filters: TransactionFilters;
  accounts: AccountDto[];
  categories: CategoryChildDto[];
  onApply: (filters: TransactionFilters) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(filters);
  const count = activeFilterCount(filters);

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [filters, isOpen, onClose]);

  if (!isOpen) return null;

  function apply(next: TransactionFilters) {
    onApply({ ...next, page: 1 });
    onClose();
  }

  return (
    <div className="mobile-quick-add-backdrop mobile-filter-backdrop md:hidden" role="dialog" aria-modal="true" aria-labelledby="mobile-filter-title" onClick={onClose}>
      <form className="game-window mobile-quick-add-sheet mobile-filter-sheet shadow-panel" onSubmit={(event) => { event.preventDefault(); apply(draft); }} onClick={(event) => event.stopPropagation()}>
        <div className="game-window-titlebar">
          <div>
            <p className="mobile-section-eyebrow">FILTER</p>
            <h2 id="mobile-filter-title" className="game-window-title-text">篩選交易</h2>
            <p className="text-sm text-muted">{count > 0 ? `目前 ${count} 個條件` : "未套用額外條件"}</p>
          </div>
          <button type="button" className="game-window-close ui-focus" aria-label="關閉篩選" onClick={onClose}>×</button>
        </div>
        <div className="game-window-body grid gap-3 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <label className="ui-label">開始日期<input className="ui-input" type="date" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} /></label>
            <label className="ui-label">結束日期<input className="ui-input" type="date" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} /></label>
          </div>
          <label className="ui-label">帳戶<select className="ui-input" value={draft.accountId} onChange={(e) => setDraft({ ...draft, accountId: e.target.value })}><option value="">{commonLabels.allAccounts}</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
          <label className="ui-label">分類<select className="ui-input" value={draft.categoryId} onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })}><option value="">{commonLabels.allCategories}</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label className="ui-label">類型<select className="ui-input" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as "" | TransactionType })}>{transactionTypes.map((type) => <option key={type || "all"} value={type}>{type ? transactionTypeLabels[type] : commonLabels.allTypes}</option>)}</select></label>
          <label className="ui-label">狀態<select className="ui-input" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as TransactionStatus })}>{statuses.map((status) => <option key={status} value={status}>{transactionStatusLabels[status]}</option>)}</select></label>
        </div>
        <div className="game-dialog-footer mobile-filter-actions">
          <Button type="button" variant="outline" onClick={() => apply({ from: "", to: "", accountId: "", categoryId: "", type: "", status: "Posted", page: 1 })}>清除篩選</Button>
          <Button type="submit">套用篩選</Button>
        </div>
      </form>
    </div>
  );
}
