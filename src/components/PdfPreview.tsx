"use client";

import { useEffect, useRef, useState } from "react";
import { buildPdfBytes } from "@/lib/pdf";
import { Quote, Settings, TemplateId } from "@/lib/types";
import { ScaledDocument } from "./QuoteDocument";

/* pdf.js est chargé depuis /public (fonctionne hors ligne, hors bundle) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PdfJs = any;
let libPromise: Promise<PdfJs> | null = null;
function loadPdfJs(): Promise<PdfJs> {
  if (!libPromise) {
    const dynImport = new Function("u", "return import(u)") as (u: string) => Promise<PdfJs>;
    libPromise = dynImport("/pdfjs/pdf.min.mjs")
      .then((lib) => {
        lib.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
        return lib;
      })
      .catch((e) => {
        libPromise = null;
        throw e;
      });
  }
  return libPromise;
}

export function PdfPreview({ quote, settings, template, delay = 350 }: { quote: Quote; settings: Settings; template: TemplateId; delay?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "updating" | "error">("loading");
  const [pages, setPages] = useState(0);
  const job = useRef(0);
  const key = JSON.stringify([quote, settings, template]);

  useEffect(() => {
    const my = ++job.current;
    setStatus((s) => (s === "ready" ? "updating" : s === "error" ? "error" : "loading"));
    const timer = setTimeout(async () => {
      try {
        const [lib, bytes] = await Promise.all([loadPdfJs(), buildPdfBytes(quote, settings, template)]);
        if (my !== job.current) return;
        const task = lib.getDocument({ data: new Uint8Array(bytes) });
        const pdf = await task.promise;
        const width = box.current?.clientWidth || 360;
        const dpr = Math.min(3, window.devicePixelRatio || 1);
        const canvases: HTMLCanvasElement[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const base = page.getViewport({ scale: 1 });
          const scale = Math.max(2, Math.min(3.2, (width * dpr) / base.width));
          const vp = page.getViewport({ scale });
          const c = document.createElement("canvas");
          c.width = Math.floor(vp.width);
          c.height = Math.floor(vp.height);
          c.className = "pdf-page";
          const ctx = c.getContext("2d")!;
          await page.render({ canvasContext: ctx, canvas: c, viewport: vp }).promise;
          canvases.push(c);
          if (my !== job.current) break;
        }
        try {
          await (task.destroy?.() ?? pdf.destroy?.());
        } catch {
          /* nettoyage */
        }
        if (my !== job.current || !box.current) return;
        box.current.replaceChildren(...canvases);
        setPages(canvases.length);
        setStatus("ready");
      } catch (e) {
        console.error("Aperçu PDF", e);
        if (my === job.current) setStatus("error");
      }
    }, status === "loading" ? 0 : delay);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (status === "error") return <ScaledDocument quote={quote} settings={settings} />;

  return (
    <div className="print-area relative w-full">
      {status === "loading" && (
        <div className="aspect-[210/297] w-full rounded-xl bg-white shadow-2xl overflow-hidden p-6 space-y-3">
          <div className="h-16 rounded-lg bg-slate-200 animate-pulse" />
          <div className="h-6 w-1/2 rounded bg-slate-200 animate-pulse" />
          <div className="h-10 rounded bg-slate-100 animate-pulse" />
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-4 rounded bg-slate-100 animate-pulse" style={{ animationDelay: `${i * 0.07}s` }} />
          ))}
        </div>
      )}
      <div ref={box} className={`pdf-pages space-y-4 transition-opacity duration-300 ${status === "updating" ? "opacity-70" : "opacity-100"}`} />
      {status === "updating" && (
        <span className="no-print absolute top-3 right-3 rounded-full bg-nuit-900/90 px-3 py-1.5 text-xs font-bold text-or-400 shadow-lg anim-pop">⟳ Mise à jour…</span>
      )}
      {status === "ready" && pages > 1 && <p className="no-print mt-2 text-center text-sm font-semibold text-slate-500">{pages} pages</p>}
    </div>
  );
}
