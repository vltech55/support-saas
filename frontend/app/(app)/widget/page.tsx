"use client";

import { useEffect, useState } from "react";
import { api, API_BASE, type Me } from "@/lib/api";

export default function WidgetPage() {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => { api.me().then(setMe).catch(() => {}); }, []);
  if (!me) return <div className="p-6 text-neutral-500">Loading…</div>;

  const widgetUrl = `${API_BASE.replace(/\/$/, "")}/static/widget.js`;
  const embed = `<script src="${widgetUrl}" data-public-key="${me.tenant_public_key}" data-api="${API_BASE}"></script>`;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-xl font-semibold">Embeddable widget</h1>
      <p className="text-sm text-neutral-400">
        Paste this snippet just before <code>&lt;/body&gt;</code> on any page where you want the chat
        bubble to appear. The widget calls the public widget endpoint with your tenant
        public key — no admin token is exposed.
      </p>
      <pre className="rounded border border-neutral-800 bg-neutral-900/60 p-3 text-xs overflow-x-auto">
        <code>{embed}</code>
      </pre>
      <section>
        <h2 className="text-sm uppercase tracking-wider text-neutral-500 mb-2">Public key</h2>
        <code className="text-sky-400 text-sm">{me.tenant_public_key}</code>
        <p className="text-xs text-neutral-500 mt-1">
          Safe to embed publicly — it only authorizes the widget chat endpoint, never admin operations.
        </p>
      </section>
      <section>
        <h2 className="text-sm uppercase tracking-wider text-neutral-500 mb-2">Live preview</h2>
        <iframe
          srcDoc={`<!doctype html><html><body style="background:#0f172a;color:#fff;font-family:system-ui;padding:24px;">
            <h2>Demo host page for ${me.tenant_name}</h2>
            <p>Open the floating chat bubble in the bottom-right to talk to your indexed docs.</p>
            <script src="${widgetUrl}" data-public-key="${me.tenant_public_key}" data-api="${API_BASE}"></script>
          </body></html>`}
          className="w-full h-96 rounded border border-neutral-800"
        />
      </section>
    </div>
  );
}
