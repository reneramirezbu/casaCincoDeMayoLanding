# OTA Connectivity Feasibility Brief — In-House Channel Manager for Casa Cinco de Mayo

**Property:** Casa Cinco de Mayo — 15-room independent boutique hotel, San Miguel de Allende (SMA), Guanajuato, Mexico
**Question:** Is it feasible to build/own an in-house channel manager (à la OwnerRez / Lodgify / Hostaway / Guesty) that pushes availability/rates/inventory to and pulls reservations from Airbnb, Booking.com, Expedia, and a direct-booking site?
**Date compiled:** 2026-07-11
**Method:** Primary developer/partner documentation via web research. Every material claim is cited. Where a fact is not published by the source-of-truth, it is explicitly marked **"not publicly documented."**

> ⚠️ **Sourcing caveat:** Airbnb, Booking.com, and Expedia all restrict the deepest technical detail (exact thresholds, fees, timelines) to logged-in partner portals that are not publicly fetchable. Those specifics are flagged below as "not publicly documented" rather than guessed. Nothing in this brief is fabricated.

---

## Executive Summary — Verdict on the 3 Architecture Paths

There are three ways to "own" reservation management across the big-3 OTAs plus a direct site. For a single 15-room independent hotel, they rank as follows:

| Path | What it is | Realistic for a 15-room independent? | One-line verdict |
|---|---|---|---|
| **(a) Certify directly with each OTA** | Become an approved Airbnb software partner + a certified Booking.com Connectivity Partner + a certified Expedia (EQC) partner, and build all integrations yourself | ❌ **Not realistic** | Partner programs are built for software *vendors* with a book of many properties, not one hotel. Airbnb new-partner applications are reportedly paused; each OTA runs its own multi-month certification. Enormous effort to serve one property. |
| **(b) Build on a connectivity-aggregator API** | Build your own UI / PMS logic on top of a white-label channel-manager API (Channex, NextPax, Rentals United) that already holds certified OTA connections and resells them | ✅ **Most realistic "own-it" option** | You get one modern REST/JSON API that fans out to Airbnb + Booking.com + Expedia (+ 50–150 more) without individually certifying. You own the front-end, calendar, logic, and data. Low monthly cost (~US$130–250/mo range). This is the pragmatic middle path. |
| **(c) Buy an existing channel manager / PMS** | License Cloudbeds, SiteMinder, Hostaway, Little Hotelier, etc. | ✅ **Realistic, least effort** | Fastest to live, includes support and (via Cloudbeds) Mexican CFDI tax invoicing. You don't "own" the software but you own your operation. Best default unless owning the codebase is itself the goal. |

**Bottom line:** Path (a) is effectively closed to a one-property owner. The genuine "build & own it in-house" answer is **Path (b) — build your PMS/UI on a connectivity-aggregator API.** Path (c) is the pragmatic buy-instead baseline and is the only path that also solves Mexican tax invoicing out of the box. A sensible plan is **(b) for the parts you want to own (guest experience, direct booking, calendar, logic) layered on an aggregator for OTA plumbing**, with **(c) as the fallback if time-to-live matters more than ownership.**

---

## 1. Airbnb API Access

