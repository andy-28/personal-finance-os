"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";
import { useAuth } from "../auth-context";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!email.includes("@")) return setError("請輸入有效的電子郵件。");
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) return setError("密碼至少 8 碼，並包含大小寫英文字母與數字。");
    if (password !== confirmPassword) return setError("兩次輸入的密碼不一致。");
    setIsSubmitting(true);
    try {
      await register(displayName, email, password);
      router.replace("/accounts");
    } catch (err) {
      setError(err instanceof Error ? err.message : "建立帳號失敗，請稍後再試。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 py-10">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-ui border bg-surface p-6 shadow-panel">
        <p className="text-sm font-medium text-muted">PersonalFinanceOS</p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">建立帳號</h1>
        <p className="mt-1 text-sm text-muted">所有財務資料會依使用者隔離保存。</p>
        <label className="ui-label mt-6">顯示名稱<input className="ui-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></label>
        <label className="ui-label mt-4">電子郵件<input className="ui-input" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="ui-label mt-4">密碼<input className="ui-input" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <label className="ui-label mt-4">確認密碼<input className="ui-input" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></label>
        {error && <div className="mt-4"><ErrorState message={error} /></div>}
        <Button type="submit" className="mt-5 w-full" isLoading={isSubmitting}>{isSubmitting ? "建立中..." : "建立帳號"}</Button>
        <p className="mt-4 text-sm text-muted">已經有帳號？ <Link className="font-medium text-foreground underline" href="/login">登入</Link></p>
      </form>
    </main>
  );
}
