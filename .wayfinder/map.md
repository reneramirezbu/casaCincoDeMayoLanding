---
labels: [wayfinder:map]
title: In-House Channel Manager for Casa Cinco de Mayo — MVP Build
tracker: local-markdown
created: 2026-07-11
---

# In-House Channel Manager for Casa Cinco de Mayo — MVP Build

## Destination

A **working, self-owned MVP channel manager** for Casa Cinco de Mayo (15-room boutique hotel,
San Miguel de Allende, GTO, MX) that keeps availability & rates in sync and centralizes
reservations across **Airbnb, Booking.com, Expedia, and a direct booking site**, selling all of
them from a single shared 15-room inventory pool so the same room never double-books. Greenfield —
nothing is live today.

Because direct OTA certification is effectively closed to a single property (see the
[OTA Connectivity Feasibility Brief](research/ota-connectivity-feasibility.md)), **"in-house / we
own it" means owning the PMS/app layer — unified calendar, direct-booking engine, reservations,
pricing logic, guest data — built on top of a connectivity-aggregator API (Channex / NextPax) that
holds the certified OTA connections. We do NOT certify with each OTA ourselves.**

## Notes

**Execution override.** Wayfinder defaults to *plan, don't do*; this effort overrides that. The
owner chose "go straight to building an MVP," so the map carries real build/task tickets to a
running MVP — not just decisions. (Charting a map is still one session: this session produced the
tickets and stopped. Work-sessions build them one at a time.)

**Standing preferences for this effort:**
- **Owner is time-constrained.** Prefer AFK `research`/`task` tickets and dispatch parallel
  sub-agents / `cursor-agent` for legwork. For HITL decisions, prefer bounded multiple-choice
  prompts (`AskUserQuestion`) over open-ended grilling.
- **Never fabricate Casa Cinco business facts** (current systems, prices, occupancy, account
  details). If a decision needs one, ask the owner via a quick pick — don't invent it.
- **Build-vs-buy is resolved toward build-on-aggregator (Path b).** Path (a) — certifying directly
  with each OTA — is out of scope (see below). Buying Cloudbeds (Path c) survives only as the
  explicit fallback inside "Select the connectivity backbone."
- **This repo's Next.js is modified.** `AGENTS.md` warns it has breaking changes vs. stock
  Next.js — **read `node_modules/next/dist/docs/` before writing any Next.js code.**
- The channel manager may become its **own app/repo** (this repo is currently only the marketing
  landing page) — that's decided in "Lock the tech stack, repo & scaffolding."

**Skills to consult:** `/domain-modeling` and `/prototype` (design tickets), `/grilling` (decision
tickets), `/prd` (MVP scope), `/research` (research tickets), `backend-api-architect` &
`frontend-design` sub-agents (build), `lint-and-validate` + `verification-before-completion`
(before any "done"), `git-pushing` (commits), and `cursor-agent` for independent build/design
sign-off.

**Key grounding asset:** [OTA Connectivity Feasibility Brief](research/ota-connectivity-feasibility.md)
— citation-dense; establishes the aggregator path, the Airbnb-access constraint, the pooled-inventory
risk, and the CFDI/payments burden.

## Decisions so far

<!-- empty — charting session only; nothing resolved yet -->

## Not yet specified

Fog toward the destination — in scope, not yet sharp enough to ticket. Graduates as the frontier
advances:

- **Unified guest messaging / inbox** across Airbnb + Booking.com (depends on which messaging APIs
  the chosen aggregator exposes; research flags this as post-MVP, not launch-critical).
- **Staff accounts, roles & permissions** (multi-user access for front-desk).
- **Reporting & analytics** — occupancy, ADR, RevPAR, channel mix.
- **Dynamic pricing / rate-rule automation** (seasonal, length-of-stay, min-stay rules).
- **Rate-parity enforcement policy** across channels (contractual on Booking.com/Expedia).
- **Cancellation / modification edge-case rules** (detailed behavior beyond the core sync engine).
- **Mexican tax modeling in rates & invoices** — IVA (16%) + ISH lodging tax (Guanajuato) beyond
  the CFDI issuance mechanics.
- **Housekeeping / operations module** and **guest CRM / post-stay** flows.

## Out of scope

Beyond this MVP's destination; returns only if the destination is redrawn:

- **Path (a): becoming a directly-certified OTA partner** (own Airbnb Software-Partner status +
  Booking.com Connectivity Partner + Expedia EQC certification). The feasibility brief shows this is
  effectively closed to a single 15-room property. Ruled out by scope, not fog.
- **Demand-side / reselling** other hotels' inventory (Expedia Rapid, LiteAPI) or building a
  multi-hotel channel-manager SaaS product for others. This system serves one property.
