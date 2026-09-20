# Phase 3 — Management & Operations Portal

Enterprise management layer for Cyber I.T Masters. Preserves the existing Firebase configuration and provides authenticated management views for service desk, engineers, customers, assets, quotes/invoices, SLA watchlist, reports, audit log and configuration.

## Production hardening

Before deployment, enforce Firebase custom claims/roles and Firestore/Storage rules for management users. Do not rely on hidden UI controls for authorization. Recommended roles: super_admin, operations_manager, service_manager, finance, dispatcher, engineer.

Ticket numbering and privileged mutations should ideally be performed through trusted Cloud Functions/server-side endpoints rather than arbitrary client transactions.
