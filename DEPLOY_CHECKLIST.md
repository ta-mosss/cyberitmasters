# Cyber OpsCore - patch set (session of 2026-09-29)

## 1. Files to DELETE from your repo (git rm)
public/admin.html
public/client.html
public/engineer.html
public/management.html
public/clientsignoff.html
public/super.html
public/support.html
public/authorisation.html
firestore.rules.phase4
storage.rules.phase4
firebase/firestore.rules.email-snippet
firebase/storage.rules

## 2. Files in this zip - copy into your repo at the SAME relative path, overwriting anything that already exists
netlify/functions/create-ticket/create-ticket.js   (new)
src/pages/support/PublicTicketPage.jsx             (new)
src/pages/authorisation/AuthorisationPage.jsx       (new)
src/pages/management/ManagementStaffPage.jsx        (new)
src/pages/management/ManagementTicketsPage.jsx      (overwrite)
src/pages/management/index.js                       (overwrite)
src/services/management/operations.js               (overwrite)
src/services/tickets/engineer.js                     (overwrite - fixes a build-breaking syntax error)
src/app/AppRouter.jsx                                (overwrite)
src/styles/portal.css                                (overwrite)
src/styles/management.css                            (overwrite)
scripts/phase1-check.mjs                              (overwrite)
tests/security/firestore.rules.test.mjs               (overwrite)
netlify.toml                                          (overwrite)

## 3. After copying, run this locally BEFORE pushing
npm install
npm run build
npm run phase1:check
npm run phase3:check

All four must succeed. If `npm run build` fails, STOP - do not push. Something
was not copied correctly (most likely src/services/tickets/engineer.js, since
that file had a plain syntax error that breaks the whole build).

## 4. After pushing, check GitHub Actions - not just the site
Go to your repo -> Actions tab -> find the most recent "Deploy" / "Phase 1
Security Check" run for this push.
- If it is GREEN: GitHub Pages should now be serving the new app.
- If it is RED: GitHub Pages is still serving whatever the last GREEN build
  was - which, based on everything tested this session, is almost certainly
  a build from before any of this work. This is the most likely reason
  ta-mosss.github.io/cyberitmasters/admin has kept showing the old
  admin.html through every round of testing: if the build has been failing
  silently, nothing new has ever actually gone live, no matter how many
  files get changed in the repo.

## 5. Test the NEW paths, not the old ones
/admin.html and /support.html no longer exist as files - trying to load them
directly will 404 (correct - it means the delete worked).
Use these instead:
/management            -> ticket/job/dispatch/engineer/customer console
/management/staff      -> staff & access (Worker-backed)
/support                -> public ticket intake (no login)
/authorise?ticketId=... -> device drop-off authorisation
/engineer               -> engineer portal
