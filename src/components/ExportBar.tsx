"use client";

import { useEffect, useState } from "react";
import { computeQuote } from "@/lib/calc";
import { fmtMoney } from "@/lib/format";
import { buildPdfBlob, loadPdfAssets } from "@/lib/pdf";
import { saveFile, shareFile, whatsappNumber } from "@/lib/share";
import { useStore } from "@/lib/store";
import { Quote } from "@/lib/types";
import { Confetti, Toast } from "./ui";
import { templateInfo, templateOf } from "@/lib/templates";

export function ExportBar({ quote }: { quote: Quote }) {
  const { settings, upsertQuote } = useStore();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "pdf" | "wa" | "word">(null);
  const [party, setParty] = useState(0);

  useEffect(() => {
    loadPdfAssets(settings); // précharge les photos (le partage iPhone doit rester rapide après l'appui)
  }, [settings]);

  const markSent = () => {
    if (quote.status === "brouillon") upsertQuote({ ...quote, status: "envoye" });
  };

  const download = async () => {
    setBusy("pdf");
    try {
      const { blob, filename } = await buildPdfBlob(quote, settings);
      const r = await saveFile(blob, filename, `Devis ${quote.number}`);
      if (r === "downloaded") setMsg(`✓ PDF « ${templateInfo(templateOf(quote, settings)).name} » enregistré : ${filename}`);
      else if (r === "shared") setMsg("✓ PDF partagé / enregistré");
      else if (r === "opened") setMsg("PDF ouvert : utilisez Partager pour l'enregistrer");
      if (r !== "cancelled") setParty((x) => x + 1);
    } catch (e) {
      console.error(e);
      setMsg("Erreur lors de la création du PDF");
    } finally {
      setBusy(null);
    }
  };

  const word = async () => {
    setBusy("word");
    try {
      const { buildWordBlob } = await import("@/lib/word");
      const { blob, filename } = await buildWordBlob(quote, settings);
      const r = await saveFile(blob, filename, `Devis ${quote.number}`);
      if (r === "downloaded") setMsg(`✓ Word enregistré : ${filename}`);
      else if (r === "shared") setMsg("✓ Fichier Word partagé / enregistré");
      else if (r === "opened") setMsg("Fichier Word ouvert : utilisez Partager pour l'enregistrer");
      if (r !== "cancelled") setParty((x) => x + 1);
    } catch (e) {
      console.error(e);
      setMsg("Erreur lors de la création du fichier Word");
    } finally {
      setBusy(null);
    }
  };

  const whatsapp = async () => {
    setBusy("wa");
    try {
      const { blob, filename } = await buildPdfBlob(quote, settings);
      const tq = computeQuote(quote);
      const text = `Bonjour ${quote.client.name}, voici le devis ${quote.number} de ${settings.name} : montant total ${fmtMoney(tq.total)} CFA${tq.vat > 0 ? " TTC" : ""}.`;
      const r = await shareFile(blob, filename, `Devis ${quote.number}`, text);
      if (r === "shared") {
        markSent();
        setParty((x) => x + 1);
        setMsg("✓ Devis partagé");
      } else if (r === "unsupported") {
        await saveFile(blob, filename, `Devis ${quote.number}`);
        const num = whatsappNumber(quote.client.phone);
        window.open(`https://wa.me/${num}?text=${encodeURIComponent(text + " (PDF joint)")}`, "_blank");
        markSent();
        setMsg("PDF enregistré. Joignez-le dans WhatsApp avec le trombone 📎");
      }
    } catch (e) {
      console.error(e);
      setMsg("Erreur lors du partage");
    } finally {
      setBusy(null);
    }
  };

  const spinner = <span className="inline-block h-5 w-5 rounded-full border-[3px] border-current border-t-transparent animate-spin" />;

  return (
    <div className="no-print space-y-2.5">
      <button className="btn-gold shine w-full !min-h-[64px] !text-xl" onClick={download} disabled={!!busy}>
        {busy === "pdf" ? spinner : <span className="text-2xl">⬇</span>} Télécharger PDF
      </button>
      <div className="grid grid-cols-3 gap-2.5">
        <button
          className="relative overflow-hidden flex flex-col items-center justify-center gap-0.5 rounded-2xl px-2 min-h-[64px] text-[15px] font-bold text-white transition active:scale-[0.97] disabled:opacity-50"
          style={{ background: "linear-gradient(135deg,#25d366,#128c4a)", boxShadow: "0 8px 20px -8px rgba(18,140,74,.7)" }}
          onClick={whatsapp}
          disabled={!!busy}
        >
          <span className="text-xl leading-none">{busy === "wa" ? spinner : "💬"}</span> WhatsApp
        </button>
        <button
          className="relative overflow-hidden flex flex-col items-center justify-center gap-0.5 rounded-2xl px-2 min-h-[64px] text-[15px] font-bold text-white transition active:scale-[0.97] disabled:opacity-50"
          style={{ background: "linear-gradient(135deg,#2b7cd3,#185abd)", boxShadow: "0 8px 20px -8px rgba(24,90,189,.7)" }}
          onClick={word}
          disabled={!!busy}
        >
          <span className="text-xl leading-none font-black">{busy === "word" ? spinner : "W"}</span> Word
        </button>
        <button className="flex flex-col items-center justify-center gap-0.5 rounded-2xl px-2 min-h-[64px] text-[15px] font-bold bg-white text-nuit-800 border-2 border-roi-100 transition active:scale-[0.97]" onClick={() => window.print()}>
          <span className="text-xl leading-none">🖨️</span> Imprimer
        </button>
      </div>
      <Toast msg={msg} onDone={() => setMsg(null)} />
      <Confetti fire={party} />
    </div>
  );
}
