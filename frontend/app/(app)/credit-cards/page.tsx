"use client";

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AetherEnergyDivider } from "@/components/ui/aether-effect";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { GameProgress } from "@/components/ui/game-theme";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { apiFetch, money, problemMessage, type AccountDto, type CategoryDto, type CreditCardDetailDto, type CreditCardDto, type StatementImportBatchDto, type StatementImportReviewStatus, type StatementImportRowDto, type StatementImportRowType } from "@/lib/api-client";
import { formatDate, todayInputValue } from "@/lib/formatters";
import { t } from "@/lib/i18n";
import { installmentStatusLabels, statementImportBatchStatusLabels, statementImportMatchStatusLabels, statementImportReviewStatusLabels, statementImportRowTypeLabels, transactionTypeLabels } from "@/lib/labels";
import { useAuth } from "../../auth-context";

const emptyCard = { accountId: "", accountName: "", currencyCode: "TWD", issuerName: "", cardName: "", lastFourDigits: "", creditLimit: "", statementClosingDay: 2, paymentDueDay: 20, paymentAccountId: "" };
const emptyPurchase = { creditCardAccountId: "", categoryId: "", amount: "", purchaseDate: todayInputValue(), postedDate: "", merchant: "", note: "" };
const emptyRefund = { creditCardAccountId: "", amount: "", refundDate: todayInputValue(), originalTransactionId: "", note: "" };
const emptyPayment = { creditCardAccountId: "", paymentAccountId: "", amount: "", paymentDate: todayInputValue(), note: "" };
const emptyInstallment = { creditCardAccountId: "", merchant: "", description: "", purchaseDate: todayInputValue(), originalAmount: "", installmentCount: 3, firstInstallmentDate: todayInputValue() };

type StatementRowUpdate = {
  reviewStatus: StatementImportReviewStatus;
  categoryId?: string | null;
  amount?: number;
  type?: StatementImportRowType;
};

const statementRowTypeOptions: StatementImportRowType[] = ["Unknown", "Purchase", "Installment", "Fee", "Interest", "Refund", "Payment", "Adjustment"];
function statementRowNeedsExpenseCategory(type: StatementImportRowType) {
  return type === "Purchase" || type === "Installment" || type === "Fee" || type === "Interest" || type === "Adjustment";
}

function creditUtilizationPercent(card: CreditCardDto) {
  if (!card.creditLimit || card.creditLimit <= 0) return 0;
  return Math.max(0, Math.min(100, (card.outstandingAmount / card.creditLimit) * 100));
}

function baseAvailableCredit(card: CreditCardDto) {
  if (card.creditLimit == null) return null;
  return Math.max(card.creditLimit - card.outstandingAmount, 0);
}

function billedOutstanding(card: CreditCardDto) {
  return card.billedOutstandingAmount ?? Math.min(card.outstandingAmount, card.latestStatementAmount ?? card.outstandingAmount);
}

function unbilledAmount(card: CreditCardDto) {
  return card.unbilledAmount ?? Math.max(card.outstandingAmount - billedOutstanding(card), 0);
}

