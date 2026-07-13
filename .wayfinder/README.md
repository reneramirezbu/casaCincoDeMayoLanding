# Wayfinder — local-markdown tracker

This directory is a **Wayfinder map**: a shared plan for a chunk of work too big for one
agent session. No external issue tracker was wired into this repo, so Wayfinder is using its
**local-markdown** default. Everything lives as files here.

## Layout

- `map.md` — the map (labelled `wayfinder:map` in its frontmatter). The low-resolution index:
  Destination, Notes, Decisions-so-far, Not-yet-specified (fog), Out-of-scope. Load this first.
- `tickets/` — one file per ticket (a child issue of the map). Each is a single decision or
  build step sized to ~one agent session.
- `research/` — linked assets produced while resolving tickets (e.g. the feasibility brief).

## Ticket frontmatter

```yaml
id: T01                 # stable identity
title: ...              # refer to tickets by this NAME, never the bare id
type: wayfinder:task    # research | prototype | grilling | task
status: open            # open | closed
assignee:               # empty = unclaimed; a name here = someone is driving it
blocked_by: []          # ids that must be `status: closed` before this is takeable
```

## The frontier query (which tickets are takeable now)

A ticket is on the **frontier** — ready to work — when **all** of:

1. `status: open`
2. `assignee:` is empty (unclaimed)
3. every id in `blocked_by` points at a ticket whose `status: closed`

Concurrent sessions/agents can run different frontier tickets in parallel. **Claim first:**
set `assignee:` before doing any work so others skip it.

## Working a ticket (see the wayfinder skill)

1. Load `map.md`. Pick the first frontier ticket (or one the user names). Claim it.
2. Resolve it — invoke the skills named in the map's Notes.
3. Record: append the answer as a `## Resolution` section in the ticket, set `status: closed`,
   and add a one-line pointer to the map's **Decisions so far**.
4. Graduate any fog the answer sharpened into new tickets; wire their `blocked_by`.

**Never resolve more than one ticket per session.**
