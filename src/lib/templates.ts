import { Quote, Settings, TemplateId } from "./types";

export interface TemplateInfo {
  id: TemplateId;
  name: string;
  tagline: string;
  swatches: string[];
  thumb: string;
}

export const TEMPLATES: TemplateInfo[] = [
  { id: "prestige", name: "Prestige", tagline: "Bandeau photo, bleu nuit et or", swatches: ["#0a1f44", "#f0a81c", "#1e4fd8"], thumb: "/templates/prestige.jpg" },
  { id: "classique", name: "Classique", tagline: "Fidèle au devis papier traditionnel", swatches: ["#1d3fd6", "#000000", "#ffffff"], thumb: "/templates/classique.jpg" },
  { id: "moderne", name: "Moderne", tagline: "Épuré, lignes fines, sarcelle", swatches: ["#0e7490", "#0f172a", "#f1f5f9"], thumb: "/templates/moderne.jpg" },
  { id: "chantier", name: "Chantier", tagline: "Noir et jaune, rayures de sécurité", swatches: ["#0c0a09", "#facc15", "#78716c"], thumb: "/templates/chantier.jpg" },
];

export function templateOf(q: Quote, s: Settings): TemplateId {
  const id = q.template ?? s.defaultTemplate ?? "prestige";
  return TEMPLATES.some((t) => t.id === id) ? id : "prestige";
}

export function templateInfo(id: TemplateId): TemplateInfo {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}