export default function CreditCardsPage() {
  const { accessToken, refreshSession } = useAuth();
  const [cards, setCards] = useState<CreditCardDto[]>([]);
  const [accounts, setAccounts] = useState<AccountDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [detail, setDetail] = useState<CreditCardDetailDto | null>(null);
  const [cardForm, setCardForm] = useState(emptyCard);
  const [purchaseForm, setPurchaseForm] = useState(emptyPurchase);
  const [refundForm, setRefundForm] = useState(emptyRefund);
  const [paymentForm, setPaymentForm] = useState(emptyPayment);
  const [installmentForm, setInstallmentForm] = useState(emptyInstallment);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statementImport, setStatementImport] = useState<StatementImportBatchDto | null>(null);
  const [statementImports, setStatementImports] = useState<StatementImportBatchDto[]>([]);
  const [statementFile, setStatementFile] = useState<File | null>(null);
  const [statementPassword, setStatementPassword] = useState("");
  const [defaultStatementCategoryId, setDefaultStatementCategoryId] = useState("");
  const [isStatementBusy, setIsStatementBusy] = useState(false);

  const activePaymentAccounts = useMemo(() => accounts.filter((account) => !account.isArchived && account.type !== "CreditCard"), [accounts]);
  const existingCardAccountIds = useMemo(() => new Set(cards.map((card) => card.accountId)), [cards]);
  const availableCreditCardAccounts = useMemo(() => accounts.filter((account) => !account.isArchived && account.type === "CreditCard" && (!existingCardAccountIds.has(account.id) || account.id === editingId)), [accounts, editingId, existingCardAccountIds]);
  const expenseCategories = useMemo(() => categories.filter((category) => category.type === "Expense"), [categories]);

  async function load(selectedId?: string | null) {
    setIsLoading(true);
    try {
      const [nextCards, nextAccounts, nextCategories] = await Promise.all([
        apiFetch<CreditCardDto[]>("/api/credit-cards", accessToken, {}, refreshSession),
        apiFetch<AccountDto[]>("/api/accounts", accessToken, {}, refreshSession),
        apiFetch<CategoryDto[]>("/api/categories?type=Expense", accessToken, {}, refreshSession)
      ]);
      setCards(nextCards);
      setAccounts(nextAccounts);
      setCategories(nextCategories);
      const detailId = selectedId ?? detail?.summary.accountId ?? nextCards[0]?.accountId ?? null;
      setDetail(detailId ? await apiFetch<CreditCardDetailDto>(`/api/credit-cards/${detailId}`, accessToken, {}, refreshSession) : null);
      setError(null);
    } catch (err) {
      setError(problemMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { if (accessToken) load(); }, [accessToken]);
  useEffect(() => { if (accessToken && detail) loadStatementImports(detail.summary.accountId); }, [accessToken, detail?.summary.accountId]);

  function selectDefaults(accountId: string) {
    setPurchaseForm((form) => ({ ...form, creditCardAccountId: accountId, categoryId: form.categoryId || expenseCategories[0]?.id || "" }));
    setRefundForm((form) => ({ ...form, creditCardAccountId: accountId }));
    const card = cards.find((candidate) => candidate.accountId === accountId);
    setPaymentForm((form) => ({ ...form, creditCardAccountId: accountId, paymentAccountId: form.paymentAccountId || card?.paymentAccountId || "" }));
    setInstallmentForm((form) => ({ ...form, creditCardAccountId: accountId }));
  }

  async function submitCard(event: FormEvent) {
    event.preventDefault();
    try {
      const body = JSON.stringify({
        accountId: cardForm.accountId || null,
        accountName: cardForm.accountName || cardForm.cardName,
        currencyCode: cardForm.currencyCode || "TWD",
        issuerName: cardForm.issuerName,
        cardName: cardForm.cardName,
        lastFourDigits: cardForm.lastFourDigits || null,
        creditLimit: cardForm.creditLimit ? Number(cardForm.creditLimit) : null,
        statementClosingDay: Number(cardForm.statementClosingDay),
        paymentDueDay: Number(cardForm.paymentDueDay),
        paymentAccountId: cardForm.paymentAccountId || null
      });
      if (editingId) await apiFetch<CreditCardDto>(`/api/credit-cards/${editingId}`, accessToken, { method: "PUT", body }, refreshSession);
      else await apiFetch<CreditCardDto>("/api/credit-cards", accessToken, { method: "POST", body }, refreshSession);
      setCardForm(emptyCard);
      setEditingId(null);
      await load(editingId);
    } catch (err) {
      setError(problemMessage(err));
    }
  }

  async function submitPurchase(event: FormEvent) {
    event.preventDefault();
    await mutate("/api/credit-cards/purchase", {
      ...purchaseForm,
      amount: Number(purchaseForm.amount),
      postedDate: purchaseForm.postedDate || null,
      note: purchaseForm.note || null,
      merchant: purchaseForm.merchant || null
    }, purchaseForm.creditCardAccountId, () => setPurchaseForm({ ...emptyPurchase, creditCardAccountId: purchaseForm.creditCardAccountId, categoryId: purchaseForm.categoryId }));
  }

  async function submitRefund(event: FormEvent) {
    event.preventDefault();
    await mutate("/api/credit-cards/refund", {
      ...refundForm,
      amount: Number(refundForm.amount),
      originalTransactionId: refundForm.originalTransactionId || null,
      note: refundForm.note || null
    }, refundForm.creditCardAccountId, () => setRefundForm({ ...emptyRefund, creditCardAccountId: refundForm.creditCardAccountId }));
  }

  async function submitPayment(event: FormEvent) {
    event.preventDefault();
    await mutate("/api/credit-cards/payment", {
      ...paymentForm,
      amount: Number(paymentForm.amount),
      paymentAccountId: paymentForm.paymentAccountId || null,
      note: paymentForm.note || null
    }, paymentForm.creditCardAccountId, () => setPaymentForm({ ...emptyPayment, creditCardAccountId: paymentForm.creditCardAccountId, paymentAccountId: paymentForm.paymentAccountId }));
  }

  async function submitInstallment(event: FormEvent) {
    event.preventDefault();
    await mutate("/api/credit-cards/installment-plans", {
      ...installmentForm,
      originalAmount: Number(installmentForm.originalAmount),
      installmentCount: Number(installmentForm.installmentCount),
      description: installmentForm.description || null
    }, installmentForm.creditCardAccountId, () => setInstallmentForm({ ...emptyInstallment, creditCardAccountId: installmentForm.creditCardAccountId }));
  }

  async function postInstallment(planId: string, itemId: string) {
    if (!detail) return;
    await mutate(`/api/credit-cards/installments/${planId}/schedule-items/${itemId}/post`, { postingDate: null, categoryId: null, note: null }, detail.summary.accountId, () => undefined);
  }


  async function loadStatementImports(cardId: string) {
    try {
      const imports = await apiFetch<StatementImportBatchDto[]>(`/api/credit-cards/${cardId}/statement-imports`, accessToken, {}, refreshSession);
      setStatementImports(imports);
      setStatementImport((current) => current ?? imports[0] ?? null);
    } catch (err) {
      setError(problemMessage(err));
    }
  }

  async function parseStatementImport(event: FormEvent) {
    event.preventDefault();
    if (!detail || !statementFile) return setError("請先選擇 PDF 帳單。");
    const formData = new FormData();
    formData.append("file", statementFile);
    formData.append("password", statementPassword);
    setIsStatementBusy(true);
    try {
      const batch = await apiFetch<StatementImportBatchDto>(`/api/credit-cards/${detail.summary.accountId}/statement-imports/parse`, accessToken, { method: "POST", body: formData }, refreshSession);
      setStatementImport(batch);
      setStatementPassword("");
      await loadStatementImports(detail.summary.accountId);
    } catch (err) {
      setError(problemMessage(err));
    } finally {
      setIsStatementBusy(false);
    }
  }

  async function updateStatementRow(rowId: string, update: StatementRowUpdate) {
    if (!statementImport) return;
    try {
      const row = await apiFetch<StatementImportRowDto>(`/api/statement-imports/${statementImport.id}/rows/${rowId}`, accessToken, { method: "PUT", body: JSON.stringify({ reviewStatus: update.reviewStatus, categoryId: update.categoryId || null, amount: update.amount, type: update.type }) }, refreshSession);
      setStatementImport({ ...statementImport, rows: statementImport.rows.map((candidate) => candidate.id === row.id ? row : candidate) });
    } catch (err) {
      setError(problemMessage(err));
    }
  }

  async function postStatementImport() {
    if (!detail || !statementImport) return;
    const rowsMissingCategory = statementImport.rows.filter((row) => row.reviewStatus === "ReadyToPost" && statementRowNeedsExpenseCategory(row.type) && !row.categoryId && !defaultStatementCategoryId);
    if (rowsMissingCategory.length > 0) {
      setError(t("chooseDefaultCategoryBeforePosting"));
      return;
    }
    setIsStatementBusy(true);
    try {
      const batch = await apiFetch<StatementImportBatchDto>(`/api/statement-imports/${statementImport.id}/post`, accessToken, { method: "POST", body: JSON.stringify({ defaultCategoryId: defaultStatementCategoryId || null }) }, refreshSession);
      setStatementImport(batch);
      await load(detail.summary.accountId);
      await loadStatementImports(detail.summary.accountId);
    } catch (err) {
      setError(problemMessage(err));
    } finally {
      setIsStatementBusy(false);
    }
  }

  async function retryFailedStatementRows() {
    if (!statementImport) return;
    const failedRows = statementImport.rows.filter((row) => row.reviewStatus === "Failed");
    const rowsMissingCategory = failedRows.filter((row) => statementRowNeedsExpenseCategory(row.type) && !row.categoryId && !defaultStatementCategoryId);
    if (rowsMissingCategory.length > 0) {
      setError(t("chooseDefaultCategoryBeforeRetry"));
      return;
    }
    setIsStatementBusy(true);
    try {
      const updatedRows: StatementImportRowDto[] = [];
      for (const row of failedRows) {
        updatedRows.push(await apiFetch<StatementImportRowDto>(`/api/statement-imports/${statementImport.id}/rows/${row.id}`, accessToken, { method: "PUT", body: JSON.stringify({ reviewStatus: "ReadyToPost", categoryId: row.categoryId || (statementRowNeedsExpenseCategory(row.type) ? defaultStatementCategoryId : null), amount: row.amount, type: row.type }) }, refreshSession));
      }
      setStatementImport({ ...statementImport, rows: statementImport.rows.map((candidate) => updatedRows.find((row) => row.id === candidate.id) ?? candidate) });
      setError(null);
    } catch (err) {
      setError(problemMessage(err));
    } finally {
      setIsStatementBusy(false);
    }
  }

  async function discardStatementImport() {
    if (!detail || !statementImport) return;
    setIsStatementBusy(true);
    try {
      await apiFetch<void>(`/api/statement-imports/${statementImport.id}/discard`, accessToken, { method: "POST" }, refreshSession);
      setStatementImport(null);
      await loadStatementImports(detail.summary.accountId);
    } catch (err) {
      setError(problemMessage(err));
    } finally {
      setIsStatementBusy(false);
    }
  }
  async function mutate(path: string, payload: unknown, selectedId: string, reset: () => void) {
    try {
      await apiFetch(path, accessToken, { method: "POST", body: JSON.stringify(payload) }, refreshSession);
      reset();
      await load(selectedId);
    } catch (err) {
      setError(problemMessage(err));
    }
  }

  return (
    <section className="grid gap-6">
      <PageHeader title={t("creditCardsTitle")} description={t("creditCardsDescription")} />
      <AetherEnergyDivider className="-mt-4 mb-1 sm:-mt-5 sm:mb-0" intensity="normal" />
      {error && <ErrorState message={error} />}

      <div className="grid gap-3 lg:grid-cols-3">
        {cards.map((card) => {
          const utilization = creditUtilizationPercent(card);
          return (
            <button key={card.accountId} className="game-panel text-left transition hover:-translate-y-0.5 hover:brightness-[1.03] active:translate-y-0" onClick={async () => { selectDefaults(card.accountId); await load(card.accountId); }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold">{card.accountName}</h2>
                  <p className="text-sm text-muted">{card.issuerName} / {card.cardName}{card.lastFourDigits ? ` / ${card.lastFourDigits}` : ""}</p>
                </div>
                <span className="game-badge game-badge-credit">{utilization.toFixed(2)}%</span>
              </div>
              <CreditUtilization card={card} className="mt-4" />
              <dl className="mt-4 grid gap-2 text-sm">
                <Row label={t("outstanding")} value={money(card.outstandingAmount, card.currencyCode)} />
                <Row label={t("billedOutstanding")} value={money(billedOutstanding(card), card.currencyCode)} />
                <Row label={t("unbilledAmount")} value={money(unbilledAmount(card), card.currencyCode)} />
                <Row label={t("availableCredit")} value={baseAvailableCredit(card) == null ? "-" : money(baseAvailableCredit(card)!, card.currencyCode)} />
                {card.creditBalance > 0 && <Row label={t("creditBalance")} value={money(card.creditBalance, card.currencyCode)} />}
                <Row label={t("nextClosing")} value={formatDate(card.nextClosingDate)} />
                <Row label={t("nextDue")} value={formatDate(card.nextPaymentDueDate)} />
              </dl>
            </button>
          );
        })}
        {!isLoading && cards.length === 0 && <div className="lg:col-span-3"><EmptyState title={t("noCreditCards")} /></div>}
      </div>

      <form onSubmit={submitCard} className="game-panel grid gap-3 md:grid-cols-4">
        <div className="md:col-span-4"><CardTitle title={editingId ? t("editCreditCard") : t("addCreditCard")} description={t("creditCardSetup")} /></div>
        <select className="ui-input" value={cardForm.accountId} onChange={(e) => setCardForm({ ...cardForm, accountId: e.target.value })}>
          <option value="">{t("createCreditCardAccount")}</option>
          {availableCreditCardAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
        </select>
        {!cardForm.accountId && <input className="ui-input" placeholder={t("accountName")} value={cardForm.accountName} onChange={(e) => setCardForm({ ...cardForm, accountName: e.target.value })} />}
        <input className="ui-input" placeholder={t("issuer")} value={cardForm.issuerName} onChange={(e) => setCardForm({ ...cardForm, issuerName: e.target.value })} />
        <input className="ui-input" placeholder={t("cardName")} value={cardForm.cardName} onChange={(e) => setCardForm({ ...cardForm, cardName: e.target.value })} />
        <input className="ui-input" placeholder={t("lastFour")} maxLength={4} value={cardForm.lastFourDigits} onChange={(e) => setCardForm({ ...cardForm, lastFourDigits: e.target.value.replace(/\D/g, "") })} />
        <input className="ui-input" placeholder={t("creditLimit")} type="number" min="0" step="0.01" value={cardForm.creditLimit} onChange={(e) => setCardForm({ ...cardForm, creditLimit: e.target.value })} />
        <input className="ui-input" placeholder={t("closingDay")} type="number" min="1" max="31" value={cardForm.statementClosingDay} onChange={(e) => setCardForm({ ...cardForm, statementClosingDay: Number(e.target.value) })} />
        <input className="ui-input" placeholder={t("dueDay")} type="number" min="1" max="31" value={cardForm.paymentDueDay} onChange={(e) => setCardForm({ ...cardForm, paymentDueDay: Number(e.target.value) })} />
        <select className="ui-input" value={cardForm.paymentAccountId} onChange={(e) => setCardForm({ ...cardForm, paymentAccountId: e.target.value })}>
          <option value="">{t("noDefaultPaymentAccount")}</option>
          {activePaymentAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
        </select>
        <Button type="submit">{editingId ? t("update") : t("add")}</Button>
      </form>

      {detail && (
        <section className="grid gap-4">
          <Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-bold">{detail.summary.accountName}</h2>
                <p className="text-sm text-muted">{formatDate(detail.summary.currentStatementPeriod.startDate)} to {formatDate(detail.summary.currentStatementPeriod.endDate)}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => { setEditingId(detail.summary.accountId); setCardForm({ accountId: detail.summary.accountId, accountName: detail.summary.accountName, currencyCode: detail.summary.currencyCode, issuerName: detail.summary.issuerName, cardName: detail.summary.cardName, lastFourDigits: detail.summary.lastFourDigits ?? "", creditLimit: detail.summary.creditLimit?.toString() ?? "", statementClosingDay: detail.summary.statementClosingDay, paymentDueDay: detail.summary.paymentDueDay, paymentAccountId: detail.summary.paymentAccountId ?? "" }); }}>{t("editSettings")}</Button>
            </div>
            <CreditCardSummary summary={detail.summary} />
          </Card>

          <StatementImportPanel batch={statementImport} history={statementImports} categories={expenseCategories} defaultCategoryId={defaultStatementCategoryId} isBusy={isStatementBusy} file={statementFile} password={statementPassword} onDefaultCategoryChange={setDefaultStatementCategoryId} onFileChange={setStatementFile} onPasswordChange={setStatementPassword} onParse={parseStatementImport} onSelectBatch={setStatementImport} onUpdateRow={updateStatementRow} onRetryFailed={retryFailedStatementRows} onPost={postStatementImport} onDiscard={discardStatementImport} />

          <div className="grid gap-4 xl:grid-cols-2">
            <TransactionForm title={t("cardPurchase")} onSubmit={submitPurchase}>
              <CreditCardSelect value={purchaseForm.creditCardAccountId} cards={cards} onChange={(value) => setPurchaseForm({ ...purchaseForm, creditCardAccountId: value })} />
              <select className="ui-input" value={purchaseForm.categoryId} onChange={(e) => setPurchaseForm({ ...purchaseForm, categoryId: e.target.value })}><option value="">{t("expenseCategory")}</option>{expenseCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
              <MoneyInput value={purchaseForm.amount} onChange={(value) => setPurchaseForm({ ...purchaseForm, amount: value })} />
              <input className="ui-input" type="date" value={purchaseForm.purchaseDate} onChange={(e) => setPurchaseForm({ ...purchaseForm, purchaseDate: e.target.value })} />
              <input className="ui-input" type="date" value={purchaseForm.postedDate} onChange={(e) => setPurchaseForm({ ...purchaseForm, postedDate: e.target.value })} />
              <input className="ui-input" placeholder={t("merchant")} value={purchaseForm.merchant} onChange={(e) => setPurchaseForm({ ...purchaseForm, merchant: e.target.value })} />
              <input className="ui-input xl:col-span-2" placeholder={t("note")} value={purchaseForm.note} onChange={(e) => setPurchaseForm({ ...purchaseForm, note: e.target.value })} />
            </TransactionForm>

            <TransactionForm title={t("cardRefund")} onSubmit={submitRefund}>
              <CreditCardSelect value={refundForm.creditCardAccountId} cards={cards} onChange={(value) => setRefundForm({ ...refundForm, creditCardAccountId: value })} />
              <MoneyInput value={refundForm.amount} onChange={(value) => setRefundForm({ ...refundForm, amount: value })} />
              <input className="ui-input" type="date" value={refundForm.refundDate} onChange={(e) => setRefundForm({ ...refundForm, refundDate: e.target.value })} />
              <select className="ui-input" value={refundForm.originalTransactionId} onChange={(e) => setRefundForm({ ...refundForm, originalTransactionId: e.target.value })}><option value="">{t("optionalOriginalPurchase")}</option>{detail.recentTransactions.filter((t) => t.type === "CreditCardPurchase").map((t) => <option key={t.id} value={t.id}>{formatDate(t.transactionDate)} / {money(t.displayAmount, detail.summary.currencyCode)}</option>)}</select>
              <input className="ui-input xl:col-span-2" placeholder={t("note")} value={refundForm.note} onChange={(e) => setRefundForm({ ...refundForm, note: e.target.value })} />
            </TransactionForm>

            <TransactionForm title={t("cardPayment")} onSubmit={submitPayment}>
              <CreditCardSelect value={paymentForm.creditCardAccountId} cards={cards} onChange={(value) => setPaymentForm({ ...paymentForm, creditCardAccountId: value })} />
              <select className="ui-input" value={paymentForm.paymentAccountId} onChange={(e) => setPaymentForm({ ...paymentForm, paymentAccountId: e.target.value })}><option value="">{t("defaultPaymentAccount")}</option>{activePaymentAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select>
              <MoneyInput value={paymentForm.amount} onChange={(value) => setPaymentForm({ ...paymentForm, amount: value })} />
              <input className="ui-input" type="date" value={paymentForm.paymentDate} onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })} />
              <input className="ui-input xl:col-span-2" placeholder={t("note")} value={paymentForm.note} onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })} />
            </TransactionForm>

            <TransactionForm title={t("installmentPlan")} onSubmit={submitInstallment}>
              <CreditCardSelect value={installmentForm.creditCardAccountId} cards={cards} onChange={(value) => setInstallmentForm({ ...installmentForm, creditCardAccountId: value })} />
              <input className="ui-input" placeholder={t("merchant")} value={installmentForm.merchant} onChange={(e) => setInstallmentForm({ ...installmentForm, merchant: e.target.value })} />
              <MoneyInput value={installmentForm.originalAmount} onChange={(value) => setInstallmentForm({ ...installmentForm, originalAmount: value })} />
              <input className="ui-input" type="number" min="1" value={installmentForm.installmentCount} onChange={(e) => setInstallmentForm({ ...installmentForm, installmentCount: Number(e.target.value) })} />
              <input className="ui-input" type="date" value={installmentForm.purchaseDate} onChange={(e) => setInstallmentForm({ ...installmentForm, purchaseDate: e.target.value })} />
              <input className="ui-input" type="date" value={installmentForm.firstInstallmentDate} onChange={(e) => setInstallmentForm({ ...installmentForm, firstInstallmentDate: e.target.value })} />
              <input className="ui-input xl:col-span-2" placeholder={t("description")} value={installmentForm.description} onChange={(e) => setInstallmentForm({ ...installmentForm, description: e.target.value })} />
            </TransactionForm>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title={t("recentTransactions")}>{detail.recentTransactions.length === 0 ? <p className="text-sm text-muted">{t("noTransactions")}</p> : detail.recentTransactions.map((transaction) => <Row key={transaction.id} label={`${formatDate(transaction.transactionDate)} ${transactionTypeLabels[transaction.type]}`} value={money(transaction.displayAmount, detail.summary.currencyCode)} />)}</Panel>
            <Panel title={t("installments")}>{detail.installmentPlans.length === 0 ? <p className="text-sm text-muted">{t("noInstallments")}</p> : detail.installmentPlans.map((plan) => <div key={plan.id} className="border-b border-border/55 py-2 last:border-0"><Row label={`${plan.merchant} / ${installmentStatusLabels[plan.status] ?? plan.status}`} value={money(plan.remainingCommitmentAmount, detail.summary.currencyCode)} /><div className="mt-2 grid gap-1">{plan.scheduleItems.map((item) => <div key={item.id} className="flex items-center justify-between gap-2 text-xs text-muted"><span>{item.installmentNumber}. {formatDate(item.dueDate)} / {money(item.amount, detail.summary.currencyCode)} / {installmentStatusLabels[item.status] ?? item.status}</span><Button type="button" variant="outline" size="sm" disabled={item.status !== "Pending"} onClick={() => postInstallment(plan.id, item.id)}>{t("post")}</Button></div>)}</div></div>)}</Panel>
          </div>
        </section>
      )}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <p className="flex justify-between gap-3"><span className="text-muted">{label}</span><span className="font-semibold">{value}</span></p>;
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return <div className="rounded-ui border border-border/55 bg-surface-muted/50 p-3 shadow-inner" title={hint}><p className="text-sm text-muted">{label}</p><p className="mt-1 font-bold">{value}</p>{hint && <p className="mt-1 text-xs text-muted">{hint}</p>}</div>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <Card><h2 className="mb-3 font-bold">{title}</h2><div className="grid gap-2 text-sm">{children}</div></Card>;
}

