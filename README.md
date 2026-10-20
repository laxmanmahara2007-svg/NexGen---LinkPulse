# LinkPulse

LinkPulse is a responsive URL shortener and click dashboard built with React, Vite, Express, and Supabase PostgreSQL.

## Run locally

1. Install dependencies from the project root with `npm install`.
2. Configure the server values in the root `.env` file using `.env.example` as a guide.
3. Apply `supabase/schema.sql` in the Supabase SQL Editor if the project schema has not been applied yet.
4. Run `npm run dev`.

Vite serves the frontend at `http://localhost:5173`; Express serves the API at `http://localhost:3000`. The Vite proxy forwards `/api` and `/r` requests to Express.

## API routes

- `POST /api/links` with `{ "destinationUrl": "https://example.com" }` creates a short link.
- `GET /api/links` returns saved links and their click counts.
- `GET /api/analytics` returns stored total links and total clicks.
- `GET /r/:code` records a click and redirects to the saved destination.
- `GET /api/health` checks the Express server; `GET /api/health/db` checks Supabase access.

Supabase credentials are read by the server only. Keep `.env` private; it is excluded by `.gitignore`.
## Separate Render services

For a separately deployed frontend, set these service environment variables before deploying:

- Frontend service: `VITE_API_BASE_URL=https://nexgen-linkpulse.onrender.com`
- Backend service: `APP_BASE_URL=https://nexgen-linkpulse.onrender.com`
- Backend service: `FRONTEND_ORIGINS=https://linkpulse-fronend.onrender.com`

`FRONTEND_ORIGINS` accepts a comma-separated list of exact origins. The backend allows the local Vite origin by default for development and rejects browser origins that are not listed.
