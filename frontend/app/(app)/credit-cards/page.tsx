"use client";

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiFetch, money, problemMessage, type AccountDto, type CategoryDto, type CreditCardDetailDto, type CreditCardDto } from "@/lib/api-client";
import { formatDate, todayInputValue } from "@/lib/formatters";
import { installmentStatusLabels, transactionTypeLabels } from "@/lib/labels";
import { useAuth } from "../../auth-context";

const emptyCard = { accountId: "", accountName: "", currencyCode: "TWD", issuerName: "", cardName: "", lastFourDigits: "", creditLimit: "", statementClosingDay: 2, paymentDueDay: 20, paymentAccountId: "" };
const emptyPurchase = { creditCardAccountId: "", categoryId: "", amount: "", purchaseDate: todayInputValue(), postedDate: "", merchant: "", note: "" };
const emptyRefund = { creditCardAccountId: "", amount: "", refundDate: todayInputValue(), originalTransactionId: "", note: "" };
const emptyPayment = { creditCardAccountId: "", paymentAccountId: "", amount: "", paymentDate: todayInputValue(), note: "" };
const emptyInstallment = { creditCardAccountId: "", merchant: "", description: "", purchaseDate: todayInputValue(), originalAmount: "", installmentCount: 3, firstInstallmentDate: todayInputValue() };

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
      <header>
        <h1 className="text-3xl font-semibold">信用卡</h1>
        <p className="text-stone-600">未清償金額、溢繳餘額與可用額度都由已入帳分錄計算。</p>
      </header>

      {error && <p className="rounded border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

      <div className="grid gap-3 lg:grid-cols-3">
        {cards.map((card) => (
          <button key={card.accountId} className="rounded border border-stone-300 bg-white p-4 text-left" onClick={async () => { selectDefaults(card.accountId); await load(card.accountId); }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{card.accountName}</h2>
                <p className="text-sm text-stone-600">{card.issuerName} / {card.cardName}{card.lastFourDigits ? ` / ${card.lastFourDigits}` : ""}</p>
              </div>
              <span className="rounded border border-stone-300 px-2 py-1 text-xs">{Math.round((card.creditUtilization ?? 0) * 100)}%</span>
            </div>
            <dl className="mt-4 grid gap-2 text-sm">
              <Row label="未清償金額" value={money(card.outstandingAmount, card.currencyCode)} />
              <Row label="溢繳餘額" value={money(card.creditBalance, card.currencyCode)} />
              <Row label="信用額度" value={card.creditLimit == null ? "-" : money(card.creditLimit, card.currencyCode)} />
              <Row label="可用額度" value={card.availableCredit == null ? "-" : money(card.availableCredit, card.currencyCode)} />
              <Row label="下次結帳" value={formatDate(card.nextClosingDate)} />
              <Row label="下次繳款" value={formatDate(card.nextPaymentDueDate)} />
            </dl>
          </button>
        ))}
        {!isLoading && cards.length === 0 && <p className="rounded border border-stone-300 bg-white p-5 text-stone-600 lg:col-span-3">尚未建立信用卡。</p>}
      </div>

      <form onSubmit={submitCard} className="grid gap-3 rounded border border-stone-300 bg-white p-4 md:grid-cols-4">
        <h2 className="md:col-span-4 font-semibold">{editingId ? "編輯信用卡" : "新增信用卡"}</h2>
        <select className="rounded border px-3 py-2" value={cardForm.accountId} onChange={(e) => setCardForm({ ...cardForm, accountId: e.target.value })}>
          <option value="">建立新的信用卡帳戶</option>
          {availableCreditCardAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
        </select>
        {!cardForm.accountId && <input className="rounded border px-3 py-2" placeholder="帳戶名稱" value={cardForm.accountName} onChange={(e) => setCardForm({ ...cardForm, accountName: e.target.value })} />}
        <input className="rounded border px-3 py-2" placeholder="發卡機構" value={cardForm.issuerName} onChange={(e) => setCardForm({ ...cardForm, issuerName: e.target.value })} />
        <input className="rounded border px-3 py-2" placeholder="卡片名稱" value={cardForm.cardName} onChange={(e) => setCardForm({ ...cardForm, cardName: e.target.value })} />
        <input className="rounded border px-3 py-2" placeholder="末四碼" maxLength={4} value={cardForm.lastFourDigits} onChange={(e) => setCardForm({ ...cardForm, lastFourDigits: e.target.value.replace(/\D/g, "") })} />
        <input className="rounded border px-3 py-2" placeholder="信用額度" type="number" min="0" step="0.01" value={cardForm.creditLimit} onChange={(e) => setCardForm({ ...cardForm, creditLimit: e.target.value })} />
        <input className="rounded border px-3 py-2" placeholder="結帳日" type="number" min="1" max="31" value={cardForm.statementClosingDay} onChange={(e) => setCardForm({ ...cardForm, statementClosingDay: Number(e.target.value) })} />
        <input className="rounded border px-3 py-2" placeholder="繳款日" type="number" min="1" max="31" value={cardForm.paymentDueDay} onChange={(e) => setCardForm({ ...cardForm, paymentDueDay: Number(e.target.value) })} />
        <select className="rounded border px-3 py-2" value={cardForm.paymentAccountId} onChange={(e) => setCardForm({ ...cardForm, paymentAccountId: e.target.value })}>
          <option value="">不設定預設付款帳戶</option>
          {activePaymentAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
        </select>
        <button className="rounded bg-stone-950 px-4 py-2 text-white">{editingId ? "更新" : "新增"}</button>
      </form>

      {detail && (
        <section className="grid gap-4">
          <div className="rounded border border-stone-300 bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">{detail.summary.accountName}</h2>
                <p className="text-sm text-stone-600">{formatDate(detail.summary.currentStatementPeriod.startDate)} 至 {formatDate(detail.summary.currentStatementPeriod.endDate)}</p>
              </div>
              <button className="rounded border px-3 py-1 text-sm" onClick={() => { setEditingId(detail.summary.accountId); setCardForm({ accountId: detail.summary.accountId, accountName: detail.summary.accountName, currencyCode: detail.summary.currencyCode, issuerName: detail.summary.issuerName, cardName: detail.summary.cardName, lastFourDigits: detail.summary.lastFourDigits ?? "", creditLimit: detail.summary.creditLimit?.toString() ?? "", statementClosingDay: detail.summary.statementClosingDay, paymentDueDay: detail.summary.paymentDueDay, paymentAccountId: detail.summary.paymentAccountId ?? "" }); }}>編輯設定</button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Metric label="未清償金額" value={money(detail.summary.outstandingAmount, detail.summary.currencyCode)} />
              <Metric label="溢繳餘額" value={money(detail.summary.creditBalance, detail.summary.currencyCode)} />
              <Metric label="預估應繳" value={money(detail.summary.estimatedAmountDue, detail.summary.currencyCode)} />
              <Metric label="本期消費" value={money(detail.summary.statementCharges, detail.summary.currencyCode)} />
              <Metric label="本期折抵 / 退款" value={money(detail.summary.statementCredits, detail.summary.currencyCode)} />
              <Metric label="本期淨額" value={money(detail.summary.estimatedStatementNet, detail.summary.currencyCode)} />
              <Metric label="分期未來承諾" value={money(detail.summary.remainingInstallmentCommitment, detail.summary.currencyCode)} />
              <Metric label="可用額度" value={detail.summary.availableCredit == null ? "-" : money(detail.summary.availableCredit, detail.summary.currencyCode)} />
              <Metric label="下次結帳" value={formatDate(detail.summary.nextClosingDate)} />
              <Metric label="下次繳款" value={formatDate(detail.summary.nextPaymentDueDate)} />
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <TransactionForm title="信用卡消費" onSubmit={submitPurchase}>
              <CreditCardSelect value={purchaseForm.creditCardAccountId} cards={cards} onChange={(value) => setPurchaseForm({ ...purchaseForm, creditCardAccountId: value })} />
              <select className="rounded border px-3 py-2" value={purchaseForm.categoryId} onChange={(e) => setPurchaseForm({ ...purchaseForm, categoryId: e.target.value })}><option value="">支出分類</option>{expenseCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
              <MoneyInput value={purchaseForm.amount} onChange={(value) => setPurchaseForm({ ...purchaseForm, amount: value })} />
              <input className="rounded border px-3 py-2" type="date" value={purchaseForm.purchaseDate} onChange={(e) => setPurchaseForm({ ...purchaseForm, purchaseDate: e.target.value })} />
              <input className="rounded border px-3 py-2" type="date" value={purchaseForm.postedDate} onChange={(e) => setPurchaseForm({ ...purchaseForm, postedDate: e.target.value })} />
              <input className="rounded border px-3 py-2" placeholder="商家" value={purchaseForm.merchant} onChange={(e) => setPurchaseForm({ ...purchaseForm, merchant: e.target.value })} />
              <input className="rounded border px-3 py-2 xl:col-span-2" placeholder="備註" value={purchaseForm.note} onChange={(e) => setPurchaseForm({ ...purchaseForm, note: e.target.value })} />
            </TransactionForm>

            <TransactionForm title="信用卡退款" onSubmit={submitRefund}>
              <CreditCardSelect value={refundForm.creditCardAccountId} cards={cards} onChange={(value) => setRefundForm({ ...refundForm, creditCardAccountId: value })} />
              <MoneyInput value={refundForm.amount} onChange={(value) => setRefundForm({ ...refundForm, amount: value })} />
              <input className="rounded border px-3 py-2" type="date" value={refundForm.refundDate} onChange={(e) => setRefundForm({ ...refundForm, refundDate: e.target.value })} />
              <select className="rounded border px-3 py-2" value={refundForm.originalTransactionId} onChange={(e) => setRefundForm({ ...refundForm, originalTransactionId: e.target.value })}><option value="">可選原消費</option>{detail.recentTransactions.filter((t) => t.type === "CreditCardPurchase").map((t) => <option key={t.id} value={t.id}>{formatDate(t.transactionDate)} / {money(t.displayAmount, detail.summary.currencyCode)}</option>)}</select>
              <input className="rounded border px-3 py-2 xl:col-span-2" placeholder="備註" value={refundForm.note} onChange={(e) => setRefundForm({ ...refundForm, note: e.target.value })} />
            </TransactionForm>

            <TransactionForm title="信用卡付款" onSubmit={submitPayment}>
              <CreditCardSelect value={paymentForm.creditCardAccountId} cards={cards} onChange={(value) => setPaymentForm({ ...paymentForm, creditCardAccountId: value })} />
              <select className="rounded border px-3 py-2" value={paymentForm.paymentAccountId} onChange={(e) => setPaymentForm({ ...paymentForm, paymentAccountId: e.target.value })}><option value="">預設付款帳戶</option>{activePaymentAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select>
              <MoneyInput value={paymentForm.amount} onChange={(value) => setPaymentForm({ ...paymentForm, amount: value })} />
              <input className="rounded border px-3 py-2" type="date" value={paymentForm.paymentDate} onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })} />
              <input className="rounded border px-3 py-2 xl:col-span-2" placeholder="備註" value={paymentForm.note} onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })} />
            </TransactionForm>

            <TransactionForm title="分期計畫" onSubmit={submitInstallment}>
              <CreditCardSelect value={installmentForm.creditCardAccountId} cards={cards} onChange={(value) => setInstallmentForm({ ...installmentForm, creditCardAccountId: value })} />
              <input className="rounded border px-3 py-2" placeholder="商家" value={installmentForm.merchant} onChange={(e) => setInstallmentForm({ ...installmentForm, merchant: e.target.value })} />
              <MoneyInput value={installmentForm.originalAmount} onChange={(value) => setInstallmentForm({ ...installmentForm, originalAmount: value })} />
              <input className="rounded border px-3 py-2" type="number" min="1" value={installmentForm.installmentCount} onChange={(e) => setInstallmentForm({ ...installmentForm, installmentCount: Number(e.target.value) })} />
              <input className="rounded border px-3 py-2" type="date" value={installmentForm.purchaseDate} onChange={(e) => setInstallmentForm({ ...installmentForm, purchaseDate: e.target.value })} />
              <input className="rounded border px-3 py-2" type="date" value={installmentForm.firstInstallmentDate} onChange={(e) => setInstallmentForm({ ...installmentForm, firstInstallmentDate: e.target.value })} />
              <input className="rounded border px-3 py-2 xl:col-span-2" placeholder="說明" value={installmentForm.description} onChange={(e) => setInstallmentForm({ ...installmentForm, description: e.target.value })} />
            </TransactionForm>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="近期交易">{detail.recentTransactions.length === 0 ? <p className="text-sm text-stone-600">尚無交易。</p> : detail.recentTransactions.map((transaction) => <Row key={transaction.id} label={`${formatDate(transaction.transactionDate)} ${transactionTypeLabels[transaction.type]}`} value={money(transaction.displayAmount, detail.summary.currencyCode)} />)}</Panel>
            <Panel title="分期">{detail.installmentPlans.length === 0 ? <p className="text-sm text-stone-600">尚無分期計畫。</p> : detail.installmentPlans.map((plan) => <div key={plan.id} className="border-b border-stone-200 py-2 last:border-0"><Row label={`${plan.merchant} / ${installmentStatusLabels[plan.status] ?? plan.status}`} value={money(plan.remainingCommitmentAmount, detail.summary.currencyCode)} /><div className="mt-2 grid gap-1">{plan.scheduleItems.map((item) => <div key={item.id} className="flex items-center justify-between gap-2 text-xs text-stone-600"><span>{item.installmentNumber}. {formatDate(item.dueDate)} / {money(item.amount, detail.summary.currencyCode)} / {installmentStatusLabels[item.status] ?? item.status}</span><button className="rounded border px-2 py-1 disabled:opacity-50" disabled={item.status !== "Pending"} onClick={() => postInstallment(plan.id, item.id)}>入帳</button></div>)}</div></div>)}</Panel>
          </div>
        </section>
      )}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <p className="flex justify-between gap-3"><span className="text-stone-600">{label}</span><span className="font-medium">{value}</span></p>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded border border-stone-200 p-3"><p className="text-sm text-stone-600">{label}</p><p className="mt-1 font-semibold">{value}</p></div>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded border border-stone-300 bg-white p-4"><h2 className="mb-3 font-semibold">{title}</h2><div className="grid gap-2 text-sm">{children}</div></div>;
}

function TransactionForm({ title, onSubmit, children }: { title: string; onSubmit: (event: FormEvent) => void; children: React.ReactNode }) {
  return <form onSubmit={onSubmit} className="grid gap-3 rounded border border-stone-300 bg-white p-4 sm:grid-cols-2"><h2 className="font-semibold sm:col-span-2">{title}</h2>{children}<button className="rounded bg-stone-950 px-4 py-2 text-white sm:col-span-2">儲存</button></form>;
}

function CreditCardSelect({ value, cards, onChange }: { value: string; cards: CreditCardDto[]; onChange: (value: string) => void }) {
  return <select className="rounded border px-3 py-2" value={value} onChange={(e) => onChange(e.target.value)}><option value="">選擇信用卡</option>{cards.map((card) => <option key={card.accountId} value={card.accountId}>{card.accountName}</option>)}</select>;
}

function MoneyInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <input className="rounded border px-3 py-2" placeholder="金額" type="number" min="0" step="0.01" value={value} onChange={(e) => onChange(e.target.value)} />;
}