function TransactionForm({ title, onSubmit, children }: { title: string; onSubmit: (event: FormEvent) => void; children: React.ReactNode }) {
  return <form onSubmit={onSubmit} className="game-panel grid gap-3 sm:grid-cols-2"><h2 className="font-bold sm:col-span-2">{title}</h2>{children}<Button type="submit" className="sm:col-span-2">{t("save")}</Button></form>;
}

function CreditCardSelect({ value, cards, onChange }: { value: string; cards: CreditCardDto[]; onChange: (value: string) => void }) {
  return <select className="ui-input" value={value} onChange={(e) => onChange(e.target.value)}><option value="">{t("selectCard")}</option>{cards.map((card) => <option key={card.accountId} value={card.accountId}>{card.accountName}</option>)}</select>;
}

function MoneyInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <input className="ui-input" placeholder={t("amount")} type="number" min="0" step="0.01" value={value} onChange={(e) => onChange(e.target.value)} />;
}

function CreditUtilization({ card, className = "" }: { card: CreditCardDto; className?: string }) {
  const percent = creditUtilizationPercent(card);
  const limit = card.creditLimit;
  return (
    <div className={className}>
      <GameProgress value={percent} label={t("creditUtilization")} />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>{t("used")}：{money(card.outstandingAmount, card.currencyCode)}{limit == null ? "" : ` / ${money(limit, card.currencyCode)}`}</span>
        <span className="font-semibold text-primary">{percent.toFixed(2)}%</span>
      </div>
    </div>
  );
}

