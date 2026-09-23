# Phase 3 — Management Portal / Operations Console

## Migration status

**Status: React migration implemented; legacy management portal retained for rollback.**

The former `public/management.html` operations console has been migrated into the shared Vite/React application while preserving the existing Firebase data model, security rules and trusted server functions.

## React routes

- `/management` — Operations dashboard
- `/management/tickets` — Service Desk
- `/management/jobs` — Job Cards
- `/management/dispatch` — Dispatch Board
- `/management/engineers` — Engineer Directory
- `/management/customers` — Customer Directory
- `/management/assets` — Asset Register
- `/management/quotes` — Quotes & Invoices
- `/management/sla` — SLA & Escalations
- `/management/reports` — Operations reporting
- `/management/audit` — Audit trail
- `/management/settings` — Security and migration state

## Data feeds

The portal subscribes to live Firestore collections:

- `tickets`
- `jobs`
- `users`
- `customers`
- `assets`
- `quotes`
- `auditLogs`

The staff directory is filtered to known staff roles and excludes customer accounts.

## Operational writes

Manager-level ticket and job mutations are performed with Firestore write batches that also create an audit record.

Job creation remains server-authorised through:

`/.netlify/functions/create-job`

The existing backend verifies a manager role before issuing a job card number and creating the job.

Customer sign-off remains server-authorised through:

`/.netlify/functions/authorise`

No management UI decision replaces Firestore Rules or backend verification.

## Role behaviour

Management access is granted through the existing `PORTAL_ROLES.management` gate.

- `super_admin` — management access and manager writes
- `operations_manager` — management access and manager writes
- `service_manager` — management access and manager writes
- `dispatcher` — management access and manager writes
- `finance` — management visibility through the existing role gate, but the React UI is read-only and backend rules remain authoritative

## Migration safety

The legacy file remains:

`public/management.html`

It must remain available until production verification confirms feature parity, data access and security behaviour.

## Validation

- Phase 1 security checks: PASS
- Phase 2 checks: PASS
- Phase 3 foundation checks: PASS
- Engineer portal checks: PASS
- Management portal checks: PASS

The production Vite bundle cannot be executed in this offline build environment because the repository's npm dependencies are not installed and the npm registry is unavailable from the build container.
