---
id: T05
title: Design the core domain model & data schema
type: wayfinder:prototype
status: open
assignee:
blocked_by: [T01, T02]
parent: map
---

## Question

Design the domain model and database schema for the PMS core. Blocked by the aggregator choice (its
API shapes the mapping entities) and the stack (Prisma schema target). Use `/domain-modeling` and
`/prototype`.

Entities to model, at minimum:

- **Property → RoomType → (physical) Rooms** — 15 rooms grouped into room-types.
- **RatePlan** and a **Rate calendar** (nightly price per room-type/rate-plan, min-stay, CTA/CTD,
  open/close restrictions).
- **Inventory / availability** as a **shared pool** per room-type (the anti-double-booking core) —
  not per-channel counts.
- **Reservation** (source channel, guest, dates, room-type, status, price, payment state) + guest.
- **ChannelMapping** — our internal RoomType/RatePlan ↔ each OTA's identifiers (via the aggregator).
- **Sync/audit log** — every ARI push and reservation event, for debugging the sync engine.

**Answer records:** the schema (as a linked Prisma schema / ERD asset) and the key modeling decisions
(especially how the shared inventory pool is represented and decremented).
