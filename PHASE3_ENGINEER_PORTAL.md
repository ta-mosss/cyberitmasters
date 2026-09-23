# Phase 3 — Engineer Portal Migration

## React routes

- `/engineer` — assigned work queue and job detail workspace.
- `/engineer/schedule` — active scheduled work and scheduled-ticket view.
- `/engineer/history` — resolved and closed ticket history.
- `/engineer/profile` — engineer identity, role and skills view.

## Migrated functionality

The React engineer workspace replaces the legacy engineer portal's browser-side responsibilities with one shared Vite/React/Firebase runtime:

- Real-time assigned ticket queue using both `assignedEngineerId` and the existing legacy `assignedEngineer` name field.
- Ticket search and status filters.
- Customer, company, contact and site/device information.
- Engineer status updates.
- Work timer with backward-compatible `timeSpentMinutes` plus an auditable `tickets/{ticketId}/timeEntries` record.
- Engineer notes stored in the existing ticket notes structure.
- Ticket-scoped photo/document upload under the existing Storage rules.
- WhatsApp/email customer contact links.
- Resolution workflow and secure one-time customer sign-off link generation through the existing Netlify `authorise` function.
- Existing engineer profile fields remain read-only in the engineer workspace; profile administration stays with management.

## Security model

The React route is protected by `RequireRole` using the central auth context. Firestore remains authoritative for ticket mutations: an engineer can only update tickets that are assigned to the current user through `assignedEngineerId` or `assignedUid`. Ticket attachment access remains ticket-scoped and assignment-aware in Storage rules.

Customer sign-off is not implemented as a direct browser-side closure write. The engineer receives a server-generated, expiring one-time link from `/.netlify/functions/authorise`, and the existing server transaction remains responsible for validating and closing the customer service record.

## Compatibility

The legacy `public/engineer.html` remains available during the migration. It is the rollback/reference implementation and should only be removed after production functional parity and live-user validation.

## Verification

- `npm run engineer:check` — passes.
- `npm run phase1:check` — passes.
- `npm run phase2:check` — passes.
- `npm run phase3:check` — passes.
- TypeScript compiler JSX transpile pass over the Engineer modules — passes in the build environment.

A full Vite bundle was not regenerated in this environment because the npm registry was unavailable (`EAI_AGAIN`); the repository intentionally retains the Phase 2 lockfile reference until a connected build regenerates and commits the Phase 3 lockfile.
