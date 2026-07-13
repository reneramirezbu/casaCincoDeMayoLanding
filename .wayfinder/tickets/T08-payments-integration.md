---
id: T08
title: Payments integration — Stripe MX vs Mercado Pago
type: wayfinder:research
status: open
assignee:
blocked_by: [T02, T03]
parent: map
---

## Question

If payments are in the MVP (decided in T03), choose and integrate the processor. Blocked by stack and
the payments-in-v1 decision. The brief flags PCI scope: use a hosted processor so we **never store
card numbers**, and handle **MXN + local methods**.

Resolve:

- **Stripe MX vs. Mercado Pago** for a Mexican hotel: MXN support, local payment methods (OXXO,
  SPEI, cards), payout/settlement, fees, and how each keeps us out of PCI-DSS scope.
- How **OTA-collected bookings** (Booking.com/Expedia virtual cards, Airbnb payouts) coexist with
  **direct** host-collected payments — the reservation model must track who collected.
- Deposit vs. full-payment vs. pay-at-property flows.

**Answer records:** the chosen processor + rationale, and the integration approach (linked). If T03
defers payments out of v1, close this as deferred and move it to fog.
