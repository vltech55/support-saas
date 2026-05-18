"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function DashboardPage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof api.overview>> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { api.overview().then(setData).catch((e) => setErr((e as Error).message)); }, []);

  if (err) return <div className="p-6 text-red-300">{err}</div>;
  if (!data) return <div className="p-6 text-neutral-500">Loading…</div>;

  const t = data.totals;
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-xl font-semibold">Overview</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Documents" value={t.documents} />
        <Metric label="Conversations" value={t.conversations} />
        <Metric label="Messages" value={t.messages} />
        <Metric label="Cost this month" value={`$${t.cost_usd_this_month.toFixed(4)}`} />
      </div>
      <section>
        <h2 className="text-sm uppercase tracking-wider text-neutral-500 mb-2">Last 14 days</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-500 border-b border-neutral-800">
              <th className="py-2">Day</th><th>Tokens</th><th>Cost (USD)</th>
            </tr>
          </thead>
          <tbody>
            {data.daily.map((d) => (
              <tr key={d.day} className="border-b border-neutral-900">
                <td className="py-1">{d.day}</td>
                <td className="font-mono">{d.tokens.toLocaleString()}</td>
                <td className="font-mono">${d.cost_usd.toFixed(4)}</td>
              </tr>
            ))}
            {data.daily.length === 0 ? (
              <tr><td colSpan={3} className="py-2 text-neutral-500">No usage yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded border border-neutral-800 bg-neutral-900/40 p-3">
      <div className="text-xs uppercase tracking-wider text-neutral-500">{label}</div>
      <div className="text-2xl font-mono mt-1">{value}</div>
    </div>
  );
}
