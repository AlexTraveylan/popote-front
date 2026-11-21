# CLAUDE.md - popote-front

Front React de Popote (le back-end et la doc métier sont dans `popote-back/docs`).

## Commands

- Install: `npm install`
- Dev: `npm run dev` (proxy `/api` vers `VITE_API_PROXY_TARGET`)
- Validate (à faire passer avant chaque commit): `npm run validate`
- Smoke test de l'API: `npm run smoke`

## Structure

| Dossier                   | Rôle                                                                                                |
| ------------------------- | --------------------------------------------------------------------------------------------------- |
| `src/api/schemas.ts`      | Schémas Effect `Schema` miroirs des modèles Pydantic du back (source de vérité : réponses de l'API) |
| `src/api/client.ts`       | Client HTTP en `Effect` (`ApiError` taggée, décodage des réponses), `runApi` pour TanStack Query    |
| `src/api/hooks.ts`        | Hooks `useQuery` ; `useApiMutation` invalide tout le cache après une écriture                       |
| `src/state/AppContext.ts` | Membre courant (localStorage via `lib/member.ts`), jour affiché, toasts                             |
| `src/pages/*`             | Aujourd'hui, Recettes, Stock, Semaine, Courses (navigation par `#hash`)                             |
| `src/components/*`        | Feuilles modales (recette, cuisiner, nouvelle recette), formulaire de recette, petits composants    |
| `src/styles.css`          | Tokens de couleur (clair/sombre) et styles, mobile d'abord                                          |

## Conventions

- Toute réponse de l'API passe par un schéma Effect ; ajouter le champ au schéma quand le back évolue.
- Pas de logique métier côté front : classement, disponibilité et décomptes viennent de l'API.
- Textes de l'interface en français, du point de vue de l'utilisateur.
- Tests Vitest à côté du code (`*.spec.ts`) pour les fonctions pures de `src/lib`.
