"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { money, type AccountDto, type TransactionDto } from "@/lib/api-client";
import { formatDate } from "@/lib/formatters";
import { transactionStatusLabels, transactionTypeLabels } from "@/lib/labels";

function tone(transaction: TransactionDto) {
  if (transaction.type === "Income" || transaction.type === "CreditCardRefund") return "text-income";
  if (transaction.type === "Expense" || transaction.type === "CreditCardPurchase") return "text-expense";
  return "text-transfer";
}

function iconFor(transaction: TransactionDto) {
  if (transaction.type === "Income") return "＋";
  if (transaction.type === "Transfer") return "↔";
  if (transaction.type === "CreditCardPurchase" || transaction.type === "CreditCardRefund" || transaction.type === "CreditCardPayment") return "◇";
  if (transaction.type === "OpeningBalance") return "◆";
  return "−";
}

export function MobileTransactionCard({
  transaction,
  accounts,
  onEdit
}: {
  transaction: TransactionDto;
  accounts: AccountDto[];
  onEdit: (transaction: TransactionDto) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const currency = accounts.find((account) => account.id === transaction.entries[0]?.accountId)?.currencyCode ?? "TWD";
  const accountPath = transaction.entries.map((entry) => entry.accountName).join(" → ");
  const amountTone = tone(transaction);
  const primaryText = transaction.payee ?? transaction.category?.name ?? transactionTypeLabels[transaction.type];
  const secondaryText = [transaction.payee ? transaction.category?.name : null, accountPath].filter(Boolean).join(" · ");

  return (
    <article className={`mobile-transaction-card ${isExpanded ? "mobile-transaction-card-expanded" : ""}`}>
      <button type="button" className="mobile-transaction-summary" onClick={() => setIsExpanded((current) => !current)} aria-expanded={isExpanded}>
        <span className={`mobile-transaction-icon ${amountTone}`} aria-hidden="true">{iconFor(transaction)}</span>
        <span className="min-w-0">
          <strong>{primaryText}</strong>
          <small>{secondaryText || transactionTypeLabels[transaction.type]}</small>
          <small>{formatDate(transaction.transactionDate)}</small>
        </span>
        <span className="mobile-transaction-side">
          <strong className={amountTone}>{money(transaction.displayAmount, currency)}</strong>
          <span className="mobile-transaction-chevron" aria-hidden="true">⌄</span>
        </span>
      </button>
      <div className="mobile-transaction-detail" aria-hidden={!isExpanded}>
        <p><span>Type</span><strong>{transactionTypeLabels[transaction.type]}</strong></p>
        <p><span>Category</span><strong>{transaction.category?.name ?? "-"}</strong></p>
        <p><span>Status</span><Badge tone={transaction.status === "Posted" ? "success" : "neutral"}>{transactionStatusLabels[transaction.status]}</Badge></p>
        {transaction.note && <p><span>Note</span><strong>{transaction.note}</strong></p>}
        <div className="grid gap-1">
          {transaction.entries.map((entry) => (
            <p key={entry.accountId}>
              <span>{entry.accountName}</span>
              <strong>{money(entry.amount, accounts.find((account) => account.id === entry.accountId)?.currencyCode ?? currency)}</strong>
            </p>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => onEdit(transaction)}>
          Edit details
        </Button>
      </div>
    </article>
  );
}
