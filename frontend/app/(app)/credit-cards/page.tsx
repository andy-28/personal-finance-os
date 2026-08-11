"use client";

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AetherMetric, AetherPanelHeader, AetherSummaryGrid } from "@/components/ui/aether-management";
import { Button } from "@/components/ui/button";
import { GameProgress, GameTab, GameTabs, GameWindow } from "@/components/ui/game-theme";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { apiFetch, money, problemMessage, type AccountDto, type CategoryDto, type CreditCardDetailDto, type CreditCardDto, type StatementImportBatchDto, type StatementImportReviewStatus, type StatementImportRowDto, type StatementImportRowType } from "@/lib/api-client";
import { financeDataChangedEvent } from "@/lib/app-events";
import { formatDate, todayInputValue } from "@/lib/formatters";
import { t } from "@/lib/i18n";
import { installmentStatusLabels, statementImportMatchStatusLabels, statementImportReviewStatusLabels, statementImportRowTypeLabels, transactionTypeLabels } from "@/lib/labels";
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

type CreditCardTab = "overview" | "statement" | "operations" | "installments";
type CreditCardOperation = "purchase" | "refund" | "payment" | "installment";

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

function numericAmount(value: string) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function cardMeta(card: CreditCardDto) {
  const parts = [card.issuerName, card.cardName, card.lastFourDigits].filter(Boolean);
  return parts.join(" · ");
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
  const [activeTab, setActiveTab] = useState<CreditCardTab>("overview");
  const [activeOperation, setActiveOperation] = useState<CreditCardOperation>("purchase");
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);

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

  async function selectCreditCard(accountId: string) {
    if (detail?.summary.accountId === accountId) return;
    selectDefaults(accountId);
    setStatementImport(null);
    setStatementImports([]);
    try {
      const nextDetail = await apiFetch<CreditCardDetailDto>(`/api/credit-cards/${accountId}`, accessToken, {}, refreshSession);
      setDetail(nextDetail);
      setError(null);
    } catch (err) {
      setError(problemMessage(err));
    }
  }

  useEffect(() => { if (accessToken) load(); }, [accessToken]);

  useEffect(() => {
    document.getElementById(`credit-card-tab-${activeTab}`)?.scrollTo({ top: 0 });
  }, [activeTab, detail?.summary.accountId]);
  useEffect(() => {
    if (!accessToken) return;
    const onFinanceDataChanged = () => { void load(detail?.summary.accountId); };
    window.addEventListener(financeDataChangedEvent, onFinanceDataChanged);
    return () => window.removeEventListener(financeDataChangedEvent, onFinanceDataChanged);
  }, [accessToken, detail?.summary.accountId]);
  useEffect(() => { if (accessToken && detail) loadStatementImports(detail.summary.accountId); }, [accessToken, detail?.summary.accountId]);
  useEffect(() => { if (detail) selectDefaults(detail.summary.accountId); }, [detail?.summary.accountId]);

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
      const savedCard = editingId
        ? await apiFetch<CreditCardDto>(`/api/credit-cards/${editingId}`, accessToken, { method: "PUT", body }, refreshSession)
        : await apiFetch<CreditCardDto>("/api/credit-cards", accessToken, { method: "POST", body }, refreshSession);
      setCardForm(emptyCard);
      setEditingId(null);
      setIsCardModalOpen(false);
      await load(savedCard.accountId);
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
      setStatementImport(imports[0] ?? null);
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

  function openCreateCardModal() {
    setEditingId(null);
    setCardForm(emptyCard);
    setIsCardModalOpen(true);
  }

  function openEditCardModal(card: CreditCardDto) {
    setEditingId(card.accountId);
    setCardForm({
      accountId: card.accountId,
      accountName: card.accountName,
      currencyCode: card.currencyCode,
      issuerName: card.issuerName,
      cardName: card.cardName,
      lastFourDigits: card.lastFourDigits ?? "",
      creditLimit: card.creditLimit?.toString() ?? "",
      statementClosingDay: card.statementClosingDay,
      paymentDueDay: card.paymentDueDay,
      paymentAccountId: card.paymentAccountId ?? ""
    });
    setIsCardModalOpen(true);
  }

  function closeCardModal() {
    setCardForm(emptyCard);
    setEditingId(null);
    setIsCardModalOpen(false);
  }

  return (
    <section className="grid gap-3 credit-card-page-workspace-full">
      {error && <ErrorState message={error} />}

      <section className="aether-management-window credit-card-module-shell">
        <GameTabs role="tablist" aria-label="信用卡工作區主導覽" className="credit-card-application-nav">
          <GameTab role="tab" aria-selected={activeTab === "overview"} aria-controls="credit-card-tab-overview" isActive={activeTab === "overview"} onClick={() => setActiveTab("overview")}>概覽</GameTab>
          <GameTab role="tab" aria-selected={activeTab === "statement"} aria-controls="credit-card-tab-statement" isActive={activeTab === "statement"} onClick={() => setActiveTab("statement")}>帳單</GameTab>
          <GameTab role="tab" aria-selected={activeTab === "operations"} aria-controls="credit-card-tab-operations" isActive={activeTab === "operations"} onClick={() => setActiveTab("operations")}>操作</GameTab>
          <GameTab role="tab" aria-selected={activeTab === "installments"} aria-controls="credit-card-tab-installments" isActive={activeTab === "installments"} onClick={() => setActiveTab("installments")}>分期</GameTab>
        </GameTabs>

        <AetherPanelHeader
          eyebrow="CARD SLOTS"
          title="卡片管理"
          subtitle="選取卡片後，在右側查看帳單、入帳、繳款與分期。"
          summary={`${cards.length} 張卡片`}
          actions={<Button type="button" onClick={openCreateCardModal}>{t("addCreditCard")}</Button>}
        />

        <section className="credit-card-module-switcher" aria-label="信用卡切換">
          <div className="credit-card-module-switcher-title">
            <span>CREDIT CARDS</span>
            <strong>信用卡</strong>
          </div>
          <div className="credit-card-module-card-list" role="listbox" aria-label="信用卡清單">
            {cards.map((card) => {
              const isActive = detail?.summary.accountId === card.accountId;
              return (
                <button key={card.accountId} type="button" className={`credit-card-module-card ${isActive ? "credit-card-module-card-active" : ""}`} onClick={() => { void selectCreditCard(card.accountId); }}>
                  <span>{card.accountName}</span>
                  <small>{cardMeta(card)}</small>
                </button>
              );
            })}
            {!isLoading && cards.length === 0 && <span className="text-sm text-muted">{t("noCreditCards")}</span>}
          </div>
          <div className="credit-card-module-actions">
            <Button type="button" variant="outline" size="sm" onClick={openCreateCardModal}>{t("addCreditCard")}</Button>
            {detail && <Button type="button" variant="ghost" size="sm" onClick={() => openEditCardModal(detail.summary)}>{t("editSettings")}</Button>}
          </div>
        </section>

        <section className={`aether-detail-pane credit-card-workspace-mode credit-card-workspace-mode-${activeTab}`}>
            {detail ? (
              <div className="credit-card-workspace-viewport">
                <div className="credit-card-tab-panel" id={`credit-card-tab-${activeTab}`} role="tabpanel" key={activeTab}>
                  {activeTab === "overview" && (
                    <div className="credit-card-overview-workspace">
                      <CreditCardSummary summary={detail.summary} compact />
                      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
                        <Panel title={t("recentTransactions")}>{detail.recentTransactions.length === 0 ? <p className="text-sm text-muted">{t("noTransactions")}</p> : detail.recentTransactions.slice(0, 8).map((transaction) => <Row key={transaction.id} label={`${formatDate(transaction.transactionDate)} ${transactionTypeLabels[transaction.type]}`} value={money(transaction.displayAmount, detail.summary.currencyCode)} />)}</Panel>
                        <Panel title="帳期資訊" variant="plain">
                          <Row label={t("nextClosing")} value={formatDate(detail.summary.nextClosingDate)} />
                          <Row label={t("nextDue")} value={formatDate(detail.summary.nextPaymentDueDate)} />
                          <Row label={t("latestStatementAmount")} value={money(detail.summary.latestStatementAmount ?? billedOutstanding(detail.summary), detail.summary.currencyCode)} />
                          <Row label={t("statementCharges")} value={money(detail.summary.statementCharges, detail.summary.currencyCode)} />
                          <Row label={t("statementCredits")} value={money(detail.summary.statementCredits, detail.summary.currencyCode)} />
                          <Row label={t("statementNet")} value={money(detail.summary.estimatedStatementNet, detail.summary.currencyCode)} />
                        </Panel>
                      </div>
                    </div>
                  )}

                  {activeTab === "statement" && <StatementWorkspacePanel batch={statementImport} history={statementImports} categories={expenseCategories} defaultCategoryId={defaultStatementCategoryId} isBusy={isStatementBusy} file={statementFile} password={statementPassword} onDefaultCategoryChange={setDefaultStatementCategoryId} onFileChange={setStatementFile} onPasswordChange={setStatementPassword} onParse={parseStatementImport} onSelectBatch={setStatementImport} onUpdateRow={updateStatementRow} onRetryFailed={retryFailedStatementRows} onPost={postStatementImport} onDiscard={discardStatementImport} />}

                  {activeTab === "operations" && (
                    <div className="credit-card-operation-layout">
                      <div className="credit-card-operation-menu" role="radiogroup" aria-label="操作類型">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">操作類型</p>
                        <button type="button" role="radio" aria-checked={activeOperation === "purchase"} className={`credit-card-operation-choice ${activeOperation === "purchase" ? "credit-card-operation-choice-active" : ""}`} onClick={() => setActiveOperation("purchase")}>{t("cardPurchase")}</button>
                        <button type="button" role="radio" aria-checked={activeOperation === "refund"} className={`credit-card-operation-choice ${activeOperation === "refund" ? "credit-card-operation-choice-active" : ""}`} onClick={() => setActiveOperation("refund")}>{t("cardRefund")}</button>
                        <button type="button" role="radio" aria-checked={activeOperation === "payment"} className={`credit-card-operation-choice ${activeOperation === "payment" ? "credit-card-operation-choice-active" : ""}`} onClick={() => setActiveOperation("payment")}>{t("cardPayment")}</button>
                        <button type="button" role="radio" aria-checked={activeOperation === "installment"} className={`credit-card-operation-choice ${activeOperation === "installment" ? "credit-card-operation-choice-active" : ""}`} onClick={() => setActiveOperation("installment")}>{t("installmentPlan")}</button>
                      </div>

                      <div className="min-w-0">
                      {activeOperation === "purchase" && (
                        <TransactionForm title={t("cardPurchase")} selectedCard={detail.summary} onSubmit={submitPurchase} onClear={() => setPurchaseForm({ ...emptyPurchase, creditCardAccountId: detail.summary.accountId, categoryId: purchaseForm.categoryId })} actionLabel="確認消費" preview={<OperationPreview rows={[
                          ["目前總未繳", money(detail.summary.outstandingAmount, detail.summary.currencyCode)],
                          ["本次新增消費", purchaseForm.amount ? money(numericAmount(purchaseForm.amount), detail.summary.currencyCode) : "-"],
                          ["入帳後預估未繳", purchaseForm.amount ? money(detail.summary.outstandingAmount + numericAmount(purchaseForm.amount), detail.summary.currencyCode) : "-"]
                        ]} note="實際結果仍以入帳後的 Ledger 計算為準。" />}>
                          <MoneyInput value={purchaseForm.amount} onChange={(value) => setPurchaseForm({ ...purchaseForm, amount: value })} />
                          <select className="ui-input" value={purchaseForm.categoryId} onChange={(e) => setPurchaseForm({ ...purchaseForm, categoryId: e.target.value })}><option value="">{t("expenseCategory")}</option>{expenseCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
                          <input className="ui-input" type="date" value={purchaseForm.purchaseDate} onChange={(e) => setPurchaseForm({ ...purchaseForm, purchaseDate: e.target.value })} />
                          <input className="ui-input" type="date" value={purchaseForm.postedDate} onChange={(e) => setPurchaseForm({ ...purchaseForm, postedDate: e.target.value })} />
                          <input className="ui-input" placeholder={t("merchant")} value={purchaseForm.merchant} onChange={(e) => setPurchaseForm({ ...purchaseForm, merchant: e.target.value })} />
                          <input className="ui-input xl:col-span-2" placeholder={t("note")} value={purchaseForm.note} onChange={(e) => setPurchaseForm({ ...purchaseForm, note: e.target.value })} />
                        </TransactionForm>
                      )}

                      {activeOperation === "refund" && (
                        <TransactionForm title={t("cardRefund")} selectedCard={detail.summary} onSubmit={submitRefund} onClear={() => setRefundForm({ ...emptyRefund, creditCardAccountId: detail.summary.accountId })} actionLabel="確認退款" preview={<OperationPreview rows={[
                          ["目前總未繳", money(detail.summary.outstandingAmount, detail.summary.currencyCode)],
                          ["本次退款", refundForm.amount ? money(numericAmount(refundForm.amount), detail.summary.currencyCode) : "-"],
                          ["退款後預估未繳", refundForm.amount ? money(Math.max(detail.summary.outstandingAmount - numericAmount(refundForm.amount), 0), detail.summary.currencyCode) : "-"]
                        ]} note="退款會降低信用卡負債，實際沖銷仍以入帳後 Ledger 為準。" />}>
                          <MoneyInput value={refundForm.amount} onChange={(value) => setRefundForm({ ...refundForm, amount: value })} />
                          <input className="ui-input" type="date" value={refundForm.refundDate} onChange={(e) => setRefundForm({ ...refundForm, refundDate: e.target.value })} />
                          <select className="ui-input" value={refundForm.originalTransactionId} onChange={(e) => setRefundForm({ ...refundForm, originalTransactionId: e.target.value })}><option value="">{t("optionalOriginalPurchase")}</option>{detail.recentTransactions.filter((t) => t.type === "CreditCardPurchase").map((t) => <option key={t.id} value={t.id}>{formatDate(t.transactionDate)} / {money(t.displayAmount, detail.summary.currencyCode)}</option>)}</select>
                          <input className="ui-input xl:col-span-2" placeholder={t("note")} value={refundForm.note} onChange={(e) => setRefundForm({ ...refundForm, note: e.target.value })} />
                        </TransactionForm>
                      )}

                      {activeOperation === "payment" && (
                        <TransactionForm title={t("cardPayment")} selectedCard={detail.summary} onSubmit={submitPayment} onClear={() => setPaymentForm({ ...emptyPayment, creditCardAccountId: detail.summary.accountId, paymentAccountId: detail.summary.paymentAccountId ?? paymentForm.paymentAccountId })} actionLabel="確認繳款" preview={<OperationPreview rows={[
                          ["目前已結帳應繳", money(billedOutstanding(detail.summary), detail.summary.currencyCode)],
                          ["目前總未繳", money(detail.summary.outstandingAmount, detail.summary.currencyCode)],
                          ["本次繳款", paymentForm.amount ? money(numericAmount(paymentForm.amount), detail.summary.currencyCode) : "-"],
                          ["繳款後預估未繳", paymentForm.amount ? money(Math.max(detail.summary.outstandingAmount - numericAmount(paymentForm.amount), 0), detail.summary.currencyCode) : "-"]
                        ]} note="信用卡繳款會降低信用卡負債並扣除付款帳戶資產，不會再次計入一般支出。" actions={<>
                          <Button type="button" variant="outline" size="sm" onClick={() => setPaymentForm({ ...paymentForm, amount: String(billedOutstanding(detail.summary)) })}>填入已結帳應繳</Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => setPaymentForm({ ...paymentForm, amount: String(detail.summary.outstandingAmount) })}>填入總未繳</Button>
                        </>} />}>
                          <select className="ui-input" value={paymentForm.paymentAccountId} onChange={(e) => setPaymentForm({ ...paymentForm, paymentAccountId: e.target.value })}><option value="">{t("defaultPaymentAccount")}</option>{activePaymentAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select>
                          <MoneyInput value={paymentForm.amount} onChange={(value) => setPaymentForm({ ...paymentForm, amount: value })} />
                          <input className="ui-input" type="date" value={paymentForm.paymentDate} onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })} />
                          <input className="ui-input xl:col-span-2" placeholder={t("note")} value={paymentForm.note} onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })} />
                        </TransactionForm>
                      )}

                      {activeOperation === "installment" && (
                        <TransactionForm title={t("installmentPlan")} selectedCard={detail.summary} onSubmit={submitInstallment} onClear={() => setInstallmentForm({ ...emptyInstallment, creditCardAccountId: detail.summary.accountId })} actionLabel="建立分期" preview={<OperationPreview rows={[
                          ["總金額", installmentForm.originalAmount ? money(numericAmount(installmentForm.originalAmount), detail.summary.currencyCode) : "-"],
                          ["期數", `${installmentForm.installmentCount}`],
                          ["每期預估", installmentForm.originalAmount && installmentForm.installmentCount > 0 ? money(numericAmount(installmentForm.originalAmount) / installmentForm.installmentCount, detail.summary.currencyCode) : "-"],
                          ["首次入帳日", formatDate(installmentForm.firstInstallmentDate)]
                        ]} note="預覽僅供操作前確認，實際分期排程仍以既有後端拆分規則建立。" />}>
                          <input className="ui-input" placeholder={t("merchant")} value={installmentForm.merchant} onChange={(e) => setInstallmentForm({ ...installmentForm, merchant: e.target.value })} />
                          <MoneyInput value={installmentForm.originalAmount} onChange={(value) => setInstallmentForm({ ...installmentForm, originalAmount: value })} />
                          <input className="ui-input" type="number" min="1" value={installmentForm.installmentCount} onChange={(e) => setInstallmentForm({ ...installmentForm, installmentCount: Number(e.target.value) })} />
                          <input className="ui-input" type="date" value={installmentForm.purchaseDate} onChange={(e) => setInstallmentForm({ ...installmentForm, purchaseDate: e.target.value })} />
                          <input className="ui-input" type="date" value={installmentForm.firstInstallmentDate} onChange={(e) => setInstallmentForm({ ...installmentForm, firstInstallmentDate: e.target.value })} />
                          <input className="ui-input xl:col-span-2" placeholder={t("description")} value={installmentForm.description} onChange={(e) => setInstallmentForm({ ...installmentForm, description: e.target.value })} />
                        </TransactionForm>
                      )}
                      </div>
                    </div>
                  )}

                  {activeTab === "installments" && <InstallmentPanel detail={detail} onPostInstallment={postInstallment} />}
                </div>
              </div>
            ) : (
              <EmptyState title={t("noCreditCards")} />
            )}
        </section>
      </section>

      {!isCardModalOpen && <button type="button" className="game-floating-add" aria-label={t("addCreditCard")} title={t("addCreditCard")} onClick={openCreateCardModal}>+</button>}

      {isCardModalOpen && (
        <div className="game-dialog-backdrop">
          <GameWindow title={editingId ? t("editCreditCard") : t("addCreditCard")} description={t("creditCardSetup")} className="game-dialog" onRequestClose={closeCardModal} closeLabel={t("close")}>
            <CreditCardSetupForm
              cardForm={cardForm}
              editingId={editingId}
              availableCreditCardAccounts={availableCreditCardAccounts}
              activePaymentAccounts={activePaymentAccounts}
              onSubmit={submitCard}
              onChange={setCardForm}
              onCancel={closeCardModal}
            />
          </GameWindow>
        </div>
      )}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <p className="flex justify-between gap-3"><span className="text-muted">{label}</span><span className="font-semibold">{value}</span></p>;
}

