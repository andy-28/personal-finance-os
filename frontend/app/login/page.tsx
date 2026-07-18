"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
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
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded border border-stone-300 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-stone-950">Sign in</h1>
        <label className="mt-6 block text-sm font-medium">Email<input className="mt-1 w-full rounded border border-stone-300 px-3 py-2" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="mt-4 block text-sm font-medium">Password<input className="mt-1 w-full rounded border border-stone-300 px-3 py-2" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {error && <p className="mt-4 rounded border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        <button disabled={isSubmitting} className="mt-5 w-full rounded bg-stone-950 px-4 py-2 font-medium text-white disabled:opacity-60">{isSubmitting ? "Signing in..." : "Sign in"}</button>
        <p className="mt-4 text-sm text-stone-600">No account yet? <Link className="font-medium text-stone-950 underline" href="/register">Register</Link></p>
      </form>
    </main>
  );
}
