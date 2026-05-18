"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function BillingPage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof api.billingMe>> | null>(null);
  const [plans, setPlans] = useState<Awaited<ReturnType<typeof api.plans>> | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    try {
      const [b, p] = await Promise.all([api.billingMe(), api.plans()]);
      setData(b); setPlans(p);
    } catch (e) { setErr((e as Error).message); }
  }
  useEffect(() => { refresh(); }, []);

  async function upgrade(plan: string) {
    try {
      const cs = await api.checkout(plan, window.location.origin + "/billing");
      // mock provider returns a local URL; in stripe mode it's a Stripe hosted URL.
      window.location.href = cs.url.startsWith("http") ? cs.url : (window.location.origin + cs.url);
    } catch (e) { setErr((e as Error).message); }
  }

  if (err) return <div className="p-6 text-red-300">{err}</div>;
  if (!data || !plans) return <div className="p-6 text-neutral-500">Loading…</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Billing</h1>
        <div className="text-sm text-neutral-400">
          Current plan: <span className="text-neutral-100 uppercase">{data.plan}</span> · status {data.status}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Metric label="Messages used (month)" value={`${data.used_messages_this_month} / ${data.limits.messages}`} />
        <Metric label="Doc cap" value={`${data.limits.docs}`} />
        <Metric label="Cost this month" value={`$${data.cost_usd_this_month.toFixed(4)}`} />
      </div>

      <section>
        <h2 className="text-sm uppercase tracking-wider text-neutral-500 mb-2">Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {plans.plans.map((p) => (
            <div key={p.id} className={`rounded border p-4 ${data.plan === p.id ? "border-sky-500" : "border-neutral-800"}`}>
              <div className="text-lg font-semibold uppercase">{p.id}</div>
              <div className="text-sm text-neutral-400 mt-1">{p.docs} docs · {p.messages} messages/mo</div>
              <button
                disabled={p.id === data.plan || p.id === "free"}
                onClick={() => upgrade(p.id)}
                className="mt-3 w-full rounded bg-sky-500 text-neutral-950 font-medium py-1.5 text-sm disabled:opacity-40"
              >
                {p.id === data.plan ? "Current" : `Upgrade to ${p.id}`}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-neutral-800 bg-neutral-900/40 p-3">
      <div className="text-xs uppercase tracking-wider text-neutral-500">{label}</div>
      <div className="text-xl font-mono mt-1">{value}</div>
    </div>
  );
}
