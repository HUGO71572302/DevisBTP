import { GState, jsPDF } from "jspdf";
import autoTable, { RowInput } from "jspdf-autotable";
import { computeQuote, QuoteTotals, totalInWords } from "./calc";
import { fmtDateLong, fmtNum, safeFilePart } from "./format";
import { templateOf } from "./templates";
import { Quote, Settings, TemplateId } from "./types";

type RGB = [number, number, number];
const WHITE: RGB = [255, 255, 255];

export const PHOTO_STRIP = [
  { src: "/images/masonry-strip.jpg", label: "MAÇONNERIE" },
  { src: "/images/tiling-strip.jpg", label: "CARRELAGE" },
  { src: "/images/rebar-strip.jpg", label: "FERRAILLAGE" },
  { src: "/images/wood-strip.jpg", label: "MENUISERIE" },
];
export const BANNER_SRC = "/images/banner-doc.jpg";
export const BANNER_CHANTIER_SRC = "/images/banner-chantier.jpg";

export interface PdfAssets {
  banner?: string;
  bannerChantier?: string;
  stamp?: string;
  photos?: { data: string; label: string }[];
}

/* ====================== Thèmes ====================== */
interface Theme {
  font: "helvetica" | "times";
  ink: RGB;
  muted: RGB;
  primary: RGB;
  accent: RGB;
  accentDark: RGB;
  accent2: RGB;
  soft: RGB; // fond des encadrés
  line: RGB;
  table: {
    grid: boolean;
    lineColor: RGB;
    lineWidth: number;
    headFill: RGB;
    headText: RGB;
    headAmount: RGB;
    zebra?: RGB;
    sectionFill: RGB;
    sectionText: RGB;
    subFill: RGB;
    laborFill: RGB;
    totalFill: RGB;
    totalText: RGB;
    totalAmount: RGB;
    restFill: RGB;
    numColor: RGB;
    allBold: boolean;
    fontSize: number;
    pad: number;
    headUpper: boolean;
  };
  arrete: "box" | "classic" | "minimal";
  sigBox: "dashed" | "solid" | "none";
  photos: boolean;
  bottom: number; // espace réservé au pied de page (mm)
}

const THEMES: Record<TemplateId, Theme> = {
  prestige: {
    font: "helvetica",
    ink: [10, 31, 68],
    muted: [100, 116, 139],
    primary: [10, 31, 68],
    accent: [240, 168, 28],
    accentDark: [168, 112, 8],
    accent2: [30, 79, 216],
    soft: [247, 245, 240],
    line: [219, 227, 243],
    table: {
      grid: false,
      lineColor: [219, 227, 243],
      lineWidth: 0.2,
      headFill: [10, 31, 68],
      headText: WHITE,
      headAmount: [240, 168, 28],
      zebra: [247, 249, 253],
      sectionFill: [253, 241, 216],
      sectionText: [168, 112, 8],
      subFill: [228, 236, 255],
      laborFill: [247, 245, 240],
      totalFill: [10, 31, 68],
      totalText: WHITE,
      totalAmount: [240, 168, 28],
      restFill: [253, 241, 216],
      numColor: [30, 79, 216],
      allBold: false,
      fontSize: 9.5,
      pad: 1.15,
      headUpper: true,
    },
    arrete: "box",
    sigBox: "dashed",
    photos: true,
    bottom: 9,
  },
  classique: {
    font: "times",
    ink: [0, 0, 0],
    muted: [60, 60, 60],
    primary: [29, 63, 214],
    accent: [29, 63, 214],
    accentDark: [29, 63, 214],
    accent2: [0, 0, 0],
    soft: [255, 255, 255],
    line: [0, 0, 0],
    table: {
      grid: true,
      lineColor: [0, 0, 0],
      lineWidth: 0.25,
      headFill: WHITE,
      headText: [0, 0, 0],
      headAmount: [0, 0, 0],
      sectionFill: [232, 239, 253],
      sectionText: [29, 63, 214],
      subFill: WHITE,
      laborFill: WHITE,
      totalFill: WHITE,
      totalText: [0, 0, 0],
      totalAmount: [0, 0, 0],
      restFill: WHITE,
      numColor: [0, 0, 0],
      allBold: true,
      fontSize: 10.5,
      pad: 0.95,
      headUpper: true,
    },
    arrete: "classic",
    sigBox: "none",
    photos: false,
    bottom: 8,
  },
  moderne: {
    font: "helvetica",
    ink: [15, 23, 42],
    muted: [100, 116, 139],
    primary: [15, 23, 42],
    accent: [14, 116, 144],
    accentDark: [14, 116, 144],
    accent2: [14, 116, 144],
    soft: [241, 245, 249],
    line: [226, 232, 240],
    table: {
      grid: false,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      headFill: WHITE,
      headText: [100, 116, 139],
      headAmount: [14, 116, 144],
      sectionFill: WHITE,
      sectionText: [14, 116, 144],
      subFill: [241, 245, 249],
      laborFill: [248, 250, 252],
      totalFill: [14, 116, 144],
      totalText: WHITE,
      totalAmount: WHITE,
      restFill: [236, 254, 255],
      numColor: [148, 163, 184],
      allBold: false,
      fontSize: 9.5,
      pad: 1.6,
      headUpper: true,
    },
    arrete: "minimal",
    sigBox: "solid",
    photos: false,
    bottom: 12,
  },
  chantier: {
    font: "helvetica",
    ink: [28, 25, 23],
    muted: [120, 113, 108],
    primary: [12, 10, 9],
    accent: [250, 204, 21],
    accentDark: [161, 98, 7],
    accent2: [12, 10, 9],
    soft: [245, 245, 244],
    line: [231, 229, 228],
    table: {
      grid: false,
      lineColor: [231, 229, 228],
      lineWidth: 0.2,
      headFill: [12, 10, 9],
      headText: WHITE,
      headAmount: [250, 204, 21],
      zebra: [250, 250, 249],
      sectionFill: [254, 243, 199],
      sectionText: [28, 25, 23],
      subFill: [231, 229, 228],
      laborFill: [245, 245, 244],
      totalFill: [12, 10, 9],
      totalText: WHITE,
      totalAmount: [250, 204, 21],
      restFill: [254, 249, 195],
      numColor: [161, 98, 7],
      allBold: false,
      fontSize: 9.5,
      pad: 1.15,
      headUpper: true,
    },
    arrete: "box",
    sigBox: "dashed",
    photos: true,
    bottom: 12,
  },
};

