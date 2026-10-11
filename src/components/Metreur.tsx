"use client";

import { useState } from "react";
import { fmtNum } from "@/lib/format";
import { Unit } from "@/lib/types";
import { NumInput, Sheet } from "./ui";

type Mode = "sol" | "mur" | "plinthe";
interface Zone {
  l: number;
  w: number;
}

const DOOR = { w: 0.9, h: 2.1 };
const WINDOW = { w: 1.2, h: 1.0 };
const r2 = (n: number) => Math.round(n * 100) / 100;

function Plan({ l, w, mode }: { l: number; w: number; mode: Mode }) {
  const L = l || 4;
  const W = w || 3;
  const max = Math.max(L, W);
  const pw = (L / max) * 190;
  const ph = (W / max) * 120;
  const x = (240 - pw) / 2;
  const y = (160 - ph) / 2;
  return (
    <svg viewBox="0 0 240 160" className="w-full h-40">
      <defs>
        <pattern id="tile" width="16" height="16" patternUnits="userSpaceOnUse">
          <rect width="16" height="16" fill="#fdf1d8" />
          <path d="M16 0H0V16" fill="none" stroke="#f0a81c" strokeOpacity=".45" strokeWidth="1" />
        </pattern>
      </defs>
      <rect
        x={x}
        y={y}
        width={pw}
        height={ph}
        rx="4"
        fill={mode === "sol" ? "url(#tile)" : "#f1f5ff"}
        stroke="#0a1f44"
        strokeWidth={mode === "sol" ? 3 : 7}
        style={{ transition: "all .5s cubic-bezier(.2,.8,.2,1)" }}
      />
      {mode !== "sol" && <rect x={x + 3.5} y={y + 3.5} width={Math.max(0, pw - 7)} height={Math.max(0, ph - 7)} fill="none" stroke={mode === "plinthe" ? "#f0a81c" : "#1e4fd8"} strokeWidth="3" strokeDasharray={mode === "plinthe" ? "0" : "6 4"} style={{ transition: "all .5s" }} />}
      <text x="120" y={y - 6} textAnchor="middle" fontSize="12" fontWeight="800" fill="#0a1f44">{fmtNum(L)} m</text>
      <text x={x + pw + 6} y="84" fontSize="12" fontWeight="800" fill="#0a1f44">{fmtNum(W)} m</text>
    </svg>
  );
}

