# Connectly

Connectly is a full-stack real-time messaging and child-safety platform. The repository contains three services:

- **Frontend** — Next.js/React/TypeScript chat and account UI
- **Backend** — Node.js/Express API, PostgreSQL persistence, JWT authentication, and Socket.IO
- **AI Safety Service** — FastAPI service that analyzes messages using a multi-layer risk-scoring pipeline

The current project also contains parent/guardian features for linking accounts and viewing safety alerts.

---

## Table of Contents

- [Architecture](#architecture)
- [Features](#features)
- [Project Structure](#project-structure)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Database](#database)
- [Running Locally](#running-locally)
- [API Reference](#api-reference)
- [Real-Time Socket Events](#real-time-socket-events)
- [AI Safety Service](#ai-safety-service)
- [Parent and Guardian Safety Flow](#parent-and-guardian-safety-flow)
- [Frontend Pages](#frontend-pages)
- [Docker](#docker)
- [Troubleshooting](#troubleshooting)
- [Security Notes](#security-notes)
- [Current Limitations](#current-limitations)
- [Development](#development)


---

## Features

### Messaging

- Direct one-to-one conversations
- Persistent message history
- Real-time message delivery with Socket.IO
- Conversation rooms
- Unread message counts
- Mark conversation as read

### Contacts

- Search users
- Send contact requests
- Accept requests
- Reject requests
- View pending requests
- View sent requests
- Create a conversation when a contact request is accepted

### Authentication

- User registration
- User login
- Password hashing with `bcryptjs`
- JWT-based authentication
- User roles:
  - `child`
  - `parent`

### Parent / Guardian Safety

- Parent-child linking data
- Guardian account linking
- View linked children
- View safety alerts
- Risk alerts associated with analyzed messages

### AI Safety Analysis

The AI service uses multiple layers:

1. Grooming pattern detection
2. Drug/illegal-activity detection
3. Coded-language and emoji decoding
4. Transformer-based toxicity classification
5. Zero-shot intent classification

The final risk score is the highest score produced by the enabled layers.

### Frontend

- Next.js App Router
- TypeScript
- Tailwind CSS
- Chat interface
- Login/signup flows
- Parent dashboard
- Guardian signup/login
- Emoji support in the chat UI

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 |
| UI | React 18 |
| Language | TypeScript |
| Styling | Tailwind CSS 3 |
| HTTP client | Axios |
| Real-time | Socket.IO 4 |
| Backend | Node.js + Express |
| Authentication | JWT |
| Password hashing | bcryptjs |
| Database | PostgreSQL |
| Database driver | node-postgres (`pg`) |
| Cache/client | Redis client included |
| AI API | FastAPI |
| AI runtime | Python 3.11 |
| ML | PyTorch + Hugging Face Transformers |

---

## Prerequisites

Install:

- Node.js 20 recommended
- npm
- PostgreSQL
- Redis
- Python 3.11 recommended

The backend Dockerfile uses Node 20, and the AI-service Dockerfile uses Python 3.11.

The AI service downloads/loads Hugging Face models, so its first startup can require substantially more time and memory than the Node services.

---

## Environment Configuration

### Frontend

Create:

```text
frontend/.env.local
```

using:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

The frontend Axios client uses `NEXT_PUBLIC_BACKEND_URL` and falls back to:

```text
http://localhost:4000
```

The Socket.IO client uses the same backend URL.

### Backend

Create:

```text
backend/.env
```

Example:

```env
PORT=4000

POSTGRES_USER=safechat
POSTGRES_PASSWORD=safechat
POSTGRES_DB=safechat
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

REDIS_HOST=localhost
REDIS_PORT=6379

AI_SERVICE_URL=http://localhost:8000

JWT_SECRET=change_this_in_development
CORS_ORIGIN=http://localhost:3000
```

The repository's `.env.example` currently uses Docker-oriented hostnames such as `postgres` and `redis`. If you are running the services directly on your machine, use `localhost` unless you have configured those hostnames yourself.

### AI Service

Create:

```text
ai-service/.env
```

Example:

```env
PORT=8000
RISK_THRESHOLD=0.7
```

---

## Database

The backend uses PostgreSQL.

### Core tables

Migration `001_init.sql` creates:

- `users`
- `parent_links`
- `conversations`
- `messages`
- `alerts`

Subsequent migrations add:

- usernames
- contacts
- date of birth / age
- invite-code infrastructure
- guardian links
- contact requests

### Applying migrations

The project contains SQL migrations but does not include a migration runner in `package.json`.

Apply them in order:

```text
001_init.sql
002_contacts.sql
003_dob_invite.sql
004_guardian_link.sql
005_contact_requests.sql
```

For example, with `psql`:

```bash
psql -U safechat -d safechat -f backend/migrations/001_init.sql
psql -U safechat -d safechat -f backend/migrations/002_contacts.sql
psql -U safechat -d safechat -f backend/migrations/003_dob_invite.sql
psql -U safechat -d safechat -f backend/migrations/004_guardian_link.sql
psql -U safechat -d safechat -f backend/migrations/005_contact_requests.sql
```

Adjust the connection parameters for your PostgreSQL installation.

> **Important:** The migration files are intended to be applied in sequence. Migration `005_contact_requests.sql` drops and recreates the `contacts` table, so do not treat migrations as independent scripts.

---

## Running Locally

Run each service in its own terminal.

### 1. Start PostgreSQL and Redis

Make sure PostgreSQL and Redis are running.

Verify PostgreSQL is accepting connections before starting the backend.

### 2. Start the AI service

```bash
cd ai-service

python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

uvicorn app.main:app --reload --port 8000
```

On Windows PowerShell:

```powershell
cd ai-service
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt

uvicorn app.main:app --reload --port 8000
```

The AI service should be available at:

```text
http://localhost:8000
```

Health check:

```text
GET http://localhost:8000/health
```

### 3. Start the backend

```bash
cd backend
npm install
npm run dev
```

The backend should be available at:

```text
http://localhost:4000
```

Health check:

```text
GET http://localhost:4000/health
```

Expected response:

```json
{
  "status": "ok"
}
```

### 4. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## API Reference

All protected endpoints require:

```http
Authorization: Bearer <JWT>
```

### Authentication

#### Register

```http
POST /api/auth/register
```

Example:

```json
{
  "name": "Arohi",
  "email": "arohi@example.com",
  "password": "password",
  "dob": "2010-01-01",
  "role": "child"
}
```

The backend accepts `parent` as the parent role; other values are normalized to the `child` role.

#### Login

```http
POST /api/auth/login
```

Example:

```json
{
  "email": "arohi@example.com",
  "password": "password"
}
```

Returns a JWT and basic user information.

---

### Messages

#### Get conversation history

```http
GET /api/messages/:conversationId
```

Returns up to the latest 50 messages for the conversation.

> The current archive exposes message history through REST. New messages are sent through Socket.IO rather than a REST `POST` endpoint.

---

### Contacts

#### Get contacts

```http
GET /api/contacts
```

#### Search users

```http
GET /api/contacts/search?q=<query>
```

The current backend requires at least two characters for a search.

#### Get pending requests

```http
GET /api/contacts/pending
```

#### Get sent requests

```http
GET /api/contacts/sent
```

#### Send contact request

```http
POST /api/contacts/request
```

Body:

```json
{
  "receiverId": 123
}
```

#### Accept request

```http
POST /api/contacts/accept/:requestId
```

#### Reject request

```http
POST /api/contacts/reject/:requestId
```

#### Mark conversation as read

```http
POST /api/contacts/read/:conversationId
```

---

### Parent

#### Get alerts

```http
GET /api/parent/alerts
```

---

### Guardian

#### Link a child

```http
POST /api/guardian/link
```

Body:

```json
{
  "childEmail": "child@example.com"
}
```

#### Get linked children

```http
GET /api/guardian/children
```

#### Get guardian alerts

```http
GET /api/guardian/alerts
```

---

## Real-Time Socket Events

The backend initializes Socket.IO on the same HTTP server as Express.

### Client → server

#### `conversation:join`

Join a conversation room:

```js
socket.emit("conversation:join", String(conversationId));
```

#### `message:send`

Send a message:

```js
socket.emit("message:send", {
  conversationId: String(conversationId),
  content: "Hello!"
});
```

The backend:

1. Gets the authenticated user from the Socket.IO connection.
2. Saves the message to PostgreSQL.
3. Broadcasts `message:new`.
4. Starts asynchronous AI analysis.

### Server → client

#### `message:new`

Example:

```json
{
  "id": 42,
  "sender_id": 7,
  "conversation_id": 12,
  "content": "Hello!",
  "created_at": "2026-08-13T14:00:00.000Z"
}
```

The frontend uses this event to update the active chat and conversation previews.

---

## Socket Authentication

The frontend connects with:

```js
io(BACKEND_URL, {
  auth: { token },
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000
});
```

The backend Socket.IO middleware verifies the JWT before allowing the connection.

This means a client cannot establish a normal authenticated socket session without a valid token.

---

## AI Safety Service

The AI service is a FastAPI application.

### Health

```http
GET /health
```

Example response:

```json
{
  "status": "ok",
  "version": "0.3.0"
}
```

### Analyze a message

```http
POST /analyze
```

Example:

```json
{
  "text": "message text",
  "language": "auto",
  "sender_age": 15
}
```

The API response contains:

```json
{
  "risk_score": 0.0,
  "category": "none",
  "flagged": false,
  "explanation": "No risk detected...",
  "layers": {
    "grooming": 0.0,
    "drug_illegal": 0.0,
    "coded_language": 0.0,
    "transformer": 0.0,
    "zero_shot": 0.0
  }
}
```

### Risk threshold

The configured default is:

```text
RISK_THRESHOLD=0.7
```

A final risk score at or above the threshold is marked as:

```text
flagged = true
```

---

## AI Pipeline

The current `risk_scoring.py` pipeline performs the following:

### 1. Preprocessing

Text is:

- lowercased
- whitespace-normalized
- decoded for several leetspeak substitutions
- decoded for selected dot-separated obfuscations
- normalized for repeated punctuation

### 2. Grooming classifier

Regex/pattern detection looks for known grooming-related signals such as:

- requests for pictures
- secrecy
- meeting alone
- requests involving a child's location
- moving conversations elsewhere
- inappropriate age/appearance comments

### 3. Drug/illegal-activity classifier

Detects selected:

- drug terms
- drug slang
- buying/selling patterns
- weapon-related phrases
- trafficking-style signals

### 4. Coded-language classifier

Decodes selected:

- emojis
- number codes
- coded phrases
- obfuscated words

The decoded text is passed to subsequent classifiers.

### 5. Transformer classifier

Uses:

```text
unitary/toxic-bert
```

to identify semantic toxicity categories such as:

- toxic
- severe toxic
- obscene
- threat
- insult
- identity hate

### 6. Zero-shot classifier

Uses:

```text
facebook/bart-large-mnli
```

to compare a message against threat-intent descriptions such as:

- exploitation of a child's loneliness
- requests for photos/videos
- offering drugs
- secret meetings
- secrecy from parents
- coercion
- isolation from family/friends
- inappropriate sexual messaging

### Final score

The current implementation takes:

```text
maximum score across the five layers
```

and compares it to `RISK_THRESHOLD`.

---

## AI Model Startup

The FastAPI lifespan pre-loads:

- the transformer classifier
- the zero-shot classifier

when the AI service starts.

This means the first startup can be slow and can require significant RAM/CPU.

The zero-shot model is particularly large, so allow additional startup time and disk/network access when it is downloaded for the first time.

---

## Parent and Guardian Safety Flow

The backend supports a safety-alert workflow:

```text
Child sends message
       │
       ▼
Message saved
       │
       ▼
AI analysis
       │
       ▼
risk_score >= 0.7
       │
       ▼
Flagged
       │
       ▼
Find linked parent
       │
       ▼
Create alert
```

The alert contains:

- message ID
- child ID
- parent ID
- risk score
- category
- status
- creation time

The current alert service explicitly leaves external notification delivery as a future TODO.

---

## Frontend Pages

The current frontend contains these routes:

| Route | Purpose |
|---|---|
| `/` | Landing/home page |
| `/login` | User login |
| `/signup` | User registration |
| `/chat` | Main real-time chat |
| `/parents` | Parent-related page |
| `/parent-dashboard` | Parent safety dashboard |
| `/guardian/login` | Guardian login |
| `/guardian/signup` | Guardian signup/linking flow |

---

## Frontend API Configuration

The Axios client is defined in:

```text
frontend/src/lib/api.ts
```

It uses:

```text
NEXT_PUBLIC_BACKEND_URL
```

with a fallback to:

```text
http://localhost:4000
```

Authentication is added using:

```ts
setAuthToken(token)
```

which sets the Axios `Authorization` header.

---

## Docker

Each service has its own Dockerfile.

### Backend

```bash
cd backend
docker build -t connectly-backend .
docker run --env-file .env -p 4000:4000 connectly-backend
```

### Frontend

```bash
cd frontend
docker build -t connectly-frontend .
docker run --env-file .env -p 3000:3000 connectly-frontend
```

### AI service

```bash
cd ai-service
docker build -t connectly-ai .
docker run --env-file .env -p 8000:8000 connectly-ai
```

### Important Docker note

The uploaded repository does **not** contain a root `docker-compose.yml`.

The backend `.env.example` uses Docker-style service names:

```text
postgres
redis
ai-service
```

If you run the services manually without Docker Compose, change these to reachable hostnames such as `localhost`.

---

## Troubleshooting

### Frontend cannot reach backend

Check that:

```text
Frontend: http://localhost:3000
Backend:  http://localhost:4000
```

and that:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

is configured.

### Backend health check

Open:

```text
http://localhost:4000/health
```

Expected:

```json
{
  "status": "ok"
}
```

### AI service health check

Open:

```text
http://localhost:8000/health
```

Expected:

```json
{
  "status": "ok",
  "version": "0.3.0"
}
```

### WebSocket connection warning during development

You may see a browser error resembling:

```text
WebSocket connection to
ws://localhost:4000/socket.io/
failed: WebSocket is closed before the connection is established.
```

If it is immediately followed by:

```text
Socket connected
```

or:

```text
Socket connected — rejoining rooms
```

the socket has successfully reconnected.

If it continuously fails, check:

1. Backend is running.
2. Socket.IO is initialized.
3. Frontend points to port `4000`.
4. CORS allows `http://localhost:3000`.
5. The JWT is present and valid.

For stale Next.js development builds:

```bash
rm -rf frontend/.next
cd frontend
npm run dev
```

### Database connection errors

Check:

```env
POSTGRES_USER
POSTGRES_PASSWORD
POSTGRES_DB
POSTGRES_HOST
POSTGRES_PORT
```

For local development, `POSTGRES_HOST` is usually:

```text
localhost
```

For a Docker network, it may be:

```text
postgres
```

### AI service unavailable

The backend's `aiClient.js` catches AI-service failures and returns an `unscored` result rather than preventing the message from being sent.

Check:

```text
AI_SERVICE_URL=http://localhost:8000
```

and confirm:

```text
GET /health
```

works.

### AI service starts slowly

This is expected because the application pre-loads Hugging Face models.

Make sure the machine has enough memory and that model downloads can complete.

---

## Security Notes

This project is designed around a child-safety use case, so production security should be treated as a requirement rather than an optional enhancement.

### Secrets

Never commit:

```text
.env
```

files containing real passwords, JWT secrets, API keys, or production credentials.

Use `.env.example` as a template.

### JWT

Change:

```env
JWT_SECRET=dev_secret_change_me
```

before production use.

### CORS

Do not use:

```text
CORS_ORIGIN=*
```

in production.

Set it to the actual frontend origin.

### Database

Do not expose PostgreSQL directly to the public internet.

### Passwords

Passwords are hashed with `bcryptjs` before storage.

### Authorization

REST endpoints use the `requireAuth` middleware for authenticated resources.

The backend should continue validating resource ownership/membership server-side rather than trusting frontend state.

---

## Current Limitations

The uploaded project is functional as a messaging prototype, but several areas are still development-stage.

### Scheduled messages

The uploaded archive currently does **not** contain:

```text
POST /api/messages/schedule
GET /api/messages/scheduled
DELETE /api/messages/schedule/:id
```

or a scheduled-message background worker.

If those were added in a separate working copy, they are not present in this uploaded archive and should be merged into the repository before documenting scheduled messaging as a current feature.

### Redis

A Redis client is implemented in:

```text
backend/src/config/redis.js
```

but the current `app.js` does not initialize a Redis connection.

### Context and trajectory scoring

The AI service contains:

```text
context_scoring.py
trajectory_scoring.py
```

but the current `/analyze` endpoint calls:

```python
run_pipeline(payload.text)
```

and the active `risk_scoring.py` pipeline uses the five message-level layers described above.

Therefore, context/trajectory scoring should not be described as active in the current API unless the pipeline is updated to invoke those functions.

### Alert notifications

`alertService.js` creates database alerts, but external push/email notifications are currently marked as a TODO.

### Migration tooling

The SQL migrations exist, but there is no dedicated migration command in the backend `package.json`.

### Production job infrastructure

There is no root deployment orchestration or distributed job queue in the uploaded archive.

---

## Development

### Frontend

```bash
cd frontend

npm install
npm run dev
```

Production build:

```bash
npm run build
npm start
```

Lint:

```bash
npm run lint
```

### Backend

```bash
cd backend

npm install
npm run dev
```

Production:

```bash
npm start
```

### AI service

```bash
cd ai-service

python3.11 -m venv .venv
source .venv/bin/activate

pip install -r requirements.txt

uvicorn app.main:app --reload --port 8000
```

---

## Recommended Local Startup Order

For the smoothest development experience:

```text
1. PostgreSQL
       ↓
2. Redis
       ↓
3. AI service :8000
       ↓
4. Backend :4000
       ↓
5. Frontend :3000
```

Then verify:

```text
http://localhost:8000/health
http://localhost:4000/health
http://localhost:3000
```

---

## License

No license file is included in the uploaded project.

If this repository is intended for public distribution, add an appropriate `LICENSE` file and update this section.
