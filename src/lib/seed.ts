import { CatalogItem, Labor, Line, Quote, Settings, Unit } from "./types";
import { uid } from "./format";

export const defaultSettings: Settings = {
  name: "Ma. Mo. Co. B",
  slogan: "Maçonnerie Moderne de Construction des Bâtiments",
  activities: "* Construction de Bâtiments et Travaux publics\nRevêtement marbre et carreaux *",
  bp: "…",
  phones: "91 61 54 35 / 97 65 90 73",
  city: "Kara",
  manager: "",
  logo: "",
  paymentTerms: "Acompte à la commande, solde à la fin des travaux.",
  validityDays: 30,
  depositPercent: 50,
  vatRate: 0,
  signature: "",
  showStamp: true,
  stampColor: "bleu",
  showDevCredit: false,
  defaultTemplate: "prestige",
};

export const DEV = {
  name: "Atissoli KABRAME",
  title: "FabManager",
  phones: ["96 93 38 93", "71 57 23 02"],
  whatsapp: "22896933893",
};

export function emptyLabor(): Labor {
  return { mode: "none", rate: 0, qty: 0, autoQty: true, forfait: 0 };
}

function L(designation: string, unit: Unit, qty: number, pu: number): Line {
  return { id: uid(), designation, unit, qty, pu };
}

function C(category: CatalogItem["category"], designation: string, unit: Unit, pu: number): CatalogItem {
  return { id: uid(), category, designation, unit, pu };
}

export function defaultCatalog(): CatalogItem[] {
  return [
    C("carrelage", "Chambre", "m²", 3500),
    C("carrelage", "Couloir", "m²", 3500),
    C("carrelage", "Salon", "m²", 6000),
    C("carrelage", "Cuisine mur", "m²", 3100),
    C("carrelage", "Cuisine sol", "m²", 4300),
    C("carrelage", "Terrasse", "m²", 4300),
    C("carrelage", "Douche mur", "m²", 3100),
    C("carrelage", "Douche sol", "m²", 3500),
    C("carrelage", "Plinthes", "ml", 500),
    C("maconnerie", "Élévation murs en agglos de 15", "m²", 2500),
    C("maconnerie", "Dalle en béton armé", "m²", 6000),
    C("maconnerie", "Enduit (crépissage)", "m²", 1000),
    C("maconnerie", "Chape", "m²", 1500),
    C("ferraillage", "Ferraillage poteaux", "u", 5000),
    C("ferraillage", "Ferraillage chaînage", "ml", 1500),
    C("menuiserie", "Coffrage dalle", "m²", 2000),
    C("menuiserie", "Pose de porte", "u", 10000),
    C("materiaux", "Ciment", "tonne", 81000),
    C("materiaux", "Sable gros grain", "voyage", 40000),
    C("materiaux", "Sable fin", "voyage", 35000),
    C("materiaux", "Gravier", "voyage", 90000),
    C("materiaux", "Colle carrelage (sac)", "u", 6500),
    C("materiaux", "Joint (sac)", "u", 2500),
    C("materiaux", "Fer de 10", "u", 4500),
    C("materiaux", "Bois de coffrage", "u", 2500),
  ];
}

export function sampleQuote(): Quote {
  const now = Date.now();
  return {
    id: uid(),
    number: "DEV-2025-001",
    status: "brouillon",
    client: { name: "Client exemple", phone: "", site: "Kara" },
    date: "2025-10-16",
    sections: [
      {
        id: uid(),
        type: "carrelage",
        labor: emptyLabor(),
        lines: [
          L("Chambre 1", "m²", 17, 3500),
          L("Chambre 2", "m²", 17, 3500),
          L("Chambre 3", "m²", 18, 3500),
          L("Couloir", "m²", 6, 3500),
          L("Salon", "m²", 27, 6000),
          L("Cuisine mur", "m²", 26, 3100),
          L("Cuisine sol", "m²", 14, 4300),
          L("Terrasse", "m²", 16, 4300),
          L("Douche extérieure mur", "m²", 20, 3100),
          L("Douche extérieure sol", "m²", 7, 3500),
        ],
      },
    ],
    materials: [L("Ciment", "tonne", 3, 81000), L("Sable gros grain", "voyage", 1, 40000)],
    laborScope: "global",
    labor: { mode: "m2", rate: 1000, qty: 168, autoQty: true, forfait: 0 },
    depositMode: "percent",
    depositValue: 0,
    customRest: undefined,
    paymentTerms: defaultSettings.paymentTerms,
    validityDays: 30,
    createdAt: now,
    updatedAt: now,
  };
}
