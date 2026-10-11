"use client";

import { useState } from "react";
import { lineAmount } from "@/lib/calc";
import { fmtMoney, uid } from "@/lib/format";
import { useStore } from "@/lib/store";
import { CAT_CATEGORIES, CatCategory, Line } from "@/lib/types";
import { NumInput, Sheet, UnitSelect } from "./ui";
import { Metreur } from "./Metreur";

export function lineErrors(l: Line): { designation?: string; qty?: string; pu?: string } {
  return {
    designation: l.designation.trim() ? undefined : "Désignation obligatoire",
    qty: l.qty > 0 ? undefined : "Quantité manquante",
    pu: l.pu > 0 ? undefined : "Prix manquant",
  };
}

export function LinesEditor({
  lines,
  onChange,
  startNumber,
  category,
  showErrors,
  emptyText,
}: {
  lines: Line[];
  onChange: (l: Line[]) => void;
  startNumber: number;
  category: CatCategory;
  showErrors: boolean;
  emptyText: string;
}) {
  const { catalog } = useStore();
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState<CatCategory>(category);
  const [search, setSearch] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const [measure, setMeasure] = useState<number | null>(null);

  const update = (i: number, patch: Partial<Line>) => onChange(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= lines.length) return;
    const c = [...lines];
    [c[i], c[j]] = [c[j], c[i]];
    onChange(c);
  };
  const addEmpty = () => onChange([...lines, { id: uid(), designation: "", unit: category === "materiaux" ? "u" : "m²", qty: 0, pu: 0 }]);

  const items = catalog.filter(
    (c) => (search ? true : c.category === cat) && c.designation.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <div className="space-y-3">
      {lines.length === 0 && <p className="rounded-2xl border-2 border-dashed border-slate-300 bg-white/60 p-5 text-slate-500 text-center">🧱 {emptyText}</p>}
      {lines.map((l, i) => {
        const err = showErrors ? lineErrors(l) : {};
        return (
          <div key={l.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm anim-fade-up">
            <div className="flex items-center gap-2">
              <span className="shrink-0 grid place-items-center h-9 min-w-9 px-1 rounded-full bg-gradient-to-br from-nuit-900 to-roi-600 text-or-400 font-black shadow">{startNumber + i}</span>
              <input
                className={`input ${err.designation ? "input-error" : ""}`}
                placeholder="Désignation (ex : Chambre 1)"
                value={l.designation}
                onChange={(e) => update(i, { designation: e.target.value })}
              />
            </div>
            <div className="mt-2 grid grid-cols-[0.9fr_1fr_1.2fr] gap-2">
              <div>
                <span className="text-sm font-semibold text-slate-500">Unité</span>
                <UnitSelect value={l.unit} onChange={(u) => update(i, { unit: u })} />
              </div>
              <div>
                <span className="text-sm font-semibold text-slate-500">Quantité</span>
                <NumInput value={l.qty} onChange={(n) => update(i, { qty: n })} error={!!err.qty} ariaLabel="Quantité" />
              </div>
              <div>
                <span className="text-sm font-semibold text-slate-500">Prix unitaire</span>
                <NumInput value={l.pu} onChange={(n) => update(i, { pu: n })} error={!!err.pu} ariaLabel="Prix unitaire" />
              </div>
            </div>
            {(err.designation || err.qty || err.pu) && (
              <p className="mt-1 text-sm font-semibold text-red-600">⚠ {[err.designation, err.qty, err.pu].filter(Boolean).join(" · ")}</p>
            )}
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="text-lg">
                <span className="text-slate-500 text-base">Montant : </span>
                <b className="text-nuit-900 text-xl">{fmtMoney(lineAmount(l))}</b>
              </div>
              <div className="flex gap-1.5">
                {category !== "materiaux" && (
                  <button className="btn-icon !bg-or-100 !border-or-400/50" onClick={() => setMeasure(i)} aria-label="Métreur" title="Calculer la surface">📐</button>
                )}
                <button className="btn-icon" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Monter">↑</button>
                <button className="btn-icon" onClick={() => move(i, 1)} disabled={i === lines.length - 1} aria-label="Descendre">↓</button>
                <button className="btn-icon" onClick={() => onChange([...lines.slice(0, i + 1), { ...l, id: uid() }, ...lines.slice(i + 1)])} aria-label="Dupliquer">⧉</button>
                <button
                  className="btn-icon !text-red-600"
                  onClick={() => {
                    if (!l.designation && !l.qty && !l.pu ? true : confirm(`Supprimer la ligne « ${l.designation || startNumber + i} » ?`))
                      onChange(lines.filter((_, j) => j !== i));
                  }}
                  aria-label="Supprimer"
                >
                  🗑
                </button>
              </div>
            </div>
          </div>
        );
      })}
      <div className="grid grid-cols-2 gap-2">
        <button className="btn-gold" onClick={() => { setCat(category); setSearch(""); setOpen(true); }}>📦 Catalogue</button>
        <button className="btn-secondary" onClick={addEmpty}>＋ Ligne vide</button>
      </div>

      <Metreur
        key={measure ?? -1}
        open={measure !== null}
        onClose={() => setMeasure(null)}
        onUse={(qty, unit) => {
          if (measure !== null) update(measure, { qty, unit });
        }}
      />

      <Sheet open={open} onClose={() => setOpen(false)} title="Ajouter depuis le catalogue">
        <input className="input mb-3" placeholder="🔍 Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} />
        {!search && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
            {CAT_CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setCat(c.key)}
                className={`chip ${cat === c.key ? "chip-on" : "chip-off"}`}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
        {flash && <div key={flash} className="mb-2 rounded-xl bg-nuit-900 text-or-400 px-3 py-2.5 font-bold anim-pop">✓ « {flash} » ajouté</div>}
        <div className="space-y-2 stagger">
          {items.length === 0 && <p className="text-slate-500 p-3">Aucun article. Ajoutez-en dans l&apos;onglet Catalogue.</p>}
          {items.map((c) => (
            <button
              key={c.id}
              className="w-full flex items-center justify-between rounded-2xl bg-white border border-slate-200 p-3 text-left active:scale-[0.98] active:bg-or-100 transition min-h-[62px] shadow-sm"
              onClick={() => {
                onChange([...lines, { id: uid(), designation: c.designation, unit: c.unit, qty: c.unit === "m²" || c.unit === "ml" || c.unit === "m³" ? 0 : 1, pu: c.pu }]);
                setFlash(c.designation);
                setTimeout(() => setFlash(null), 1500);
              }}
            >
              <span className="font-semibold text-lg">{c.designation}</span>
              <span className="whitespace-nowrap ml-2 flex items-center gap-2"><span className="font-black text-nuit-900">{fmtMoney(c.pu)}<span className="text-slate-400 text-sm font-semibold"> /{c.unit}</span></span><span className="grid place-items-center h-8 w-8 rounded-full bg-or-500 text-nuit-950 font-black">＋</span></span>
            </button>
          ))}
        </div>
        <button className="btn-primary w-full mt-4" onClick={() => setOpen(false)}>Terminé</button>
      </Sheet>
    </div>
  );
}
