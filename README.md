# Devis BTP Togo

Application web (PWA installable) de devis estimatifs de travaux de bâtiment au Togo, en F CFA.
Pensée pour les artisans maçons / carreleurs : mobile d'abord, utilisable aussi sur ordinateur.

Conçue et développée par **Atissoli KABRAME** – FabManager – 96 93 38 93 / 71 57 23 02

---

## Fonctionnalités

- **Comptes utilisateurs** (numéro de téléphone + mot de passe) : chaque artisan a ses propres devis, catalogue, paramètres, logo, signature.
- **Synchronisation automatique** entre téléphones + **fonctionnement hors ligne** (les modifications partent au retour du réseau).
- **Nouveau devis en 7 étapes** : client, types de travaux, lignes, matériaux, main d'œuvre (m² ou forfait), conditions (acompte % ou montant), aperçu.
- **Calculs automatiques** : montants, sous-totaux, total métrage, total général, acompte, reste à payer, montant en lettres.
- **Métreur** (sol, murs avec portes/fenêtres, plinthes) et **estimation des matériaux** (carreaux, colle, joint).
- **Catalogue** d'articles classés, prix mémorisés automatiquement.
- **Historique** avec recherche, statuts (brouillon / envoyé / accepté), dupliquer, supprimer.
- **4 modèles de PDF** au choix au moment de l'export : *Prestige*, *Classique*, *Moderne*, *Chantier*.
- **Exports** : PDF A4 (texte sélectionnable), **Word (.docx)** aux couleurs du modèle, partage WhatsApp, impression.
- **Signature au doigt** + **cachet automatique** sur les documents.
- **Sauvegarde / restauration** en fichier JSON.

## Technique

- Next.js 16 (App Router) + React 19 + Tailwind CSS 4
- PostgreSQL + Drizzle ORM (comptes, sessions, données synchronisées)
- PDF généré dans le navigateur : `jspdf` + `jspdf-autotable`
- Aperçu fidèle du PDF : `pdf.js` (fichiers dans `public/pdfjs/`, fonctionne hors ligne)
- Word généré dans le navigateur : `docx`
- Service worker (`public/sw.js`) pour le hors-ligne

## Installation

```bash
# 1. Dépendances
npm install

# 2. Base de données : créer le fichier .env
echo 'DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db' > .env

# 3. Créer les tables (sinon elles sont créées automatiquement au premier appel)
npx drizzle-kit push

# 4. Lancer
npm run dev          # développement  -> http://localhost:3000
npm run build && npm run start   # production
```

Variable optionnelle : `ADMIN_RESET_KEY` (12 caractères minimum) pour activer la réinitialisation
de mot de passe par le développeur : `POST /api/admin/reset-password` avec l'en-tête `x-admin-key`
et le corps `{ "phone": "90000000", "newPassword": "nouveau" }`.

## Structure

```
src/
  app/                 pages (Devis, Catalogue, Historique, Réglages) + routes API
    api/auth/          inscription, connexion, déconnexion, mot de passe
    api/data/          synchronisation des données par utilisateur
  components/          interface (assistant, aperçu PDF, choix du modèle, métreur, signature…)
  db/                  schéma Drizzle + connexion PostgreSQL
  lib/
    pdf.ts             moteur PDF + 4 modèles
    templates.ts       liste des modèles (noms, couleurs, vignettes)
    word.ts            export Word (.docx)
    calc.ts            calculs du devis
    format.ts          formats F CFA, dates, nombres en lettres
    stamp.ts           cachet automatique
    store.tsx          données locales + synchronisation
public/
  images/              photos (application + documents)
  templates/           vignettes des 4 modèles de PDF
  pdfjs/               moteur d'aperçu PDF (hors ligne)
  icon-*.png           icônes de l'application
  manifest.webmanifest, sw.js
```

## Images utilisées

| Fichier | Utilisation | Source |
|---|---|---|
| `public/images/masonry*.jpg`, `hero.jpg` | Accueil, Maçonnerie, bandeau Chantier | Pexels – GOWTHAM AGM |
| `public/images/tiling*.jpg` | Carrelage | Pexels – Bimbim Sindu |
| `public/images/rebar*.jpg` | Ferraillage | Pexels – Pixabay |
| `public/images/wood*.jpg` | Menuiserie, Réglages | Pexels – GOWTHAM AGM |
| `public/images/site*.jpg`, `banner-doc.jpg` | Historique, Matériaux, bandeau Prestige | Pexels – Ulrick Trappschuh |
| `public/images/tiles*.jpg` | Catalogue | Pexels – Agung Pandit Wiguna |
| `public/images/banner-chantier.jpg` | Bandeau du modèle Chantier (dérivé de masonry) | Pexels – GOWTHAM AGM |
| `public/templates/*.jpg` | Vignettes des modèles PDF | Générées par l'application |
| `public/icon-*.png`, `apple-touch-icon.png` | Icône de l'application | Générée par IA |

Les photos Pexels sont libres d'utilisation (licence Pexels).
