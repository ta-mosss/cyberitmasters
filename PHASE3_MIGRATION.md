# Phase 3 — Production React/Vite Migration

Phase 3 starts the controlled migration of the Cyber I.T Masters operational portals into one production React application.

## Foundation delivered

- React is pinned to `19.1.1` and ReactDOM to `19.1.1`.
- Firebase is pinned to `12.19.0`.
- React Router DOM is pinned to `7.18.3`.
- Firebase is initialized once from `src/services/firebase/app.js`.
- Authentication is centralized in `src/auth/AuthProvider.jsx`.
- Roles are resolved from both Firebase custom claims and `users/{uid}` profile data.
- Protected routes and role gates are implemented for `/admin`, `/management`, `/engineer` and `/customer`.
- The existing marketing site remains the `/` route.
- A migration bridge keeps the legacy HTML portals available until parity checks pass.

## Current migration strategy

The legacy portals are intentionally not deleted yet. The React routes establish the new security and navigation boundary first. Each legacy page is then decomposed into domain components, hooks and services before its standalone HTML page is removed.

Migration order:

1. Customer + sign-off — implemented
2. Engineer — implemented
3. Management
4. Admin / super-user consolidation
5. Legacy HTML/Babel/Firebase removal

## Firebase configuration

The browser-side Firebase configuration is public client configuration. It is centralized for the new application but may be overridden with `VITE_FIREBASE_*` environment variables. Server secrets such as service-account credentials and Resend API keys remain Netlify-only variables and are never prefixed with `VITE_`.

## Routes

- `/` — public marketing site
- `/login` — shared application login
- `/portal` — authenticated workspace
- `/customer` — migrated customer module
- `/signoff` — migrated secure customer sign-off
- `/engineer` — migrated engineer workspace
- `/management` — management module migration target
- `/admin` — admin module migration target

## Legacy bridge

The current standalone applications remain under `public/` and are intentionally still reachable during the migration. This allows rollback and side-by-side parity validation.

## Engineer verification

Run `npm run engineer:check` for the Engineer Portal migration-specific validation. The broader `npm run phase3:check` command now runs both the foundation and Engineer checks.

## Build target

The Vite base path is environment-driven. Netlify/custom-domain deployment defaults to `/`; the existing GitHub Pages workflow explicitly sets `/cyberitmasters/`.