export function Metreur({ open, onClose, onUse }: { open: boolean; onClose: () => void; onUse: (qty: number, unit: Unit) => void }) {
  const [mode, setMode] = useState<Mode>("sol");
  const [zones, setZones] = useState<Zone[]>([{ l: 0, w: 0 }]);
  const [h, setH] = useState(2.7);
  const [doors, setDoors] = useState(1);
  const [windows, setWindows] = useState(1);
  const [wasted, setWasted] = useState(false);

  const z0 = zones[0];
  const floor = zones.reduce((a, z) => a + z.l * z.w, 0);
  const perim = zones.reduce((a, z) => a + 2 * (z.l + z.w), 0);
  const openings = doors * DOOR.w * DOOR.h + windows * WINDOW.w * WINDOW.h;
  let result = 0;
  let unit: Unit = "m²";
  let detail = "";
  if (mode === "sol") {
    result = floor;
    detail = zones.filter((z) => z.l && z.w).map((z) => `${fmtNum(z.l)} × ${fmtNum(z.w)}`).join(" + ");
  } else if (mode === "mur") {
    result = Math.max(0, perim * h - openings);
    detail = `${fmtNum(r2(perim))} m × ${fmtNum(h)} m − ${fmtNum(r2(openings))} m² d'ouvertures`;
  } else {
    unit = "ml";
    result = Math.max(0, perim - doors * DOOR.w);
    detail = `${fmtNum(r2(perim))} m − ${doors} porte(s)`;
  }
  if (wasted) result *= 1.1;
  result = r2(result);

  const setZone = (i: number, p: Partial<Zone>) => setZones(zones.map((z, j) => (j === i ? { ...z, ...p } : z)));
  const counter = (label: string, v: number, set: (n: number) => void, icon: string) => (
    <div className="flex items-center justify-between rounded-2xl bg-white border border-slate-200 p-2 pl-3">
      <span className="font-bold text-nuit-900">{icon} {label}</span>
      <span className="flex items-center gap-2">
        <button className="btn-icon !min-w-[42px]" onClick={() => set(Math.max(0, v - 1))}>−</button>
        <b key={v} className="w-6 text-center text-lg anim-pop">{v}</b>
        <button className="btn-icon !min-w-[42px]" onClick={() => set(v + 1)}>＋</button>
      </span>
    </div>
  );

  return (
    <Sheet open={open} onClose={onClose} title="📐 Métreur">
      <div className="grid grid-cols-3 gap-2 mb-3">
        {([
          ["sol", "Sol", "⬜"],
          ["mur", "Murs", "🧱"],
          ["plinthe", "Plinthes", "📏"],
        ] as const).map(([k, l, i]) => (
          <button key={k} onClick={() => setMode(k)} className={`rounded-2xl border-2 min-h-[52px] font-bold transition active:scale-95 ${mode === k ? "seg-on" : "seg-off"}`}>
            {i} {l}
          </button>
        ))}
      </div>

      <div className="rounded-3xl bg-white border border-slate-200 p-2 mb-3">
        <Plan l={z0.l} w={z0.w} mode={mode} />
      </div>

      <div className="space-y-2">
        {zones.map((z, i) => (
          <div key={i} className="grid grid-cols-[1fr_auto_1fr_auto] items-end gap-2 anim-fade-up">
            <label>
              <span className="text-sm font-bold text-slate-500">{zones.length > 1 ? `Zone ${i + 1} – ` : ""}Longueur (m)</span>
              <NumInput value={z.l} onChange={(n) => setZone(i, { l: n })} placeholder="4,5" />
            </label>
            <span className="pb-3 text-xl font-black text-slate-400">×</span>
            <label>
              <span className="text-sm font-bold text-slate-500">Largeur (m)</span>
              <NumInput value={z.w} onChange={(n) => setZone(i, { w: n })} placeholder="3,8" />
            </label>
            {zones.length > 1 ? (
              <button className="btn-icon !text-red-600 mb-1" onClick={() => setZones(zones.filter((_, j) => j !== i))} aria-label="Retirer">✕</button>
            ) : (
              <span className="w-[44px]" />
            )}
          </div>
        ))}
        <button className="w-full rounded-2xl border-2 border-dashed border-slate-300 min-h-[46px] font-bold text-nuit-700 active:scale-[0.98] transition" onClick={() => setZones([...zones, { l: 0, w: 0 }])}>
          ＋ Ajouter une zone (pièce en L, placard…)
        </button>
      </div>

      {mode === "mur" && (
        <div className="mt-3 space-y-2 anim-fade-up">
          <label className="block">
            <span className="text-sm font-bold text-slate-500">Hauteur à carreler (m)</span>
            <NumInput value={h} onChange={setH} placeholder="2,7" />
          </label>
          {counter(`Portes (${fmtNum(DOOR.w)} × ${fmtNum(DOOR.h)})`, doors, setDoors, "🚪")}
          {counter(`Fenêtres (${fmtNum(WINDOW.w)} × ${fmtNum(WINDOW.h)})`, windows, setWindows, "🪟")}
        </div>
      )}
      {mode === "plinthe" && <div className="mt-3 anim-fade-up">{counter(`Portes (${fmtNum(DOOR.w)} m chacune)`, doors, setDoors, "🚪")}</div>}

      <label className="mt-3 flex items-center gap-3 min-h-[48px] font-semibold text-nuit-800">
        <input type="checkbox" className="h-6 w-6 accent-[#f0a81c]" checked={wasted} onChange={(e) => setWasted(e.target.checked)} />
        Ajouter 10 % de chute
      </label>

      <div className="mt-3 rounded-3xl bg-gradient-to-br from-nuit-950 to-nuit-700 p-4 text-white shadow-xl">
        <div className="text-xs font-bold tracking-widest text-or-400">RÉSULTAT</div>
        <div key={result} className="text-4xl font-black anim-pop">
          {fmtNum(result)} <span className="text-2xl">{unit}</span>
        </div>
        {detail && <div className="mt-1 text-sm text-blue-100/70">{detail}{wasted ? " + 10 %" : ""}</div>}
      </div>
      <button
        className="btn-gold shine w-full mt-3"
        disabled={result <= 0}
        onClick={() => {
          onUse(result, unit);
          onClose();
        }}
      >
        ✓ Utiliser {fmtNum(result)} {unit}
      </button>
    </Sheet>
  );
}
