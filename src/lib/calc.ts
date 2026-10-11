import { Labor, Line, Quote, Section, Unit, workLabel } from "./types";
import { amountInWords } from "./format";

export function lineAmount(l: Line): number {
  return Math.round((l.qty || 0) * (l.pu || 0));
}

export function sectionMetrage(s: Section): number {
  return s.lines.filter((l) => l.unit === "m²").reduce((a, l) => a + (l.qty || 0), 0);
}

export function sectionSubtotal(s: Section): number {
  return s.lines.reduce((a, l) => a + lineAmount(l), 0);
}

/** « Un million … francs » (+ « toutes taxes comprises » si TVA) pour la ligne « Arrêté le présent devis… » */
export function totalInWords(t: QuoteTotals): string {
  return amountInWords(t.total).replace(/ francs CFA$/, " francs") + (t.vat > 0 ? " toutes taxes comprises" : "");
}

export function laborQty(l: Labor, autoQty: number): number {
  return l.autoQty ? autoQty : l.qty || 0;
}

export function laborAmount(l: Labor, autoQty: number): number {
  if (l.mode === "m2") return Math.round((l.rate || 0) * laborQty(l, autoQty));
  if (l.mode === "forfait") return Math.round(l.forfait || 0);
  return 0;
}

export type DocRow =
  | { k: "section"; label: string }
  | { k: "line"; n: number; designation: string; unit: Unit; qty: number; pu: number; amount: number }
  | { k: "subtotal"; label: string; unit?: string; qty?: number; amount: number }
  | { k: "labor"; label: string; unit: string; qty: number | null; pu: number | null; amount: number }
  | { k: "total"; label: string; amount: number; strong?: boolean };

export interface QuoteTotals {
  metrage: number;
  worksTotal: number;
  materialsTotal: number;
  laborTotal: number;
  /** Total hors taxes */
  totalHT: number;
  vatRate: number;
  vat: number;
  /** Total à payer (TTC si TVA, sinon = HT) */
  total: number;
  deposit: number;
  depositPercent: number | null;
  rest: number;
  rows: DocRow[];
  lineCount: number;
}

export function computeQuote(q: Quote): QuoteTotals {
  const rows: DocRow[] = [];
  let n = 0;
  const activeSections = q.sections.filter((s) => s.lines.length > 0);
  const multi = activeSections.length > 1;
  let metrage = 0;
  let worksTotal = 0;

  for (const s of activeSections) {
    if (multi) rows.push({ k: "section", label: workLabel(s.type).toUpperCase() });
    for (const l of s.lines) {
      n++;
      rows.push({ k: "line", n, designation: l.designation, unit: l.unit, qty: l.qty, pu: l.pu, amount: lineAmount(l) });
    }
    const m = sectionMetrage(s);
    const st = sectionSubtotal(s);
    metrage += m;
    worksTotal += st;
    if (multi) {
      rows.push({ k: "subtotal", label: `Sous-total ${workLabel(s.type)}`, unit: m > 0 ? "m²" : undefined, qty: m > 0 ? m : undefined, amount: st });
    }
  }
  if (activeSections.length > 0) {
    rows.push(
      metrage > 0
        ? { k: "subtotal", label: "Total Métrage", unit: "m²", qty: metrage, amount: worksTotal }
        : { k: "subtotal", label: "Total travaux", amount: worksTotal },
    );
  }

  let materialsTotal = 0;
  for (const l of q.materials) {
    n++;
    const a = lineAmount(l);
    materialsTotal += a;
    rows.push({ k: "line", n, designation: l.designation, unit: l.unit, qty: l.qty, pu: l.pu, amount: a });
  }
  if (q.materials.length > 1) rows.push({ k: "subtotal", label: "Total matériaux", amount: materialsTotal });

  let laborTotal = 0;
  const pushLabor = (lab: Labor, auto: number, label: string) => {
    if (lab.mode === "none") return;
    const a = laborAmount(lab, auto);
    if (a <= 0) return;
    laborTotal += a;
    if (lab.mode === "m2") rows.push({ k: "labor", label, unit: "m²", qty: laborQty(lab, auto), pu: lab.rate, amount: a });
    else rows.push({ k: "labor", label, unit: "forfait", qty: 1, pu: a, amount: a });
  };
  if (q.laborScope === "global") {
    pushLabor(q.labor, metrage, "Main d'œuvre");
  } else {
    for (const s of q.sections) pushLabor(s.labor, sectionMetrage(s), `Main d'œuvre ${workLabel(s.type)}`);
  }

  const totalHT = worksTotal + materialsTotal + laborTotal;
  const vatRate = Math.max(0, Math.min(100, q.vatRate || 0));
  const vat = Math.round((totalHT * vatRate) / 100);
  const total = totalHT + vat;
  if (vatRate > 0) {
    rows.push({ k: "total", label: "MONTANT TOTAL HT", amount: totalHT });
    rows.push({ k: "total", label: `TVA (${String(vatRate).replace(".", ",")} %)`, amount: vat });
    rows.push({ k: "total", label: "MONTANT TOTAL TTC", amount: total, strong: true });
  } else {
    rows.push({ k: "total", label: "MONTANT TOTAL", amount: total, strong: true });
  }

  let deposit = 0;
  let depositPercent: number | null = null;
  let rest = total;
  if (q.depositMode === "percent") {
    depositPercent = Math.max(0, Math.min(100, q.depositValue || 0));
    deposit = Math.round((total * depositPercent) / 100);
    rest = total - deposit;
  } else if (q.depositMode === "amount") {
    deposit = Math.max(0, Math.min(total, Math.round(q.depositValue || 0)));
    rest = total - deposit;
  } else if (q.depositMode === "custom") {
    deposit = Math.max(0, Math.round(q.depositValue || 0));
    rest = Math.max(0, Math.round(q.customRest || 0));
  }
  if (deposit > 0) {
    rows.push({ k: "total", label: depositPercent !== null ? `ACOMPTE (${String(depositPercent).replace(".", ",")} %)` : "ACOMPTE", amount: deposit });
    rows.push({ k: "total", label: "RESTE À PAYER", amount: rest });
  }

  return { metrage, worksTotal, materialsTotal, laborTotal, totalHT, vatRate, vat, total, deposit, depositPercent, rest, rows, lineCount: n };
}
