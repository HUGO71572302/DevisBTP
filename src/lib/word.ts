"use client";

import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  ImageRun,
  PageNumber,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
  ITableCellBorders,
} from "docx";
import { computeQuote, totalInWords } from "./calc";
import { fmtDateLong, fmtNum, safeFilePart } from "./format";
import { loadPdfAssets } from "./pdf";
import { Quote, Settings, TemplateId } from "./types";
import { templateOf } from "./templates";

interface Palette {
  ink: string; dark: string; accent: string; pillBg: string; pillText: string; accentDark: string; accentLight: string;
  blue: string; blueLight: string; bluePale: string; zebra: string; soft: string; line: string; gray: string; headSub: string; body: string; font: string;
}
const PALETTES: Record<TemplateId, Palette> = {
  prestige: { ink: "0A1F44", dark: "0A1F44", accent: "F0A81C", pillBg: "F0A81C", pillText: "0A1F44", accentDark: "A87008", accentLight: "FDF1D8", blue: "1E4FD8", blueLight: "E4ECFF", bluePale: "F1F5FF", zebra: "F7F9FD", soft: "F7F5F0", line: "DBE3F3", gray: "64748B", headSub: "CDDAF2", body: "334155", font: "Arial" },
  classique: { ink: "000000", dark: "1D3FD6", accent: "C7D5FF", pillBg: "1D3FD6", pillText: "FFFFFF", accentDark: "1D3FD6", accentLight: "E8EFFD", blue: "1D3FD6", blueLight: "EEF2FF", bluePale: "F5F7FF", zebra: "FFFFFF", soft: "F5F7FF", line: "000000", gray: "404040", headSub: "E0E7FF", body: "000000", font: "Times New Roman" },
  moderne: { ink: "0F172A", dark: "0F172A", accent: "67E8F9", pillBg: "0E7490", pillText: "FFFFFF", accentDark: "0E7490", accentLight: "ECFEFF", blue: "0E7490", blueLight: "F1F5F9", bluePale: "F8FAFC", zebra: "FFFFFF", soft: "F1F5F9", line: "E2E8F0", gray: "64748B", headSub: "CBD5E1", body: "334155", font: "Arial" },
  chantier: { ink: "1C1917", dark: "0C0A09", accent: "FACC15", pillBg: "FACC15", pillText: "0C0A09", accentDark: "A16207", accentLight: "FEF3C7", blue: "A16207", blueLight: "E7E5E4", bluePale: "F5F5F4", zebra: "FAFAF9", soft: "F5F5F4", line: "E7E5E4", gray: "78716C", headSub: "D6D3D1", body: "44403C", font: "Arial" },
};
let P: Palette = PALETTES.prestige;
const WHITE = "FFFFFF";

type Align = (typeof AlignmentType)[keyof typeof AlignmentType];
type Kid = Paragraph | Table;
const FONT = () => P.font;
const CONTENT = 10206; // largeur utile A4 (twips) avec marges de 1,5 cm
const money = (n: number) => fmtNum(Math.round(n), 0) + " F";

export function wordFileName(q: Quote): string {
  return `Devis_${safeFilePart(q.client.name)}_${q.number}_${q.date}.docx`;
}

function dataUrlToBytes(url: string): Uint8Array {
  const b64 = url.split(",")[1] ?? "";
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function imgType(url: string): "png" | "jpg" {
  return url.startsWith("data:image/png") ? "png" : "jpg";
}

async function imageSize(url: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth || 1, h: img.naturalHeight || 1 });
    img.onerror = () => resolve({ w: 1, h: 1 });
    img.src = url;
  });
}

function fit(size: { w: number; h: number }, maxW: number, maxH: number) {
  const r = Math.min(maxW / size.w, maxH / size.h);
  return { width: Math.round(size.w * r), height: Math.round(size.h * r) };
}

const NONE = { style: BorderStyle.NONE, size: 0, color: WHITE };
const noBorders: ITableCellBorders = { top: NONE, bottom: NONE, left: NONE, right: NONE };
const rowBorder = (): ITableCellBorders => ({ top: NONE, left: NONE, right: NONE, bottom: { style: BorderStyle.SINGLE, size: 4, color: P.line } });

