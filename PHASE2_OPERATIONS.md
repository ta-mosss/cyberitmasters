# Phase 2 — Operational Integrity & SLA Automation

Phase 2 builds on Phase 1 security hardening.

## Included

- Atomic Job Card numbering through a Firestore transaction and `meta/counters.jobSequence`.
- New Job Cards are created through `/.netlify/functions/create-job`; the browser no longer chooses the job number.
- Server-side SLA monitor scheduled every 15 minutes.
- Default business-hour SLA targets:
  - Urgent: 4 business hours
  - High: 8 business hours
  - Medium: 24 business hours
  - Low: 48 business hours
- Business hours: Monday–Friday, 08:00–17:00. Public holidays are not yet configured.
- SLA states: `within-sla`, `at-risk`, `breached`.
- SLA due time, elapsed business minutes, evaluation time and escalation level are stored on tickets.
- Transition into `at-risk` or `breached` creates an automation escalation record and sends an email when `RESEND_API_KEY` and `SLA_ALERT_EMAILS` are configured.
- Management SLA screen now consumes server-evaluated SLA fields.
- Reporting now uses `timeSpentMinutes` and completed job counts for basic operational reporting.

## Environment variables

In Netlify, configure:

```text
FIREBASE_SERVICE_ACCOUNT
RESEND_API_KEY
TICKETS_FROM_EMAIL
ALLOWED_ORIGINS
SLA_ALERT_EMAILS
SIGNOFF_BASE_URL
SIGNOFF_PATH
```

`SLA_ALERT_EMAILS` is a comma-separated list of internal escalation recipients.

## Deployment

Phase 2 does not automatically deploy Firebase rules. Push to GitHub and let CI validate the repository first. Deploy Netlify functions through the normal GitHub-connected Netlify build.

## Existing data

Existing Job Cards keep their current numbers. Only new Job Cards use the atomic sequence. Before production rollout, seed `meta/counters.jobSequence` to at least the highest existing numeric `JOB-` value to avoid sequence overlap.

Existing tickets without SLA fields are evaluated by the scheduled monitor and receive the calculated SLA metadata on the next run.

## Limitations intentionally left for the next phase

- Public-holiday calendars.
- Per-customer SLA contracts and calendars.
- WhatsApp Business API escalation.
- Dedicated observability/Sentry integration.
- Full historical KPI warehouse/time-series reporting.
