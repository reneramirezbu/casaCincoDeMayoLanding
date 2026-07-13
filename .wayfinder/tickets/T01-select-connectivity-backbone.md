---
id: T01
title: Select the connectivity backbone (Channex vs NextPax vs Cloudbeds fallback)
type: wayfinder:task
status: open
assignee:
blocked_by: []
parent: map
---

## Question

Which connectivity layer do we build on — and is it actually available to a single 15-room hotel?
This is the pivotal decision; almost every build ticket depends on the answer. The feasibility brief
recommends **Path (b): build our own PMS/UI on a connectivity-aggregator API**, with **Channex**
(hotel-friendly, ~US$130/mo, REST/JSON, covers Airbnb + Booking.com + Expedia + 50 more) and
**NextPax** (~US$250/mo incl. 25 rooms, 150+ OTAs, self-service sandbox) as the two candidates, and
**Cloudbeds (Path c, buy)** as the fallback if the CFDI/payments/time burden outweighs owning code.

This is a **task** because the decision is blocked on real-world legwork the owner is happy to have
an agent drive:

- Contact / sign up with **Channex** and **NextPax**; confirm each will onboard a **single 15-room
  independent hotel** (not just multi-property PMS vendors).
- Confirm **Airbnb + Booking.com + Expedia** are all actually reachable through them for our case,
  and whether Airbnb access has any extra gate.
- Confirm **real pricing** for our size (the ~$130 / ~$250 figures are indicative — get quotes).
- Confirm **sandbox / test-environment access** and capture credentials (where stored).
- Note integration model (REST endpoints, **webhooks vs polling** for reservations, Mapping API).

**Answer must record:** chosen provider (or "still deciding, here's the tradeoff"), sandbox
credential location, confirmed pricing, the Airbnb-access answer, and the webhook/ARI model — the
facts T05/T06/T11 depend on. If both aggregators refuse a single hotel, escalate to the Cloudbeds
fallback and flag that it changes the destination.
