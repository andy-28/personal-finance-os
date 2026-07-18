"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
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
    if (!email.includes("@")) return setError("Enter a valid email.");
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) return setError("Password must be 8+ characters with uppercase, lowercase, and number.");
    if (password !== confirmPassword) return setError("Passwords do not match.");
    setIsSubmitting(true);
    try {
      await register(displayName, email, password);
      router.replace("/accounts");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded border border-stone-300 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-stone-950">Create account</h1>
        <label className="mt-6 block text-sm font-medium">Display name<input className="mt-1 w-full rounded border border-stone-300 px-3 py-2" value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></label>
        <label className="mt-4 block text-sm font-medium">Email<input className="mt-1 w-full rounded border border-stone-300 px-3 py-2" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="mt-4 block text-sm font-medium">Password<input className="mt-1 w-full rounded border border-stone-300 px-3 py-2" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <label className="mt-4 block text-sm font-medium">Confirm password<input className="mt-1 w-full rounded border border-stone-300 px-3 py-2" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></label>
        {error && <p className="mt-4 rounded border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        <button disabled={isSubmitting} className="mt-5 w-full rounded bg-stone-950 px-4 py-2 font-medium text-white disabled:opacity-60">{isSubmitting ? "Creating..." : "Register"}</button>
        <p className="mt-4 text-sm text-stone-600">Already registered? <Link className="font-medium text-stone-950 underline" href="/login">Sign in</Link></p>
      </form>
    </main>
  );
}
