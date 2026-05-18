"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { api, getToken, setToken, type Me } from "@/lib/api";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/documents", label: "Documents" },
  { href: "/conversations", label: "Conversations" },
  { href: "/billing", label: "Billing" },
  { href: "/widget", label: "Widget" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const t = getToken();
    if (!t) {
      router.push("/login");
      return;
    }
    api.me().then(setMe).catch((e) => setErr((e as Error).message));
  }, [router]);

  function logout() {
    setToken(null);
    router.push("/login");
  }

  if (err) return <div className="p-6 text-red-300">{err}</div>;
  if (!me) return <div className="p-6 text-neutral-500">Loading…</div>;

  return (
    <div className="flex-1 flex flex-col">
      <header className="border-b border-neutral-800 px-6 py-3 flex items-center gap-6">
        <div className="font-semibold tracking-tight">{me.tenant_name}</div>
        <nav className="flex gap-4 text-sm text-neutral-400">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={pathname === n.href ? "text-neutral-100" : "hover:text-neutral-100"}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="text-neutral-400 hidden sm:inline">{me.email}</span>
          <span className="rounded bg-sky-500/10 text-sky-300 px-2 py-0.5 text-xs uppercase">{me.plan}</span>
          <button onClick={logout} className="text-neutral-400 hover:text-neutral-100">Log out</button>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