function run(text: string, o: { bold?: boolean; italics?: boolean; color?: string; size?: number } = {}) {
  return new TextRun({ text, font: FONT(), bold: o.bold, italics: o.italics, color: o.color ?? P.ink, size: o.size ?? 19 });
}

function para(children: (TextRun | ImageRun)[] | TextRun | ImageRun, o: { align?: Align; before?: number; after?: number } = {}) {
  return new Paragraph({
    children: Array.isArray(children) ? children : [children],
    alignment: o.align,
    spacing: { before: o.before ?? 0, after: o.after ?? 0 },
  });
}

function cell(
  children: Kid[] | Kid,
  o: { w: number; fill?: string; span?: number; borders?: ITableCellBorders; leftBar?: string; pad?: number; vAlign?: "top" | "center" | "bottom" } = { w: 1000 },
) {
  const base = o.borders ?? noBorders;
  const borders: ITableCellBorders = o.leftBar ? { ...base, left: { style: BorderStyle.SINGLE, size: 36, color: o.leftBar } } : base;
  const pad = o.pad ?? 80;
  return new TableCell({
    children: Array.isArray(children) ? children : [children],
    width: { size: o.w, type: WidthType.DXA },
    columnSpan: o.span,
    shading: o.fill ? { type: ShadingType.CLEAR, color: "auto", fill: o.fill } : undefined,
    borders,
    verticalAlign: o.vAlign === "top" ? VerticalAlign.TOP : o.vAlign === "bottom" ? VerticalAlign.BOTTOM : VerticalAlign.CENTER,
    margins: { top: pad, bottom: pad, left: 110, right: 110 },
  });
}

function table(rows: TableRow[], widths: number[]) {
  return new Table({
    rows,
    width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths: widths,
    layout: TableLayoutType.FIXED,
    borders: { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE },
  });
}

/** Barre bicolore or / bleu. */
function bicolor(height = 60) {
  const w1 = Math.round(CONTENT * 0.64);
  return table(
    [
      new TableRow({
        height: { value: height, rule: "exact" },
        children: [cell(para(run("")), { w: w1, fill: P.accent, pad: 0 }), cell(para(run("")), { w: CONTENT - w1, fill: P.blue, pad: 0 })],
      }),
    ],
    [w1, CONTENT - w1],
  );
}

