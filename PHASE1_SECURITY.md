# Phase 1 — Support Desk Security Hardening

This branch/package hardens the existing support desk without changing the Firebase project ID (`test-bot-49f99`).

## What changed

- `firestore.rules` is now the canonical Firestore rules file.
- `storage.rules` is now the canonical Storage rules file.
- Legacy `.phase4` and email-rule fragments were removed.
- Customer sign-off no longer writes directly to Firestore/Realtime Database from the browser.
- `authorise` uses an expiring, cryptographically random, one-time sign-off token. Only the token hash is stored.
- Staff can create sign-off links only after Firebase ID-token verification.
- Staff email sending requires a verified Firebase ID token and staff role.
- Email audit events are server-created.
- Ticket attachments are uploaded after ticket creation so Storage rules can verify ownership.
- Engineer sign-off requests create a secure link and copy it to the clipboard.
- Internal admin sign-off uses the authenticated staff endpoint.
- GitHub Actions runs `npm run phase1:check` and the existing Vite build. It does **not** deploy Firebase rules.

## Required Netlify variables

Set these in Netlify, not in Git:

- `FIREBASE_SERVICE_ACCOUNT`
- `RESEND_API_KEY`
- `TICKETS_FROM_EMAIL`
- `TICKETS_DOMAIN`
- `ALLOWED_ORIGINS`
- `SIGNOFF_BASE_URL`
- `SIGNOFF_PATH`

## Deploying Firebase rules

No Firebase deployment is performed by the GitHub workflow. After reviewing/testing, deploy explicitly from a trusted environment:

```bash
firebase deploy --only firestore:rules,storage
```

## Important role requirement

The rules and server functions expect staff roles in `users/{uid}.role` or Firebase custom claims. Supported roles include `super_admin`, `operations_manager`, `service_manager`, `dispatcher`, `finance`, `engineer`, and `support_agent`.
