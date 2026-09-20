# Cyber I.T Masters — Phase 4 MSP Operations Centre

Phase 4 turns the Phase 3 management portal into an operational workflow connecting customer requests, dispatch, job cards, engineers, commercial records and audit history.

## Included
- Unified operations dashboard
- Service Desk ticket search and detail workflow
- Ticket assignment to engineers
- Operational notes written into ticket history
- Job Card creation linked to tickets
- Job Card lifecycle: scheduled, dispatched, en-route, onsite, in-progress, awaiting-parts, completed, cancelled
- Dispatch queue and engineer workload view
- Engineer onboarding/profile records with role, employee ID, status and skills
- Customer and asset registers
- Quotes/invoice register view
- SLA/exception watchlist
- Reports and operational metrics
- Audit log writes for ticket, job and engineer onboarding mutations
- Firebase Email/Password authentication
- Existing Firebase project configuration preserved
- Mobile-responsive management UI

## Shared data model
The portal expects these Firestore collections where applicable:
- `tickets`
- `jobs`
- `engineers`
- `customers`
- `assets`
- `quotes`
- `auditLogs`

Tickets from Phase 1 remain compatible with the existing fields such as `ref`, `ticketNumber`, `serviceCategory`, `serviceSubCategory`, `channels`, `assignedEngineer`, `status`, `priority`, `createdAt` and `updatedAt`.

## Important security requirement
The UI is an operations client, not the authorization boundary. Before production staff access, deploy Firebase Authentication custom claims and Firestore/Storage rules that enforce roles server-side. Recommended roles remain:
- `super_admin`
- `operations_manager`
- `service_manager`
- `dispatcher`
- `finance`
- `engineer`

Do not rely on hidden navigation or client-side role checks as security.

## Production next steps
1. Deploy the supplied rule templates after reviewing them against the existing customer portal rules.
2. Move privileged mutations and ticket numbering to trusted Cloud Functions/server endpoints.
3. Add verified WhatsApp/email notification providers for customer status updates and dispatch messages.
4. Add engineer authentication linked to the `engineers` profile UID.
5. Add quote approval, invoice generation and customer sign-off as server-authorized state transitions.
6. Add scheduled SLA escalation functions rather than browser-only time calculations.

The included SLA page deliberately labels its 24-hour view as an operational watchlist, not a contractual SLA calculation, because the source project does not define customer-specific SLA targets.