function Panel({ title, children, variant = "panel" }: { title: string; children: React.ReactNode; variant?: "panel" | "plain" }) {
  return <section className={variant === "plain" ? "credit-card-definition-panel" : "game-panel"}><h2 className="mb-3 font-bold">{title}</h2><div className="grid gap-2 text-sm">{children}</div></section>;
}

function TransactionForm({ title, selectedCard, onSubmit, onClear, actionLabel, preview, children }: { title: string; selectedCard: CreditCardDto; onSubmit: (event: FormEvent) => void; onClear: () => void; actionLabel: string; preview?: React.ReactNode; children: React.ReactNode }) {
  return (
    <form onSubmit={onSubmit} className="game-panel grid gap-4">
      <div className="flex flex-col gap-1 border-b border-border/55 pb-3">
        <h2 className="font-bold">{title}</h2>
        <p className="text-xs text-muted">選取卡片：{selectedCard.accountName} · {cardMeta(selectedCard)}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
      {preview}
      <div className="flex flex-wrap justify-end gap-2 border-t border-border/55 pt-3">
        <Button type="button" variant="outline" onClick={onClear}>清除</Button>
        <Button type="submit" className="min-w-32">{actionLabel}</Button>
      </div>
    </form>
  );
}

function MoneyInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <input className="ui-input" placeholder={t("amount")} type="number" min="0" step="0.01" value={value} onChange={(e) => onChange(e.target.value)} />;
}

