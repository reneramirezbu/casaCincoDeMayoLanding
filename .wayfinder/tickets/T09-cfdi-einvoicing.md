---
id: T09
title: CFDI 4.0 e-invoicing via a PAC
type: wayfinder:research
status: open
assignee:
blocked_by: [T03, T08]
parent: map
---

## Question

Mexico mandates **CFDI 4.0** electronic tax invoices (structured XML cleared in real time through a
**PAC**, with the SAT digital seal, QR-coded PDF, 5-year retention; requires the hotel's **e.Firma**
and a **CSD**). The brief is explicit: **do not hand-roll this — integrate a PAC / eFactura
provider.** Blocked by MVP scope (is invoicing in v1?) and payments.

Resolve:

- Select a **PAC / eFactura API** (or confirm whether a bought platform like Cloudbeds would cover it
  if the fallback is ever taken).
- What the hotel must obtain from SAT: **e.Firma** + **CSD** — hand the owner a checklist (HITL task,
  owner-only).
- Where CFDI generation hooks into the reservation/payment lifecycle.
- Model **IVA (16%)** and **ISH lodging tax (Guanajuato)** in rates/invoices (or split to fog if too
  large).

**Answer records:** the chosen PAC, the owner's SAT-credential checklist, and the invoicing hook
point. Likely **v1.5, not v1** — confirm against T03 and defer to fog if so.