export async function buildWordBlob(q: Quote, s: Settings, template?: TemplateId): Promise<{ blob: Blob; filename: string }> {
  P = PALETTES[template ?? templateOf(q, s)];
  const t = computeQuote(q);
  const assets = await loadPdfAssets(s);

  /* ------------ En-tête entreprise ------------ */
  const logoW = 1700;
  let logoRun: ImageRun | TextRun = run("🏗", { size: 60 });
  const logoSrc = s.logo || "";
  if (logoSrc) {
    const sz = fit(await imageSize(logoSrc), 88, 88);
    logoRun = new ImageRun({ type: imgType(logoSrc), data: dataUrlToBytes(logoSrc), transformation: sz });
  } else {
    logoRun = run("■", { size: 72, color: P.accent });
  }
  const acts = s.activities
    .split("\n")
    .map((l) => l.replace(/^\s*\*\s*|\s*\*\s*$/g, "").trim())
    .filter(Boolean)
    .slice(0, 3);
  const contacts = [s.phones ? `Tél : ${s.phones}` : "", s.bp ? `BP : ${s.bp}` : "", s.city].filter(Boolean).join("   |   ");
  const headerTexts: Paragraph[] = [
    para(run(s.name || "Mon entreprise", { bold: true, color: WHITE, size: 44 })),
    ...(s.slogan ? [para(run(s.slogan, { bold: true, italics: true, color: P.accent, size: 20 }), { before: 40 })] : []),
    ...acts.map((a, i) => para([run("●  ", { color: P.accent, size: 12 }), run(a, { color: P.headSub, size: 16 })], { before: i === 0 ? 60 : 0 })),
    ...(contacts ? [para(run(contacts, { bold: true, color: WHITE, size: 17 }), { before: 80 })] : []),
  ];
  const header = table(
    [
      new TableRow({
        children: [
          cell(
            table(
              [new TableRow({ height: { value: 1450, rule: "exact" }, children: [cell(para(logoRun, { align: AlignmentType.CENTER }), { w: 1450, fill: WHITE })] })],
              [1450],
            ),
            { w: logoW, fill: P.dark, pad: 260 },
          ),
          cell(headerTexts, { w: CONTENT - logoW, fill: P.dark, pad: 200 }),
        ],
      }),
    ],
    [logoW, CONTENT - logoW],
  );

  /* ------------ Titre + références ------------ */
  const refW = 3800;
  const title = table(
    [
      new TableRow({
        children: [
          cell(
            [
              para(run("DEVIS ESTIMATIF", { bold: true, size: 44 })),
              para([run("▬▬▬▬▬", { color: P.accent, size: 18 }), run("▬▬", { color: P.blue, size: 18 })]),
              para(run("Travaux de bâtiment - estimation en francs CFA", { color: P.gray, size: 17 }), { before: 40 }),
            ],
            { w: CONTENT - refW, pad: 40 },
          ),
          cell(
            table(
              [
                new TableRow({
                  children: [
                    cell([para(run("N° DU DEVIS", { bold: true, color: P.accent, size: 14 })), para(run(q.number, { bold: true, color: WHITE, size: 21 }))], { w: refW / 2, fill: P.dark, leftBar: P.accent, pad: 120 }),
                    cell([para(run("DATE", { bold: true, color: P.accent, size: 14 })), para(run(fmtDateLong(q.date), { bold: true, color: WHITE, size: 21 }))], { w: refW / 2, fill: P.dark, pad: 120 }),
                  ],
                }),
              ],
              [refW / 2, refW / 2],
            ),
            { w: refW, pad: 0 },
          ),
        ],
      }),
    ],
    [CONTENT - refW, refW],
  );

  /* ------------ Client ------------ */
  const cw = [4300, 2400, CONTENT - 6700];
  const clientCol = (label: string, val: string, w: number, first = false, big = false) =>
    cell([para(run(label, { bold: true, color: P.accentDark, size: 14 })), para(run(val || "-", { bold: true, size: big ? 24 : 21 }), { before: 30 })], { w, fill: P.soft, leftBar: first ? P.accent : undefined, pad: 130 });
  const client = table(
    [new TableRow({ children: [clientCol("CLIENT", q.client.name, cw[0], true, true), clientCol("TÉLÉPHONE", q.client.phone, cw[1]), clientCol("LIEU DU CHANTIER", q.client.site, cw[2])] })],
    cw,
  );

  /* ------------ Tableau principal ------------ */
  const W = [650, 0, 900, 850, 1450, 1750];
  W[1] = CONTENT - W.reduce((a, b) => a + b, 0);
  const H = (txt: string, i: number, align: Align = AlignmentType.CENTER) =>
    cell(para(run(txt, { bold: true, color: i === 5 ? P.accent : WHITE, size: 17 }), { align }), { w: W[i], fill: P.dark, pad: 110 });
  const rows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [H("N°", 0), H("DÉSIGNATION", 1, AlignmentType.LEFT), H("U", 2), H("QTÉ", 3), H("P.U.", 4), H("MONTANT", 5, AlignmentType.RIGHT)],
    }),
  ];
  let zebra = 0;
  const C: Align = AlignmentType.CENTER;
  const R: Align = AlignmentType.RIGHT;
  const L: Align = AlignmentType.LEFT;
  for (const r of t.rows) {
    if (r.k === "section") {
      rows.push(new TableRow({ children: [cell(para(run(r.label, { bold: true, color: P.accentDark, size: 17 })), { w: CONTENT, span: 6, fill: P.accentLight, pad: 70 })] }));
      zebra = 0;
    } else if (r.k === "line") {
      const fill = zebra++ % 2 === 1 ? P.zebra : undefined;
      const c = (txt: string, i: number, al: Align, o: { bold?: boolean; color?: string } = {}) => cell(para(run(txt, { size: 18, ...o }), { align: al }), { w: W[i], fill, borders: rowBorder(), pad: 60 });
      rows.push(
        new TableRow({
          children: [c(String(r.n), 0, C, { bold: true, color: P.blue }), c(r.designation, 1, L, { bold: true }), c(r.unit, 2, C), c(fmtNum(r.qty), 3, C), c(money(r.pu), 4, C), c(money(r.amount), 5, R, { bold: true })],
        }),
      );
    } else if (r.k === "subtotal" || r.k === "labor") {
      const fill = r.k === "subtotal" ? P.blueLight : P.soft;
      const c = (txt: string, i: number, al: Align, span?: number) =>
        cell(para(run(txt, { bold: true, size: 18 }), { align: al }), { w: span ? W[0] + W[1] : W[i], span, fill, borders: rowBorder(), pad: 70 });
      const qty = r.k === "subtotal" ? (r.qty !== undefined ? fmtNum(r.qty) : "") : r.qty !== null ? fmtNum(r.qty) : "";
      const pu = r.k === "labor" && r.pu !== null ? money(r.pu) : "";
      rows.push(new TableRow({ children: [c(r.label, 0, L, 2), c(r.unit ?? "", 2, C), c(qty, 3, C), c(pu, 4, C), c(money(r.amount), 5, R)] }));
    } else if (r.k === "total") {
      const strong = !!r.strong;
      const rest = r.label.startsWith("RESTE");
      rows.push(
        new TableRow({
          children: [
            cell(para(run(r.label, { bold: true, color: strong ? WHITE : P.gray, size: strong ? 21 : 18 }), { align: R }), { w: CONTENT - W[5], span: 5, fill: strong ? P.dark : undefined, pad: strong ? 110 : 70 }),
            cell(para(run(money(r.amount), { bold: true, color: strong ? P.accent : P.ink, size: strong ? 23 : 18 }), { align: R }), { w: W[5], fill: strong ? P.dark : rest ? P.accentLight : undefined, pad: strong ? 110 : 70 }),
          ],
        }),
      );
    }
  }
  const main = table(rows, W);

  /* ------------ Arrêté ------------ */
  const pillW = 3000;
  const arrete = table(
    [
      new TableRow({
        children: [
          cell(
            [
              para(run("ARRÊTÉ LE PRÉSENT DEVIS À LA SOMME DE :", { bold: true, color: P.gray, size: 16 })),
              para(run(totalInWords(t), { bold: true, italics: true, color: P.blue, size: 21 }), { before: 50 }),
            ],
            { w: CONTENT - pillW, fill: P.bluePale, leftBar: P.blue, pad: 150 },
          ),
          cell(para(run(`${fmtNum(t.total, 0)} F CFA`, { bold: true, size: 25, color: P.pillText }), { align: C }), { w: pillW, fill: P.pillBg, pad: 150 }),
        ],
      }),
    ],
    [CONTENT - pillW, pillW],
  );

  /* ------------ Conditions + signature ------------ */
  const condParas: Paragraph[] = [];
  const cond: [string, string][] = [];
  if (t.deposit > 0) cond.push(["Acompte", `${money(t.deposit)}  -  Reste à payer : ${money(t.rest)}`]);
  if (q.paymentTerms) cond.push(["Paiement", q.paymentTerms]);
  if (q.validityDays > 0) cond.push(["Validité", `${q.validityDays} jours à compter de la date d'émission`]);
  if (cond.length) condParas.push(para(run("CONDITIONS", { bold: true, color: P.accentDark, size: 15 }), { after: 60 }));
  for (const [k, v] of cond) condParas.push(para([run("■  ", { color: P.accent, size: 14 }), run(`${k} : `, { bold: true, size: 18 }), run(v, { color: P.body, size: 18 })], { after: 50 }));
  if (!condParas.length) condParas.push(para(run("")));

  const sigImgs: (ImageRun | TextRun)[] = [];
  if (s.showStamp && assets.stamp) sigImgs.push(new ImageRun({ type: "png", data: dataUrlToBytes(assets.stamp), transformation: { width: 92, height: 92 } }));
  if (s.signature) {
    sigImgs.push(run("   "));
    const sz = fit(await imageSize(s.signature), 150, 62);
    sigImgs.push(new ImageRun({ type: "png", data: dataUrlToBytes(s.signature), transformation: sz }));
  }
  const dashed = { style: BorderStyle.DASHED, size: 6, color: "C7D2E6" };
  const sigBox = table(
    [
      new TableRow({
        height: { value: 1450, rule: "atLeast" },
        children: [
          cell(
            [
              para(sigImgs.length ? sigImgs : [run("Signature et cachet", { italics: true, color: P.gray, size: 15 })], { align: AlignmentType.CENTER }),
              ...(s.manager ? [para(run(s.manager, { bold: true, size: 19 }), { align: R })] : []),
            ],
            { w: 4200, borders: { top: dashed, bottom: dashed, left: dashed, right: dashed }, pad: 80 },
          ),
        ],
      }),
    ],
    [4200],
  );
  const leftW = CONTENT - 4500;
  const bottom = table(
    [
      new TableRow({
        children: [
          cell(condParas, { w: leftW, vAlign: "top", pad: 40 }),
          cell(
            [
              para(run(`${s.city || "........"}, le ${fmtDateLong(q.date)}`, { bold: true, size: 20 }), { align: R }),
              para(run("Le Responsable,", { bold: true, size: 23 }), { align: R, before: 60, after: 80 }),
              sigBox,
            ],
            { w: 4500, vAlign: "top", pad: 40 },
          ),
        ],
      }),
    ],
    [leftW, 4500],
  );

  /* ------------ Bandeau photos ------------ */
  const photos = assets.photos ?? [];
  const pw = Math.floor(CONTENT / Math.max(1, photos.length));
  const strip = photos.length
    ? table(
        [
          new TableRow({
            children: photos.map((p) =>
              cell(
                [
                  para(new ImageRun({ type: "jpg", data: dataUrlToBytes(p.data), transformation: { width: 156, height: 66 } }), { align: C }),
                  para(run(p.label, { bold: true, color: WHITE, size: 13 }), { align: C }),
                ],
                { w: pw, fill: P.dark, pad: 50 },
              ),
            ),
          }),
        ],
        photos.map(() => pw),
      )
    : null;

  const footer = new Footer({
    children: [
      bicolor(40),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 60 },
        children: [
          run([s.name, s.phones ? `Tél : ${s.phones}` : "", s.city].filter(Boolean).join("   •   "), { bold: true, size: 15 }),
          run(`      ${q.number}  ·  Page `, { bold: true, color: P.accentDark, size: 15 }),
          new TextRun({ children: [PageNumber.CURRENT], font: FONT(), bold: true, color: P.accentDark, size: 15 }),
          run("/", { bold: true, color: P.accentDark, size: 15 }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT(), bold: true, color: P.accentDark, size: 15 }),
        ],
      }),
    ],
  });

  const gap = (n: number) => new Paragraph({ spacing: { before: 0, after: n }, children: [] });

  const doc = new Document({
    creator: s.name,
    title: `Devis ${q.number} - ${q.client.name}`,
    description: "Devis estimatif",
    styles: { default: { document: { run: { font: FONT(), size: 19, color: P.ink } } } },
    sections: [
      {
        properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 700, bottom: 900, left: 850, right: 850, footer: 400 } } },
        footers: { default: footer },
        children: [
          header,
          bicolor(70),
          gap(200),
          title,
          gap(160),
          client,
          gap(200),
          main,
          gap(200),
          arrete,
          gap(200),
          bottom,
          ...(strip ? [gap(240), strip] : []),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  return {
    blob: new Blob([blob], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }),
    filename: wordFileName(q),
  };
}
