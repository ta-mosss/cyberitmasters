# Cyber I.T Masters — Customer Portal Phase 1

Phase 1 implements the customer-facing enterprise service-desk workspace.

## Included

- Firebase Email/Password customer authentication
- Customer account creation
- Password reset
- Customer profile stored under `customers/{uid}`
- Customer dashboard with ticket metrics
- Ticket list and ticket detail view
- Existing-ticket tracking by ticket reference + registered cellphone
- Enterprise service catalogue:
  - Managed IT Support
  - Cybersecurity
  - Infrastructure & Network
  - Cloud & Hosting
  - Physical Security & Building
  - Sales & Procurement
  - On-Site Visits
  - General / Other
- Category → sub-service request flow
- WhatsApp / Email / Both communication channels
- Priority and urgency
- Onsite address/date/time
- Device/asset fields where relevant
- Attachments uploaded to Firebase Storage
- Ticket records linked to the authenticated customer's `customerId`
- Asset history derived from ticket records
- Quotes & invoice links when supplied by the admin side
- Ticket timeline and SLA visibility
- Mobile-first customer workspace

## Ticket fields written by Phase 1

New customer requests include the enterprise fields:

- `customerId`
- `requesterUid`
- `serviceCategory`
- `serviceCategoryLabel`
- `serviceSubCategory`
- `serviceSubCategoryLabel`
- `serviceType` (category ID for compatibility)
- `channels`
- `contactMethod`
- `priority`
- `urgency`
- `attachments`
- existing contact, issue, device and onsite fields

## Firebase rules requirement

The portal assumes Firestore rules permit an authenticated customer to read their own customer record and tickets where `customerId == request.auth.uid`, and permit the customer to create their own ticket with `customerId == request.auth.uid`.

The portal also attempts an email-based ticket lookup as a compatibility bridge for older tickets. Production Firestore rules should restrict this appropriately rather than allowing unrestricted ticket reads.

## Existing architecture preserved

The existing Firebase project/configuration and public-file architecture are retained. The customer portal remains at `public/client.html`.