### Direct API access for an individual owner / small hotel: effectively **no**
Airbnb's full API is **not open to individual hosts or single properties.** Access is granted only to approved **software partners** — channel managers, PMS systems, and software companies — that pass Airbnb's review. Individual hosts are directed to connect *through* an already-approved partner rather than to obtain direct access. ([Airbnb Community — "How do I become an Airbnb partner?"](https://community.withairbnb.com/t5/Ask-about-your-listing/How-do-I-become-an-Airbnb-partner/m-p/2184078); [Airbnb API Terms of Service, help art. 3418](https://www.airbnb.com/help/article/3418))

### The Airbnb Software Partner / Preferred Software Partner program
Airbnb runs a **Software Partner** program with a curated **"Preferred"** and **"Preferred+"** tier. Partners are selected only after a **comprehensive review** against Airbnb's *integration, technical, foundational, and performance* standards, plus a **data-security and API-quality review.** Selection is driven by the **supply opportunity, technology strength, and ability to support shared customers** a partner brings. ([Airbnb Newsroom — 2025 Preferred Software Partners](https://news.airbnb.com/announcing-our-2025-preferred-software-partners/); [2024 Preferred Software Partners](https://news.airbnb.com/announcing-our-2024-preferred-software-partners/))

- **Vetting criteria:** business/company review, security standards, and how many users/listings you support. Approval activates API access at the *company* level, not the property level. ([Airbnb Community](https://community.withairbnb.com/t5/Ask-about-your-listing/How-do-I-become-an-Airbnb-partner/m-p/2184078))
- **Minimum-listing threshold to become a partner:** **not publicly documented** as a hard number. The bar is qualitative ("supply opportunity"), which structurally disfavors a one-property applicant.
- **Application status:** third-party industry sources report that **new applications on the Airbnb partner portal are currently paused**, with prospective partners told to contact Airbnb global support to have a case reviewed. Treat as *reported, not officially confirmed by Airbnb.* ([Elfsight — How to get and use the Airbnb API, 2026](https://elfsight.com/blog/how-to-get-and-use-airbnb-api-partnership-and-integration/))
- **Hotel eligibility once connected via a partner:** the API *does* support hotel-type inventory. To use it in certain geographies a listing must be licensed as one of a defined set of property categories including **boutique hotel, hotel, aparthotel, B&B, hostel, resort, serviced apartment**, etc. Listings must be fully **verified** and set to **Listed** before they can authenticate; only **one Airbnb account** may connect per PMS account. ([Cloudbeds — Airbnb API Minimum Requirements](https://myfrontdesk.cloudbeds.com/hc/en-us/articles/360009781474-Airbnb-API-Minimum-Requirements))

### Fallback path: iCal calendar sync — and its hard limits
Airbnb exposes a per-listing **iCal export/import** URL that any host can use with no partner status. It is a genuine fallback but a thin one.

- **What iCal syncs:** **availability only.** A booking (or manual block) on one platform exports as a "busy"/blocked date that other platforms import, so calendars mutually block. ([AirROI — What is iCal Sync](https://www.airroi.com/glossary/ical-sync); [PriceLabs — Sync Airbnb & Booking.com calendars](https://help.pricelabs.co/portal/en/kb/articles/how-to-sync-your-airbnb-and-booking-com-calendars))
- **What iCal does NOT sync:** **rates/prices, minimum-stay and restrictions, guest identity/contact details, reservation line items, payment, or messaging.** Each channel's pricing and content must still be maintained separately; when a booking lands via another channel you must log into that channel to see who booked and communicate. ([AirROI](https://www.airroi.com/glossary/ical-sync); [Rentals United — Airbnb calendar sync](https://rentalsunited.com/blog/airbnb-calendar-sync/))
- **The overbooking gap:** iCal is **pull-based and slow** — refresh intervals are typically a few hours and can lag (commonly cited 3–12h). Two guests can book the same room on two channels inside that window. For a 15-room hotel selling the same room-types across 3+ OTAs, iCal alone is **not a safe channel-management strategy** — it's a stopgap, not a channel manager. ([AirROI](https://www.airroi.com/glossary/ical-sync))

**The API-vs-iCal gap in one sentence:** the real-time API gives two-way ARI, reservation payloads, guest data, and messaging under an approved partner relationship; iCal gives you delayed one-way availability blocking and nothing else.

---

## 2. Booking.com Connectivity

### Can a single hotelier / small dev team get certified? Technically yes, but as a *software provider*, not as a property
Booking.com exposes its supply-side integration through the **Connectivity APIs** governed by the **Connectivity Partner Programme (CPP).** A property does **not** connect its own bespoke software as a one-off exception — the *software* must be onboarded as a **Connectivity Partner**, after which any property can select that provider in its Booking.com **Extranet**. A small dev team can in principle apply; the gate is passing the programme's onboarding + certification, not company size per se. ([Booking.com — About the Connectivity APIs](https://developers.booking.com/connectivity/docs); [Requirements for becoming a Connectivity Partner](https://connectivity.booking.com/s/article/Requirements-for-becoming-a-Booking-com-Connectivity-Partner); [Connectivity Portal](https://connect.booking.com/))

### Requirements & certification process
- **Onboarding requirements** must be met to become a partner; **PCI DSS attestation** is required for anything touching card data, and **PII compliance** is reviewed against applicable regulations. Partners must also **keep pace with ongoing API changes** to keep connected properties current. ([Requirements page](https://connectivity.booking.com/s/article/Requirements-for-becoming-a-Booking-com-Connectivity-Partner))
- **Certification vs self-assessment:** before production, each API is gated by either a **certification** (you run prescribed test requests against **test properties**; the Connectivity Support team evaluates your requests/responses and signs off) **or a self-assessment** (follow tutorials, submit response IDs/screenshots), depending on the API's criticality. Booking.com recommends launching to a **small beta group** first. ([Booking.com — Going Live](https://developers.booking.com/connectivity/docs/going_live))
- **Test environment:** certification is performed against **test properties** rather than a fully separate public sandbox; a dedicated always-on sandbox is **not clearly documented** publicly. ([Going Live](https://developers.booking.com/connectivity/docs/going_live))
- **Timeline & fees:** the end-to-end certification duration and any programme fees are **not publicly documented** — they surface inside the partner portal / via an account manager.

### Main API groups (the ARI + reservations surface a channel manager needs)
From Booking.com's connectivity product list: **Rates & Availability (ARI)** — manage availability & pricing; **Reservations** — retrieve/confirm bookings (PCI-compliant servers required for card retrieval); **Content** — create/update property content; **Photos**; **Promotions** — create/manage deals; **Guest Reviews** — retrieve & respond; **Messaging (Guest Messages)** — property↔guest communication; **Reporting** — report/modify existing reservations; **Facilities**; **Performance Data & Insights**; **Payments by Booking.com onboarding.** ([About the Connectivity APIs](https://developers.booking.com/connectivity/docs); [Understanding the Messaging API](https://developers.booking.com/connectivity/docs/messaging-api/understanding-the-messaging-api))

> Note: third parties advertise "Extranet API" scraping tools as an "alternative to certification." These automate the human Extranet UI and are outside the official programme — **treat as unsupported/ToS-risky and not recommended** for a business you intend to run for years.

---

## 3. Expedia Connectivity — the critical Rapid-vs-EQC distinction

**This hotel needs the *supply* (property) side, not the *demand* (travel-agent) side.** Expedia Group sells two very different API families; conflating them is the most common mistake:

| | **Expedia QuickConnect (EQC) / Lodging Supply Connectivity** ✅ what the hotel needs | **Expedia Rapid** ❌ NOT what the hotel needs |
|---|---|---|
| Purpose | Let a **hotel/PMS manage its OWN listing** on Expedia — push availability, rates, inventory, restrictions; retrieve/confirm its own bookings | **Resell Expedia's ~800K-property inventory** inside *your* travel app/OTA as an agent |
| Direction | You are the **supplier** publishing your rooms | You are a **distributor** consuming Expedia's supply |
| Core API | **Availability and Rates API** (+ Booking Notification *or* Booking Retrieval/Confirmation) | **Rapid shopping/booking/payment API** |
| Docs | [EG supply / lodging — Avail & Rates](https://developers.expediagroup.com/supply/lodging/docs/avail_and_rate_apis/avail_rates/getting_started/introduction/) · [Booking Retrieval](https://developers.expediagroup.com/supply/lodging/docs/booking_apis/booking_retrieval/getting_started/introduction/) | [Rapid product hub](https://developers.expediagroup.com/docs/products/rapid) · [Rapid API](https://partner.expediagroup.com/en-us/solutions/build-your-travel-experience/rapid-api) |

### EQC — what it is and who it's for
Expedia QuickConnect is the interface that lets **independent hotels and small/medium chains** link their PMS/CRS to Expedia to **automate exchange of room, rate, and booking information.** The **Availability and Rates API** updates inventory across all Expedia points of sale — multiple room types/rate plans, multiple date ranges, open/close and restrictions — and pairs with either the **Booking Notification API** or the **Booking Retrieval + Booking Confirmation** APIs to receive reservations. ([Expedia press release — QuickConnect launch](https://www.expedia.com/stories/expedia-inc-launches-expedia-quickconnect-solution-to-enable-direct-connections-with-hotel-partners/); [Avail & Rates API intro](https://developers.expediagroup.com/supply/lodging/docs/avail_and_rate_apis/avail_rates/getting_started/introduction/))

### Certification / onboarding for property-side connectivity
- You **contact an Expedia Connectivity Manager** to express interest in adding/upgrading an integration; Expedia explicitly warns that **launching without following the project + integration certification process** can cause degraded performance or failure. ([Avail & Rates API intro](https://developers.expediagroup.com/supply/lodging/docs/avail_and_rate_apis/avail_rates/getting_started/introduction/))
- On the property side, the hotel enables the connection in **Expedia Partner Central → Rooms and Rates → Expedia Connectivity Settings**, selecting its **System Provider** (i.e., your software, once certified) from a drop-down, then maps rooms/rate plans. ([Expedia Partner Central connectivity setup, as documented by connectivity providers](https://help.shrgroup.com/s/article/CRS-Expedia-Group-Quick-Connect-Integration-Setup-Guide))
- Expedia maintains a **directory of recommended/certified connectivity providers** that properties can simply choose from — the intended path for most hotels. ([Expedia — Hotel connectivity providers](https://partner.expediagroup.com/en-us/industries/hotels/hotel-connectivity-providers))
- **Sandbox, exact certification timeline, and fees:** **not publicly documented**; handled via the Connectivity Manager and partner portal.

**Interpretation for us:** EQC is genuinely open to "a hotel connecting its own software," but that software must pass Expedia's integration certification. Same shape as Booking.com — it's a *software-vendor* certification, not a property toggle.

---

## 4. The Pragmatic Middle Path — Connectivity Aggregators (build-your-own on top)

This is the key to "own it in-house **without** certifying with every OTA." Several vendors have already done the Airbnb/Booking.com/Expedia certifications and **resell that certified connectivity through a single developer API**, letting you build your own UI, calendar, PMS logic, and direct-booking flow on top. You integrate **once**.

### Channex.io — best hotel-capable fit
- **What it is:** a **white-label channel-manager API** built for PMS/tech partners; explicitly positioned so you build your product and Channex is the OTA plumbing. Modern **REST/JSON**, no XML/CSV mapping. ([channex.io](https://channex.io/); [Channex docs](https://docs.channex.io/); [About Channex & FAQ](https://docs.channex.io/about-channex-and-faq))
- **OTA coverage:** **50+ OTAs incl. Booking.com, Airbnb, and Expedia.** ([channex.io](https://channex.io/))
- **Build your own front-end?** Yes — "full API from creating properties, rooms and rates to mapping each OTA," designed for PMS providers to **resell connectivity under their own brand.** Requirement: you must have a PMS/booking-engine system (a custom-built one qualifies); pure "resellers with no system" are excluded. ([PMS Integration Guide](https://docs.channex.io/guides/pms-integration-guide); [About Channex & FAQ](https://docs.channex.io/about-channex-and-faq))
- **Pricing:** a single **white-label plan reported at ~US$130/month** covering API access, dashboard, Mapping API, unlimited users, onboarding, and support (homepage says "transparent per-property pricing" without exact figures; the ~$130 figure comes from directory listings — **treat as indicative, confirm with Channex**). ([channex.io](https://channex.io/); [Capterra — Channex](https://www.capterra.com/p/10036936/Channex/))
- **Fit note:** supports hotel room-types/rate-plans and is one of the few aggregators equally comfortable with hotels (not just vacation rentals). Integration effort cited as ~2–4 weeks. ([channex.io](https://channex.io/))

### NextPax — Supply API
- **What it is:** a next-gen channel manager exposing a **Supply API** with a self-service **Developer Portal and a sandbox**; syncs availability, rates, content, **messaging, reviews, promotions, reservations** in real time. ([NextPax Supply API](https://nextpax.com/channel-manager/supply-api))
- **Coverage:** **150+ OTAs** incl. Booking.com, Airbnb, Vrbo, Expedia, Trip.com, plus GDS. ([NextPax Supply API](https://nextpax.com/channel-manager/supply-api))
- **Pricing:** flexible monthly, **pay once per property regardless of channel count**; **minimum ~US$/€250/month including the first 25 units/rooms** (a 15-room hotel fits inside the base tier). ([NextPax Pricing](https://nextpax.com/nextpax-pricing))
- **Build your own front-end?** Yes — REST/JSON Supply API + sandbox aimed at partners building their own product. ([NextPax Supply API](https://nextpax.com/channel-manager/supply-api))

### Rentals United — White-Label Channel Manager API
- **What it is:** **pre-built connectivity infrastructure** so a PMS can offer OTA distribution **under its own brand** without building the integrations. Two-way sync of rates/availability/content. ([RU White-Label CM](https://rentalsunited.com/white-label-channel-manager/); [RU API](https://rentalsunited.com/how-it-works-api/))
- **Coverage:** **90+ channels**, real-time two-way with Airbnb, Vrbo, Booking.com + specialist/regional OTAs. ([RU White-Label CM](https://rentalsunited.com/white-label-channel-manager/))
- **Fit note:** **more vacation-rental-centric** than hotel-centric; strong for STR, less ideal if you need rich hotel room-type/rate-plan semantics. Pricing **not publicly documented** (sales-led).

### Nuitée / LiteAPI — investigated, but **NOT the right tool**
LiteAPI is a **demand-side hotel-distribution API** — it lets you *search and resell* 2.6M+ hotels (GDS/NDC), analogous to **Expedia Rapid**, not a property publishing its own ARI to OTAs. It does **not** solve "push my 15 rooms to Airbnb/Booking/Expedia." Listed here only to rule it out. ([Nuitée / LiteAPI](https://www.liteapi.travel/); [Nuitée Connect](https://nuitee.com/connect))

**Aggregator takeaway:** **Channex (hotel-friendly) or NextPax (broad + sandbox)** are the strongest bases to "own it in-house without certifying with each OTA." One REST API → Airbnb + Booking.com + Expedia + dozens more; you build the calendar, inbox, direct-booking, and business logic; monthly cost roughly **US$130–250** for a property this size.

---

## 5. What a Channel Manager Must Actually Do (and what's hard/risky)

| Capability | What it means | Difficulty / risk |
|---|---|---|
| **ARI push** (Availability, Rates, Inventory + restrictions) | Two-way, near-real-time sync of open/close, nightly rates, min-stay/CTA/CTD, per room-type & rate-plan, across all channels | **Core.** Moderate via aggregator (they normalize it); very hard if certifying each OTA yourself. |
| **Reservation retrieval & delivery** | Pull new/modified/cancelled bookings from each channel into your system, with guest + payment payloads | **Core.** Payment data → **PCI DSS** scope (Booking.com requires PCI attestation to retrieve card data). ([Booking.com Requirements](https://connectivity.booking.com/s/article/Requirements-for-becoming-a-Booking-com-Connectivity-Partner)) |
| **Room-type & rate-plan mapping** | Map your internal room types/rate plans to each OTA's equivalents | Core, fiddly; every OTA models rate plans differently. Aggregators provide a Mapping API. |
| **Pooled / shared inventory** | Sell the *same* physical rooms across all channels from one shared pool so total sold never exceeds 15 | **Highest-risk item.** This is what prevents **overbookings**. Requires atomic, low-latency decrementing on every booking event; the reason iCal (hours-delayed, availability-only) is unsafe. ([AirROI — iCal Sync](https://www.airroi.com/glossary/ical-sync)) |
| **Unified calendar** | One availability grid across all channels + direct | Moderate; the payoff of pooled inventory. |
| **Rate parity** | Keep displayed rates consistent across channels (contractual on Booking.com/Expedia) | Policy risk more than technical; your pricing logic must push consistent rates or intentional channel deltas. |
| **Unified messaging / inbox** | One inbox for Airbnb + Booking.com guest messages | Requires each OTA's Messaging API (Airbnb messaging = partner-only; Booking.com Messaging API). Nice-to-have, not launch-critical. |
| **Payment handling** | Collect deposits/balances; handle OTA "virtual cards" (Booking.com/Expedia collect) vs. host-collect | **Hard + compliance-heavy.** PCI DSS + (in Mexico) CFDI invoicing (see §6). Consider a payment processor (Stripe/Mercado Pago) so you never store PANs. |

**Riskiest three to get right:** pooled inventory (overbooking), payment/PCI handling, and reservation-modification/cancellation edge cases. These are exactly the areas where a mature aggregator or bought channel manager de-risks you the most.

---

## 6. Mexico / San Miguel de Allende Specifics

### Currency
Price and settle in **MXN**; expect USD-quoting guests. Your booking engine/payment layer must handle MXN and FX display. (Mercado Pago and Stripe both operate in Mexico and support MXN + local methods.)

### CFDI 4.0 / Facturación Electrónica (SAT) — the biggest local build burden
Mexico mandates **CFDI** (Comprobante Fiscal Digital por Internet) electronic tax invoices for essentially all B2B/B2C transactions. Any in-house system that issues guest invoices must comply:
- **CFDI 4.0** is the mandatory version (since Jan 1 2023; 3.3 retired). Invoices are structured **XML**, cleared **in real time through a PAC** (SAT-accredited certification provider) that applies the **Digital Seal (sello)** and reports to SAT; a **QR-coded PDF** is delivered and records retained **5 years.** ([Cloudbeds — Mexico Government Compliance](https://www.cloudbeds.com/government-compliance/mexico/); [Avalara — Mexican e-invoices](https://www.avalara.com/us/en/vatlive/country-guides/north-america/mexico/mexican-e-invoices.html); [EDICOM — CFDI e-invoicing](https://edicomgroup.com/blog/cfdi-electronic-invoicing-mexico))
- The hotel needs SAT digital certificates: **e.Firma** (foundational) and a **CSD** (Certificado de Sello Digital) exclusively for signing CFDIs. ([Cloudbeds — Mexico](https://www.cloudbeds.com/government-compliance/mexico/))
- **Practical implication:** do **not** build CFDI generation from scratch. Integrate a **PAC / eFactura provider** (Cloudbeds bundles eFactura SAT / partners like NDFact by Nativo Digital; standalone PACs exist). This is a strong argument for using a platform that already handles Mexican invoicing — or at least a PAC API — rather than a fully home-grown billing stack. ([Cloudbeds — Mexico](https://www.cloudbeds.com/government-compliance/mexico/))
- Also note **lodging/occupancy tax (ISH, Impuesto Sobre Hospedaje)** in Guanajuato and standard **IVA (16%)** must be modeled in rates/invoices.

### OTA prevalence in SMA
San Miguel de Allende is a high-demand UNESCO tourist market where the **big-3 dominate**: Airbnb carries a deep boutique-hotel/B&B inventory for SMA (dedicated boutique-hotel and hotel category pages), and Booking.com/Expedia are the standard for international hotel bookings. There is **no meaningful Mexico-only OTA** that would let you skip the big-3 — Despegar/Decolar exists regionally but is secondary for this segment. Direct bookings (walk-the-guest-off-OTA) are the margin play. ([Airbnb — SMA boutique hotels](https://www.airbnb.com/san-miguel-de-allende-mexico/stays/boutique-hotels); [Airbnb — SMA hotels](https://www.airbnb.com/san-miguel-de-allende-mexico/stays/hotels))

### Direct-booking engine options that work in Mexico
A direct-booking engine you control is the one channel with **no commission and no certification gatekeeper** — build this yourself first. Aggregators (Channex/NextPax) plus a Mexico-capable payment processor (Mercado Pago / Stripe MX) + a PAC for CFDI is a fully self-owned direct stack. Off-the-shelf engines that operate in Mexico include **Cloudbeds** (also solves CFDI) and **Little Hotelier**. ([Cloudbeds channel manager/booking](https://www.cloudbeds.com/channel-manager/))

---

## 7. Recommendation Matrix — for a 15-room independent in SMA

| Dimension | (a) Certify with each OTA | (b) Build on aggregator API | (c) Buy a channel manager/PMS |
|---|---|---|---|
| **Feasible for 1 property?** | ❌ No (programs target vendors; Airbnb apps reportedly paused) | ✅ Yes | ✅ Yes |
| **Own the software/UX?** | ✅ Fully (but you also own all the pain) | ✅ Your front-end/logic; rent the OTA plumbing | ❌ You configure, don't own |
| **Time to live** | 6–18+ months, uncertain approvals | Weeks–a few months | Days–weeks |
| **Up-front effort** | Very high (3 separate certifications + maintenance) | Moderate (one API integration) | Low |
| **Monthly cost (indicative)** | Your dev time; OTA programs' fees not published | ~US$130–250/mo (Channex/NextPax) + your build | Hostaway ~US$99+/mo; Cloudbeds/SiteMinder quote-based |
| **Overbooking safety** | You must build pooled inventory | Aggregator provides pooled ARI | Built-in |
| **Mexico CFDI handled?** | You build/integrate a PAC | You integrate a PAC yourself | ✅ Cloudbeds bundles CFDI; others may not |
| **Payments/PCI** | Your burden | Your burden (use Stripe/Mercado Pago to shrink PCI scope) | Mostly handled |

### Recommended path
**Primary: Path (b).** Build the in-house PMS/UI (unified calendar, direct-booking engine, guest CRM, pricing logic) **on Channex** (hotel-friendly, ~$130/mo, covers Airbnb + Booking.com + Expedia + 50 more) **or NextPax** (150+ OTAs, sandbox, base tier includes 25 rooms). Layer a **Mexican PAC/eFactura integration** for CFDI and **Mercado Pago/Stripe** for MXN payments. This delivers genuine ownership of everything guest-facing while outsourcing only the certification-gated OTA plumbing.

**Fallback: Path (c).** If time-to-live or the CFDI/payment burden outweighs the desire to own code, license **Cloudbeds** (only option here that also solves Mexican tax invoicing natively) and revisit building later.

**Avoid Path (a)** for a single 15-room property, and **avoid iCal-only** as a production strategy — it cannot prevent same-day cross-channel overbookings.

### Biggest risks & unknowns
1. **Airbnb access is the tightest constraint.** Direct partner status is closed to one-property owners and new applications are reportedly paused — so **Airbnb connectivity is only realistically obtainable through an aggregator or bought CM.** This alone tips the decision toward (b)/(c). ([Elfsight, 2026](https://elfsight.com/blog/how-to-get-and-use-airbnb-api-partnership-and-integration/); [Airbnb Community](https://community.withairbnb.com/t5/Ask-about-your-listing/How-do-I-become-an-Airbnb-partner/m-p/2184078))
2. **Undisclosed commercials.** OTA certification timelines/fees and exact aggregator per-property pricing are **not fully public** — confirm via sales/portal before committing.
3. **CFDI + payments compliance** is non-trivial and Mexico-specific; underestimating it is the most likely way an in-house build stalls. Use a PAC and a hosted payment processor; don't hand-roll.
4. **Pooled-inventory correctness** is the single highest-stakes piece of logic — get it from the aggregator rather than reinventing it.

---

## Sources

**Airbnb**
- Airbnb Community — How do I become an Airbnb partner?: https://community.withairbnb.com/t5/Ask-about-your-listing/How-do-I-become-an-Airbnb-partner/m-p/2184078
- Airbnb Newsroom — 2025 Preferred Software Partners: https://news.airbnb.com/announcing-our-2025-preferred-software-partners/
- Airbnb Newsroom — 2024 Preferred Software Partners: https://news.airbnb.com/announcing-our-2024-preferred-software-partners/
- Airbnb API Terms of Service (Help art. 3418): https://www.airbnb.com/help/article/3418
- Cloudbeds — Airbnb API Minimum Requirements: https://myfrontdesk.cloudbeds.com/hc/en-us/articles/360009781474-Airbnb-API-Minimum-Requirements
- Elfsight — How to get and use the Airbnb API (2026; "applications paused" claim): https://elfsight.com/blog/how-to-get-and-use-airbnb-api-partnership-and-integration/
- AirROI — What is iCal Sync: https://www.airroi.com/glossary/ical-sync
- Rentals United — Airbnb Calendar Sync: https://rentalsunited.com/blog/airbnb-calendar-sync/
- PriceLabs — Sync Airbnb & Booking.com calendars: https://help.pricelabs.co/portal/en/kb/articles/how-to-sync-your-airbnb-and-booking-com-calendars
- Airbnb — SMA boutique hotels: https://www.airbnb.com/san-miguel-de-allende-mexico/stays/boutique-hotels
- Airbnb — SMA hotels: https://www.airbnb.com/san-miguel-de-allende-mexico/stays/hotels

**Booking.com**
- About the Connectivity APIs: https://developers.booking.com/connectivity/docs
- Requirements for becoming a Connectivity Partner: https://connectivity.booking.com/s/article/Requirements-for-becoming-a-Booking-com-Connectivity-Partner
- Connectivity Partner Programme — minimum requirements: https://connectivity.booking.com/s/partnerprogramme/minimum-requirements
- Going Live (certification vs self-assessment): https://developers.booking.com/connectivity/docs/going_live
- Understanding the Messaging API: https://developers.booking.com/connectivity/docs/messaging-api/understanding-the-messaging-api
- Connectivity Portal: https://connect.booking.com/

**Expedia Group**
- Availability and Rates API (supply / EQC) — intro: https://developers.expediagroup.com/supply/lodging/docs/avail_and_rate_apis/avail_rates/getting_started/introduction/
- Booking Retrieval API — intro: https://developers.expediagroup.com/supply/lodging/docs/booking_apis/booking_retrieval/getting_started/introduction/
- Expedia press release — QuickConnect launch: https://www.expedia.com/stories/expedia-inc-launches-expedia-quickconnect-solution-to-enable-direct-connections-with-hotel-partners/
- Expedia — Recommended hotel connectivity providers: https://partner.expediagroup.com/en-us/industries/hotels/hotel-connectivity-providers
- Rapid API product hub (demand-side, for contrast): https://developers.expediagroup.com/docs/products/rapid
- Rapid API (build your travel experience): https://partner.expediagroup.com/en-us/solutions/build-your-travel-experience/rapid-api
- SHR — Expedia QuickConnect setup guide (Partner Central steps): https://help.shrgroup.com/s/article/CRS-Expedia-Group-Quick-Connect-Integration-Setup-Guide

**Connectivity Aggregators**
- Channex.io (home): https://channex.io/
- Channex docs: https://docs.channex.io/
- Channex — About & FAQ: https://docs.channex.io/about-channex-and-faq
- Channex — PMS Integration Guide: https://docs.channex.io/guides/pms-integration-guide
- Capterra — Channex (pricing reference): https://www.capterra.com/p/10036936/Channex/
- NextPax — Supply API: https://nextpax.com/channel-manager/supply-api
- NextPax — Pricing: https://nextpax.com/nextpax-pricing
- Rentals United — White-Label Channel Manager: https://rentalsunited.com/white-label-channel-manager/
- Rentals United — How it works (API): https://rentalsunited.com/how-it-works-api/
- Nuitée / LiteAPI (demand-side, ruled out): https://www.liteapi.travel/ ; https://nuitee.com/connect

**Buy-option channel managers / PMS**
- Cloudbeds — Channel Manager: https://www.cloudbeds.com/channel-manager/
- Cloudbeds vs SiteMinder comparison: https://hotelsystemsguide.com/cloudbeds-vs-siteminder/

**Mexico / CFDI**
- Cloudbeds — Mexico Government Compliance (CFDI, PAC, e.Firma/CSD): https://www.cloudbeds.com/government-compliance/mexico/
- Avalara — Mexican e-invoices (CFDI): https://www.avalara.com/us/en/vatlive/country-guides/north-america/mexico/mexican-e-invoices.html
- EDICOM — CFDI electronic invoicing Mexico: https://edicomgroup.com/blog/cfdi-electronic-invoicing-mexico

---
*Prepared as a linked planning asset. Items marked "not publicly documented" require confirmation via each provider's partner portal or sales contact before commitment.*
