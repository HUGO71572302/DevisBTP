export type Unit = "m²" | "ml" | "m³" | "tonne" | "voyage" | "u" | "forfait" | "paquet" | "tricycle" | "pièce";
export const UNITS: Unit[] = ["m²", "ml", "m³", "tonne", "voyage", "u", "forfait", "paquet", "tricycle", "pièce"];

export type WorkType = "maconnerie" | "carrelage" | "ferraillage" | "menuiserie";
export const WORK_TYPES: { key: WorkType; label: string; hint: string; icon: string; img: string }[] = [
  { key: "maconnerie", label: "Maçonnerie", hint: "Murs, dalles, fondations", icon: "🧱", img: "/images/masonry-sm.jpg" },
  { key: "carrelage", label: "Carrelage", hint: "Sols, murs, terrasses", icon: "🔲", img: "/images/tiling-sm.jpg" },
  { key: "ferraillage", label: "Ferraillage", hint: "Fer, armatures", icon: "🔩", img: "/images/rebar-sm.jpg" },
  { key: "menuiserie", label: "Menuiserie", hint: "Portes, fenêtres, coffrage", icon: "🪚", img: "/images/wood-sm.jpg" },
];

export type CatCategory = WorkType | "materiaux";
export const CAT_CATEGORIES: { key: CatCategory; label: string }[] = [
  ...WORK_TYPES.map((w) => ({ key: w.key as CatCategory, label: w.label })),
  { key: "materiaux", label: "Matériaux" },
];

export function workLabel(t: WorkType): string {
  return WORK_TYPES.find((w) => w.key === t)?.label ?? t;
}

export interface Line {
  id: string;
  designation: string;
  unit: Unit;
  qty: number;
  pu: number;
}

export interface Labor {
  mode: "none" | "m2" | "forfait";
  rate: number;
  qty: number;
  autoQty: boolean;
  forfait: number;
}

export interface Section {
  id: string;
  type: WorkType;
  lines: Line[];
  labor: Labor;
}

export type QuoteStatus = "brouillon" | "envoye" | "accepte";
export const STATUSES: { key: QuoteStatus; label: string; cls: string }[] = [
  { key: "brouillon", label: "Brouillon", cls: "bg-slate-100 text-slate-700 ring-1 ring-slate-300" },
  { key: "envoye", label: "Envoyé", cls: "bg-roi-100 text-roi-600 ring-1 ring-roi-500/30" },
  { key: "accepte", label: "Accepté", cls: "bg-or-100 text-or-600 ring-1 ring-or-500/40" },
];

export type TemplateId = "prestige" | "classique" | "moderne" | "chantier";

export interface Quote {
  id: string;
  number: string;
  status: QuoteStatus;
  client: { name: string; phone: string; site: string };
  date: string; // YYYY-MM-DD
  sections: Section[];
  materials: Line[];
  laborScope: "global" | "section";
  labor: Labor;
  depositMode: "percent" | "amount" | "custom";
  depositValue: number;
  /** Reste à payer fixe (mode "custom" uniquement) */
  customRest?: number;
  /** Taux de TVA en % (0 = sans TVA). Absent sur les anciens devis = sans TVA. */
  vatRate?: number;
  paymentTerms: string;
  validityDays: number;
  template?: TemplateId;
  createdAt: number;
  updatedAt: number;
}

export interface Settings {
  name: string;
  slogan: string;
  activities: string;
  bp: string;
  phones: string;
  city: string;
  manager: string;
  logo: string; // data URL
  paymentTerms: string;
  validityDays: number;
  depositPercent: number;
  /** TVA proposée par défaut sur les nouveaux devis (0 = sans TVA, 18 = Togo) */
  vatRate: number;
  signature: string; // data URL (signature au doigt)
  showStamp: boolean; // cachet automatique
  stampColor: "bleu" | "rouge";
  showDevCredit: boolean;
  defaultTemplate: TemplateId;
}

export interface AuthUser {
  id: string;
  name: string;
  phone: string;
  company: string;
  createdAt: string;
}

/** Document synchronisé avec le serveur (par utilisateur). */
export interface SyncDoc {
  settings: Settings;
  settingsAt: number;
  quotes: Quote[];
  catalog: CatalogItem[];
  catalogAt: number;
  deleted: Record<string, number>;
  /** Plus grand numéro de devis déjà attribué, par année ("2026" → 12). Jamais redescendu. */
  seq: Record<string, number>;
}

export interface CatalogItem {
  id: string;
  category: CatCategory;
  designation: string;
  unit: Unit;
  pu: number;
}

export interface BackupData {
  app: "devis-btp";
  version: 1;
  exportedAt: string;
  settings: Settings;
  quotes: Quote[];
  catalog: CatalogItem[];
}
