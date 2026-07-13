---
id: T10
title: Build the unified reservations dashboard & calendar
type: wayfinder:task
status: open
assignee:
blocked_by: [T02, T05, T06]
parent: map
---

## Question

Build the front-desk surface: one calendar/grid across all channels + direct, and a reservations
list. This is the "one dashboard instead of 3+ logins" payoff. Blocked by stack, domain model, and
the sync engine (it renders the pooled inventory + reservations those produce). Use `/prototype` then
`frontend-design`.

Scope:

- **Availability calendar** — 15 rooms × dates, showing which channel each booking came from, from
  the shared pool.
- **Reservations list/detail** — filter by channel, dates, status; see guest + payment state.
- **Manual controls** — block a room, close-out dates, adjust a nightly rate (writes back through the
  ARI push in T06).
- Read-only MVP is acceptable first; editing controls can follow.

**Answer records:** the working dashboard (linked), and which manual controls made v1.