/* ====================== Utilitaires ====================== */
/** Remplace les caractères hors WinAnsi (polices PDF standard). */
function t(s: string): string {
  return (s || "")
    .replace(/[\u202F\u00A0\u2009]/g, " ")
    .replace(/œ/g, "oe")
    .replace(/Œ/g, "OE")
    .replace(/[’‘]/g, "'")
    .replace(/[“”«»]/g, '"')
    .replace(/…/g, "...")
    .replace(/[–—]/g, "-")
    .replace(/[^\x20-\x7E\u00A0-\u00FF\n]/g, "");
}
const money = (n: number) => fmtNum(Math.round(n), 0) + " F";
const W = 210;
const H = 297;
const M = 15;
const CW = W - 2 * M;

export function pdfFileName(q: Quote): string {
  return `Devis_${safeFilePart(q.client.name)}_${q.number}_${q.date}.pdf`;
}

function activities(s: Settings): string[] {
  return s.activities
    .split("\n")
    .map((l) => l.replace(/^\s*\*\s*|\s*\*\s*$/g, "").trim())
    .filter(Boolean)
    .slice(0, 3);
}

function contacts(s: Settings): string[] {
  return [s.phones ? `Tél : ${s.phones}` : "", s.bp ? `BP : ${s.bp}` : "", s.city ? s.city : ""].filter(Boolean);
}

function houseIcon(doc: jsPDF, x: number, y: number, size: number, roof: RGB, body: RGB) {
  doc.setFillColor(...roof);
  doc.triangle(x + size * 0.5, y + size * 0.12, x + size * 0.08, y + size * 0.5, x + size * 0.92, y + size * 0.5, "F");
  doc.setFillColor(...body);
  doc.rect(x + size * 0.2, y + size * 0.48, size * 0.6, size * 0.38, "F");
  doc.setFillColor(...roof);
  doc.rect(x + size * 0.43, y + size * 0.62, size * 0.14, size * 0.24, "F");
}

/** Dessine le logo (ou l'icône maison) centré dans une boîte. */
function logo(doc: jsPDF, s: Settings, x: number, y: number, box: number, roof: RGB, body: RGB): boolean {
  if (s.logo) {
    try {
      const p = doc.getImageProperties(s.logo);
      const ratio = p.width / p.height;
      const w = ratio >= 1 ? box : box * ratio;
      const h = ratio >= 1 ? box / ratio : box;
      doc.addImage(s.logo, s.logo.startsWith("data:image/png") ? "PNG" : "JPEG", x + (box - w) / 2, y + (box - h) / 2, w, h);
      return true;
    } catch {
      /* logo illisible */
    }
  }
  houseIcon(doc, x, y, box, roof, body);
  return false;
}

function fitFont(doc: jsPDF, text: string, maxW: number, start: number, min: number) {
  let size = start;
  doc.setFontSize(size);
  while (doc.getTextWidth(text) > maxW && size > min) doc.setFontSize(--size);
}

/** Bande de rayures de sécurité jaune / noire. */
function hazard(doc: jsPDF, y: number, h: number, yellow: RGB, black: RGB) {
  doc.setFillColor(...yellow);
  doc.rect(0, y, W, h, "F");
  doc.setFillColor(...black);
  const step = 7;
  for (let x = -h; x < W + step; x += step) {
    doc.lines(
      [
        [h, -h],
        [step / 2, 0],
        [-h, h],
      ],
      x,
      y + h,
      [1, 1],
      "F",
      true,
    );
  }
}

