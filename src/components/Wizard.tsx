"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { computeQuote, laborAmount, sectionMetrage } from "@/lib/calc";
import { fmtMoney, fmtNum, uid } from "@/lib/format";
import { emptyLabor } from "@/lib/seed";
import { nextNumber, useStore } from "@/lib/store";
import { Labor, Quote, STATUSES, WORK_TYPES, WorkType, workLabel } from "@/lib/types";
import { ExportBar } from "./ExportBar";
import { LinesEditor, lineErrors } from "./LinesEditor";
import { PdfPreview } from "./PdfPreview";
import { TemplatePicker } from "./TemplatePicker";
import { templateInfo, templateOf } from "@/lib/templates";
import { Confetti, CountUp, Field, NumInput } from "./ui";

const STEPS = ["Client", "Travaux", "Lignes", "Matériaux", "Main d'œuvre", "Conditions", "Aperçu"];

function LaborEditor({ labor, onChange, autoQty, title, error }: { labor: Labor; onChange: (l: Labor) => void; autoQty: number; title: string; error?: string }) {
  const modes: { k: Labor["mode"]; label: string }[] = [
    { k: "none", label: "Aucune" },
    { k: "m2", label: "Prix au m²" },
    { k: "forfait", label: "Forfait" },
  ];
  return (
    <div className="card space-y-3">
      <h3 className="text-lg font-black text-nuit-900 flex items-center gap-2"><span className="grid place-items-center h-9 w-9 rounded-xl bg-or-100 text-lg">👷</span>{title}</h3>
      <div className="grid grid-cols-3 gap-2">
        {modes.map((m) => (
          <button
            key={m.k}
            onClick={() => onChange({ ...labor, mode: m.k })}
            className={`rounded-xl border-2 min-h-[52px] font-bold ${labor.mode === m.k ? "seg-on" : "seg-off"} transition active:scale-95`}
          >
            {m.label}
          </button>
        ))}
      </div>
      {labor.mode === "m2" && (
        <>
          <Field label="Prix par m² (F)">
            <NumInput value={labor.rate} onChange={(n) => onChange({ ...labor, rate: n })} error={!!error && !(labor.rate > 0)} />
          </Field>
          <label className="flex items-center gap-3 text-lg min-h-[48px]">
            <input type="checkbox" className="h-7 w-7 accent-[#1e4fd8]" checked={labor.autoQty} onChange={(e) => onChange({ ...labor, autoQty: e.target.checked, qty: labor.qty || autoQty })} />
            Utiliser le total métrage ({fmtNum(autoQty)} m²)
          </label>
          {!labor.autoQty && (
            <Field label="Métrage (m²)">
              <NumInput value={labor.qty} onChange={(n) => onChange({ ...labor, qty: n })} />
            </Field>
          )}
        </>
      )}
      {labor.mode === "forfait" && (
        <Field label="Montant du forfait (F)">
          <NumInput value={labor.forfait} onChange={(n) => onChange({ ...labor, forfait: n })} error={!!error} />
        </Field>
      )}
      {labor.mode !== "none" && (
        <div className="rounded-2xl bg-nuit-900 text-white p-3.5 text-lg flex justify-between anim-fade-up">
          <span>Main d&apos;œuvre</span> <b className="text-or-400">{fmtMoney(laborAmount(labor, autoQty))}</b>
        </div>
      )}
      {error && <p className="font-semibold text-red-600">⚠ {error}</p>}
    </div>
  );
}

function laborError(l: Labor, auto: number): string | undefined {
  if (l.mode === "m2" && !(l.rate > 0)) return "Indiquez le prix par m²";
  if (l.mode === "m2" && !(l.autoQty ? auto : l.qty)) return "Le métrage est à 0 m²";
  if (l.mode === "forfait" && !(l.forfait > 0)) return "Indiquez le montant du forfait";
  return undefined;
}

