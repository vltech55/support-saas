"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function ConversationsPage() {
  const [list, setList] = useState<Awaited<ReturnType<typeof api.listConversations>>>([]);
  const [active, setActive] = useState<Awaited<ReturnType<typeof api.getConversation>> | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { api.listConversations().then(setList).catch((e) => setErr((e as Error).message)); }, []);
  async function open(id: string) {
    try { setActive(await api.getConversation(id)); } catch (e) { setErr((e as Error).message); }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
      <aside className="space-y-2">
        <h2 className="text-sm uppercase tracking-wider text-neutral-500">Recent</h2>
        {err ? <div className="text-red-300 text-sm">{err}</div> : null}
        {list.length === 0 ? (
          <div className="text-neutral-500 text-sm">No conversations yet.</div>
        ) : list.map((c) => (
          <button
            key={c.id}
            onClick={() => open(c.id)}
            className={`w-full text-left rounded border px-3 py-2 text-sm hover:border-sky-500 ${active?.id === c.id ? "border-sky-500" : "border-neutral-800"}`}
          >
            <div className="flex items-center justify-between text-xs text-neutral-500">
              <span>{c.channel}</span>
              <span>{c.message_count} msg</span>
            </div>
            <div className="mt-1 line-clamp-2 text-neutral-200">{c.last_message_preview ?? "(no messages)"}</div>
            <div className="mt-1 text-xs text-neutral-500 font-mono">{c.end_user_session}</div>
          </button>
        ))}
      </aside>
      <section className="space-y-3">
        {active ? (
          active.messages.map((m) => (
            <div key={m.id} className="rounded border border-neutral-800 p-3">
              <div className="flex items-center justify-between text-xs text-neutral-500">
                <span>{m.role}</span>
                <span>{new Date(m.created_at).toLocaleString()}</span>
              </div>
              <div className="mt-1 whitespace-pre-wrap text-sm">{m.content}</div>
              {m.citations?.items?.length ? (
                <div className="mt-2 text-xs text-neutral-400">
                  cites: {m.citations.items.map((c) => c.filename).join(", ")}
                </div>
              ) : null}
            </div>
          ))
        ) : (
          <div className="text-neutral-500 text-sm">Pick a conversation on the left to view the transcript.</div>
        )}
      </section>
    </div>
  );
}