function CreditCardSummary({ summary }: { summary: CreditCardDto }) {
  const available = baseAvailableCredit(summary);
  const backendAvailable = summary.availableCredit;
  return (
    <div className="mt-4 grid gap-4">
      <CreditUtilization card={summary} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label={t("creditLimit")} value={summary.creditLimit == null ? "-" : money(summary.creditLimit, summary.currencyCode)} />
        <Metric label={t("usedCredit")} value={money(summary.outstandingAmount, summary.currencyCode)} />
        <Metric label={t("billedOutstanding")} value={money(billedOutstanding(summary), summary.currencyCode)} hint={t("billedOutstandingHelp")} />
        <Metric label={t("unbilledAmount")} value={money(unbilledAmount(summary), summary.currencyCode)} hint={t("unbilledAmountHelp")} />
        <Metric label={t("outstanding")} value={money(summary.outstandingAmount, summary.currencyCode)} />
        <Metric label={t("availableCredit")} value={available == null ? "-" : money(available, summary.currencyCode)} />
        {summary.creditBalance > 0 && <Metric label={t("creditBalance")} value={money(summary.creditBalance, summary.currencyCode)} hint={t("creditBalanceHelp")} />}
        {summary.creditBalance > 0 && backendAvailable != null && <Metric label={t("availableCreditIncludingBalance")} value={money(backendAvailable, summary.currencyCode)} />}
        <Metric label={t("latestStatementAmount")} value={money(summary.latestStatementAmount ?? billedOutstanding(summary), summary.currencyCode)} />
        <Metric label={t("installments")} value={money(summary.remainingInstallmentCommitment, summary.currencyCode)} />
        <Metric label={t("nextClosing")} value={formatDate(summary.nextClosingDate)} />
        <Metric label={t("nextDue")} value={formatDate(summary.nextPaymentDueDate)} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label={t("statementCharges")} value={money(summary.statementCharges, summary.currencyCode)} />
        <Metric label={t("statementCredits")} value={money(summary.statementCredits, summary.currencyCode)} />
        <Metric label={t("statementNet")} value={money(summary.estimatedStatementNet, summary.currencyCode)} />
      </div>
    </div>
  );
}
function StatementImportPanel({ batch, history, categories, defaultCategoryId, isBusy, file, password, onDefaultCategoryChange, onFileChange, onPasswordChange, onParse, onSelectBatch, onUpdateRow, onRetryFailed, onPost, onDiscard }: {
  batch: StatementImportBatchDto | null;
  history: StatementImportBatchDto[];
  categories: CategoryDto[];
  defaultCategoryId: string;
  isBusy: boolean;
  file: File | null;
  password: string;
  onDefaultCategoryChange: (value: string) => void;
  onFileChange: (file: File | null) => void;
  onPasswordChange: (value: string) => void;
  onParse: (event: FormEvent) => void;
  onSelectBatch: (batch: StatementImportBatchDto) => void;
  onUpdateRow: (rowId: string, update: StatementRowUpdate) => void;
  onRetryFailed: () => void;
  onPost: () => void;
  onDiscard: () => void;
}) {
  const readyRows = batch?.rows.filter((row) => row.reviewStatus === "ReadyToPost").length ?? 0;
  const failedRows = batch?.rows.filter((row) => row.reviewStatus === "Failed").length ?? 0;
  const rowsMissingPostCategory = batch?.rows.filter((row) => row.reviewStatus === "ReadyToPost" && statementRowNeedsExpenseCategory(row.type) && !row.categoryId).length ?? 0;
  const postedRows = batch?.rows.filter((row) => row.reviewStatus === "Posted").length ?? 0;
  const blockedRows = batch?.rows.filter((row) => row.reviewStatus === "New" || row.matchStatus !== "New" || row.type === "Unknown").length ?? 0;
  const rowsNeedAttention = readyRows > 0 || failedRows > 0 || blockedRows > 0;
  const [rowsExpanded, setRowsExpanded] = useState(false);

  useEffect(() => {
    setRowsExpanded(rowsNeedAttention);
  }, [batch?.id, rowsNeedAttention]);

  return (
    <Card>
      <CardTitle title={t("statementImport")} description={t("statementImportDescription")} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.5fr)]">
        <form onSubmit={onParse} className="game-inspect-panel">
          <div className="game-inspect-header"><div><h3 className="font-bold">{t("uploadPdf")}</h3><p className="text-xs text-muted">{t("passwordRequestOnly")}</p></div></div>
          <div className="game-inspect-body">
            <input className="ui-input" type="file" accept="application/pdf,.pdf" onChange={(event) => onFileChange(event.target.files?.[0] ?? null)} />
            <input className="ui-input" type="password" autoComplete="off" placeholder={t("password")} value={password} onChange={(event) => onPasswordChange(event.target.value)} />
            <p className="text-xs text-muted">{file ? `${file.name} / ${Math.ceil(file.size / 1024)} KB` : t("noFileSelected")}</p>
            <Button type="submit" isLoading={isBusy}>{t("parseStatement")}</Button>
          </div>
        </form>

        <div className="grid gap-4">
          {batch ? (
            <div className="game-panel grid gap-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="text-lg font-bold">{batch.provider} / {batch.originalFileName}</h3>
                  <p className="text-sm text-muted">{batch.statementPeriodStart ? formatDate(batch.statementPeriodStart) : "-"} {t("periodTo")} {batch.statementPeriodEnd ? formatDate(batch.statementPeriodEnd) : "-"} / {t("dueDate")} {batch.paymentDueDate ? formatDate(batch.paymentDueDate) : "-"}</p>
                </div>
                <span className="game-badge game-badge-credit">{statementImportBatchStatusLabels[batch.status]}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                <Metric label={t("statement")} value={batch.statementAmount == null ? "-" : money(batch.statementAmount)} />
                <Metric label={t("newCharges")} value={batch.newCharges == null ? "-" : money(batch.newCharges)} />
                <Metric label={t("rows")} value={`${batch.rows.length}`} />
                <Metric label={t("ready")} value={`${readyRows} / ${t("posted")} ${postedRows}`} />
              </div>
              {batch.warnings.length > 0 && <StatementReviewNotice warnings={batch.warnings} rows={batch.rows} />}
              <div className="flex flex-wrap items-end gap-2">
                <label className="ui-label min-w-64">{t("defaultExpenseCategory")}<select className="ui-input" value={defaultCategoryId} onChange={(event) => onDefaultCategoryChange(event.target.value)}><option value="">{t("chooseWhenPostingPurchases")}</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
                <Button type="button" disabled={isBusy || readyRows === 0 || (rowsMissingPostCategory > 0 && !defaultCategoryId)} onClick={onPost}>{t("postReadyRows")}</Button>
                <Button type="button" variant="outline" disabled={isBusy || failedRows === 0} onClick={onRetryFailed}>{t("retryFailedRows")}</Button>
                <Button type="button" variant="outline" disabled={isBusy || postedRows > 0} onClick={onDiscard}>{t("discard")}</Button>
              </div>
              {rowsMissingPostCategory > 0 && !defaultCategoryId && <p className="text-sm text-warning">{t("rowMissingCategory")}</p>}
              {failedRows > 0 && <p className="text-sm text-danger">{failedRows} {t("failedRowsHint")}</p>}
              {blockedRows > 0 && <p className="text-sm text-warning">{blockedRows} {t("blockedRowsHint")}</p>}
              <div className="rounded-ui border border-border/55 bg-surface-muted/25">
                <button type="button" className="flex w-full flex-col gap-3 p-3 text-left transition hover:bg-surface-muted/45 sm:flex-row sm:items-center sm:justify-between" onClick={() => setRowsExpanded((expanded) => !expanded)} aria-expanded={rowsExpanded}>
                  <div>
                    <p className="font-semibold">{t("statementRows")}</p>
                    <p className="text-xs text-muted">{batch.rows.length} {t("rows")} / {postedRows} {t("posted")} / {readyRows} {t("ready")} / {failedRows} {t("failed")} / {blockedRows} {t("needsReview")}</p>
                  </div>
                  <span className="game-badge game-badge-neutral">{rowsExpanded ? t("hideRows") : t("showRows")}</span>
                </button>
                {rowsExpanded && (
                  <div className="grid max-h-[720px] gap-2 overflow-y-auto border-t border-border/55 p-3">
                    {batch.rows.map((row) => <StatementRowReview key={row.id} row={row} categories={categories} onUpdate={onUpdateRow} />)}
                  </div>
                )}
              </div>
            </div>
          ) : <EmptyState title={t("noStatementParsed")} description={t("noStatementParsedDescription")} />}

          {history.length > 0 && (
            <div className="game-panel">
              <h3 className="mb-3 font-bold">{t("importHistory")}</h3>
              <div className="grid gap-2">{history.map((item) => <button key={item.id} type="button" className="rounded-ui border border-border/55 bg-surface-muted/35 p-3 text-left text-sm hover:border-primary/70" onClick={() => onSelectBatch(item)}><span className="font-semibold">{item.originalFileName}</span><span className="ml-2 text-muted">{statementImportBatchStatusLabels[item.status]} / {item.rows.length} {t("rows")}</span></button>)}</div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function StatementReviewNotice({ warnings, rows }: { warnings: string[]; rows: StatementImportRowDto[] }) {
  const unknownCount = rows.filter((row) => row.type === "Unknown" || row.amount <= 0).length;
  const mismatch = warnings.find((warning) => warning.startsWith("SummaryMismatch"));
  const manualReviewText = unknownCount > 0 ? `${unknownCount} ${t("rowsNeedAmountType")}` : t("reviewNotesAvailable");

  return (
    <div className="rounded-ui border border-primary/45 bg-primary/10 p-3 text-sm text-foreground">
      <p className="font-semibold">{t("importedSuccessfullyReviewNeeded")}</p>
      <p className="mt-1 text-muted">{manualReviewText}{mismatch ? ` ${t("totalsReconcileAfterReview")}` : ""}</p>
      <p className="mt-2 break-words text-xs text-muted">{t("parserNotes")}：{warnings.join(" / ")}</p>
    </div>
  );
}

function StatementRowReview({ row, categories, onUpdate }: { row: StatementImportRowDto; categories: CategoryDto[]; onUpdate: (rowId: string, update: StatementRowUpdate) => void }) {
  const [categoryId, setCategoryId] = useState(row.categoryId ?? "");
  const [amount, setAmount] = useState(row.amount > 0 ? String(row.amount) : "");
  const [rowType, setRowType] = useState<StatementImportRowType>(row.type);

  useEffect(() => {
    setCategoryId(row.categoryId ?? "");
    setAmount(row.amount > 0 ? String(row.amount) : "");
    setRowType(row.type);
  }, [row.id, row.categoryId, row.amount, row.type]);

  const parsedAmount = Number(amount);
  const canMarkReady = row.reviewStatus !== "Posted" && Number.isFinite(parsedAmount) && parsedAmount > 0 && rowType !== "Unknown";
  const editable = row.reviewStatus !== "Posted";

  return (
    <div className="rounded-ui border border-border/55 bg-surface-muted/35 p-3">
      <div className="grid gap-2 lg:grid-cols-[1fr_auto_auto] lg:items-center">
        <div className="min-w-0">
          <p className="truncate font-semibold">{row.normalizedDescription}</p>
          <p className="text-xs text-muted">#{row.sourceRowNumber} / {statementImportRowTypeLabels[row.type]} / {row.transactionDate ? formatDate(row.transactionDate) : "-"} / {t("posted")} {row.postingDate ? formatDate(row.postingDate) : "-"}</p>
          {row.rawText && <p className="mt-1 text-xs text-muted">{t("rawText")}：{row.rawText}</p>}
          {row.failureReason && <p className="mt-1 text-xs text-danger">{row.failureReason}</p>}
        </div>
        <div className="font-bold">{money(row.amount, row.currency)}</div>
        <span className={`game-badge ${row.matchStatus === "New" ? "game-badge-neutral" : "game-badge-warning"}`}>{statementImportReviewStatusLabels[row.reviewStatus]} / {statementImportMatchStatusLabels[row.matchStatus]}</span>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_9rem_minmax(0,1fr)_auto_auto] md:items-center">
        <select className="ui-input" value={rowType} disabled={!editable} onChange={(event) => setRowType(event.target.value as StatementImportRowType)}>
          {statementRowTypeOptions.map((type) => <option key={type} value={type}>{statementImportRowTypeLabels[type]}</option>)}
        </select>
        <input className="ui-input" type="number" min="0.01" step="0.01" placeholder={t("amount")} value={amount} disabled={!editable} onChange={(event) => setAmount(event.target.value)} />
        <select className="ui-input" value={categoryId} disabled={!editable} onChange={(event) => setCategoryId(event.target.value)}>
          <option value="">{t("noCategory")}</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        <Button type="button" variant="outline" size="sm" disabled={!canMarkReady} onClick={() => onUpdate(row.id, { reviewStatus: "ReadyToPost", categoryId: categoryId || null, amount: parsedAmount, type: rowType })}>{t("saveReady")}</Button>
        <Button type="button" variant="ghost" size="sm" disabled={!editable} onClick={() => onUpdate(row.id, { reviewStatus: "Ignored", categoryId: categoryId || null, amount: Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : undefined, type: rowType })}>{t("ignore")}</Button>
      </div>
      {rowType === "Unknown" && <p className="mt-2 text-xs text-muted">{t("chooseRowTypeAndAmount")}</p>}
      {rowType === "Payment" && row.reviewStatus !== "Posted" && <p className="mt-2 text-xs text-warning">{t("paymentRowsManualReview")}</p>}
    </div>
  );
}
