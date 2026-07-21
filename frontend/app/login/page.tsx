"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";
import { useAuth } from "../auth-context";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      router.replace("/accounts");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登入失敗，請稍後再試。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 py-10">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-ui border bg-surface p-6 shadow-panel">
        <p className="text-sm font-medium text-muted">PersonalFinanceOS</p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">登入</h1>
        <p className="mt-1 text-sm text-muted">管理你的帳戶、交易與信用卡待辦。</p>
        <label className="ui-label mt-6">電子郵件<input className="ui-input" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="ui-label mt-4">密碼<input className="ui-input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {error && <div className="mt-4"><ErrorState message={error} /></div>}
        <Button type="submit" className="mt-5 w-full" isLoading={isSubmitting}>{isSubmitting ? "登入中..." : "登入"}</Button>
        <p className="mt-4 text-sm text-muted">還沒有帳號？ <Link className="font-medium text-foreground underline" href="/register">建立帳號</Link></p>
      </form>
    </main>
  );
}
