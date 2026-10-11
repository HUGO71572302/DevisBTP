export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

/** 1112100 -> "1 112 100" (espaces normales, compatibles PDF) */
export function fmtNum(n: number, maxDecimals = 2): string {
  if (!isFinite(n)) n = 0;
  const neg = n < 0;
  const factor = Math.pow(10, maxDecimals);
  const r = Math.round(Math.abs(n) * factor) / factor;
  const [int, dec] = r.toFixed(maxDecimals).split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const decTrim = dec ? dec.replace(/0+$/, "") : "";
  return (neg ? "-" : "") + grouped + (decTrim ? "," + decTrim : "");
}

export function fmtMoney(n: number): string {
  return fmtNum(Math.round(n), 0) + " F";
}

/**
 * Lit un nombre tapé à la main, avec les habitudes locales :
 * "1 500", "1.500", "1.000.000", "1,5", "1.500,50", "1,000,000" → valeurs correctes.
 * Règle : la virgule est décimale ; un point suivi d'exactement 3 chiffres (ou plusieurs points) = séparateur de milliers.
 */
export function parseNum(s: string): number {
  let t = (s || "").replace(/[\s\u00a0\u202f']/g, "");
  if (!t) return 0;
  const hasDot = t.includes(".");
  const hasComma = t.includes(",");
  if (hasDot && hasComma) {
    // le dernier séparateur est la décimale, l'autre sert aux milliers
    if (t.lastIndexOf(",") > t.lastIndexOf(".")) t = t.replace(/\./g, "").replace(",", ".");
    else t = t.replace(/,/g, "");
  } else if (hasDot) {
    const parts = t.split(".");
    const thousands = parts.length > 2 || (parts.length === 2 && parts[1].length === 3 && parts[0].length > 0 && parts[0] !== "0");
    if (thousands) t = parts.join("");
  } else if (hasComma) {
    const parts = t.split(",");
    t = parts.length > 2 ? parts.join("") : parts.join(".");
  }
  const n = parseFloat(t);
  return isFinite(n) ? n : 0;
}

const MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

export function todayISO(): string {
  const d = new Date();
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** "2025-10-16" -> "16 octobre 2025" */
export function fmtDateLong(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d === 1 ? "1er" : d} ${MONTHS[m - 1]} ${y}`;
}

export function fmtDateShort(iso: string): string {
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

/* ---------- Nombres en toutes lettres (français) ---------- */
const UNITS_W = [
  "zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix",
  "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf",
];
const TENS_W = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante", "quatre-vingt", "quatre-vingt"];

function below100(n: number, final: boolean): string {
  if (n < 20) return UNITS_W[n];
  const t = Math.floor(n / 10);
  const u = n % 10;
  if (t === 7 || t === 9) {
    if (t === 7 && u === 1) return "soixante et onze";
    return TENS_W[t] + "-" + UNITS_W[10 + u];
  }
  if (u === 0) return t === 8 ? (final ? "quatre-vingts" : "quatre-vingt") : TENS_W[t];
  if (u === 1 && t !== 8) return TENS_W[t] + " et un";
  return TENS_W[t] + "-" + UNITS_W[u];
}

function below1000(n: number, final: boolean): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  let s = "";
  if (h > 0) {
    s = h === 1 ? "cent" : UNITS_W[h] + " cent" + (r === 0 && final ? "s" : "");
  }
  if (r > 0) s += (s ? " " : "") + below100(r, final);
  return s;
}

export function numberToFrenchWords(value: number): string {
  let n = Math.round(Math.abs(value));
  if (n === 0) return "zéro";
  const parts: string[] = [];
  const billions = Math.floor(n / 1e9);
  n %= 1e9;
  const millions = Math.floor(n / 1e6);
  n %= 1e6;
  const thousands = Math.floor(n / 1000);
  const rest = n % 1000;
  if (billions) parts.push(billions === 1 ? "un milliard" : below1000(billions, true) + " milliards");
  if (millions) parts.push(millions === 1 ? "un million" : below1000(millions, true) + " millions");
  if (thousands) parts.push(thousands === 1 ? "mille" : below1000(thousands, false) + " mille");
  if (rest) parts.push(below1000(rest, true));
  return parts.join(" ");
}

/** "Un million cent douze mille cent francs CFA" */
export function amountInWords(n: number): string {
  const w = numberToFrenchWords(n);
  const r = Math.round(Math.abs(n));
  const de = r >= 1e6 && r % 1e6 === 0 ? " de" : "";
  return w.charAt(0).toUpperCase() + w.slice(1) + de + " francs CFA";
}

export function safeFilePart(s: string): string {
  return (
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "Client"
  );
}
