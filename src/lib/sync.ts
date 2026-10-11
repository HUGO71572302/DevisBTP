import { CatalogItem, Quote, Settings, SyncDoc } from "./types";
import { defaultCatalog, defaultSettings, sampleQuote } from "./seed";
import { todayISO } from "./format";

const DAY = 86_400_000;

export function emptyDoc(): SyncDoc {
  return { settings: { ...defaultSettings }, settingsAt: 0, quotes: [], catalog: [], catalogAt: 0, deleted: {}, seq: {} };
}

/** Normalise un document reçu (anciennes versions, champs manquants). */
export function normalizeDoc(d: unknown): SyncDoc {
  const x = (d && typeof d === "object" ? d : {}) as Partial<SyncDoc>;
  return {
    settings: { ...defaultSettings, ...(x.settings ?? {}) },
    settingsAt: Number(x.settingsAt) || 0,
    quotes: Array.isArray(x.quotes) ? x.quotes.filter((q) => q && typeof q.id === "string") : [],
    catalog: Array.isArray(x.catalog) ? x.catalog.filter((c) => c && typeof c.id === "string") : [],
    catalogAt: Number(x.catalogAt) || 0,
    deleted: x.deleted && typeof x.deleted === "object" ? x.deleted : {},
    seq: x.seq && typeof x.seq === "object" ? x.seq : {},
  };
}

/** Numéro "DEV-2026-012" → { year: "2026", n: 12 } */
export function parseNumber(num: string): { year: string; n: number } | null {
  const m = /^DEV-(\d{4})-(\d+)/.exec(num || "");
  return m ? { year: m[1], n: parseInt(m[2], 10) } : null;
}

function mergeSeq(...all: Record<string, number>[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of all) for (const [y, n] of Object.entries(s || {})) out[y] = Math.max(out[y] ?? 0, Number(n) || 0);
  return out;
}

/** Deux devis différents avec le même numéro (deux téléphones hors ligne) : le plus récent reçoit un nouveau numéro. */
function fixDuplicateNumbers(quotes: Quote[], seq: Record<string, number>): Quote[] {
  const seen = new Set<string>();
  const ordered = [...quotes].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  const renamed = new Map<string, Quote>();
  for (const q of ordered) {
    if (seen.has(q.number)) {
      const p = parseNumber(q.number);
      if (p) {
        seq[p.year] = Math.max(seq[p.year] ?? 0, ...quotes.map((x) => (parseNumber(x.number)?.year === p.year ? parseNumber(x.number)!.n : 0))) + 1;
        const number = `DEV-${p.year}-${String(seq[p.year]).padStart(3, "0")}`;
        renamed.set(q.id, { ...q, number, updatedAt: Date.now() });
        seen.add(number);
        continue;
      }
    }
    seen.add(q.number);
  }
  return renamed.size ? quotes.map((q) => renamed.get(q.id) ?? q) : quotes;
}

/**
 * Fusionne deux versions (téléphone / serveur) :
 * - devis : le plus récent gagne, devis supprimés exclus (pierres tombales)
 * - paramètres et catalogue : le plus récent gagne
 */
export function mergeDocs(a: SyncDoc, b: SyncDoc): SyncDoc {
  const now = Date.now();
  const deleted: Record<string, number> = {};
  for (const src of [a.deleted, b.deleted]) {
    for (const [id, ts] of Object.entries(src)) {
      if (now - ts < 180 * DAY) deleted[id] = Math.max(deleted[id] ?? 0, ts);
    }
  }
  const map = new Map<string, Quote>();
  for (const q of [...a.quotes, ...b.quotes]) {
    const cur = map.get(q.id);
    if (!cur || (q.updatedAt || 0) > (cur.updatedAt || 0)) map.set(q.id, q);
  }
  const quotes = [...map.values()]
    .filter((q) => !(deleted[q.id] && deleted[q.id] >= (q.updatedAt || 0)))
    .sort((x, y) => (y.createdAt || 0) - (x.createdAt || 0));

  const sA = a.settingsAt >= b.settingsAt;
  const cA = a.catalogAt >= b.catalogAt;
  const seq = mergeSeq(a.seq, b.seq);
  const finalQuotes = fixDuplicateNumbers(quotes, seq);
  return {
    settings: sA ? a.settings : b.settings,
    settingsAt: Math.max(a.settingsAt, b.settingsAt),
    catalog: cA ? a.catalog : b.catalog,
    catalogAt: Math.max(a.catalogAt, b.catalogAt),
    quotes: finalQuotes,
    deleted,
    seq,
  };
}

export function sameDoc(a: SyncDoc, b: SyncDoc): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Document de départ d'un nouveau compte. */
export function starterDoc(info: { name: string; company: string; phone: string; city: string }): SyncDoc {
  const settings: Settings = {
    ...defaultSettings,
    name: info.company || info.name,
    slogan: "",
    activities: "",
    bp: "",
    phones: info.phone,
    city: info.city,
    manager: info.name,
  };
  const q = sampleQuote();
  q.number = `DEV-${new Date().getFullYear()}-001`;
  q.date = todayISO();
  q.paymentTerms = settings.paymentTerms;
  q.client.site = info.city || q.client.site;
  const catalog: CatalogItem[] = defaultCatalog();
  const now = Date.now();
  return { settings, settingsAt: now, quotes: [q], catalog, catalogAt: now, deleted: {}, seq: { [String(new Date().getFullYear())]: 1 } };
}

export function formatPhone(digits: string): string {
  return digits.length === 8 ? digits.replace(/(\d{2})(?=\d)/g, "$1 ").trim() : digits;
}

/** Garde uniquement les chiffres ; retire l'indicatif +228 pour les numéros togolais. */
export function normalizePhone(raw: string): string {
  let d = (raw || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("228") && d.length === 11) d = d.slice(3);
  return d;
}
