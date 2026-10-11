"use client";

import { DEV } from "@/lib/seed";

/** Signature du développeur de l'application. */
export function DevCredit({ variant = "light" }: { variant?: "light" | "dark" | "compact" }) {
  if (variant === "compact") {
    return (
      <p className="text-center text-xs text-slate-500">
        Conçu par <b className="text-nuit-800">{DEV.name}</b> · {DEV.title} · {DEV.phones.join(" / ")}
      </p>
    );
  }
  const dark = variant === "dark";
  return (
    <div className={`relative overflow-hidden rounded-3xl p-4 ${dark ? "bg-white/10 backdrop-blur-xl border border-white/15 text-white" : "card"}`}>
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-or-500/20 blur-2xl" />
      <div className="relative flex items-center gap-3">
        <div className="relative shrink-0">
          <div className="grid place-items-center h-14 w-14 rounded-2xl bg-gradient-to-br from-or-400 to-or-600 text-nuit-950 font-black text-xl shadow-lg">AK</div>
          <span className="absolute -bottom-1 -right-1 grid place-items-center h-6 w-6 rounded-full bg-nuit-900 text-[11px] ring-2 ring-or-400">✦</span>
        </div>
        <div className="min-w-0">
          <div className={`text-[11px] font-bold tracking-widest ${dark ? "text-or-400" : "text-or-600"}`}>CONÇU ET DÉVELOPPÉ PAR</div>
          <div className={`text-lg font-black leading-tight ${dark ? "" : "text-nuit-900"}`}>{DEV.name}</div>
          <div className={`text-sm font-semibold ${dark ? "text-blue-100/80" : "text-slate-500"}`}>{DEV.title}</div>
        </div>
      </div>
      <div className="relative mt-3 grid grid-cols-2 gap-2">
        <a href={`tel:+228${DEV.phones[0].replace(/\s/g, "")}`} className={`rounded-xl px-3 py-2.5 text-center font-bold text-sm transition active:scale-95 ${dark ? "bg-white/10 border border-white/15" : "bg-roi-50 text-nuit-800 border border-roi-100"}`}>
          📞 {DEV.phones[0]}
        </a>
        <a href={`tel:+228${DEV.phones[1].replace(/\s/g, "")}`} className={`rounded-xl px-3 py-2.5 text-center font-bold text-sm transition active:scale-95 ${dark ? "bg-white/10 border border-white/15" : "bg-roi-50 text-nuit-800 border border-roi-100"}`}>
          📞 {DEV.phones[1]}
        </a>
      </div>
    </div>
  );
}
