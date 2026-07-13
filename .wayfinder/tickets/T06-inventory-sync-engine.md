---
id: T06
title: Design the pooled-inventory & ARI sync engine
type: wayfinder:prototype
status: open
assignee:
blocked_by: [T01, T05]
parent: map
---

## Question

Design the highest-risk piece: the engine that keeps the shared 15-room pool correct across all
channels. The feasibility brief names pooled-inventory correctness as the single highest-stakes logic
and the reason iCal-only is unsafe. Blocked by aggregator choice (webhook/ARI contract) and the
domain model.

Resolve:

- **Reservation ingestion:** webhooks vs. polling from the aggregator; idempotency; how new /
  modified / cancelled bookings decrement/restore the pool **atomically** so total sold never exceeds
  physical rooms.
- **ARI push:** when a booking lands on any channel, how availability is pushed back out to the
  others fast enough to avoid a second sale in the race window; batching; retry/backoff on failure.
- **Conflict / oversell handling:** what happens if two channels sell the last room inside the race
  window despite our push — detection, alerting, and recovery policy.
- **Rate push:** how nightly rates / restrictions propagate to all channels from one edit.
- **Observability:** the sync/audit log from T05, plus alerting on divergence.

Prototype the state model and the critical decrement path (via `/prototype`) before full build.

**Answer records:** the sync architecture (linked design doc / diagram), the chosen webhook-vs-poll
model, and the oversell-recovery policy.