/* ====================== En-têtes ====================== */
function headerPrestige(doc: jsPDF, q: Quote, s: Settings, a: PdfAssets, th: Theme): number {
  const C = th;
  const BH = 48;
  if (a.banner) {
    try {
      doc.addImage(a.banner, "JPEG", 0, 0, W, BH, undefined, "FAST");
    } catch {
      doc.setFillColor(...C.primary);
      doc.rect(0, 0, W, BH, "F");
    }
  } else {
    doc.setFillColor(...C.primary);
    doc.rect(0, 0, W, BH, "F");
  }
  doc.setFillColor(...C.accent);
  doc.rect(0, BH, W * 0.64, 1.8, "F");
  doc.setFillColor(...C.accent2);
  doc.rect(W * 0.64, BH, W * 0.36, 1.8, "F");

  const E = 27;
  doc.setFillColor(...WHITE);
  doc.roundedRect(M, 9, E, E, 3.5, 3.5, "F");
  doc.setDrawColor(...C.accent);
  doc.setLineWidth(0.8);
  doc.roundedRect(M - 1.2, 7.8, E + 2.4, E + 2.4, 4.4, 4.4, "S");
  logo(doc, s, M + 2, 11, E - 4, C.accent, C.primary);

  const tx = M + E + 7;
  const tw = 118;
  doc.setTextColor(...WHITE);
  doc.setFont(th.font, "bold");
  fitFont(doc, t(s.name || "Mon entreprise"), tw, 25, 15);
  doc.text(t(s.name || "Mon entreprise"), tx, 17);
  let ty = 23;
  if (s.slogan) {
    doc.setFont(th.font, "bolditalic");
    doc.setFontSize(10);
    doc.setTextColor(...C.accent);
    const sl = (doc.splitTextToSize(t(s.slogan), tw) as string[]).slice(0, 2);
    doc.text(sl, tx, ty);
    ty += sl.length * 4.2;
  }
  doc.setFont(th.font, "normal");
  doc.setFontSize(8.3);
  doc.setTextColor(205, 218, 242);
  for (const l of activities(s)) {
    doc.setFillColor(...C.accent);
    doc.circle(tx + 0.9, ty - 1, 0.7, "F");
    doc.text(t(l), tx + 3, ty);
    ty += 3.7;
  }
  doc.setFont(th.font, "bold");
  doc.setFontSize(8.6);
  doc.setTextColor(...WHITE);
  let cx = tx;
  contacts(s).forEach((c, i) => {
    if (i > 0) {
      doc.setFillColor(...C.accent);
      doc.rect(cx + 1.6, BH - 6.9, 0.6, 3, "F");
      cx += 4.2;
    }
    doc.text(t(c), cx, BH - 4.5);
    cx += doc.getTextWidth(t(c));
  });

  // Titre + références
  let y = BH + 11.8;
  doc.setTextColor(...C.ink);
  doc.setFont(th.font, "bold");
  doc.setFontSize(23);
  doc.text("DEVIS ESTIMATIF", M, y + 2);
  doc.setFillColor(...C.accent);
  doc.rect(M, y + 5, 22, 1.5, "F");
  doc.setFillColor(...C.accent2);
  doc.rect(M + 23, y + 5, 8, 1.5, "F");
  doc.setFont(th.font, "normal");
  doc.setFontSize(9);
  doc.setTextColor(...C.muted);
  doc.text(t("Travaux de bâtiment - estimation en francs CFA"), M, y + 11);
  refBox(doc, q, th, W - M - 66, y - 6, C.primary, C.accent, WHITE);

  y += 17;
  clientCard(doc, q, th, y, C.soft, C.accent, C.accentDark);
  return y + 22;
}

function refBox(doc: jsPDF, q: Quote, th: Theme, bx: number, by: number, fill: RGB, label: RGB, val: RGB) {
  const bw = 66;
  doc.setFillColor(...fill);
  doc.roundedRect(bx, by, bw, 19, 3, 3, "F");
  doc.setFillColor(...label);
  doc.roundedRect(bx, by, 2.2, 19, 1, 1, "F");
  const ref = (l: string, v: string, x: number) => {
    doc.setFont(th.font, "bold");
    doc.setFontSize(7);
    doc.setTextColor(...label);
    doc.text(t(l), x, by + 6.5);
    doc.setFontSize(10.5);
    doc.setTextColor(...val);
    doc.text(t(v), x, by + 13);
  };
  ref("N° DU DEVIS", q.number, bx + 6);
  ref("DATE", fmtDateLong(q.date), bx + 37);
}

function clientCard(doc: jsPDF, q: Quote, th: Theme, y: number, fill: RGB, bar: RGB, label: RGB) {
  const ch = 17;
  doc.setFillColor(...fill);
  doc.roundedRect(M, y, CW, ch, 3, 3, "F");
  doc.setFillColor(...bar);
  doc.roundedRect(M, y, 2.2, ch, 1, 1, "F");
  const col = (l: string, v: string, x: number, w: number, big = false) => {
    doc.setFont(th.font, "bold");
    doc.setFontSize(7);
    doc.setTextColor(...label);
    doc.text(t(l), x, y + 6);
    doc.setFontSize(big ? 12 : 10.5);
    doc.setTextColor(...th.ink);
    doc.text((doc.splitTextToSize(t(v || "-"), w) as string[])[0] ?? "", x, y + 12.5);
  };
  col("CLIENT", q.client.name, M + 7, 70, true);
  col("TÉLÉPHONE", q.client.phone, M + 82, 36);
  col("LIEU DU CHANTIER", q.client.site, M + 122, CW - 126);
}

function headerClassique(doc: jsPDF, q: Quote, s: Settings, _a: PdfAssets, th: Theme): number {
  let y = 16;
  const hasLogo = !!s.logo;
  if (hasLogo) logo(doc, s, M, 13, 30, th.accent, th.ink);
  const textW = hasLogo ? CW - 70 : CW - 20;
  doc.setFont("times", "bold");
  doc.setTextColor(...th.primary);
  fitFont(doc, t(s.name || "Mon entreprise"), textW + 20, 30, 18);
  doc.text(t(s.name || "Mon entreprise"), W / 2, y + 8, { align: "center" });
  y += 16;
  if (s.slogan) {
    doc.setFont("times", "normal");
    doc.setFontSize(14);
    const lines = doc.splitTextToSize(t(s.slogan), textW) as string[];
    doc.text(lines, W / 2, y, { align: "center" });
    y += lines.length * 6;
  }
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11.5);
  if (s.activities) {
    const lines = s.activities.split("\n").flatMap((l) => doc.splitTextToSize(t(l), textW + 10) as string[]);
    doc.text(lines, W / 2, y + 1, { align: "center" });
    y += lines.length * 5 + 1;
  }
  const c = [s.bp ? `BP : ${s.bp}` : "", s.phones ? `Contacts : ${s.phones}` : ""].filter(Boolean).join("     ");
  if (c) {
    doc.text(t(c), W / 2, y + 2, { align: "center" });
    y += 6;
  }
  y = Math.max(y, 44);
  doc.setDrawColor(90, 90, 90);
  doc.setLineWidth(0.4);
  doc.line(M, y, W - M, y);
  y += 9;
  doc.setFont("times", "bold");
  doc.setFontSize(22);
  doc.text("DEVIS ESTIMATIF", W / 2, y, { align: "center" });
  y += 6;
  doc.setFont("times", "normal");
  doc.setFontSize(11);
  doc.text(t(`N° ${q.number}`), W / 2, y, { align: "center" });
  y += 5;
  const info: [string, string][] = [
    ["Client", q.client.name],
    ["Téléphone", q.client.phone],
    ["Chantier", q.client.site],
    ["Date", fmtDateLong(q.date)],
  ];
  doc.setDrawColor(0);
  doc.setLineWidth(0.25);
  doc.rect(M, y, CW, 14);
  info.forEach(([k, v], i) => {
    const x = M + 3 + (i % 2) * (CW / 2);
    const yy = y + 5.2 + Math.floor(i / 2) * 5.6;
    doc.setFont("times", "bold");
    doc.text(t(`${k} : `), x, yy);
    const kw = doc.getTextWidth(t(`${k} : `));
    doc.setFont("times", "normal");
    doc.text((doc.splitTextToSize(t(v || "-"), CW / 2 - kw - 6) as string[])[0] ?? "", x + kw, yy);
  });
  return y + 17;
}

