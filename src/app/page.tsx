"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { computeQuote } from "@/lib/calc";
import { fmtDateShort, fmtMoney } from "@/lib/format";
import { useStore } from "@/lib/store";
import { STATUSES, WORK_TYPES } from "@/lib/types";
import { Wizard } from "@/components/Wizard";
import { CountUp } from "@/components/ui";
import { SyncBadge } from "@/components/SyncBadge";
import { DevCredit } from "@/components/DevCredit";
import { Quote } from "@/lib/types";

const MOIS = ["janv", "févr", "mars", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"];

function Activity({ quotes }: { quotes: Quote[] }) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const list = quotes.filter((q) => q.date.startsWith(key));
    return {
      label: MOIS[d.getMonth()],
      total: list.reduce((a, q) => a + computeQuote(q).total, 0),
      accepted: list.filter((q) => q.status === "accepte").reduce((a, q) => a + computeQuote(q).total, 0),
      count: list.length,
    };
  });
  const max = Math.max(1, ...months.map((m) => m.total));
  const cur = months[5];
  return (
    <section className="card">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-black text-nuit-900">Mon activité</h2>
          <p className="text-sm text-slate-500">Montant des devis sur 6 mois</p>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold text-or-600">CE MOIS</div>
          <div className="font-black text-nuit-900"><CountUp value={cur.total} suffix=" F" /></div>
          <div className="text-xs text-slate-500">{cur.count} devis</div>
        </div>
      </div>
      <div className="mt-4 flex items-end gap-2 h-36">
        {months.map((m, i) => (
          <div key={m.label} className="flex-1 flex flex-col items-center justify-end h-full">
            <div className="relative w-full flex-1 flex items-end">
              <div
                className="relative w-full overflow-hidden rounded-t-xl bg-gradient-to-t from-nuit-800 to-roi-500 origin-bottom"
                style={{ height: `${Math.max(3, (m.total / max) * 100)}%`, animation: `barUp .9s cubic-bezier(.2,.8,.2,1) ${i * 0.08}s both` }}
              >
                {m.accepted > 0 && <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-or-600 to-or-400" style={{ height: `${(m.accepted / m.total) * 100}%` }} />}
              </div>
            </div>
            <span className={`mt-1.5 text-xs font-bold ${i === 5 ? "text-nuit-900" : "text-slate-400"}`}>{m.label}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-4 text-xs font-semibold text-slate-500">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-roi-500" />Tous les devis</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-or-500" />Acceptés</span>
      </div>
    </section>
  );
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Bonjour" : h < 18 ? "Bon après-midi" : "Bonsoir";
}

function DevisScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const { quotes, newQuote, settings, user } = useStore();
  const id = params.get("id");
  const step = Math.min(6, Math.max(0, parseInt(params.get("step") || "0", 10) || 0));

  if (id) return <Wizard key={id + step} quoteId={id} initialStep={step} onExit={() => router.push("/historique")} />;

  const recent = [...quotes].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 4);
  const accepted = quotes.filter((q) => q.status === "accepte").reduce((a, q) => a + computeQuote(q).total, 0);
  const pending = quotes.filter((q) => q.status !== "accepte").length;

  const start = () => {
    const q = newQuote();
    router.push(`/?id=${q.id}`);
  };

  return (
    <div>
      {/* HERO */}
      <header className="relative overflow-hidden rounded-b-[2.5rem] text-white shadow-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/hero.jpg" alt="Maçon posant des briques" className="absolute inset-0 h-full w-full object-cover anim-kenburns" />
        <div className="absolute inset-0 bg-gradient-to-b from-nuit-950/70 via-nuit-900/75 to-nuit-950/95" />
        <div className="absolute -left-16 top-10 h-48 w-48 rounded-full bg-roi-500/30 blur-3xl" />
        <div className="absolute -right-10 bottom-0 h-40 w-40 rounded-full bg-or-500/30 blur-3xl" />
        <div className="relative mx-auto max-w-2xl lg:max-w-5xl px-5 pt-[calc(env(safe-area-inset-top)+26px)] pb-8">
          <div className="flex items-center gap-3 anim-fade-up">
            {settings.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.logo} alt="" className="h-12 w-12 rounded-2xl bg-white object-contain p-1 ring-2 ring-or-500" />
            ) : (
              <span className="grid place-items-center h-12 w-12 rounded-2xl bg-gradient-to-br from-or-400 to-or-600 text-2xl shadow-lg">🏗️</span>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-blue-100/80 text-sm">{greeting()} {user.name.split(" ")[0]} 👋</div>
              <div className="text-xl font-black truncate">{settings.name}</div>
            </div>
            <SyncBadge dark />
          </div>

          <h1 className="mt-6 text-[34px] leading-[1.05] font-black tracking-tight anim-fade-up" style={{ animationDelay: ".08s" }}>
            Vos devis <span className="text-gradient-gold">professionnels</span>
            <br />en 2 minutes.
          </h1>

          <button onClick={start} className="btn-gold shine w-full mt-6 !min-h-[68px] !text-xl anim-fade-up" style={{ animationDelay: ".16s" }}>
            <span className="grid place-items-center h-9 w-9 rounded-full bg-nuit-900 text-or-400 text-2xl">＋</span>
            Nouveau devis
          </button>

          <div className="mt-5 grid grid-cols-3 gap-2 stagger">
            <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/15 p-3">
              <div className="text-2xl font-black"><CountUp value={quotes.length} /></div>
              <div className="text-xs text-blue-100/80 font-semibold">Devis</div>
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/15 p-3">
              <div className="text-2xl font-black"><CountUp value={pending} /></div>
              <div className="text-xs text-blue-100/80 font-semibold">En attente</div>
            </div>
            <div className="rounded-2xl bg-or-500/20 backdrop-blur border border-or-400/40 p-3">
              <div className="text-lg font-black text-or-400 leading-8 truncate"><CountUp value={accepted} suffix=" F" /></div>
              <div className="text-xs text-blue-100/80 font-semibold">Acceptés</div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl lg:max-w-5xl px-4 pt-6 space-y-7">
        <Activity quotes={quotes} />

        {/* Métiers */}
        <section>
          <h2 className="text-xl font-black text-nuit-900 mb-3 px-1">Nos métiers</h2>
          <div className="-mx-4 px-4 flex gap-3 overflow-x-auto snap-x pb-2 stagger lg:mx-0 lg:px-0 lg:grid lg:grid-cols-4 lg:gap-4 lg:overflow-visible">
            {WORK_TYPES.map((w, i) => (
              <button key={w.key} onClick={start} className="group relative snap-start shrink-0 w-40 h-48 lg:w-auto lg:h-56 rounded-3xl overflow-hidden shadow-lg active:scale-95 lg:hover:-translate-y-1 lg:hover:shadow-2xl transition text-left">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={w.img} alt={w.label} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-nuit-950/95 via-nuit-900/30 to-transparent" />
                <span className="absolute top-3 left-3 grid place-items-center h-10 w-10 rounded-xl bg-white/90 text-xl anim-float" style={{ animationDelay: `${i * 0.5}s` }}>{w.icon}</span>
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <div className="font-black text-lg">{w.label}</div>
                  <div className="text-xs text-blue-100/80">{w.hint}</div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {recent.length > 0 && (
          <section>
            <div className="flex items-baseline justify-between mb-3 px-1">
              <h2 className="text-xl font-black text-nuit-900">Derniers devis</h2>
              <button onClick={() => router.push("/historique")} className="text-roi-600 font-bold">Tout voir →</button>
            </div>
            <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-4 stagger">
              {recent.map((q) => {
                const st = STATUSES.find((s) => s.key === q.status)!;
                const tot = computeQuote(q).total;
                return (
                  <div key={q.id} className="card relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-or-400 to-roi-600" />
                    <div className="flex justify-between gap-2 pl-1.5">
                      <div className="min-w-0">
                        <div className="font-black text-lg truncate text-nuit-900">{q.client.name || "Sans nom"}</div>
                        <div className="text-slate-500 text-sm font-semibold">{q.number} · {fmtDateShort(q.date)}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-black text-nuit-900">{fmtMoney(tot)}</div>
                        <span className={`inline-block mt-1 rounded-full px-3 py-0.5 text-xs font-bold ${st.cls}`}>{st.label}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3 pl-1.5">
                      <button className="btn-secondary !min-h-[48px] !text-base" onClick={() => router.push(`/?id=${q.id}&step=6`)}>👁 Voir</button>
                      <button className="btn-primary !min-h-[48px] !text-base" onClick={() => router.push(`/?id=${q.id}`)}>✏️ Modifier</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
        <DevCredit variant="compact" />
      </main>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <DevisScreen />
    </Suspense>
  );
}
