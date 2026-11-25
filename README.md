# RythonDev Media Kit

A minimal media kit for **RythonDev** with live Twitch analytics and a small CMS for
text content and YouTube / TikTok / Instagram follower counts.

- **Backend:** TypeScript (Elysia on Bun) + SQLite (`bun:sqlite`)
- **Frontend:** Svelte 5 + Vite
- **Caching:** in-memory cache with a 5 minute TTL
- **Deployment:** Docker + Docker Compose

## Features

- Public media kit page at `/`
- Live Twitch stats (followers, total views, live status, current viewers)
- CMS at `/#/admin` for:
  - Text content (`brand_name`, `tagline`, `about`, `email`, profile images, services, stream schedule)
  - YouTube, TikTok, and Instagram handles, URLs, and follower counts
  - Past 30-day views, collaborations, Twitch locations, audience gender & age breakdowns
  - Image uploads persisted alongside the SQLite database
- Twitch data is fetched from the Twitch Helix API; other platform counts are managed in the CMS
- SQLite persistence
- 5 minute cache TTL for the public payload and Twitch data
- HTTP Basic Auth for CMS API routes

## Configuration

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

> **Note:** values containing `$` must be single-quoted, otherwise the dotenv
> loader may try to expand them as variables. For example:
> `ADMIN_PASSWORD='p@$$w0rd!'`

| Variable | Description | Default |
| --- | --- | --- |
| `TWITCH_CLIENT_ID` | Twitch Helix API client ID | empty |
| `TWITCH_CLIENT_SECRET` | Twitch Helix API client secret | empty |
| `TWITCH_LOGIN` | Twitch channel login | `rythondev` |
| `ADMIN_USER` | CMS username | `admin` |
| `ADMIN_PASSWORD` | CMS password | `change-me` |
| `PORT` | HTTP port | `3000` |
| `DATABASE_PATH` | SQLite database file path | `data/media_kit.db` |
| `UPLOADS_DIR` | Directory for uploaded images | `<DATABASE_PATH dir>/uploads` |
| `STATIC_DIR` | Directory containing the built frontend | `frontend/dist` |

## Local development (no Docker)

Install dependencies and run the backend and frontend in two terminals:

```bash
# terminal 1 (backend — Bun/Elysia → http://localhost:3000)
cd backend
bun install
bun run dev

# terminal 2 (frontend — Vite → http://localhost:5173)
cd frontend
bun install
bun run dev
```

The Vite dev server proxies `/api` and `/uploads` requests to `http://localhost:3000`.

## Production build (no Docker)

```bash
cd frontend && bun install && bun run build
cd ../backend && bun install
cd ..
DATABASE_PATH=./data/media_kit.db STATIC_DIR=./frontend/dist bun run backend/src/index.ts
```

This builds the frontend to `frontend/dist` and serves the whole app (static site + API)
from <http://localhost:3000>.

## Docker

```bash
docker compose up --build
```

The app is then available at <http://localhost:8081> (mapped to container port `3000`).
The SQLite database and uploaded images are persisted in the `media-kit-data` Docker volume.

## API

- `GET /api/media-kit` — public media kit payload (cached for 5 minutes)
- `GET /api/admin/verify` — verify Basic Auth credentials
- `GET /api/admin/state` — current content, platforms, views, collabs, and demographics (admin)
- `PUT /api/admin/content` — update text content (admin)
- `PUT /api/admin/platforms` — update platform follower counts & order (admin)
- `PUT /api/admin/monthly-views` — update past 30-day views & order (admin)
- `PUT /api/admin/collabs` — replace collaborations list (admin)
- `PUT /api/admin/twitch-locations` — replace Twitch viewer locations (admin)
- `PUT /api/admin/audience/genders` — replace audience gender split (admin)
- `PUT /api/admin/audience/age-genders` — replace audience age/gender breakdown (admin)
- `POST /api/admin/upload` — upload raw image (PNG, JPEG, WebP, GIF, AVIF; max 5 MB) (admin)

Admin routes use HTTP Basic Auth. The CMS login page stores the Base64-encoded
credentials in `localStorage` and sends them with each admin request.
