---
id: T11
title: Connect the OTAs, map rooms/rates & go live
type: wayfinder:task
status: open
assignee:
blocked_by: [T01, T04, T06]
parent: map
---

## Question

The go-live step: connect the real Airbnb/Booking.com/Expedia listings through the chosen aggregator,
map our room-types & rate-plans to each OTA's equivalents, and cut the shared inventory pool live.
Blocked by the aggregator (T01), the real OTA listings existing (T04), and the sync engine (T06).

Scope:

- In each OTA (Extranet / Partner Central / Airbnb) select our connectivity provider / authorize the
  connection per the brief's per-OTA steps.
- **Map** internal RoomTypes/RatePlans ↔ each OTA's room/rate identifiers via the aggregator's
  Mapping API (every OTA models rate plans differently — expect friction).
- Verify a **test booking** on each channel flows into our system and correctly decrements the pool
  and pushes availability to the others (validate the anti-oversell path end-to-end).
- Define the **cutover** (start with a small beta / limited inventory, per Booking.com's own
  recommendation, before full pool).

**Answer records:** connection status per OTA, the mapping table (linked), and the end-to-end
test-booking results proving no oversell.
