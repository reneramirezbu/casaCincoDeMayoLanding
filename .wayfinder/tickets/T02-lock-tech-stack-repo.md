---
id: T02
title: Lock the tech stack, repo & scaffolding
type: wayfinder:grilling
status: open
assignee:
blocked_by: []
parent: map
---

## Question

What do we build the in-house app on, and where does it live? Front-load this so every build ticket
is unblocked. Decisions to lock:

- **Repo:** new dedicated repo vs. this `casaCincoDeMayoLanding` repo. (This repo is currently only
  the marketing landing page; a channel manager is a much bigger, likely separate app. Default:
  new repo, but confirm.)
- **Framework / stack:** owner's existing stack is Next.js 15 (App Router) + TypeScript + Prisma +
  Postgres (Neon) + Clerk auth + Tailwind/shadcn (per RERealty). Reuse it, or diverge? Note: a
  channel manager has a **long-running sync/worker** component (webhooks, ARI push, reservation
  polling) that a pure Next.js app doesn't cover — decide where that runs (serverless cron vs. a
  worker/queue).
- **Hosting & data:** Vercel + Neon vs. alternative; where the background worker runs.
- ⚠️ **`AGENTS.md` warns this repo's Next.js is modified** — before any code, read
  `node_modules/next/dist/docs/`.

**Answer records:** the repo location/name, the confirmed stack, and the chosen approach for the
background sync worker.
