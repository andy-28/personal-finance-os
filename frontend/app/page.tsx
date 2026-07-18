"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-context";

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) router.replace(user ? "/transactions" : "/login");
  }, [isLoading, router, user]);

  return <main className="grid min-h-screen place-items-center text-stone-700">Loading...</main>;
}

