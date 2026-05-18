"use client";

import { useEffect, useState } from "react";
import { Loader2, Trash2, Upload } from "lucide-react";
import { api } from "@/lib/api";

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Awaited<ReturnType<typeof api.listDocs>>>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try { setDocs(await api.listDocs()); } catch (e) { setErr((e as Error).message); }
  }
  useEffect(() => { refresh(); }, []);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setErr(null);
    try { await api.uploadDoc(file); await refresh(); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); e.target.value = ""; }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this document?")) return;
    await api.deleteDoc(id);
    await refresh();
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Documents</h1>
        <label className="inline-flex items-center gap-2 rounded bg-sky-500 text-neutral-950 font-medium px-3 py-2 cursor-pointer hover:bg-sky-400">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {busy ? "Uploading…" : "Upload PDF"}
          <input type="file" accept="application/pdf" className="hidden" onChange={onUpload} disabled={busy} />
        </label>
      </div>
      {err ? <div className="text-red-300 text-sm">{err}</div> : null}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-neutral-500 border-b border-neutral-800">
            <th className="py-2">Filename</th>
            <th>Pages</th>
            <th>Chunks</th>
            <th>Size</th>
            <th>Uploaded</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {docs.map((d) => (
            <tr key={d.id} className="border-b border-neutral-900">
              <td className="py-2">{d.filename}</td>
              <td className="font-mono">{d.page_count ?? "—"}</td>
              <td className="font-mono">{d.chunk_count}</td>
              <td className="font-mono text-xs">{(d.byte_size / 1024).toFixed(1)} KB</td>
              <td className="text-neutral-400 text-xs">{new Date(d.created_at).toLocaleString()}</td>
              <td>
                <button onClick={() => onDelete(d.id)} className="text-red-400 hover:text-red-300">
                  <Trash2 className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
          {docs.length === 0 ? (
            <tr><td colSpan={6} className="py-2 text-neutral-500">No documents yet. Upload a PDF to get started.</td></tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
