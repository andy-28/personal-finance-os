"use client";

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { useEffect, useState } from "react";
import { PersonalHud } from "@/components/personal-hud/personal-hud";
import { ErrorState } from "@/components/ui/states";
import { apiFetch, problemMessage, type AccountDto } from "@/lib/api-client";
import { useSettings } from "@/lib/settings/user-settings";
import { useAuth } from "../../auth-context";

export default function HudPage() {
  const { accessToken, refreshSession } = useAuth();
  const { settings } = useSettings();
  const [accounts, setAccounts] = useState<AccountDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const nextAccounts = await apiFetch<AccountDto[]>("/api/accounts", accessToken, {}, refreshSession);
      setAccounts(nextAccounts);
      setError(null);
    } catch (err) {
      setError(problemMessage(err));
    }
  }

  useEffect(() => { if (accessToken) void load(); }, [accessToken]);

  return (
    <section className="grid gap-5">
      {error && <ErrorState message={`Personal HUD 部分資料載入失敗：${error}`} />}
      <PersonalHud goals={settings.goalSettings.goalBars} accounts={accounts} />
    </section>
  );
}