function CreditUtilization({ card, className = "", compact = false }: { card: CreditCardDto; className?: string; compact?: boolean }) {
  const percent = creditUtilizationPercent(card);
  const limit = card.creditLimit;
  return (
    <div className={className}>
      <GameProgress value={percent} label={t("creditUtilization")} />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        {!compact && <span>{t("used")}：{money(card.outstandingAmount, card.currencyCode)}{limit == null ? "" : ` / ${money(limit, card.currencyCode)}`}</span>}
        {compact && <span>{t("creditUtilization")}</span>}
        <span className="font-semibold text-primary">{percent.toFixed(compact ? 1 : 2)}%</span>
      </div>
    </div>
  );
}

function CreditCardSummary({ summary, compact = false }: { summary: CreditCardDto; compact?: boolean }) {
  const available = baseAvailableCredit(summary);
  const backendAvailable = summary.availableCredit;
  return (
    <div className="mt-4 grid gap-4">
      <CreditUtilization card={summary} />
      <AetherSummaryGrid className="credit-card-primary-metrics">
        <AetherMetric label={t("outstanding")} value={money(summary.outstandingAmount, summary.currencyCode)} tone="primary" />
        <AetherMetric label={t("billedOutstanding")} value={money(billedOutstanding(summary), summary.currencyCode)} hint={t("billedOutstandingHelp")} tone="warning" />
        <AetherMetric label={t("unbilledAmount")} value={money(unbilledAmount(summary), summary.currencyCode)} hint={t("unbilledAmountHelp")} />
      </AetherSummaryGrid>
      <div className="credit-card-definition-panel">
        <Row label={t("creditLimit")} value={summary.creditLimit == null ? "-" : money(summary.creditLimit, summary.currencyCode)} />
        <Row label={t("availableCredit")} value={available == null ? "-" : money(available, summary.currencyCode)} />
        <Row label={t("creditUtilization")} value={`${creditUtilizationPercent(summary).toFixed(2)}%`} />
        <Row label={t("nextClosing")} value={formatDate(summary.nextClosingDate)} />
        <Row label={t("nextDue")} value={formatDate(summary.nextPaymentDueDate)} />
        <Row label={t("latestStatementAmount")} value={money(summary.latestStatementAmount ?? billedOutstanding(summary), summary.currencyCode)} />
        {summary.creditBalance > 0 && <Row label={t("creditBalance")} value={money(summary.creditBalance, summary.currencyCode)} />}
        {summary.creditBalance > 0 && backendAvailable != null && <Row label={t("availableCreditIncludingBalance")} value={money(backendAvailable, summary.currencyCode)} />}
      </div>
      {!compact && <AetherSummaryGrid>
        <AetherMetric label={t("statementCharges")} value={money(summary.statementCharges, summary.currencyCode)} />
        <AetherMetric label={t("statementCredits")} value={money(summary.statementCredits, summary.currencyCode)} />
        <AetherMetric label={t("statementNet")} value={money(summary.estimatedStatementNet, summary.currencyCode)} />
      </AetherSummaryGrid>}
      {compact && <div className="credit-card-period-strip">
        <Row label={t("statementCharges")} value={money(summary.statementCharges, summary.currencyCode)} />
        <Row label={t("statementCredits")} value={money(summary.statementCredits, summary.currencyCode)} />
        <Row label={t("statementNet")} value={money(summary.estimatedStatementNet, summary.currencyCode)} />
      </div>}
    </div>
  );
}

