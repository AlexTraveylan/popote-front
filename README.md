# Popote — front

Interface de [Popote](https://github.com/AlexTraveylan/popote-back) pensée pour le téléphone : recettes du jour selon le
frigo, « j'ai cuisiné », stock avec la case « bientôt plus », planning, mémoire du foyer et historique des courses.

- React 19 · TypeScript · Vite · TanStack Query
- [Effect](https://effect.website) : client HTTP typé (`Effect` + `Schema` pour valider chaque réponse de l'API)
- Outillage : npm, ESLint, Prettier, Vitest, tsx

## Lancer

Le plus simple : `scripts\start.ps1` dans `popote-back` lance l'API et ce front ensemble.

Seul (API déjà lancée sur le port 8000) :

```powershell
npm install
npm run dev        # http://localhost:5173, accessible sur le réseau local (téléphone)
```

Le serveur Vite relaie `/api` vers l'API (`VITE_API_PROXY_TARGET`, défaut `http://127.0.0.1:8000`) :
le téléphone n'a besoin que de l'adresse du front.

## Vérifier

```powershell
npm run validate   # prettier, eslint, tsc, vitest
npm run smoke      # tsx : interroge l'API en marche
```
