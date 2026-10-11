"use client";

import { TEMPLATES } from "@/lib/templates";
import { TemplateId } from "@/lib/types";

export function TemplatePicker({ value, onChange, compact = false }: { value: TemplateId; onChange: (id: TemplateId) => void; compact?: boolean }) {
  return (
    <div className={compact ? "grid grid-cols-2 gap-3" : "-mx-4 px-4 flex gap-3 overflow-x-auto snap-x pb-2 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-4 sm:overflow-visible"}>
      {TEMPLATES.map((tpl, i) => {
        const on = tpl.id === value;
        return (
          <button
            key={tpl.id}
            type="button"
            onClick={() => onChange(tpl.id)}
            aria-pressed={on}
            className={`group relative snap-start shrink-0 ${compact ? "" : "w-36 sm:w-auto"} text-left rounded-2xl bg-white p-2 transition duration-300 active:scale-95 anim-fade-up ${
              on ? "ring-4 ring-or-500 shadow-xl -translate-y-0.5" : "ring-1 ring-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5"
            }`}
            style={{ animationDelay: `${i * 0.06}s` }}
          >
            <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={tpl.thumb} alt={`Modèle ${tpl.name}`} className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-105" loading="lazy" />
              {on && (
                <span className="absolute top-2 right-2 grid place-items-center h-8 w-8 rounded-full bg-or-500 text-nuit-950 font-black shadow-lg anim-pop">✓</span>
              )}
            </div>
            <div className="mt-2 px-1 flex items-center justify-between gap-1">
              <span className="font-black text-nuit-900">{tpl.name}</span>
              <span className="flex -space-x-1">
                {tpl.swatches.map((c) => (
                  <span key={c} className="h-4 w-4 rounded-full ring-2 ring-white" style={{ background: c, boxShadow: c === "#ffffff" ? "inset 0 0 0 1px #cbd5e1" : undefined }} />
                ))}
              </span>
            </div>
            <div className="px-1 text-xs leading-snug text-slate-500">{tpl.tagline}</div>
          </button>
        );
      })}
    </div>
  );
}
