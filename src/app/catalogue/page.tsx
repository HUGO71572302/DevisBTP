"use client";

import { useState } from "react";
import { fmtMoney, uid } from "@/lib/format";
import { useStore } from "@/lib/store";
import { CAT_CATEGORIES, CatalogItem, CatCategory } from "@/lib/types";
import { Field, NumInput, PageTitle, Sheet, UnitSelect } from "@/components/ui";

const CAT_IMG: Record<CatCategory, string> = {
  maconnerie: "/images/masonry-sm.jpg",
  carrelage: "/images/tiling-sm.jpg",
  ferraillage: "/images/rebar-sm.jpg",
  menuiserie: "/images/wood-sm.jpg",
  materiaux: "/images/site-sm.jpg",
};

export default function CataloguePage() {
  const { catalog, setCatalog } = useStore();
  const [cat, setCat] = useState<CatCategory>("carrelage");
  const [search, setSearch] = useState("");
  const [edit, setEdit] = useState<CatalogItem | null>(null);
  const [err, setErr] = useState(false);

  const list = catalog.filter((c) => (search ? true : c.category === cat) && c.designation.toLowerCase().includes(search.trim().toLowerCase()));

  const save = () => {
    if (!edit) return;
    if (!edit.designation.trim() || !(edit.pu > 0)) {
      setErr(true);
      return;
    }
    const exists = catalog.some((c) => c.id === edit.id);
    setCatalog(exists ? catalog.map((c) => (c.id === edit.id ? edit : c)) : [...catalog, edit]);
    setEdit(null);
  };

  return (
    <div>
      <PageTitle image="/images/tiles.jpg" icon="📦" sub="Vos désignations et prix. Les prix utilisés dans les devis sont mémorisés automatiquement.">Catalogue</PageTitle>
      <main className="mx-auto max-w-2xl lg:max-w-5xl p-4 space-y-3 anim-fade-up">
        <input className="input" placeholder="🔍 Rechercher un article…" value={search} onChange={(e) => setSearch(e.target.value)} />
        {!search && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {CAT_CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setCat(c.key)}
                className={`chip ${cat === c.key ? "chip-on" : "chip-off"}`}
              >
                {c.label} ({catalog.filter((x) => x.category === c.key).length})
              </button>
            ))}
          </div>
        )}
        <button
          className="btn-gold shine w-full lg:w-auto lg:px-8"
          onClick={() => {
            setErr(false);
            setEdit({ id: uid(), category: cat, designation: "", unit: cat === "materiaux" ? "u" : "m²", pu: 0 });
          }}
        >
          ＋ Nouvel article
        </button>
        <div key={cat + search} className="space-y-2 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-3 stagger">
          {list.length === 0 && <p className="text-center text-slate-500 p-6">Aucun article.</p>}
          {list.map((c) => (
            <button
              key={c.id}
              className="w-full card !p-3 flex items-center gap-3 text-left active:scale-[0.98] transition"
              onClick={() => {
                setErr(false);
                setEdit({ ...c });
              }}
            >
              <img src={CAT_IMG[c.category]} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
              <span className="flex-1 min-w-0">
                <span className="block text-lg font-bold truncate">{c.designation}</span>
                {search && <span className="text-sm text-slate-500">{CAT_CATEGORIES.find((x) => x.key === c.category)?.label}</span>}
              </span>
              <span className="text-right whitespace-nowrap"><span className="block font-black text-nuit-900">{fmtMoney(c.pu)}</span><span className="text-sm text-slate-400 font-semibold">par {c.unit}</span></span>
            </button>
          ))}
        </div>
      </main>

      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit && catalog.some((c) => c.id === edit.id) ? "Modifier l'article" : "Nouvel article"}>
        {edit && (
          <div className="space-y-4">
            <Field label="Désignation *" error={err && !edit.designation.trim() ? "Obligatoire" : undefined}>
              <input className="input" value={edit.designation} placeholder="Ex : Chambre" onChange={(e) => setEdit({ ...edit, designation: e.target.value })} />
            </Field>
            <Field label="Type de travaux">
              <select className="input" value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value as CatCategory })}>
                {CAT_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-[1fr_1.4fr] gap-3">
              <Field label="Unité">
                <UnitSelect value={edit.unit} onChange={(u) => setEdit({ ...edit, unit: u })} />
              </Field>
              <Field label="Prix unitaire (F) *" error={err && !(edit.pu > 0) ? "Obligatoire" : undefined}>
                <NumInput value={edit.pu} onChange={(n) => setEdit({ ...edit, pu: n })} />
              </Field>
            </div>
            <button className="btn-primary w-full" onClick={save}>✓ Enregistrer</button>
            {catalog.some((c) => c.id === edit.id) && (
              <button
                className="btn-danger w-full"
                onClick={() => {
                  if (confirm(`Supprimer « ${edit.designation} » du catalogue ?`)) {
                    setCatalog(catalog.filter((c) => c.id !== edit.id));
                    setEdit(null);
                  }
                }}
              >
                🗑 Supprimer
              </button>
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}