export function Wizard({ quoteId, initialStep, onExit }: { quoteId: string; initialStep: number; onExit: () => void }) {
  const { quotes, settings, seq, upsertQuote, rememberPrices, catalog, saveSettings, discardIfEmpty, duplicateQuote } = useStore();
  const router = useRouter();
  const [unlocked, setUnlocked] = useState(false);
  const q = quotes.find((x) => x.id === quoteId);
  const [step, setStep] = useState(initialStep);
  const [showErr, setShowErr] = useState(false);
  const [dir, setDir] = useState<1 | -1>(1);
  const [party, setParty] = useState(0);

  const goRef = useRef<(to: number) => void>(() => {});
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goRef.current(step + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goRef.current(step - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  if (!q) {
    return (
      <div className="p-6 text-center space-y-4">
        <p className="text-lg">Devis introuvable.</p>
        <button className="btn-primary" onClick={onExit}>Retour</button>
      </div>
    );
  }

  const set = (patch: Partial<Quote>) => upsertQuote({ ...q, ...patch });
  const tpl = templateOf(q, settings);
  const totals = computeQuote(q);
  // En quittant, un devis resté vide est supprimé (pas de brouillons fantômes dans l'historique)
  const exit = () => {
    discardIfEmpty(q.id);
    onExit();
  };

  // Un devis envoyé ou accepté est verrouillé : le client a déjà reçu ce document.
  if (q.status !== "brouillon" && !unlocked && step < 6) {
    const st = STATUSES.find((s) => s.key === q.status);
    return (
      <div className="mx-auto max-w-md p-4 pt-[calc(env(safe-area-inset-top)+24px)] space-y-4">
        <div className="card text-center space-y-3 anim-pop">
          <div className="text-5xl">🔒</div>
          <div className="text-xs font-bold text-or-600 tracking-wider">{q.number}</div>
          <h2 className="text-2xl font-black text-nuit-900">Ce devis est {st?.label.toLowerCase()}</h2>
          <p className="text-slate-500">
            {q.client.name || "Le client"} a déjà reçu ce devis ({fmtMoney(totals.total)}). Pour éviter un désaccord, il vaut mieux faire une copie plutôt que de le changer.
          </p>
          <button className="btn-gold w-full" onClick={() => setStep(6)}>👁 Voir le devis</button>
          <button
            className="btn-primary w-full"
            onClick={() => {
              const c = duplicateQuote(q.id);
              if (c) router.push(`/?id=${c.id}`);
            }}
          >
            📄 Faire une nouvelle version
          </button>
          <button
            className="btn-secondary w-full"
            onClick={() => {
              if (confirm(`Modifier ${q.number} ? Il repassera en « Brouillon » et devra être renvoyé au client.`)) {
                upsertQuote({ ...q, status: "brouillon" });
                setUnlocked(true);
              }
            }}
          >
            ✏️ Modifier quand même
          </button>
          <button className="text-slate-500 font-semibold min-h-[44px]" onClick={onExit}>✕ Fermer</button>
        </div>
      </div>
    );
  }

  const errors = (): string[] => {
    const e: string[] = [];
    if (step === 0) {
      if (!q.client.name.trim()) e.push("name");
      if (q.client.phone && q.client.phone.replace(/\D/g, "").length < 8) e.push("phone");
      if (!q.date) e.push("date");
    }
    if (step === 1 && q.sections.length === 0) e.push("types");
    if (step === 2) {
      if (!q.sections.some((s) => s.lines.length)) e.push("nolines");
      if (q.sections.some((s) => s.lines.some((l) => Object.values(lineErrors(l)).some(Boolean)))) e.push("lines");
    }
    if (step === 3 && q.materials.some((l) => Object.values(lineErrors(l)).some(Boolean))) e.push("lines");
    if (step === 4) {
      if (q.laborScope === "global" && laborError(q.labor, totals.metrage)) e.push("labor");
      if (q.laborScope === "section" && q.sections.some((s) => laborError(s.labor, sectionMetrage(s)))) e.push("labor");
    }
    if (step === 5) {
      if (q.depositMode === "percent" && q.depositValue > 100) e.push("deposit");
      if (q.depositMode === "amount" && q.depositValue > totals.total) e.push("deposit");
      if (q.depositMode === "custom" && (q.depositValue <= 0 || (q.customRest || 0) < 0)) e.push("deposit");
    }
    return e;
  };
  const errs = showErr ? errors() : [];

  const go = (to: number) => {
    if (to < 0 || to > 6) return;
    if (to > step && errors().length) {
      setShowErr(true);
      return;
    }
    setShowErr(false);
    if (to === 6) rememberPrices(q);
    setDir(to >= step ? 1 : -1);
    setStep(to);
  };
  goRef.current = go;

  const toggleType = (t: WorkType) => {
    const existing = q.sections.find((s) => s.type === t);
    if (existing) {
      if (existing.lines.length && !confirm(`Retirer « ${workLabel(t)} » et ses ${existing.lines.length} ligne(s) ?`)) return;
      set({ sections: q.sections.filter((s) => s.type !== t) });
    } else {
      const order = WORK_TYPES.map((w) => w.key);
      const sections = [...q.sections, { id: uid(), type: t, lines: [], labor: emptyLabor() }].sort(
        (a, b) => order.indexOf(a.type) - order.indexOf(b.type),
      );
      set({ sections });
    }
  };

  let counter = 1;

  return (
    <div>
      {/* En-tête de l'assistant */}
      <header className="no-print sticky top-0 z-30 text-white px-4 pt-[calc(env(safe-area-inset-top)+10px)] pb-4 rounded-b-3xl shadow-xl bg-gradient-to-br from-nuit-950 via-nuit-900 to-nuit-700">
        <div className="mx-auto max-w-2xl lg:max-w-5xl">
          <div className="flex items-center justify-between gap-2">
            <button onClick={exit} className="rounded-xl bg-white/10 border border-white/15 px-3.5 py-2 font-bold min-h-[44px] active:scale-95 transition">✕ Fermer</button>
            <div className="text-right">
              <div className="text-xs font-bold text-or-400 tracking-wider">{q.number}</div>
              <div className="text-2xl font-black"><CountUp value={totals.total} suffix=" F" /></div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <span key={step} className="grid place-items-center h-10 w-10 rounded-xl bg-gradient-to-br from-or-400 to-or-600 text-nuit-950 font-black text-lg anim-pop">{step + 1}</span>
            <div>
              <div className="text-xs text-blue-100/70 font-semibold">Étape {step + 1} sur 7</div>
              <div key={"t" + step} className="text-lg font-black anim-fade-up">{STEPS[step]}</div>
            </div>
          </div>
          <div className="mt-3 relative h-2.5 rounded-full bg-white/15 overflow-hidden">
            <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-or-400 to-or-600 transition-all duration-500 ease-out" style={{ width: `${((step + 1) / 7) * 100}%` }} />
          </div>
          <div className="mt-1.5 grid grid-cols-7 gap-1">
            {STEPS.map((s, i) => (
              <button key={s} onClick={() => go(i)} aria-label={s} className={`h-6 text-[10px] font-bold rounded-md transition ${i === step ? "text-or-400" : i < step ? "text-white/80" : "text-white/35"}`}>
                {i < step ? "✓" : i + 1}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className={`mx-auto max-w-2xl lg:max-w-5xl ${step < 6 ? "xl:max-w-[1500px] xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:gap-6 xl:px-4" : ""}`}>
      <main key={step} className={`min-w-0 p-4 space-y-4 ${dir === 1 ? "anim-slide-in" : "anim-slide-back"}`}>
        {step === 0 && (
          <div className="card space-y-4">
            <div className="relative overflow-hidden rounded-2xl p-4 text-white bg-gradient-to-r from-nuit-900 to-roi-600">
              <div className="text-xs font-bold text-or-400 tracking-wider">NUMÉRO AUTOMATIQUE</div>
              <div className="text-2xl font-black">{q.number}</div>
              <span className="absolute -right-2 -bottom-3 text-6xl opacity-20">📄</span>
            </div>
            <Field label="Nom du client *" error={errs.includes("name") ? "Le nom du client est obligatoire" : undefined}>
              <input className={`input ${errs.includes("name") ? "input-error" : ""}`} value={q.client.name} autoComplete="off" placeholder="Ex : M. Kossi AGBEKO" onChange={(e) => set({ client: { ...q.client, name: e.target.value } })} />
            </Field>
            <Field label="Téléphone du client" error={errs.includes("phone") ? "Numéro incomplet (8 chiffres minimum)" : undefined} hint="Facultatif – sert pour WhatsApp">
              <input className={`input ${errs.includes("phone") ? "input-error" : ""}`} type="tel" inputMode="tel" value={q.client.phone} placeholder="90 00 00 00" onChange={(e) => set({ client: { ...q.client, phone: e.target.value } })} />
            </Field>
            <Field label="Lieu du chantier">
              <input className="input" value={q.client.site} placeholder="Ex : Kara, quartier Tomdè" onChange={(e) => set({ client: { ...q.client, site: e.target.value } })} />
            </Field>
            <Field label="Date du devis" error={errs.includes("date") ? "Date obligatoire" : undefined}>
              <input
                className="input"
                type="date"
                value={q.date}
                onChange={(e) => {
                  const date = e.target.value;
                  const yearChanged = date.slice(0, 4) !== q.date.slice(0, 4);
                  set({ date, number: yearChanged && date ? nextNumber(quotes.filter((x) => x.id !== q.id), date, seq) : q.number });
                }}
              />
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <p className="text-lg font-semibold text-nuit-700">Touchez les travaux à réaliser :</p>
            {WORK_TYPES.map((w) => {
              const on = q.sections.some((s) => s.type === w.key);
              return (
                <button
                  key={w.key}
                  onClick={() => toggleType(w.key)}
                  className={`relative w-full overflow-hidden rounded-3xl text-left h-28 shadow-lg transition active:scale-[0.98] ${on ? "ring-4 ring-or-500" : "ring-1 ring-slate-200"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={w.img} alt={w.label} className={`absolute inset-0 h-full w-full object-cover transition duration-500 ${on ? "scale-110" : ""}`} />
                  <div className={`absolute inset-0 transition ${on ? "bg-gradient-to-r from-nuit-950/90 via-nuit-900/70 to-or-600/40" : "bg-gradient-to-r from-nuit-950/85 via-nuit-900/60 to-transparent"}`} />
                  <div className="relative h-full flex items-center gap-4 px-4 text-white">
                    <span key={on ? "on" : "off"} className={`grid place-items-center h-11 w-11 shrink-0 rounded-xl border-2 text-2xl font-black ${on ? "bg-or-500 border-or-400 text-nuit-950 anim-pop" : "border-white/60 bg-white/10"}`}>{on ? "✓" : ""}</span>
                    <span>
                      <span className="block text-2xl font-black">{w.icon} {w.label}</span>
                      <span className="block text-blue-100/90">{w.hint}</span>
                    </span>
                  </div>
                </button>
              );
            })}
            {errs.includes("types") && <p className="font-semibold text-red-600 text-lg">⚠ Cochez au moins un type de travaux</p>}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            {q.sections.map((s) => {
              const start = counter;
              counter += s.lines.length;
              return (
                <section key={s.id} className="card space-y-3">
                  <div className="flex items-baseline justify-between">
                    <h2 className="text-xl font-black text-nuit-900 flex items-center gap-2"><img src={WORK_TYPES.find((w) => w.key === s.type)?.img} alt="" className="h-10 w-10 rounded-xl object-cover ring-2 ring-or-400" /> {workLabel(s.type)}</h2>
                    <span className="rounded-full bg-roi-100 text-roi-600 px-3 py-1 font-bold text-sm">{fmtNum(sectionMetrage(s))} m²</span>
                  </div>
                  <LinesEditor
                    lines={s.lines}
                    startNumber={start}
                    category={s.type}
                    showErrors={showErr}
                    emptyText="Aucune ligne. Ajoutez depuis le catalogue ou une ligne vide."
                    onChange={(lines) => set({ sections: q.sections.map((x) => (x.id === s.id ? { ...x, lines } : x)) })}
                  />
                  <div className="rounded-2xl bg-roi-50 border border-roi-100 p-3 flex justify-between text-lg text-nuit-900">
                    <span>Sous-total</span>
                    <b>{fmtMoney(s.lines.reduce((a, l) => a + Math.round(l.qty * l.pu), 0))}</b>
                  </div>
                </section>
              );
            })}
            <div className="rounded-3xl p-4 flex justify-between items-center text-lg text-white bg-gradient-to-r from-nuit-900 to-nuit-700 shadow-xl">
              <span>Total métrage<br /><b className="text-2xl">{fmtNum(totals.metrage)} m²</b></span>
              <b className="text-or-400 text-2xl"><CountUp value={totals.worksTotal} suffix=" F" /></b>
            </div>
            {errs.includes("nolines") && <p className="font-semibold text-red-600 text-lg">⚠ Ajoutez au moins une ligne</p>}
            {errs.includes("lines") && <p className="font-semibold text-red-600 text-lg">⚠ Complétez les lignes en rouge</p>}
          </div>
        )}

        {step === 3 && (
          <section className="card space-y-3">
            <div className="relative -m-4 mb-1 h-28 overflow-hidden rounded-t-3xl"><img src="/images/site.jpg" alt="" className="absolute inset-0 h-full w-full object-cover anim-kenburns" /><div className="absolute inset-0 bg-gradient-to-t from-nuit-950/90 to-nuit-900/20" /><h2 className="absolute bottom-3 left-4 text-2xl font-black text-white">🧰 Matériaux</h2></div>
            <p className="text-slate-600">Ciment, sable, carreaux, colle, joint, fer, bois… (facultatif)</p>
            <LinesEditor
              lines={q.materials}
              startNumber={totals.lineCount - q.materials.length + 1}
              category="materiaux"
              showErrors={showErr}
              emptyText="Aucun matériau. Vous pouvez passer à l'étape suivante."
              onChange={(materials) => set({ materials })}
            />
            <div className="rounded-2xl bg-roi-50 border border-roi-100 p-3 flex justify-between text-lg text-nuit-900">
              <span>Total matériaux</span>
              <b>{fmtMoney(totals.materialsTotal)}</b>
            </div>
            {errs.includes("lines") && <p className="font-semibold text-red-600 text-lg">⚠ Complétez les lignes en rouge</p>}
          </section>
        )}

        {step === 3 && (() => {
          const tiled = q.sections.filter((x) => x.type === "carrelage").reduce((a, x) => a + sectionMetrage(x), 0);
          if (tiled <= 0) return null;
          const priceOf = (re: RegExp) => catalog.find((c) => c.category === "materiaux" && re.test(c.designation))?.pu ?? 0;
          const sugg = [
            { designation: "Carreaux (10 % de chute inclus)", unit: "m²" as const, qty: Math.ceil(tiled * 1.1), pu: priceOf(/carreau/i), why: `${fmtNum(tiled)} m² + 10 %` },
            { designation: "Colle carrelage (sac 25 kg)", unit: "u" as const, qty: Math.ceil((tiled * 5) / 25), pu: priceOf(/colle/i), why: "≈ 5 kg par m²" },
            { designation: "Joint (sac 5 kg)", unit: "u" as const, qty: Math.ceil(tiled / 15), pu: priceOf(/joint/i), why: "≈ 1 sac pour 15 m²" },
          ];
          const exists = (d: string) => q.materials.some((m) => m.designation.split(" (")[0].toLowerCase() === d.split(" (")[0].toLowerCase());
          const todo = sugg.filter((x) => !exists(x.designation));
          return (
            <section className="relative overflow-hidden rounded-3xl p-4 text-white shadow-xl bg-gradient-to-br from-nuit-950 via-nuit-900 to-roi-600 anim-fade-up">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-or-500/25 blur-2xl" />
              <div className="relative flex items-center gap-3">
                <span className="grid place-items-center h-12 w-12 rounded-2xl bg-gradient-to-br from-or-400 to-or-600 text-2xl anim-float">🧮</span>
                <div>
                  <div className="text-xs font-bold tracking-widest text-or-400">ESTIMATION AUTOMATIQUE</div>
                  <div className="text-lg font-black">Pour {fmtNum(tiled)} m² de carrelage</div>
                </div>
              </div>
              <div className="relative mt-3 space-y-2">
                {sugg.map((x) => (
                  <div key={x.designation} className={`flex items-center justify-between rounded-2xl px-3 py-2.5 ${exists(x.designation) ? "bg-white/5 opacity-60" : "bg-white/10"}`}>
                    <div className="min-w-0">
                      <div className="font-bold truncate">{x.designation}</div>
                      <div className="text-xs text-blue-100/70">{x.why}</div>
                    </div>
                    <div className="text-right shrink-0 pl-2">
                      <div className="text-xl font-black text-or-400">{x.qty} <span className="text-sm">{x.unit}</span></div>
                      {exists(x.designation) && <div className="text-[11px] font-bold text-emerald-300">✓ ajouté</div>}
                    </div>
                  </div>
                ))}
              </div>
              {todo.length > 0 && (
                <button
                  className="btn-gold shine relative w-full mt-3"
                  onClick={() => set({ materials: [...q.materials, ...todo.map((x) => ({ id: uid(), designation: x.designation, unit: x.unit, qty: x.qty, pu: x.pu }))] })}
                >
                  ＋ Ajouter {todo.length > 1 ? `ces ${todo.length} matériaux` : "ce matériau"}
                </button>
              )}
              {todo.some((x) => !x.pu) && <p className="relative mt-2 text-xs text-blue-100/70">Complétez les prix manquants dans les lignes ci-dessus.</p>}
            </section>
          );
        })()}

        {step === 4 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {(["global", "section"] as const).map((sc) => (
                <button
                  key={sc}
                  onClick={() => set({ laborScope: sc })}
                  className={`rounded-xl border-2 p-3 min-h-[64px] font-bold ${q.laborScope === sc ? "seg-on" : "seg-off"} transition active:scale-95`}
                >
                  {sc === "global" ? "Pour tout le devis" : "Par type de travaux"}
                </button>
              ))}
            </div>
            {q.laborScope === "global" ? (
              <LaborEditor title="Main d'œuvre" labor={q.labor} autoQty={totals.metrage} onChange={(labor) => set({ labor })} error={showErr ? laborError(q.labor, totals.metrage) : undefined} />
            ) : (
              q.sections.map((s) => (
                <LaborEditor
                  key={s.id}
                  title={`Main d'œuvre ${workLabel(s.type)}`}
                  labor={s.labor}
                  autoQty={sectionMetrage(s)}
                  error={showErr ? laborError(s.labor, sectionMetrage(s)) : undefined}
                  onChange={(labor) => set({ sections: q.sections.map((x) => (x.id === s.id ? { ...x, labor } : x)) })}
                />
              ))
            )}
          </div>
        )}

        {step === 5 && (
          <div className="card space-y-4">
            <div>
              <span className="label">TVA</span>
              <div className="grid grid-cols-2 gap-2 mb-2">
                {[0, 18].map((r) => (
                  <button
                    key={r}
                    onClick={() => set({ vatRate: r })}
                    className={`rounded-xl border-2 min-h-[52px] font-bold ${(q.vatRate || 0) === r ? "seg-on" : "seg-off"} transition active:scale-95`}
                  >
                    {r === 0 ? "Sans TVA" : "TVA 18 %"}
                  </button>
                ))}
              </div>
              {(q.vatRate || 0) > 0 && (
                <div className="rounded-2xl bg-sable-50 p-3 text-base space-y-1 anim-fade-up">
                  <div className="flex justify-between"><span className="text-slate-500">Total HT</span><b>{fmtMoney(totals.totalHT)}</b></div>
                  <div className="flex justify-between"><span className="text-slate-500">TVA ({fmtNum(totals.vatRate)} %)</span><b>{fmtMoney(totals.vat)}</b></div>
                  <div className="flex justify-between text-nuit-900"><span className="font-bold">Total TTC</span><b>{fmtMoney(totals.total)}</b></div>
                </div>
              )}
            </div>
            <div>
              <span className="label">Acompte et reste à payer</span>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {(["percent", "amount", "custom"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      if (m === "percent") set({ depositMode: m, depositValue: settings.depositPercent });
                      else if (m === "amount") set({ depositMode: m, depositValue: Math.round((totals.total * settings.depositPercent) / 100) });
                      else set({ depositMode: m, depositValue: Math.round((totals.total * settings.depositPercent) / 100), customRest: totals.total - Math.round((totals.total * settings.depositPercent) / 100) });
                    }}
                    className={`rounded-xl border-2 min-h-[52px] font-bold text-sm ${q.depositMode === m ? "seg-on" : "seg-off"} transition active:scale-95`}
                  >
                    {m === "percent" ? "% du total" : m === "amount" ? "Montant auto" : "Personnalisé"}
                  </button>
                ))}
              </div>
              {q.depositMode === "custom" ? (
                <div className="space-y-3 anim-fade-up">
                  <Field label="Acompte (F)">
                    <NumInput value={q.depositValue} onChange={(n) => set({ depositValue: n })} placeholder="Ex : 500 000" />
                  </Field>
                  <Field label="Reste à payer (F)">
                    <NumInput value={q.customRest || 0} onChange={(n) => set({ customRest: n })} placeholder="Ex : 500 000" />
                  </Field>
                </div>
              ) : (
                <>
                  <NumInput value={q.depositValue} onChange={(n) => set({ depositValue: n })} error={errs.includes("deposit")} placeholder={q.depositMode === "percent" ? "Ex : 50 %" : "Ex : 500 000 F"} />
                  <span className="mt-1 block text-sm text-slate-500">{q.depositMode === "percent" ? "Pourcentage du montant total" : "Montant à recevoir avant les travaux"}</span>
                </>
              )}
              {errs.includes("deposit") && <p className="mt-1 font-semibold text-red-600">⚠ L&apos;acompte dépasse le total</p>}
              <div className="mt-3 rounded-2xl bg-nuit-900 text-white p-4 text-lg space-y-1.5 shadow-xl">
                <div className="flex justify-between"><span className="text-blue-100/80">Montant total{totals.vat > 0 ? " TTC" : ""}</span><b><CountUp value={totals.total} suffix=" F" /></b></div>
                <div className="flex justify-between"><span className="text-blue-100/80">Acompte</span><b><CountUp value={totals.deposit} suffix=" F" /></b></div>
                <div className="h-2 rounded-full bg-white/15 overflow-hidden"><div className="h-full bg-gradient-to-r from-or-400 to-or-600 transition-all duration-500" style={{ width: `${totals.total ? (totals.deposit / totals.total) * 100 : 0}%` }} /></div>
                <div className="flex justify-between text-or-400 text-xl"><span>Reste à payer</span><b><CountUp value={totals.rest} suffix=" F" /></b></div>
              </div>
            </div>
            <Field label="Conditions de paiement">
              <textarea className="input min-h-[96px]" value={q.paymentTerms} onChange={(e) => set({ paymentTerms: e.target.value })} />
            </Field>
            <Field label="Validité du devis (jours)">
              <NumInput value={q.validityDays} onChange={(n) => set({ validityDays: Math.round(n) })} />
            </Field>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-[380px_minmax(0,1fr)] lg:gap-6 lg:items-start">
            <div className="no-print space-y-4 lg:sticky lg:top-[210px]">
            <div className="card space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-nuit-900 flex items-center gap-2"><span className="grid place-items-center h-8 w-8 rounded-full bg-nuit-900 text-or-400 text-sm font-black">1</span>Modèle du document</h3>
                <span key={tpl} className="rounded-full bg-or-100 px-3 py-1 text-xs font-black text-or-600 anim-pop">{templateInfo(tpl).name}</span>
              </div>
              <TemplatePicker
                value={tpl}
                compact
                onChange={(id) => {
                  set({ template: id });
                  if (settings.defaultTemplate !== id) saveSettings({ ...settings, defaultTemplate: id });
                }}
              />
              <p className="text-xs text-slate-500">Le modèle choisi est mémorisé pour vos prochains devis.</p>
            </div>
            <div className="card space-y-3">
              <h3 className="text-lg font-black text-nuit-900 flex items-center gap-2"><span className="grid place-items-center h-8 w-8 rounded-full bg-nuit-900 text-or-400 text-sm font-black">2</span>Exporter</h3>
              <ExportBar quote={q} />
              <div>
                <span className="label">Statut</span>
                <div className="grid grid-cols-3 gap-2">
                  {STATUSES.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => {
                        set({ status: s.key });
                        if (s.key === "accepte" && q.status !== "accepte") setParty((x) => x + 1);
                      }}
                      className={`rounded-2xl border-2 min-h-[50px] font-bold transition active:scale-95 ${q.status === s.key ? "border-transparent shadow-md " + s.cls : "border-slate-200 bg-white text-slate-500"}`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            </div>
            <PdfPreview quote={q} settings={settings} template={tpl} />
            <Confetti fire={party} />
          </div>
        )}
      </main>
      {step < 6 && (
        <aside className="no-print hidden xl:block sticky top-[200px] self-start py-4 max-h-[calc(100dvh-200px)] overflow-y-auto">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="flex items-center gap-2 text-sm font-black tracking-wider text-nuit-700">
              <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-or-500 opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-or-500" /></span>
              APERÇU EN DIRECT
            </span>
            <span className="text-xs text-slate-400">Alt + → / ← pour changer d&apos;étape</span>
          </div>
          <PdfPreview quote={q} settings={settings} template={tpl} delay={700} />
        </aside>
      )}
      </div>

      {/* Barre de navigation de l'assistant */}
      <div className="no-print fixed inset-x-0 bottom-[calc(80px+env(safe-area-inset-bottom))] lg:bottom-5 lg:left-72 z-30 px-3 pb-2">
        <div className="mx-auto max-w-2xl lg:max-w-xl grid grid-cols-[1fr_1.4fr] gap-3 rounded-3xl bg-white/90 backdrop-blur-xl p-2 shadow-[0_10px_30px_-10px_rgba(10,31,68,0.35)] border border-white">
          <button className="btn-secondary" onClick={() => (step === 0 ? exit() : go(step - 1))}>← {step === 0 ? "Annuler" : "Retour"}</button>
          {step < 6 ? (
            <button className={step === 5 ? "btn-gold shine" : "btn-primary"} onClick={() => go(step + 1)}>{step === 5 ? "Voir l\u2019aperçu" : "Suivant"} →</button>
          ) : (
            <button className="btn-gold" onClick={exit}>✓ Terminer</button>
          )}
        </div>
      </div>
      <div className="h-28 no-print" />
    </div>
  );
}
