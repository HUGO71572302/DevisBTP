"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { computeQuote } from "@/lib/calc";
import { fmtDateLong, fmtDateShort, fmtMoney } from "@/lib/format";
import { useStore } from "@/lib/store";
import { QuoteStatus, STATUSES } from "@/lib/types";
import { PageTitle } from "@/components/ui";

export default function HistoriquePage() {
  const { quotes, upsertQuote, deleteQuote, duplicateQuote } = useStore();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<QuoteStatus | "all">("all");

  const s = search.trim().toLowerCase();
  const list = [...quotes]
    .sort((a, b) => (b.date === a.date ? b.number.localeCompare(a.number) : b.date.localeCompare(a.date)))
    .filter((q) => filter === "all" || q.status === filter)
    .filter(
      (q) =>
        !s ||
        q.client.name.toLowerCase().includes(s) ||
        q.number.toLowerCase().includes(s) ||
        fmtDateShort(q.date).includes(s) ||
        fmtDateLong(q.date).toLowerCase().includes(s) ||
        q.client.site.toLowerCase().includes(s),
    );

  const cycle = (st: QuoteStatus): QuoteStatus => (st === "brouillon" ? "envoye" : st === "envoye" ? "accepte" : "brouillon");

  return (
    <div>
      <PageTitle image="/images/site.jpg" icon="🗂️" sub={`${quotes.length} devis enregistré(s)`}>Historique</PageTitle>
      <main className="mx-auto max-w-2xl lg:max-w-5xl p-4 space-y-3">
        <input className="input" placeholder="🔍 Client, numéro ou date…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[{ key: "all" as const, label: "Tous" }, ...STATUSES].map((st) => (
            <button
              key={st.key}
              onClick={() => setFilter(st.key)}
              className={`chip ${filter === st.key ? "chip-on" : "chip-off"}`}
            >
              {st.label}
            </button>
          ))}
        </div>
        {list.length === 0 && <div className="text-center text-slate-500 p-8 anim-fade-up"><div className="text-5xl mb-2 anim-float">🔍</div>Aucun devis trouvé.</div>}
        <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-4">
        {list.map((q, idx) => {
          const st = STATUSES.find((x) => x.key === q.status)!;
          return (
            <div key={q.id} className="card relative overflow-hidden anim-fade-up" style={{ animationDelay: `${Math.min(idx, 8) * 0.05}s` }}>
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${q.status === "accepte" ? "bg-or-500" : q.status === "envoye" ? "bg-roi-600" : "bg-slate-300"}`} />
              <div className="flex justify-between gap-3 pl-1.5">
                <div className="min-w-0">
                  <div className="text-lg font-black truncate text-nuit-900">{q.client.name || "Sans nom"}</div>
                  <div className="text-slate-500">{q.number}</div>
                  <div className="text-slate-500">{fmtDateLong(q.date)}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-black text-nuit-900">{fmtMoney(computeQuote(q).total)}</div>
                  <button onClick={() => upsertQuote({ ...q, status: cycle(q.status) })} key={q.status} className={`mt-1 rounded-full px-3 py-1.5 text-sm font-bold anim-pop ${st.cls}`} title="Changer le statut">
                    {st.label} ▾
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 mt-3 pl-1.5">
                <button className="btn-secondary !px-1 !text-base !min-h-[52px] flex-col !gap-0" onClick={() => router.push(`/?id=${q.id}&step=6`)}>👁<span className="text-xs">Ouvrir</span></button>
                <button className="btn-secondary !px-1 !text-base !min-h-[52px] flex-col !gap-0" onClick={() => router.push(`/?id=${q.id}`)}>✏️<span className="text-xs">Modifier</span></button>
                <button
                  className="btn-secondary !px-1 !text-base !min-h-[52px] flex-col !gap-0"
                  onClick={() => {
                    const c = duplicateQuote(q.id);
                    if (c) router.push(`/?id=${c.id}`);
                  }}
                >
                  ⧉<span className="text-xs">Dupliquer</span>
                </button>
                <button
                  className="btn-danger !px-1 !text-base !min-h-[52px] flex-col !gap-0"
                  onClick={() => {
                    if (confirm(`Supprimer définitivement le devis ${q.number} (${q.client.name || "sans nom"}) ?`)) deleteQuote(q.id);
                  }}
                >
                  🗑<span className="text-xs">Supprimer</span>
                </button>
              </div>
            </div>
          );
        })}
        </div>
      </main>
    </div>
  );
}