function headerModerne(doc: jsPDF, q: Quote, s: Settings, _a: PdfAssets, th: Theme): number {
  doc.setFillColor(...th.accent);
  doc.rect(0, 0, W, 3, "F");
  // Logo + entreprise
  const L = 18;
  const hasLogo = !!s.logo;
  if (hasLogo) logo(doc, s, M, 12, L, th.accent, th.ink);
  else {
    doc.setFillColor(...th.accent);
    doc.roundedRect(M, 12, L, L, 3, 3, "F");
    doc.setFont(th.font, "bold");
    doc.setFontSize(15);
    doc.setTextColor(...WHITE);
    const ini = (s.name || "E").replace(/[^A-Za-zÀ-ÿ ]/g, " ").split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "E";
    doc.text(t(ini), M + L / 2, 12 + L / 2 + 2.1, { align: "center" });
  }
  const tx = M + L + 5;
  doc.setFont(th.font, "bold");
  doc.setTextColor(...th.ink);
  fitFont(doc, t(s.name || "Mon entreprise"), 95, 17, 11);
  doc.text(t(s.name || "Mon entreprise"), tx, 19);
  doc.setFont(th.font, "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...th.muted);
  const sub = [s.slogan, ...activities(s)].filter(Boolean).slice(0, 2);
  sub.forEach((l, i) => doc.text((doc.splitTextToSize(t(l), 100) as string[])[0] ?? "", tx, 24 + i * 3.8));
  // Titre à droite
  doc.setFont(th.font, "bold");
  doc.setFontSize(30);
  doc.setTextColor(...th.accent);
  doc.text("DEVIS", W - M, 21, { align: "right" });
  doc.setFontSize(8.5);
  doc.setTextColor(...th.muted);
  doc.text("ESTIMATIF", W - M, 26.5, { align: "right", charSpace: 1.2 });

  // Contacts
  doc.setFontSize(8.3);
  doc.setFont(th.font, "normal");
  doc.text(t(contacts(s).join("   ·   ")), M, 38);
  doc.setDrawColor(...th.line);
  doc.setLineWidth(0.3);
  doc.line(M, 41.5, W - M, 41.5);

  // Bloc infos : 4 colonnes
  const y = 47;
  const cols: [string, string][] = [
    ["CLIENT", q.client.name],
    ["TÉLÉPHONE", q.client.phone],
    ["CHANTIER", q.client.site],
    ["DEVIS N° / DATE", `${q.number}`],
  ];
  const widths = [62, 34, 44, CW - 140];
  let x = M;
  cols.forEach(([l, v], i) => {
    doc.setFont(th.font, "bold");
    doc.setFontSize(6.8);
    doc.setTextColor(...th.muted);
    doc.text(t(l), x, y, { charSpace: 0.4 });
    doc.setFontSize(i === 0 ? 11.5 : 10);
    doc.setTextColor(...th.ink);
    doc.text((doc.splitTextToSize(t(v || "-"), widths[i] - 3) as string[])[0] ?? "", x, y + 5.5);
    if (i === 3) {
      doc.setFont(th.font, "normal");
      doc.setFontSize(9);
      doc.setTextColor(...th.muted);
      doc.text(t(fmtDateLong(q.date)), x, y + 10);
    }
    x += widths[i];
  });
  return y + 17;
}

function headerChantier(doc: jsPDF, q: Quote, s: Settings, a: PdfAssets, th: Theme): number {
  const BH = 44;
  if (a.bannerChantier) {
    try {
      doc.addImage(a.bannerChantier, "JPEG", 0, 0, W, BH, undefined, "FAST");
    } catch {
      doc.setFillColor(...th.primary);
      doc.rect(0, 0, W, BH, "F");
    }
  } else {
    doc.setFillColor(...th.primary);
    doc.rect(0, 0, W, BH, "F");
  }
  hazard(doc, BH, 4, th.accent, th.primary);

  const E = 24;
  doc.setFillColor(...th.accent);
  doc.rect(M, 10, E, E, "F");
  if (s.logo) {
    doc.setFillColor(...WHITE);
    doc.rect(M + 1.5, 11.5, E - 3, E - 3, "F");
  }
  logo(doc, s, M + 2.5, 12.5, E - 5, th.primary, th.primary);
  const tx = M + E + 7;
  doc.setFont(th.font, "bold");
  doc.setTextColor(...WHITE);
  fitFont(doc, t((s.name || "Mon entreprise").toUpperCase()), 125, 24, 14);
  doc.text(t((s.name || "Mon entreprise").toUpperCase()), tx, 19);
  let ty = 25;
  if (s.slogan) {
    doc.setFontSize(9.5);
    doc.setTextColor(...th.accent);
    doc.text((doc.splitTextToSize(t(s.slogan), 125) as string[])[0] ?? "", tx, ty);
    ty += 4.4;
  }
  doc.setFont(th.font, "normal");
  doc.setFontSize(8.2);
  doc.setTextColor(214, 211, 209);
  const acts = activities(s);
  if (acts.length) {
    doc.text(t(acts.join("  /  ")), tx, ty, { maxWidth: 125 });
  }
  doc.setFont(th.font, "bold");
  doc.setFontSize(8.6);
  doc.setTextColor(...WHITE);
  doc.text(t(contacts(s).join("   |   ")), tx, BH - 4.5);

  // Titre en bloc noir
  let y = BH + 4 + 8;
  doc.setFillColor(...th.primary);
  doc.rect(M, y - 6.5, 92, 13, "F");
  doc.setFillColor(...th.accent);
  doc.rect(M, y - 6.5, 3, 13, "F");
  doc.setFont(th.font, "bold");
  doc.setFontSize(17);
  doc.setTextColor(...th.accent);
  doc.text("DEVIS ESTIMATIF", M + 7, y + 2.2);
  // Références sur fond jaune
  const bx = W - M - 66;
  doc.setFillColor(...th.accent);
  doc.rect(bx, y - 6.5, 66, 13, "F");
  doc.setFontSize(6.8);
  doc.setTextColor(...th.primary);
  doc.text("N° DU DEVIS", bx + 4, y - 2);
  doc.text("DATE", bx + 35, y - 2);
  doc.setFontSize(10.5);
  doc.text(t(q.number), bx + 4, y + 3.8);
  doc.text(t(fmtDateLong(q.date)), bx + 35, y + 3.8);

  y += 11;
  // Client : cadre noir fin
  const ch = 16;
  doc.setDrawColor(...th.primary);
  doc.setLineWidth(0.5);
  doc.rect(M, y, CW, ch, "S");
  doc.setFillColor(...th.primary);
  doc.rect(M, y, 3, ch, "F");
  const col = (l: string, v: string, x: number, w: number, big = false) => {
    doc.setFont(th.font, "bold");
    doc.setFontSize(6.8);
    doc.setTextColor(...th.accentDark);
    doc.text(t(l), x, y + 5.5);
    doc.setFontSize(big ? 12 : 10.5);
    doc.setTextColor(...th.ink);
    doc.text((doc.splitTextToSize(t(v || "-"), w) as string[])[0] ?? "", x, y + 12);
  };
  col("CLIENT", q.client.name, M + 7, 70, true);
  col("TÉLÉPHONE", q.client.phone, M + 82, 36);
  col("LIEU DU CHANTIER", q.client.site, M + 122, CW - 126);
  return y + ch + 5;
}

/* ====================== Corps commun ====================== */
function table(doc: jsPDF, totals: QuoteTotals, th: Theme, startY: number): number {
  const T = th.table;
  const b = T.allBold ? ("bold" as const) : undefined;
  const body: RowInput[] = totals.rows.map((r): RowInput => {
    switch (r.k) {
      case "section":
        return [{ content: t(r.label), colSpan: 6, styles: { halign: "left", fillColor: T.sectionFill, textColor: T.sectionText, fontStyle: "bold", fontSize: T.fontSize - 0.5 } }];
      case "line":
        return [
          { content: String(r.n), styles: { textColor: T.numColor, fontStyle: "bold" } },
          { content: t(r.designation), styles: { halign: "left", fontStyle: "bold" } },
          { content: t(r.unit), styles: { fontStyle: b } },
          { content: fmtNum(r.qty), styles: { fontStyle: b } },
          { content: money(r.pu), styles: { fontStyle: b } },
          { content: money(r.amount), styles: { fontStyle: "bold", halign: "right" } },
        ];
      case "subtotal":
      case "labor": {
        const st = { fillColor: r.k === "subtotal" ? T.subFill : T.laborFill, fontStyle: "bold" as const, textColor: th.ink };
        const qty = r.k === "subtotal" ? (r.qty !== undefined ? fmtNum(r.qty) : "") : r.qty !== null ? fmtNum(r.qty) : "";
        const pu = r.k === "labor" && r.pu !== null ? money(r.pu) : "";
        return [
          { content: t(r.label), colSpan: 2, styles: { ...st, halign: r.k === "labor" && th.table.grid ? "center" : "left" } },
          { content: t(r.unit ?? ""), styles: st },
          { content: qty, styles: st },
          { content: pu, styles: st },
          { content: money(r.amount), styles: { ...st, halign: "right" } },
        ];
      }
      case "total":
        if (r.strong)
          return [
            { content: t(r.label), colSpan: 5, styles: { halign: "right", fillColor: T.totalFill, textColor: T.totalText, fontStyle: "bold", fontSize: T.fontSize + 1.5 } },
            { content: money(r.amount), styles: { halign: "right", fillColor: T.totalFill, textColor: T.totalAmount, fontStyle: "bold", fontSize: T.fontSize + 2.5 } },
          ];
        return [
          { content: t(r.label), colSpan: 5, styles: { halign: "right", fillColor: WHITE, textColor: th.muted, fontStyle: "bold" } },
          { content: money(r.amount), styles: { halign: "right", fillColor: r.label.startsWith("RESTE") ? T.restFill : WHITE, fontStyle: "bold" } },
        ];
    }
  });

  const head = ["N°", "DÉSIGNATION", "U", "QTÉ", "P.U.", "MONTANT"].map((h) => t(T.headUpper ? h : h));
  autoTable(doc, {
    startY,
    margin: { left: M, right: M, top: 16, bottom: th.bottom + 8 },
    head: [head],
    body,
    theme: T.grid ? "grid" : "plain",
    styles: {
      font: th.font,
      fontSize: T.fontSize,
      textColor: th.ink,
      lineColor: T.lineColor,
      lineWidth: T.grid ? T.lineWidth : { bottom: T.lineWidth, top: 0, left: 0, right: 0 },
      cellPadding: { top: T.pad, bottom: T.pad, left: 2.2, right: 2.2 },
      halign: "center",
      valign: "middle",
    },
    alternateRowStyles: T.zebra ? { fillColor: T.zebra } : undefined,
    headStyles: {
      fillColor: T.headFill,
      textColor: T.headText,
      fontStyle: "bold",
      fontSize: T.grid ? T.fontSize + 0.5 : 8.5,
      cellPadding: { top: 2.3, bottom: 2.3, left: 2.2, right: 2.2 },
      lineWidth: T.grid ? T.lineWidth : { bottom: th.arrete === "minimal" ? 0.6 : 0, top: 0, left: 0, right: 0 },
      lineColor: th.arrete === "minimal" ? th.accent : T.lineColor,
    },
    columnStyles: {
      0: { cellWidth: 11 },
      1: { cellWidth: "auto", halign: "left" },
      2: { cellWidth: 16 },
      3: { cellWidth: 15 },
      4: { cellWidth: 26 },
      5: { cellWidth: 31, halign: T.grid ? "center" : "right" },
    },
    didParseCell: (d) => {
      if (d.section === "head" && d.column.index === 5) {
        d.cell.styles.textColor = T.headAmount;
        d.cell.styles.halign = T.grid ? "center" : "right";
      }
      if (d.section === "head" && d.column.index === 1) d.cell.styles.halign = "left";
      if (T.grid && d.section === "body" && d.column.index === 5) d.cell.styles.halign = "center";
    },
  });
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

function arrete(doc: jsPDF, totals: QuoteTotals, th: Theme, y: number, ensure: (h: number) => number): number {
  const words = totalInWords(totals);
  if (th.arrete === "classic") {
    y = ensure(22);
    doc.setFontSize(12.5);
    doc.setFont("times", "bold");
    doc.setTextColor(0, 0, 0);
    const prefix = "Arrêté le présent Devis à la somme de : ";
    doc.text(t(prefix), M, y);
    let x = M + doc.getTextWidth(t(prefix));
    doc.setFont("times", "bolditalic");
    for (const w of t(words).split(" ")) {
      if (x + doc.getTextWidth(w) > W - M) {
        y += 6;
        x = M;
      }
      doc.text(w, x, y);
      x += doc.getTextWidth(w + " ");
    }
    y += 6.5;
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.text(t(`(${fmtNum(totals.total, 0)}) F CFA`), M, y);
    return y + 7;
  }
  if (th.arrete === "minimal") {
    doc.setFont(th.font, "normal");
    doc.setFontSize(9.5);
    const lines = doc.splitTextToSize(t(words), CW - 75) as string[];
    const h = Math.max(16, 8 + lines.length * 4.4);
    y = ensure(h);
    doc.setFont(th.font, "bold");
    doc.setFontSize(7);
    doc.setTextColor(...th.muted);
    doc.text(t("ARRÊTÉ LE PRÉSENT DEVIS À LA SOMME DE"), M, y + 4, { charSpace: 0.4 });
    doc.setFont(th.font, "italic");
    doc.setFontSize(10);
    doc.setTextColor(...th.ink);
    doc.text(lines, M, y + 9.5);
    doc.setFont(th.font, "bold");
    doc.setFontSize(7);
    doc.setTextColor(...th.muted);
    doc.text(totals.vat > 0 ? "TOTAL TTC" : "MONTANT TOTAL", W - M, y + 4, { align: "right", charSpace: 0.4 });
    doc.setFontSize(19);
    doc.setTextColor(...th.accent);
    doc.text(t(`${fmtNum(totals.total, 0)} F CFA`), W - M, y + 12, { align: "right" });
    doc.setDrawColor(...th.line);
    doc.setLineWidth(0.3);
    doc.line(M, y + h, W - M, y + h);
    return y + h + 6;
  }
  // "box"
  const pillW = 58;
  doc.setFont(th.font, "bolditalic");
  doc.setFontSize(10.5);
  const lines = doc.splitTextToSize(t(words), CW - pillW - 14) as string[];
  const ah = Math.max(17, 10.5 + lines.length * 4.4);
  y = ensure(ah);
  const chantier = th.primary[0] < 20 && th.accent[0] > 240 && th.accent[2] < 50;
  doc.setFillColor(...(chantier ? th.soft : ([241, 245, 255] as RGB)));
  doc.roundedRect(M, y, CW, ah, chantier ? 0 : 3, chantier ? 0 : 3, "F");
  doc.setFillColor(...(chantier ? th.accent : th.accent2));
  doc.rect(M, y, 2.2, ah, "F");
  doc.setFont(th.font, "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...th.muted);
  doc.text(t("ARRÊTÉ LE PRÉSENT DEVIS À LA SOMME DE :"), M + 7, y + 6);
  doc.setFont(th.font, "bolditalic");
  doc.setFontSize(10.5);
  doc.setTextColor(...(chantier ? th.ink : th.accent2));
  doc.text(lines, M + 7, y + 11.5);
  const px = W - M - pillW - 4;
  const py = y + (ah - 12) / 2;
  doc.setFillColor(...(chantier ? th.primary : th.accent));
  doc.roundedRect(px, py, pillW, 12, chantier ? 0 : 6, chantier ? 0 : 6, "F");
  doc.setFont(th.font, "bold");
  doc.setFontSize(12.5);
  doc.setTextColor(...(chantier ? th.accent : th.primary));
  doc.text(t(`${fmtNum(totals.total, 0)} F CFA`), px + pillW / 2, py + 8, { align: "center" });
  return y + ah + 5;
}

function conditionsAndSignature(doc: jsPDF, q: Quote, s: Settings, a: PdfAssets, totals: QuoteTotals, th: Theme, y: number, ensure: (h: number) => number): number {
  const cond: [string, string][] = [];
  if (totals.deposit > 0) cond.push(["Acompte", `${money(totals.deposit)}  -  Reste à payer : ${money(totals.rest)}`]);
  if (q.paymentTerms) cond.push(["Paiement", q.paymentTerms]);
  if (q.validityDays > 0) cond.push(["Validité", `${q.validityDays} jours à compter de la date d'émission`]);
  const classic = th.sigBox === "none";
  const leftW = CW * 0.55;
  const fs = classic ? 10.5 : 9;
  doc.setFontSize(fs);
  const condLines = cond.map(([k, v]) => {
    doc.setFont(th.font, "bold");
    const kw = doc.getTextWidth(t(`${k} : `));
    doc.setFont(th.font, "normal");
    return { k, kw, lines: doc.splitTextToSize(t(v), leftW - 4 - kw) as string[] };
  });
  const lh = classic ? 4.6 : 4;
  const condH = cond.length ? 7 + condLines.reduce((acc, c) => acc + c.lines.length * lh + 1.6, 0) : 0;
  const sigH = 35;
  y = ensure(Math.max(condH, sigH));
  const top = y;
  if (cond.length) {
    doc.setFont(th.font, "bold");
    doc.setFontSize(classic ? 10 : 7.5);
    doc.setTextColor(...(classic ? th.ink : th.accentDark));
    doc.text(classic ? "Conditions :" : "CONDITIONS", M, y + 2);
    let yy = y + 7.5;
    for (const c of condLines) {
      if (!classic) {
        doc.setFillColor(...th.accent);
        doc.rect(M, yy - 2.4, 1.8, 1.8, "F");
      }
      const x0 = classic ? M : M + 4;
      doc.setFontSize(fs);
      doc.setFont(th.font, "bold");
      doc.setTextColor(...th.ink);
      doc.text(t(`${c.k} : `), x0, yy);
      doc.setFont(th.font, "normal");
      doc.setTextColor(...(classic ? th.ink : ([51, 65, 85] as RGB)));
      doc.text(c.lines, x0 + c.kw, yy);
      yy += c.lines.length * lh + 1.6;
    }
  }
  const sx = M + leftW + 6;
  const sw = W - M - sx;
  doc.setFont(th.font, "bold");
  doc.setFontSize(classic ? 13 : 10);
  doc.setTextColor(...th.ink);
  doc.text(t(`${s.city || "........"}, le ${fmtDateLong(q.date)}`), W - M, top + 2, { align: "right" });
  doc.setFontSize(classic ? 14 : 11.5);
  doc.text("Le Responsable,", W - M, top + 8.5, { align: "right" });
  const boxY = top + 11;
  const boxH = 22;
  if (th.sigBox !== "none") {
    doc.setDrawColor(...(th.sigBox === "solid" ? th.line : th.line));
    doc.setLineWidth(th.sigBox === "solid" ? 0.3 : 0.4);
    if (th.sigBox === "dashed") doc.setLineDashPattern([1.4, 1.2], 0);
    doc.roundedRect(sx, boxY, sw, boxH, 2.5, 2.5, "S");
    doc.setLineDashPattern([], 0);
  }
  if (s.showStamp && a.stamp) {
    try {
      const d = 25;
      doc.setGState(new GState({ opacity: 0.82 }));
      doc.addImage(a.stamp, "PNG", sx + 2, boxY + boxH / 2 - d / 2 - 1, d, d, undefined, "FAST");
    } catch {
      /* cachet ignoré */
    }
    doc.setGState(new GState({ opacity: 1 }));
  }
  if (s.signature) {
    try {
      const p = doc.getImageProperties(s.signature);
      const maxW = sw * 0.6;
      const maxH = boxH - 7;
      const r = Math.min(maxW / p.width, maxH / p.height);
      doc.addImage(s.signature, "PNG", sx + sw - p.width * r - 3, boxY + 1.5 + (maxH - p.height * r) / 2, p.width * r, p.height * r);
    } catch {
      /* signature illisible */
    }
  }
  if (s.manager) {
    doc.setFont(th.font, "bold");
    doc.setFontSize(classic ? 11.5 : 9.5);
    doc.setTextColor(...th.ink);
    doc.text(t(s.manager), sx + sw - 3, boxY + boxH - 2, { align: "right" });
  } else if (!s.signature && !(s.showStamp && a.stamp) && !classic) {
    doc.setFont(th.font, "italic");
    doc.setFontSize(7);
    doc.setTextColor(...th.muted);
    doc.text("Signature et cachet", sx + sw / 2, boxY + boxH - 2, { align: "center" });
  }
  return top + Math.max(condH, sigH) + 4;
}

function photoStrip(doc: jsPDF, a: PdfAssets, th: Theme, y: number) {
  const photos = a.photos ?? [];
  const stripH = 17;
  const stripY = H - th.bottom - 4 - stripH;
  if (!th.photos || !photos.length || y > stripY - 1) return;
  const gap = 2.5;
  const pw = (CW - gap * (photos.length - 1)) / photos.length;
  photos.forEach((p, i) => {
    const x = M + i * (pw + gap);
    try {
      doc.addImage(p.data, "JPEG", x, stripY, pw, stripH, undefined, "FAST");
      doc.setGState(new GState({ opacity: 0.82 }));
      doc.setFillColor(...th.primary);
      doc.rect(x, stripY + stripH - 5, pw, 5, "F");
      doc.setGState(new GState({ opacity: 1 }));
      doc.setFillColor(...th.accent);
      doc.rect(x, stripY + stripH - 5, 1.2, 5, "F");
      doc.setFont(th.font, "bold");
      doc.setFontSize(6.8);
      doc.setTextColor(...WHITE);
      doc.text(t(p.label), x + 3, stripY + stripH - 1.6);
    } catch {
      /* image ignorée */
    }
  });
}

/* ====================== Pieds de page ====================== */
function footers(doc: jsPDF, q: Quote, s: Settings, id: TemplateId, th: Theme) {
  const pages = doc.getNumberOfPages();
  const foot = t([s.name, s.phones ? `Tél : ${s.phones}` : "", s.city].filter(Boolean).join("   •   "));
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    if (id === "prestige") {
      const F = th.bottom;
      doc.setFillColor(...th.primary);
      doc.rect(0, H - F, W, F, "F");
      doc.setFillColor(...th.accent);
      doc.rect(0, H - F, W * 0.64, 0.9, "F");
      doc.setFillColor(...th.accent2);
      doc.rect(W * 0.64, H - F, W * 0.36, 0.9, "F");
      doc.setFont(th.font, "bold");
      doc.setFontSize(7.8);
      doc.setTextColor(...WHITE);
      doc.text(foot, M, H - 3.3);
      doc.setTextColor(...th.accent);
      doc.text(t(`${q.number}  ·  Page ${i}/${pages}`), W - M, H - 3.3, { align: "right" });
    } else if (id === "classique") {
      if (pages > 1) {
        doc.setFont("times", "normal");
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.text(t(`${q.number} - Page ${i}/${pages}`), W / 2, H - 5, { align: "center" });
      }
    } else if (id === "moderne") {
      doc.setDrawColor(...th.line);
      doc.setLineWidth(0.3);
      doc.line(M, H - 11, W - M, H - 11);
      doc.setFont(th.font, "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...th.muted);
      doc.text(foot, M, H - 6.5);
      doc.setTextColor(...th.accent);
      doc.text(t(`${q.number}  ·  ${i}/${pages}`), W - M, H - 6.5, { align: "right" });
      doc.setFillColor(...th.accent);
      doc.rect(0, H - 1.5, W, 1.5, "F");
    } else {
      hazard(doc, H - 12, 3.2, th.accent, th.primary);
      doc.setFillColor(...th.primary);
      doc.rect(0, H - 8.8, W, 8.8, "F");
      doc.setFont(th.font, "bold");
      doc.setFontSize(7.8);
      doc.setTextColor(...WHITE);
      doc.text(foot, M, H - 3.4);
      doc.setTextColor(...th.accent);
      doc.text(t(`${q.number}  ·  Page ${i}/${pages}`), W - M, H - 3.4, { align: "right" });
    }
  }
}

/* ====================== Assemblage ====================== */
const HEADERS: Record<TemplateId, (doc: jsPDF, q: Quote, s: Settings, a: PdfAssets, th: Theme) => number> = {
  prestige: headerPrestige,
  classique: headerClassique,
  moderne: headerModerne,
  chantier: headerChantier,
};

export function buildPdf(q: Quote, s: Settings, assets: PdfAssets = {}, template?: TemplateId): jsPDF {
  const id = template ?? templateOf(q, s);
  const th = THEMES[id];
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const totals = computeQuote(q);
  doc.setProperties({ title: t(`Devis ${q.number} - ${q.client.name}`), author: t(s.name), subject: "Devis estimatif" });

  let y = HEADERS[id](doc, q, s, assets, th);
  y = table(doc, totals, th, y) + (th.arrete === "classic" ? 8 : 5);
  const limit = H - th.bottom - 6;
  const ensure = (h: number) => {
    if (y + h > limit) {
      doc.addPage();
      y = 18;
    }
    return y;
  };
  y = arrete(doc, totals, th, y, ensure);
  y = conditionsAndSignature(doc, q, s, assets, totals, th, y, ensure);
  photoStrip(doc, assets, th, y);
  footers(doc, q, s, id, th);
  return doc;
}

/* ====================== Chargement des images (navigateur) ====================== */
const imgCache: Record<string, string> = {};

async function toDataUrl(url: string): Promise<string | undefined> {
  if (imgCache[url]) return imgCache[url];
  try {
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const blob = await res.blob();
    const data = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    imgCache[url] = data;
    return data;
  } catch {
    return undefined;
  }
}

export async function loadPdfAssets(settings?: Settings): Promise<PdfAssets> {
  let stamp: string | undefined;
  if (settings?.showStamp && typeof document !== "undefined") {
    const { makeStamp } = await import("./stamp");
    stamp = makeStamp(settings) || undefined;
  }
  const [banner, bannerChantier, ...ph] = await Promise.all([toDataUrl(BANNER_SRC), toDataUrl(BANNER_CHANTIER_SRC), ...PHOTO_STRIP.map((p) => toDataUrl(p.src))]);
  return {
    banner,
    bannerChantier,
    stamp,
    photos: ph.map((d, i) => (d ? { data: d, label: PHOTO_STRIP[i].label } : null)).filter((x): x is { data: string; label: string } => !!x),
  };
}

export async function buildPdfBlob(q: Quote, s: Settings, template?: TemplateId): Promise<{ blob: Blob; filename: string }> {
  const assets = await loadPdfAssets(s);
  const doc = buildPdf(q, s, assets, template);
  return { blob: doc.output("blob"), filename: pdfFileName(q) };
}

export async function buildPdfBytes(q: Quote, s: Settings, template?: TemplateId): Promise<ArrayBuffer> {
  const assets = await loadPdfAssets(s);
  return buildPdf(q, s, assets, template).output("arraybuffer");
}
