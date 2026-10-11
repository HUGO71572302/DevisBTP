"use client";

import { useStore } from "@/lib/store";

export function SyncBadge({ dark = false }: { dark?: boolean }) {
  const { syncState, syncNow } = useStore();
  const m = {
    synced: { i: "☁️", t: "Sauvegardé", c: dark ? "bg-emerald-400/20 text-emerald-200 border-emerald-300/30" : "bg-emerald-50 text-emerald-700 border-emerald-200" },
    pending: { i: "⏳", t: "En attente", c: dark ? "bg-or-500/20 text-or-400 border-or-400/30" : "bg-or-100 text-or-600 border-or-400/40" },
    syncing: { i: "🔄", t: "Envoi…", c: dark ? "bg-white/10 text-white border-white/20" : "bg-roi-50 text-roi-600 border-roi-100" },
    offline: { i: "📴", t: "Hors ligne", c: dark ? "bg-white/10 text-blue-100 border-white/20" : "bg-slate-100 text-slate-600 border-slate-200" },
  }[syncState];
  return (
    <button onClick={() => syncNow()} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition active:scale-95 ${m.c}`} title="Synchroniser maintenant">
      <span className={syncState === "syncing" ? "animate-spin inline-block" : ""}>{m.i}</span>
      {m.t}
    </button>
  );
}
