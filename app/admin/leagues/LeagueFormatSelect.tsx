"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LEAGUE_FORMATS } from "@/lib/league-format";
import type { LeagueFormat } from "@/types/database";

export default function LeagueFormatSelect({
  leagueId,
  format,
}: {
  leagueId: string;
  format: LeagueFormat;
}) {
  const router = useRouter();
  const [value, setValue] = useState<LeagueFormat>(format);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  async function change(next: LeagueFormat) {
    const previous = value;
    setValue(next);
    setSaving(true);
    setError(false);
    const res = await fetch("/api/admin/leagues", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ league_id: leagueId, format: next }),
    });
    setSaving(false);
    if (!res.ok) {
      setValue(previous);
      setError(true);
      return;
    }
    router.refresh();
  }

  return (
    <select
      value={value}
      disabled={saving}
      onChange={(e) => change(e.target.value as LeagueFormat)}
      title={error ? "Failed to save — try again" : "Change league format"}
      className={`input text-xs py-1 px-2 w-auto ${error ? "border-red-500 text-red-400" : ""}`}
    >
      {LEAGUE_FORMATS.map((f) => (
        <option key={f.id} value={f.id}>
          {f.title}
        </option>
      ))}
    </select>
  );
}
