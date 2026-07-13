---
id: T03
title: Define the MVP scope & cut line
type: wayfinder:grilling
status: open
assignee:
blocked_by: []
parent: map
---

## Question

The owner wants "all of the above" (stop double-bookings + one calendar + rate/inventory control +
unified messaging). That's the full vision, but **v1 needs an explicit cut line** so the build has a
finish. Decide what's in MVP v1 vs. deferred to fog.

Proposed default ordering, grounded in the feasibility brief (pooled inventory is foundational and
highest-risk; messaging is explicitly "nice-to-have, not launch-critical"; payments/CFDI is a big
Mexico-specific rock):

- **v1 (in):** shared 15-room inventory pool + two-way availability/rate sync across Airbnb +
  Booking.com + Expedia (via the aggregator); a unified reservations calendar/dashboard; a
  direct-booking page (the one channel with no gatekeeper).
- **v1.5 / deferred (fog):** unified guest messaging, dynamic pricing rules, reporting/analytics,
  staff roles.
- **Open question the owner must settle:** does the **direct-booking site need to take real
  payments in v1** (→ pulls in T08 payments + T09 CFDI, a large scope), or can v1 direct bookings be
  request-to-book / pay-at-property, deferring payments+CFDI? This single call sizes the MVP more
  than any other.

**Answer records:** the v1 in/out list and the payments-in-v1 decision. Use a bounded pick for the
owner, not an open grilling.
