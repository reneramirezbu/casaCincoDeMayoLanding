---
id: T07
title: Build the direct booking engine (MVP)
type: wayfinder:task
status: open
assignee:
blocked_by: [T02, T05]
parent: map
---

## Question

Build the direct-booking flow on the hotel's own site — the one channel with **no commission and no
certification gatekeeper**, which the brief recommends building first. Blocked by stack (T02) and
domain model (T05). It reads/writes the same shared inventory pool as the OTA sync, so it can never
oversell against OTA bookings.

Scope:

- Search availability for date range → show bookable room-types & MXN rates from the rate calendar.
- Create a reservation against the shared pool (same atomic decrement path as T06).
- Guest details capture; confirmation.
- **Payments are gated on T03's "payments in v1?" decision** — if v1 is request-to-book /
  pay-at-property, ship without the payment step and layer T08/T09 in later; if v1 takes payment,
  this ticket blocks on T08.
- MXN pricing/display; note USD-quoting guests.

**Answer records:** the working direct-booking flow (linked), and whether payment was included or
deferred.
