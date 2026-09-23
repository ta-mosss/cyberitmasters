# Cyber I.T Masters — React Website v2

A production-oriented React/Vite frontend for Cyber I.T Masters, positioned as a full-service:

- Managed IT / MSP
- IT Solutions & Infrastructure
- Cybersecurity
- Microsoft 365 / Cloud
- Web Development
- Application Development
- DevOps / Cloud Engineering
- IT Procurement & Technology

## Run locally

```bash
npm install
npm run dev
```

Then open the Vite URL shown in the terminal.

## Production build

```bash
npm run build
npm run preview
```

## Logo

Put the existing `logo.png` in the project root's `public/` directory.

## Form integration

The current contact form prepares a `mailto:` enquiry so the frontend works without a backend. For production, replace the `submit()` handler in `src/App.jsx` with your preferred API/CRM endpoint.

## React Bits / Lightfall

The animated Lightfall hero uses OGL and is implemented in:
`src/components/Lightfall.jsx`

The component was adapted from the supplied React Bits Lightfall source. OGL is therefore included as a dependency.

## Phase 3 — Production application migration

The project now has a shared Vite/React application shell for the operational portals. Direct dependencies are pinned to React 19.1.1, Firebase 12.19.0 and React Router DOM 7.18.3.

Start the application with:

```bash
npm install
npm run dev
```

Then open `/login` for the shared application login. `/portal`, `/admin`, `/management`, `/engineer` and `/customer` are protected migration routes.

The existing HTML portals under `public/` remain available during the migration and are intentionally not removed yet. See `PHASE3_MIGRATION.md` and `MIGRATION_STATUS.md`.

## Deployment target

The React/Vite frontend is configured for GitHub Pages. The legacy standalone HTML portals are archived under `legacy-portals/` and are not copied into `dist/`.
