"use client";

import { Settings } from "./types";

const INK = { bleu: "#1d3fbf", rouge: "#c3201f" };
const cache = new Map<string, string>();

function arcText(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, r: number, top: boolean, maxAngle: number, baseSize: number) {
  let size = baseSize;
  const spacing = 1.08;
  let widths: number[] = [];
  let total = 0;
  for (; size > 18; size -= 2) {
    ctx.font = `900 ${size}px Arial, Helvetica, sans-serif`;
    widths = [...text].map((c) => ctx.measureText(c).width * spacing);
    total = widths.reduce((a, b) => a + b, 0) / r;
    if (total <= maxAngle) break;
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const chars = [...text];
  if (top) {
    let a = -Math.PI / 2 - total / 2;
    chars.forEach((ch, i) => {
      const w = widths[i] / r;
      const ang = a + w / 2;
      ctx.save();
      ctx.translate(cx + r * Math.cos(ang), cy + r * Math.sin(ang));
      ctx.rotate(ang + Math.PI / 2);
      ctx.fillText(ch, 0, 0);
      ctx.restore();
      a += w;
    });
  } else {
    let a = Math.PI / 2 + total / 2;
    chars.forEach((ch, i) => {
      const w = widths[i] / r;
      const ang = a - w / 2;
      ctx.save();
      ctx.translate(cx + r * Math.cos(ang), cy + r * Math.sin(ang));
      ctx.rotate(ang - Math.PI / 2);
      ctx.fillText(ch, 0, 0);
      ctx.restore();
      a -= w;
    });
  }
}

/** Génère un cachet rond façon tampon encreur (PNG transparent). */
export function makeStamp(s: Settings): string {
  if (typeof document === "undefined") return "";
  const key = [s.name, s.city, s.phones, s.bp, s.stampColor].join("|");
  const hit = cache.get(key);
  if (hit) return hit;

  const S = 600;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const ctx = c.getContext("2d");
  if (!ctx) return "";
  const ink = INK[s.stampColor] ?? INK.bleu;
  const cx = S / 2;
  const cy = S / 2;

  ctx.translate(cx, cy);
  ctx.rotate((-12 * Math.PI) / 180);
  ctx.translate(-cx, -cy);
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;

  // anneaux
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.arc(cx, cy, 282, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, 258, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, 168, 0, Math.PI * 2);
  ctx.stroke();

  const name = (s.name || "ENTREPRISE").toUpperCase().replace(/\s+/g, " ").trim();
  const bottom = [s.city ? s.city.toUpperCase() : "", "TOGO"].filter(Boolean).join(" - ");
  arcText(ctx, name, cx, cy, 213, true, Math.PI * 0.95, 58);
  arcText(ctx, bottom, cx, cy, 213, false, Math.PI * 0.55, 46);

  // étoiles de séparation
  ctx.font = "900 34px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("★", cx - 213, cy);
  ctx.fillText("★", cx + 213, cy);

  // centre
  ctx.font = "900 40px Arial";
  ctx.fillText("★ ★ ★", cx, cy - 78);
  ctx.font = "900 50px Arial";
  ctx.fillText("LE", cx, cy - 22);
  ctx.font = "900 44px Arial";
  ctx.fillText("RESPONSABLE", cx, cy + 28);
  const tel = (s.phones || "").split("/")[0].trim();
  if (tel) {
    ctx.font = "700 32px Arial";
    ctx.fillText(`Tél : ${tel}`, cx, cy + 82);
  }

  // effet encre : petites lacunes aléatoires
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "destination-out";
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 1400; i++) {
    const r = rnd() * 3.2 + 0.6;
    ctx.globalAlpha = 0.35 + rnd() * 0.6;
    ctx.beginPath();
    ctx.arc(rnd() * S, rnd() * S, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";

  const url = c.toDataURL("image/png");
  cache.set(key, url);
  return url;
}