function OperationPreview({ rows, note, actions }: { rows: Array<[string, string]>; note: string; actions?: React.ReactNode }) {
  return (
    <div className="credit-card-operation-preview">
      <div className="grid gap-2">
        {rows.map(([label, value]) => <Row key={label} label={label} value={value} />)}
      </div>
      {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
      <p className="mt-3 text-xs text-muted">{note}</p>
    </div>
  );
}

function CreditCardSetupForm({
  cardForm,
  editingId,
  availableCreditCardAccounts,
  activePaymentAccounts,
  onSubmit,
  onChange,
  onCancel
}: {
  cardForm: typeof emptyCard;
  editingId: string | null;
  availableCreditCardAccounts: AccountDto[];
  activePaymentAccounts: AccountDto[];
  onSubmit: (event: FormEvent) => void;
  onChange: (form: typeof emptyCard) => void;
  onCancel: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="game-inspect-panel">
        <div className="game-inspect-header">
          <div className="game-slot game-slot-sm">CR</div>
          <div>
            <h3 className="font-bold">{editingId ? t("editCreditCard") : t("addCreditCard")}</h3>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">CARD SETUP</p>
          </div>
        </div>
        <div className="game-inspect-body grid gap-3 md:grid-cols-2">
          <select className="ui-input md:col-span-2" value={cardForm.accountId} onChange={(e) => onChange({ ...cardForm, accountId: e.target.value })}>
            <option value="">{t("createCreditCardAccount")}</option>
            {availableCreditCardAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
          {!cardForm.accountId && <input className="ui-input md:col-span-2" placeholder={t("accountName")} value={cardForm.accountName} onChange={(e) => onChange({ ...cardForm, accountName: e.target.value })} />}
          <input className="ui-input" placeholder={t("issuer")} value={cardForm.issuerName} onChange={(e) => onChange({ ...cardForm, issuerName: e.target.value })} />
          <input className="ui-input" placeholder={t("cardName")} value={cardForm.cardName} onChange={(e) => onChange({ ...cardForm, cardName: e.target.value })} />
          <input className="ui-input" placeholder={t("lastFour")} maxLength={4} value={cardForm.lastFourDigits} onChange={(e) => onChange({ ...cardForm, lastFourDigits: e.target.value.replace(/\D/g, "") })} />
          <input className="ui-input" placeholder={t("creditLimit")} type="number" min="0" step="0.01" value={cardForm.creditLimit} onChange={(e) => onChange({ ...cardForm, creditLimit: e.target.value })} />
          <input className="ui-input" placeholder={t("closingDay")} type="number" min="1" max="31" value={cardForm.statementClosingDay} onChange={(e) => onChange({ ...cardForm, statementClosingDay: Number(e.target.value) })} />
          <input className="ui-input" placeholder={t("dueDay")} type="number" min="1" max="31" value={cardForm.paymentDueDay} onChange={(e) => onChange({ ...cardForm, paymentDueDay: Number(e.target.value) })} />
          <select className="ui-input md:col-span-2" value={cardForm.paymentAccountId} onChange={(e) => onChange({ ...cardForm, paymentAccountId: e.target.value })}>
            <option value="">{t("noDefaultPaymentAccount")}</option>
            {activePaymentAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>{t("cancel")}</Button>
        <Button type="submit">{editingId ? t("update") : t("add")}</Button>
      </div>
    </form>
  );
}

function InstallmentPanel({ detail, onPostInstallment }: { detail: CreditCardDetailDto; onPostInstallment: (planId: string, itemId: string) => void }) {
  return (
    <Panel title={t("installments")}>
      {detail.installmentPlans.length === 0 ? (
        <p className="text-sm text-muted">{t("noInstallments")}</p>
      ) : (
        <div className="grid gap-3">
          {detail.installmentPlans.map((plan) => (
            <div key={plan.id} className="rounded-ui border border-border/55 bg-surface-muted/30 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold">{plan.merchant}</p>
                  <p className="text-xs text-muted">{installmentStatusLabels[plan.status] ?? plan.status}</p>
                </div>
                <strong>{money(plan.remainingCommitmentAmount, detail.summary.currencyCode)}</strong>
              </div>
              <div className="mt-3 grid gap-2">
                {plan.scheduleItems.map((item) => (
                  <div key={item.id} className="grid gap-2 rounded-ui border border-border/40 bg-background/20 p-2 text-xs text-muted sm:grid-cols-[1fr_auto] sm:items-center">
                    <span>{item.installmentNumber}. {formatDate(item.dueDate)} / {money(item.amount, detail.summary.currencyCode)} / {installmentStatusLabels[item.status] ?? item.status}</span>
                    <Button type="button" variant="outline" size="sm" disabled={item.status !== "Pending"} onClick={() => onPostInstallment(plan.id, item.id)}>{t("post")}</Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function StatementWorkspacePanel({ batch, history, categories, defaultCategoryId, isBusy, file, password, onDefaultCategoryChange, onFileChange, onPasswordChange, onParse, onSelectBatch, onUpdateRow, onRetryFailed, onPost, onDiscard }: {
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
  const postedRows = batch?.rows.filter((row) => row.reviewStatus === "Posted").length ?? 0;
  const ignoredRows = batch?.rows.filter((row) => row.reviewStatus === "Ignored").length ?? 0;
  const blockedRows = batch?.rows.filter((row) => row.reviewStatus === "New" || row.matchStatus !== "New" || row.type === "Unknown").length ?? 0;
  const rowsMissingPostCategory = batch?.rows.filter((row) => row.reviewStatus === "ReadyToPost" && statementRowNeedsExpenseCategory(row.type) && !row.categoryId).length ?? 0;
  const totalRows = batch?.rows.length ?? 0;
  const importProgress = totalRows > 0 ? (postedRows / totalRows) * 100 : 0;
  const postedTotal = batch?.rows.reduce((sum, row) => row.reviewStatus === "Posted" ? sum + row.amount : sum, 0) ?? 0;
  const [isImportPanelOpen, setIsImportPanelOpen] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | StatementImportReviewStatus>("All");
  const [typeFilter, setTypeFilter] = useState<"All" | StatementImportRowType>("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [isReconciliationOpen, setIsReconciliationOpen] = useState(false);

  useEffect(() => {
    setSelectedRowId(batch?.rows[0]?.id ?? null);
  }, [batch?.id]);

  async function handleImportSubmit(event: FormEvent) {
    await Promise.resolve(onParse(event));
    setIsImportPanelOpen(false);
  }

  const selectedRow = batch?.rows.find((row) => row.id === selectedRowId) ?? batch?.rows[0] ?? null;
  const categoryById = new Map(categories.map((category) => [category.id, category.name]));
  const reconciliationDifference = batch?.statementAmount == null ? null : batch.statementAmount - postedTotal;
  const filteredRows = batch?.rows.filter((row) => {
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery = normalizedQuery.length === 0
      || row.normalizedDescription.toLowerCase().includes(normalizedQuery)
      || row.rawDescription.toLowerCase().includes(normalizedQuery)
      || (row.rawText ?? "").toLowerCase().includes(normalizedQuery);
    const matchesStatus = statusFilter === "All" || row.reviewStatus === statusFilter;
    const matchesType = typeFilter === "All" || row.type === typeFilter;
    const matchesCategory = categoryFilter === "All" || (categoryFilter === "Uncategorized" ? !row.categoryId : row.categoryId === categoryFilter);
    return matchesQuery && matchesStatus && matchesType && matchesCategory;
  }) ?? [];

  return (
    <section className="statement-target-workspace">
      <div className="statement-target-summary">
        <label>
          <span>帳單選擇</span>
          {history.length > 0 ? (
            <select className="ui-input" value={batch?.id ?? ""} onChange={(event) => {
              const nextBatch = history.find((item) => item.id === event.target.value);
              if (nextBatch) onSelectBatch(nextBatch);
            }}>
              {history.map((item) => <option key={item.id} value={item.id}>{item.provider} · {item.statementPeriodEnd ? formatDate(item.statementPeriodEnd).slice(0, 7) : item.originalFileName} · {item.rows.length} 筆</option>)}
            </select>
          ) : (
            <strong>{t("noStatementParsed")}</strong>
          )}
        </label>
        <div className="statement-target-summary-cell statement-target-summary-cell-primary"><span>帳單金額</span><strong>{batch?.statementAmount == null ? "-" : money(batch.statementAmount)}</strong></div>
        <div className="statement-target-summary-cell"><span>繳款日</span><strong>{batch?.paymentDueDate ? formatDate(batch.paymentDueDate) : "-"}</strong></div>
        <div className="statement-target-summary-cell statement-target-summary-cell-success"><span>已入帳</span><strong>{postedRows}</strong></div>
        <div className="statement-target-summary-cell statement-target-summary-cell-warning"><span>待入帳</span><strong>{readyRows}</strong></div>
        <div className="statement-target-summary-cell statement-target-summary-cell-danger"><span>失敗</span><strong>{failedRows}</strong></div>
        <div className="statement-target-progress"><span>處理進度</span><strong>{totalRows > 0 ? `${Math.round(importProgress)}%` : "-"}</strong><GameProgress value={importProgress} label="入帳進度" /></div>
      </div>

      {!batch && (
        <div className="statement-import-empty-workspace">
          <EmptyState title={t("noStatementParsed")} description={t("noStatementParsedDescription")} />
          <Button type="button" onClick={() => setIsImportPanelOpen(true)}>匯入新帳單</Button>
        </div>
      )}

      {isImportPanelOpen && (
        <div className="statement-dialog-backdrop" role="presentation" onMouseDown={() => setIsImportPanelOpen(false)}>
          <form onSubmit={handleImportSubmit} className="statement-upload-dialog" role="dialog" aria-modal="true" aria-labelledby="statement-import-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="statement-dialog-header">
              <div>
                <p className="statement-target-kicker">IMPORT PDF</p>
                <h3 id="statement-import-title">匯入新帳單</h3>
                <p>{t("passwordRequestOnly")}</p>
              </div>
            </div>
            <div className="statement-upload-stack">
              <label className="ui-label">銀行<select className="ui-input" defaultValue="auto" aria-label="銀行"><option value="auto">自動辨識（Richart、玉山）</option></select></label>
              <label className="ui-label">PDF 檔案<input className="ui-input" type="file" accept="application/pdf,.pdf" onChange={(event) => onFileChange(event.target.files?.[0] ?? null)} /></label>
              <label className="ui-label">{t("password")}<input className="ui-input" type="password" autoComplete="off" value={password} onChange={(event) => onPasswordChange(event.target.value)} /></label>
              <p className="text-xs text-muted">{file ? `${file.name} / ${Math.ceil(file.size / 1024)} KB` : t("noFileSelected")}</p>
            </div>
            <div className="statement-dialog-footer">
              <Button type="button" variant="ghost" onClick={() => setIsImportPanelOpen(false)}>取消</Button>
              <Button type="submit" isLoading={isBusy}>{t("parseStatement")}</Button>
            </div>
          </form>
        </div>
      )}

      {batch && (
        <>
          <div className="statement-target-grid">
            <main className="statement-target-main">
              <div className="statement-target-toolbar">
                <input className="ui-input" placeholder="搜尋商家、原始文字、金額..." value={query} onChange={(event) => setQuery(event.target.value)} />
                <select className="ui-input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "All" | StatementImportReviewStatus)}>
                  <option value="All">全部狀態</option>
                  <option value="New">待確認</option>
                  <option value="ReadyToPost">待入帳</option>
                  <option value="Posted">已入帳</option>
                  <option value="Ignored">已略過</option>
                  <option value="Failed">失敗</option>
                </select>
                <select className="ui-input" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as "All" | StatementImportRowType)}>
                  <option value="All">全部類型</option>
                  {statementRowTypeOptions.map((type) => <option key={type} value={type}>{statementImportRowTypeLabels[type]}</option>)}
                </select>
                <select className="ui-input" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                  <option value="All">全部分類</option>
                  <option value="Uncategorized">未分類</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
                <label className="ui-label statement-target-default-category"><span>{t("defaultExpenseCategory")}</span><select className="ui-input" value={defaultCategoryId} onChange={(event) => onDefaultCategoryChange(event.target.value)}><option value="">{t("chooseWhenPostingPurchases")}</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
                <button type="button" className="statement-target-ghost-button" onClick={() => setIsImportPanelOpen(true)}>匯入新帳單</button>
                <button type="button" className="statement-target-ghost-button" onClick={() => { setQuery(""); setStatusFilter("All"); setTypeFilter("All"); setCategoryFilter("All"); }}>重設篩選</button>
                <button type="button" className="statement-target-ghost-button" disabled={isBusy || postedRows > 0} onClick={onDiscard}>{t("discard")}</button>
                <button type="button" className="statement-target-ghost-button" disabled={isBusy || failedRows === 0} onClick={onRetryFailed}>{t("retryFailedRows")}</button>
                <button type="button" className="statement-target-ghost-button" disabled={isBusy || readyRows === 0 || (rowsMissingPostCategory > 0 && !defaultCategoryId)} onClick={onPost}>{t("postReadyRows")}</button>
              </div>
              <div className="statement-target-table-shell">
                <div className="statement-target-table">
                  <div className="statement-target-table-head"><span></span><span>日期</span><span>商家 / 店名</span><span>分類</span><span>類型</span><span>金額</span><span>狀態</span><span></span></div>
                  <div className="statement-target-table-body">
                    {filteredRows.map((row) => {
                      const isSelected = selectedRow?.id === row.id;
                      return (
                        <button key={row.id} type="button" className={`statement-target-row ${isSelected ? "statement-target-row-selected" : ""}`} onClick={() => setSelectedRowId(row.id)}>
                          <span className="statement-target-checkbox" aria-hidden="true"></span>
                          <span className="statement-target-date"><strong>{row.transactionDate ? formatDate(row.transactionDate).slice(5) : "-"}</strong><small>#{row.sourceRowNumber}</small></span>
                          <span className="statement-target-merchant"><strong>{row.normalizedDescription}</strong><small>{row.rawDescription}</small></span>
                          <span className="statement-target-muted">{row.categoryId ? categoryById.get(row.categoryId) ?? "已分類" : "未分類"}</span>
                          <span className="statement-target-muted">{statementImportRowTypeLabels[row.type]}</span>
                          <span className="statement-target-amount">{money(row.amount, row.currency)}</span>
                          <span className={`statement-status-badge ${statementStatusTone(row)}`}>{statementImportReviewStatusLabels[row.reviewStatus]}</span>
                          <span className="statement-target-chevron">›</span>
                        </button>
                      );
                    })}
                    {filteredRows.length === 0 && <div className="statement-target-empty-row">沒有符合條件的帳單明細。</div>}
                  </div>
                </div>
                <div className="statement-target-pagination"><span>顯示 {filteredRows.length} / {totalRows} 筆</span><span>{batch.originalFileName}</span></div>
              </div>
            </main>
            <StatementTargetInspector row={selectedRow} categories={categories} onUpdate={onUpdateRow} />
          </div>
          <footer className="statement-target-bottom-bar" aria-label="帳單核對摘要">
            <div className="statement-target-bottom-item"><small>帳單金額</small><strong>{batch.statementAmount == null ? "-" : money(batch.statementAmount)}</strong></div>
            <div className="statement-target-bottom-item"><small>入帳合計</small><strong>{money(postedTotal)}</strong></div>
            <div className="statement-target-bottom-item"><small>已入帳</small><strong>{postedRows}</strong></div>
            <div className="statement-target-bottom-item"><small>略過</small><strong>{ignoredRows}</strong></div>
            <div className="statement-target-bottom-item"><small>待確認</small><strong>{blockedRows}</strong></div>
            <div className="statement-target-bottom-item"><small>差額待核對</small><strong>{reconciliationDifference == null ? "—" : money(reconciliationDifference)}</strong></div>
            <button type="button" className="statement-summary-link" onClick={() => setIsReconciliationOpen(true)}>查看核對摘要</button>
          </footer>
          {isReconciliationOpen && (
            <div className="statement-dialog-backdrop" role="presentation" onMouseDown={() => setIsReconciliationOpen(false)}>
              <div className="statement-upload-dialog" role="dialog" aria-modal="true" aria-labelledby="statement-reconciliation-title" onMouseDown={(event) => event.stopPropagation()}>
                <div className="statement-dialog-header">
                  <div>
                    <p className="statement-target-kicker">RECONCILIATION</p>
                    <h3 id="statement-reconciliation-title">核對摘要</h3>
                    <p>{batch.originalFileName}</p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setIsReconciliationOpen(false)}>關閉</Button>
                </div>
                <div className="statement-summary-dialog-body">
                  <Row label="帳單金額" value={batch.statementAmount == null ? "-" : money(batch.statementAmount)} />
                  <Row label="入帳合計" value={money(postedTotal)} />
                  <Row label="已入帳" value={`${postedRows}`} />
                  <Row label="略過" value={`${ignoredRows}`} />
                  <Row label="待確認" value={`${blockedRows}`} />
                  <Row label="差額待核對" value={reconciliationDifference == null ? "—" : money(reconciliationDifference)} />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function statementStatusTone(row: StatementImportRowDto) {
  if (row.reviewStatus === "Posted") return "statement-status-badge-success";
  if (row.reviewStatus === "Failed") return "statement-status-badge-danger";
  if (row.reviewStatus === "Ignored") return "statement-status-badge-warning";
  return "statement-status-badge-neutral";
}

function StatementTargetInspector({ row, categories, onUpdate }: { row: StatementImportRowDto | null; categories: CategoryDto[]; onUpdate: (rowId: string, update: StatementRowUpdate) => void }) {
  const [categoryId, setCategoryId] = useState(row?.categoryId ?? "");
  const [amount, setAmount] = useState(row && row.amount > 0 ? String(row.amount) : "");
  const [rowType, setRowType] = useState<StatementImportRowType>(row?.type ?? "Unknown");

  useEffect(() => {
    setCategoryId(row?.categoryId ?? "");
    setAmount(row && row.amount > 0 ? String(row.amount) : "");
    setRowType(row?.type ?? "Unknown");
  }, [row?.id, row?.categoryId, row?.amount, row?.type]);

  if (!row) {
    return <aside className="statement-target-inspector statement-target-inspector-empty"><h3>尚未選取明細</h3><p>請從左側交易列表選擇一筆帳單明細。</p></aside>;
  }

  const parsedAmount = Number(amount);
  const editable = row.reviewStatus !== "Posted";
  const canMarkReady = editable && Number.isFinite(parsedAmount) && parsedAmount > 0 && rowType !== "Unknown";

  return (
    <aside className="statement-target-inspector">
      <div className="statement-target-inspector-hero">
        <div className="statement-target-inspector-meta"><span>{row.transactionDate ? formatDate(row.transactionDate) : "-"}</span><span>#{row.sourceRowNumber}</span></div>
        <h3>{row.normalizedDescription}</h3>
        <strong>{money(row.amount, row.currency)}</strong>
        <p>入帳日 {row.postingDate ? formatDate(row.postingDate) : "-"}</p>
      </div>
      <div className="statement-target-inspector-section">
        <div className="statement-target-section-title"><h4>基本資訊</h4><span className={`statement-status-badge ${statementStatusTone(row)}`}>{statementImportReviewStatusLabels[row.reviewStatus]}</span></div>
        <div className="statement-target-kv">
          <Row label="商家 / 對象" value={row.normalizedDescription} />
          <Row label="原始描述" value={row.rawDescription} />
          <Row label="交易日期" value={row.transactionDate ? formatDate(row.transactionDate) : "-"} />
          <Row label="入帳日期" value={row.postingDate ? formatDate(row.postingDate) : "-"} />
          <Row label="匹配狀態" value={statementImportMatchStatusLabels[row.matchStatus]} />
        </div>
      </div>
      <div className="statement-target-inspector-section">
        <div className="statement-target-section-title"><h4>審核操作</h4></div>
        <div className="statement-target-edit-grid">
          <select className="ui-input" value={rowType} disabled={!editable} onChange={(event) => setRowType(event.target.value as StatementImportRowType)}>{statementRowTypeOptions.map((type) => <option key={type} value={type}>{statementImportRowTypeLabels[type]}</option>)}</select>
          <input className="ui-input" type="number" min="0.01" step="0.01" value={amount} disabled={!editable} onChange={(event) => setAmount(event.target.value)} />
          <select className="ui-input" value={categoryId} disabled={!editable} onChange={(event) => setCategoryId(event.target.value)}><option value="">{t("noCategory")}</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
        </div>
      </div>
      <details className="statement-target-technical">
        <summary>Technical Data</summary>
        <div className="statement-target-kv">
          <Row label="Original Text" value={row.rawText ?? "-"} />
          <Row label="Parser Row" value={`${row.sourceRowNumber}`} />
          <Row label="Foreign Amount" value={row.foreignAmount == null ? "-" : `${row.foreignAmount} ${row.foreignCurrency ?? ""}`} />
          <Row label="Installment Info" value={row.isInstallment ? `${row.installmentCurrentNumber ?? "-"} / ${row.installmentTotalNumber ?? "-"}` : "-"} />
        </div>
      </details>
      <div className="statement-target-inspector-footer">
        <Button type="button" variant="ghost" size="sm" disabled={!editable} onClick={() => onUpdate(row.id, { reviewStatus: "Ignored", categoryId: categoryId || null, amount: Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : undefined, type: rowType })}>{t("ignore")}</Button>
        <Button type="button" size="sm" disabled={!canMarkReady} onClick={() => onUpdate(row.id, { reviewStatus: "ReadyToPost", categoryId: categoryId || null, amount: parsedAmount, type: rowType })}>{t("saveReady")}</Button>
      </div>
    </aside>
  );
}
