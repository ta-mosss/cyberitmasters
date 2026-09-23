# Phase 3 application architecture

The root marketing site remains `src/App.jsx` while the application shell routes authenticated operational users through `src/app/AppRouter.jsx`.

The operational portals are being migrated incrementally. During the migration, `/admin`, `/management`, `/engineer` and `/customer` are protected React routes that bridge to the existing legacy HTML portals. A legacy portal is removed only after parity and security checks pass.
