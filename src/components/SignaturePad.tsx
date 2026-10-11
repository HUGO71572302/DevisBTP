"use client";

import { useEffect, useRef, useState } from "react";

/** Zone de signature au doigt. Renvoie un PNG transparent recadré. */
export function SignaturePad({ value, onSave }: { value: string; onSave: (dataUrl: string) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number; t: number } | null>(null);
  const [editing, setEditing] = useState(!value);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    if (!editing) return;
    const c = canvas.current;
    if (!c) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const r = c.getBoundingClientRect();
    c.width = r.width * dpr;
    c.height = r.height * dpr;
    const ctx = c.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0a1f44";
    setEmpty(true);
  }, [editing]);

  const pos = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() };
  };

  const down = (e: React.PointerEvent) => {
    e.preventDefault();
    canvas.current!.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = pos(e);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current || !last.current) return;
    const p = pos(e);
    const ctx = canvas.current!.getContext("2d")!;
    const dist = Math.hypot(p.x - last.current.x, p.y - last.current.y);
    const speed = dist / Math.max(1, p.t - last.current.t);
    ctx.lineWidth = Math.max(1.6, 4.2 - speed * 1.6); // trait plus fin quand on va vite, comme un stylo
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    setEmpty(false);
  };
  const up = () => {
    drawing.current = false;
    last.current = null;
  };

  const clear = () => {
    const c = canvas.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setEmpty(true);
  };

  const save = () => {
    const c = canvas.current!;
    const ctx = c.getContext("2d")!;
    const { width: w, height: h } = c;
    const px = ctx.getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = 0, y1 = 0;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        if (px[(y * w + x) * 4 + 3] > 10) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
    if (x1 <= x0 || y1 <= y0) return;
    const pad = 8;
    x0 = Math.max(0, x0 - pad);
    y0 = Math.max(0, y0 - pad);
    x1 = Math.min(w, x1 + pad);
    y1 = Math.min(h, y1 + pad);
    const out = document.createElement("canvas");
    const scale = Math.min(1, 700 / (x1 - x0));
    out.width = Math.round((x1 - x0) * scale);
    out.height = Math.round((y1 - y0) * scale);
    out.getContext("2d")!.drawImage(c, x0, y0, x1 - x0, y1 - y0, 0, 0, out.width, out.height);
    onSave(out.toDataURL("image/png"));
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="space-y-2">
        <div className="relative grid place-items-center h-36 rounded-2xl border-2 border-slate-200 bg-white overflow-hidden">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="Signature" className="max-h-28 max-w-[90%] object-contain anim-pop" />
          ) : (
            <span className="text-slate-400">Aucune signature</span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-secondary !min-h-[48px]" onClick={() => setEditing(true)}>✍️ Refaire</button>
          {value && <button className="btn-danger !min-h-[48px]" onClick={() => onSave("")}>Retirer</button>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative h-44 rounded-2xl border-2 border-dashed border-roi-500 bg-white overflow-hidden">
        <div className="pointer-events-none absolute left-6 right-6 bottom-10 border-b-2 border-slate-200" />
        {empty && <span className="pointer-events-none absolute inset-0 grid place-items-center text-slate-400 text-lg">✍️ Signez ici avec le doigt</span>}
        <canvas
          ref={canvas}
          className="absolute inset-0 h-full w-full touch-none"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onPointerLeave={up}
        />
      </div>
      <div className="grid grid-cols-[1fr_1.4fr] gap-2">
        <button className="btn-secondary !min-h-[50px]" onClick={value && empty ? () => setEditing(false) : clear}>{value && empty ? "Annuler" : "Effacer"}</button>
        <button className="btn-gold !min-h-[50px]" onClick={save} disabled={empty}>✓ Enregistrer</button>
      </div>
    </div>
  );
}
