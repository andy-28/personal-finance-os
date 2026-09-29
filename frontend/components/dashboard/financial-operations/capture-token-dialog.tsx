"use client";

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { problemMessage, type AccountDto } from "@/lib/api-client";
import { transactionCapturesApi, type CaptureApiTokenDto } from "@/lib/api/transaction-captures";

export function CaptureTokenDialog({ accounts, accessToken, refreshSession, onClose }: { accounts: AccountDto[]; accessToken: string | null; refreshSession: () => Promise<string | null>; onClose: () => void }) {
  const [tokens, setTokens] = useState<CaptureApiTokenDto[]>([]);
  const [name, setName] = useState("My iPhone Shortcut");
  const [plaintext, setPlaintext] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function load() { try { setTokens(await transactionCapturesApi.getTokens(accessToken, refreshSession)); } catch (reason) { setError(problemMessage(reason)); } }
  useEffect(() => { void load(); }, []);
  async function create() { setBusy(true); setError(null); try { const created = await transactionCapturesApi.createToken(accessToken, refreshSession, name); setPlaintext(created.plaintextToken); await load(); } catch (reason) { setError(problemMessage(reason)); } finally { setBusy(false); } }
  async function revoke(id: string) { setBusy(true); setError(null); try { await transactionCapturesApi.revokeToken(accessToken, refreshSession, id); await load(); } catch (reason) { setError(problemMessage(reason)); } finally { setBusy(false); } }
  return <div className="game-dialog-backdrop" role="dialog" aria-modal="true" aria-labelledby="capture-token-dialog-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="game-panel financial-event-dialog capture-token-dialog">
      <div className="financial-event-dialog-head"><div><span>IPHONE SHORTCUT</span><h2 id="capture-token-dialog-title">Capture API Token</h2></div><button type="button" onClick={onClose} aria-label="關閉">×</button></div>
      <p className="capture-token-intro">這是只能建立 Capture 的可撤銷憑證，不能讀取帳戶或建立 Ledger Transaction。</p>
      {error && <div className="financial-ops-alert">{error}</div>}
      {plaintext && <div className="capture-token-once"><strong>只顯示這一次</strong><code>{plaintext}</code><Button size="sm" variant="outline" onClick={() => void navigator.clipboard.writeText(plaintext)}>複製 Token</Button><small>完成 Shortcut 設定前請勿關閉；伺服器只保存 hash。</small></div>}
      <div className="capture-token-create"><label className="ui-label">Token 名稱<input className="ui-input" maxLength={100} value={name} onChange={(event) => setName(event.target.value)} /></label><Button size="sm" isLoading={busy} disabled={!name.trim()} onClick={() => void create()}>建立 Token</Button></div>
      <section className="capture-token-section"><h3>ACTIVE TOKENS</h3>{tokens.filter((token) => !token.revokedAt).length === 0 ? <p>尚未建立 Token。</p> : tokens.filter((token) => !token.revokedAt).map((token) => <div className="capture-token-row" key={token.id}><div><strong>{token.name}</strong><small>建立 {formatDate(token.createdAt)} · {token.lastUsedAt ? `最後使用 ${formatDate(token.lastUsedAt)}` : "尚未使用"}</small></div><Button size="sm" variant="ghost" disabled={busy} onClick={() => void revoke(token.id)}>撤銷</Button></div>)}</section>
      <section className="capture-token-section"><h3>PAYMENT INSTRUMENT IDS</h3><p>在 Shortcut 選單中使用以下既有帳戶 ID。</p>{accounts.filter((account) => !account.isArchived).map((account) => <div className="capture-instrument-row" key={account.id}><strong>{account.name}</strong><code>{account.id}</code></div>)}</section>
      <div className="financial-event-dialog-foot"><span>完整設定步驟請見 docs/ios-shortcut-capture.md</span><div><Button type="button" onClick={onClose}>完成</Button></div></div>
    </div>
  </div>;
}

function formatDate(value: string) { return new Intl.DateTimeFormat("zh-TW", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
