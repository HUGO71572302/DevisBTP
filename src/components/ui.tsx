"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { fmtNum, parseNum } from "@/lib/format";
import { Unit, UNITS } from "@/lib/types";

export function NumInput({
  value,
  onChange,
  className = "",
  placeholder,
  error,
  ariaLabel,
}: {
  value: number;
  onChange: (n: number) => void;
  className?: string;
  placeholder?: string;
  error?: boolean;
  ariaLabel?: string;
}) {
  const [text, setText] = useState(value ? fmtNum(value) : "");
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(value ? fmtNum(value) : "");
  }, [value, focused]);
  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={ariaLabel}
      className={`input ${error ? "input-error" : ""} ${className}`}
      placeholder={placeholder ?? "0"}
      value={text}
      onFocus={(e) => {
        setFocused(true);
        setText(value ? String(value).replace(".", ",") : "");
        setTimeout(() => e.target.select(), 0);
      }}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        const v = e.target.value.replace(/[^\d,.\s]/g, "");
        setText(v);
        onChange(Math.max(0, parseNum(v)));
      }}
    />
  );
}

export function UnitSelect({ value, onChange }: { value: Unit; onChange: (u: Unit) => void }) {
  return (
    <select className="input !px-2" value={value} onChange={(e) => onChange(e.target.value as Unit)} aria-label="Unité">
      {UNITS.map((u) => (
        <option key={u} value={u}>
          {u}
        </option>
      ))}
    </select>
  );
}

export function Field({ label, error, children, hint }: { label: string; error?: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-sm text-slate-500">{hint}</span>}
      {error && <span className="mt-1 block text-base font-semibold text-red-600 anim-fade-up">⚠ {error}</span>}
    </label>
  );
}

/** En-tête de page avec photo de chantier animée. */
export function PageTitle({ children, sub, image = "/images/hero.jpg", icon }: { children: ReactNode; sub?: ReactNode; image?: string; icon?: string }) {
  return (
    <header className="relative overflow-hidden text-white rounded-b-[2rem] shadow-xl">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover anim-kenburns" />
      <div className="absolute inset-0 bg-gradient-to-br from-nuit-950/95 via-nuit-900/85 to-roi-600/50" />
      <div className="absolute -right-10 -bottom-12 h-40 w-40 rounded-full bg-or-500/25 blur-2xl" />
      <div className="relative mx-auto max-w-2xl lg:max-w-5xl px-5 pt-[calc(env(safe-area-inset-top)+22px)] pb-7">
        <div className="flex items-center gap-3 anim-fade-up">
          {icon && <span className="grid place-items-center h-12 w-12 rounded-2xl bg-white/10 backdrop-blur border border-white/20 text-2xl">{icon}</span>}
          <div>
            <h1 className="text-[28px] leading-tight font-black tracking-tight">{children}</h1>
            <div className="h-1 w-14 mt-1.5 rounded-full bg-gradient-to-r from-or-400 to-or-600 anim-bar" />
          </div>
        </div>
        {sub && <div className="text-blue-100/90 mt-3 text-base anim-fade-up" style={{ animationDelay: "0.1s" }}>{sub}</div>}
      </div>
    </header>
  );
}

export function Toast({ msg, onDone }: { msg: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!msg) return;
    const id = setTimeout(onDone, 3800);
    return () => clearTimeout(id);
  }, [msg, onDone]);
  if (!msg) return null;
  return (
    <div className="toast no-print fixed left-1/2 lg:left-[calc(50%+9rem)] bottom-28 lg:bottom-8 z-50 w-max max-w-[92vw] rounded-2xl bg-nuit-900 text-white px-5 py-3.5 text-base font-semibold shadow-2xl text-center border border-or-500/40">
      {msg}
    </div>
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="sheet-backdrop no-print fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-nuit-950/60 backdrop-blur-sm lg:p-6" onClick={onClose}>
      <div className="sheet-panel w-full max-w-2xl lg:max-w-xl max-h-[86dvh] overflow-y-auto rounded-t-[2rem] lg:rounded-[2rem] bg-sable-50 p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] lg:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-300" />
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-black text-nuit-900">{title}</h2>
          <button className="btn-icon !min-w-[48px] !min-h-[48px]" onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Nombre qui défile jusqu'à sa valeur. */
export function CountUp({ value, suffix = "", duration = 700 }: { value: number; suffix?: string; duration?: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const [bump, setBump] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    const b = value;
    if (a === b) return;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(a + (b - a) * e));
      if (p < 1) raf = requestAnimationFrame(tick);
      else {
        from.current = b;
        setBump((x) => x + 1);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return (
    <span key={bump} className={bump ? "anim-bump" : ""}>
      {fmtNum(shown, 0)}
      {suffix}
    </span>
  );
}

const CONFETTI_COLORS = ["#f0a81c", "#f7c04a", "#1e4fd8", "#2f6bff", "#ffffff", "#0a1f44"];

/** Pluie de confettis or et bleu (célébration). */
export function Confetti({ fire }: { fire: number }) {
  const [pieces, setPieces] = useState<{ id: number; left: number; dx: number; rot: number; dur: number; color: string; delay: number }[]>([]);
  useEffect(() => {
    if (!fire) return;
    const p = Array.from({ length: 46 }, (_, i) => ({
      id: fire * 100 + i,
      left: Math.random() * 100,
      dx: (Math.random() - 0.5) * 200,
      rot: (Math.random() - 0.5) * 1080,
      dur: 1.6 + Math.random() * 1.2,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delay: Math.random() * 0.25,
    }));
    setPieces(p);
    const id = setTimeout(() => setPieces([]), 3200);
    return () => clearTimeout(id);
  }, [fire]);
  return (
    <>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece no-print"
          style={
            {
              left: `${p.left}vw`,
              background: p.color,
              animationDelay: `${p.delay}s`,
              "--dx": `${p.dx}px`,
              "--rot": `${p.rot}deg`,
              "--dur": `${p.dur}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </>
  );
}
