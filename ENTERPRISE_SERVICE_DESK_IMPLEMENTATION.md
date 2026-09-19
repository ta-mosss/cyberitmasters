# Cyber I.T Masters — Enterprise Service Desk Implementation

This build follows the supplied enterprise service-desk specification and preserves the existing Firebase/Netlify architecture.

## Implemented in `public/admin.html`

### Step 1 — Enterprise service catalogue
The old three-option service list remains available only for legacy ticket rendering. New tickets use:

- Managed IT Support
  - Desktop / Laptop
  - Printer / Scanner
  - Mobile / Tablet
  - Application Support
  - Email / Microsoft 365
  - User & Account Administration
- Cybersecurity
  - Firewall / UTM
  - Endpoint Protection / EDR
  - Email Security
  - Identity & Access Management
  - Security Awareness
  - Vulnerability / Pen Test
- Infrastructure & Network
  - Network (LAN / WAN)
  - Wi-Fi / Wireless
  - Server Administration
  - Structured Cabling
  - Internet / ISP
  - Power / UPS
- Cloud & Hosting
  - Microsoft 365
  - Azure / AWS
  - Backup & Recovery
  - Disaster Recovery
  - Web / App Hosting
- Physical Security & Building
  - CCTV / Surveillance
  - Access Control
  - Alarm Systems
  - Intercom / PA
  - Building Management
- Sales & Procurement
  - Hardware Quote
  - Software / Licensing
  - New Project Consultation
  - Procurement / Order
- On-Site Visits
  - Installation
  - Repair / Replacement
  - Site Survey / Audit
- General / Other
  - General Enquiry
  - Feedback / Complaint
  - Other

### Step 2 — Client communication channels
Each new ticket stores `channels` as an array containing `whatsapp`, `email`, or both.

Legacy tickets with no `channels` field default to WhatsApp.

### Step 3 — Ticket details
The form captures client/contact information, requirement details, priority/urgency, optional device/asset information, onsite scheduling information, photos/evidence, engineer information, and authorization where applicable.

### Step 4 — Review
The ticket displays its category, sub-service, client contact, priority, communication channels, requirement, and onsite details before creation.

### Step 5 — Status notification routing
For notification statuses, the admin workflow now:

1. Saves the status.
2. Adds the engineer statement to the ticket notes.
3. Sends the client update using the ticket's selected channel(s).
4. Uses the existing Netlify `send-ticket-email` function for email.
5. Opens the existing WhatsApp URL for WhatsApp notifications.

### Step 6 — Backwards compatibility
Historical tickets continue to use `serviceType` values such as `device`, `remote`, and `onsite`. New tickets populate:

- `serviceCategory`
- `serviceCategoryLabel`
- `serviceSubCategory`
- `serviceSubCategoryLabel`
- `channels`
- `serviceType` (category id for compatibility with existing ticket records)

## Existing backend retained

The existing Firebase configuration, ticket collection, photo storage, Netlify email function, authentication gate, SLA functionality, engineer assignment, ticket notes, quotations, sign-off, analytics, and other existing admin functionality were not replaced with a new backend.

## Deployment

The project continues to use the existing Netlify function at:

`netlify/functions/send-ticket-email/send-ticket-email.js`

No new third-party service was introduced by this implementation.
