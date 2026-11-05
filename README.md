# RythonDev Media Kit

A minimal media kit for **RythonDev** with live Twitch analytics and a small CMS for
text content and YouTube / TikTok / Instagram follower counts.

- **Backend:** Rust (Axum) + SQLite (`rusqlite`)
- **Frontend:** Svelte 5 + Vite
- **Caching:** in-memory cache with a 5 minute TTL
- **Deployment:** Docker + Docker Compose

## Features

- Public media kit page at `/`
- Live Twitch stats (followers, total views, live status, current viewers)
- CMS at `/#/admin` for:
  - Text content (`brand_name`, `tagline`, `about`, `email`)
  - YouTube, TikTok, and Instagram handles, URLs, and follower counts
- Twitch data is fetched from the Twitch Helix API; other platform counts are managed in the CMS
- SQLite persistence
- 5 minute cache TTL for the public payload and Twitch data
- HTTP Basic Auth for CMS API routes

## Configuration

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

> **Note:** values containing `$` must be single-quoted, otherwise the backend's
> dotenv loader will try to expand them as variables. For example:
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
| `STATIC_DIR` | Directory containing the built frontend | `frontend/dist` |

## Local development (no Docker)

The quickest way is the root `dev` script, which starts the backend and the Vite
dev server together:

```bash
npm install
npm run dev
```

- Backend (Rust/Axum) → <http://localhost:3000>
- Frontend (Vite) → <http://localhost:5173>

The Vite dev server proxies `/api` requests to `http://localhost:3000`.

If you prefer two terminals, run them separately:

```bash
# terminal 1
npm run dev:backend

# terminal 2
npm run dev:frontend
```

> Rust is required for the backend. If `cargo` is not found, add
> `%USERPROFILE%\.cargo\bin` to your `PATH` (Windows) or `~/.cargo/bin`
> (macOS/Linux).

## Production build (no Docker)

```bash
npm install
npm run build
npm start
```

This builds the frontend to `frontend/dist`, compiles the backend, and serves the
whole app (static site + API) from <http://localhost:3000>.

The SQLite database is written to `data/media_kit.db` and static files are read
from `frontend/dist` by default. Override them if needed:

```bash
DATABASE_PATH=./data/media_kit.db STATIC_DIR=./frontend/dist npm start
```

## Docker

```bash
docker compose up --build
```

The app is then available at <http://localhost:3000>. The SQLite database is persisted
in the `media-kit-data` Docker volume.

## API

- `GET /api/media-kit` — public media kit payload (cached for 5 minutes)
- `GET /api/admin/verify` — verify Basic Auth credentials
- `GET /api/admin/state` — current content and platform values (admin)
- `PUT /api/admin/content` — update text content (admin)
- `PUT /api/admin/platforms` — update platform follower counts (admin)

Admin routes use HTTP Basic Auth. The CMS login page stores the Base64-encoded
credentials in `localStorage` and sends them with each admin request.
