# Connectly

A messaging app for a younger generation — expressive, fast, and playful on the
surface, with a silent multi-layer AI safety pipeline running underneath that
detects grooming, drug solicitation, and coded predatory language in real
time, routing risk signals to a guardian dashboard without the chat users
ever knowing it exists.

The design challenge was making the safety layer completely invisible while
keeping it effective — because the moment a predator knows they're being
monitored, they leave.

---

## Architecture

Three services, talking over REST + WebSockets:

```
frontend/    Next.js 14 (App Router) + TypeScript + Tailwind
backend/     Node.js + Express + Socket.IO + PostgreSQL + Redis
ai-service/  Python + FastAPI — the safety pipeline (see below)
```

Real-time delivery uses Socket.IO rooms keyed by `conversation_id`, plus a
personal per-user room (`user:{id}`) for direct notifications that aren't
tied to a specific conversation (contact request accepted, added to a group,
mood/music status updates).

## The safety pipeline

Every message passes through six layers before it's considered clear. The
final risk score is the **maximum** across all layers — any single strong
signal is enough to flag, whether that's an exact keyword match or a
pattern only visible across several messages.

| Layer | What it catches | How |
|---|---|---|
| 1. Grooming keywords | Exact predatory phrases ("our secret", "don't tell your parents") | Regex |
| 2. Drugs / illegal activity | Drug slang, weapon offers, trafficking-adjacent language | Keyword dictionary |
| 3. Coded language & emoji | The same threats hidden behind emoji or slang | Decodes to plain text, then re-runs the other layers |
| 4. Toxicity | General toxic/threatening/hateful language, not predator-specific | `unitary/toxic-bert` |
| 5. Zero-shot intent | Novel grooming with **no** keywords at all — e.g. "you seem lonely, I could keep you company" | `facebook/bart-large-mnli`, NLI against threat-category labels |
| 6. Trajectory | Escalating patterns across messages that each look mild alone | Same zero-shot classifier, run on the sender's recent messages + current one combined into one window |

Layer 5 has a minimum word-count floor and a higher confidence threshold
than the deterministic layers, since short/ambiguous text produces
unreliable zero-shot scores. Layer 6 exists specifically to catch what that
floor would otherwise miss — a short message like *"you are pretty"* means
little alone, but scored alongside *"i think you are beautiful," "can we
meet," "it would be our secret"* it becomes a clear pattern.

When something crosses threshold, an alert is created and routed to the
**receiving** user's linked parent (in a group, every other member's
parent) — visible on a dedicated parent dashboard, never surfaced to the
chat itself.

## Features

**Core**
- Real-time 1:1 and group messaging, contact requests, resilient reconnect handling
- Reactions, polls, voice messages (recorded client-side with a real computed waveform, not a decorative one)
- Mood status, streaks (consecutive days both people messaged), custom chat themes
- Music status via Last.fm's public API (no OAuth required — reads "now playing" from Spotify scrobbles)

**Groups**
- Full admin/member roles, rename, add/remove members, leave
- Squad Goals — shared checklist items per group; each member checks in individually, completes once everyone has

**Guardian safety**
- Parent–child account linking (by email or invite code)
- Parent dashboard surfacing flagged messages with risk score, category, and explanation

## Setup

Migrations aren't auto-run — apply them in order against your Postgres instance:

```bash
cd backend
for f in migrations/*.sql; do
  psql -h localhost -U safechat -d safechat -p 5432 -f "$f"
done
```

**backend/.env**
```
PORT=4000
POSTGRES_USER=safechat
POSTGRES_PASSWORD=safechat
POSTGRES_DB=safechat
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
REDIS_HOST=localhost
REDIS_PORT=6379
AI_SERVICE_URL=http://localhost:8000
JWT_SECRET=dev_secret_change_me
CORS_ORIGIN=http://localhost:3000
LASTFM_API_KEY=your_lastfm_api_key   # free, instant at last.fm/api
```

**frontend/.env / .env.local**
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

**Install & run** (three terminals):
```bash
cd backend && npm install && npm run dev       # :4000
cd ai-service && pip install -r requirements.txt && uvicorn app.main:app --reload  # :8000
cd frontend && npm install && npm run dev       # :3000
```

Voice message uploads are written to `backend/uploads/voice/` (created
automatically on first upload) and served statically — no external storage
required for local dev.

## Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind, `socket.io-client`, `emoji-picker-react`
- **Backend:** Express, Socket.IO, `pg`, `redis`, `jsonwebtoken`, `bcryptjs`, `multer`
- **AI service:** FastAPI, `transformers` (toxic-bert + bart-large-mnli)

## A note on scope

This is a portfolio/demo project, not a production safety system. Real
deployment would need: rate limiting, a proper migration runner instead of
manual `psql` application, encrypted message storage, human review before
any alert reaches a parent (false positives are possible, especially from
the zero-shot layers), and far more adversarial testing than a solo build
can cover. The interesting part is the pipeline design and the real bugs
found and fixed while building it — not a claim that it's ready to protect
anyone today.
