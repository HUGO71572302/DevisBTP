# Corrections – 6 octobre 2026

1. **Saisie des nombres** (`src/lib/format.ts`) : `1.500`, `1.000.000`, `1 500`, `1.500,50` sont maintenant bien lus (avant : 1,5 et 1).
2. **Devis envoyés / acceptés verrouillés** (`Wizard.tsx`) : écran 🔒 avec « Voir », « Nouvelle version » (copie) ou « Modifier quand même » (repasse en brouillon).
3. **Numérotation** (`sync.ts`, `store.tsx`, `types.ts`) : compteur par année qui ne redescend jamais + correction automatique des doublons après synchro entre deux téléphones.
4. **Brouillons vides** : supprimés automatiquement quand on quitte l'assistant sans rien saisir.
5. **Performance** (`store.tsx`) : enregistrement local regroupé (400 ms) au lieu de chaque frappe, envoi serveur après 2,5 s de pause, sauvegarde forcée quand l'appli passe en arrière-plan.
6. **Anti-force brute** (`auth-server.ts`, `login`) : tentatives stockées en base (table `login_attempts`, créée automatiquement), blocage 5 min puis doublé à chaque série (max 24 h).
7. **Changement de mot de passe** : déconnecte les autres téléphones.
8. Service worker : cache `v5` pour forcer la mise à jour.
9. **TVA** (`calc.ts`, `Wizard.tsx`, `parametres`, PDF, Word, WhatsApp) : choix « Sans TVA / TVA 18 % » à l'étape Conditions et réglage par défaut dans Réglages. Le devis affiche Total HT, TVA, Total TTC ; acompte calculé sur le TTC ; « … francs toutes taxes comprises ». Les anciens devis restent sans TVA.

## Vérifications du 7 octobre 2026
10. **Anti-force brute** (`auth-server.ts`) : le calcul du blocage ne peut plus dépasser la limite d'un entier après de très nombreux échecs (sinon la connexion renvoyait une erreur et le blocage n'était plus enregistré).
11. **Devis d'exemple** (`sync.ts`) : un nouveau compte reçoit un exemple daté d'aujourd'hui (avant : 16/10/2025).

