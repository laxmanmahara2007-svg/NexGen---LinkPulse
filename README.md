LinkPulse — URL Shortener & Analytics Platform

LinkPulse is a web-based URL shortening and analytics platform developed for the hackathon implementation round. It aims to make long URLs easier to share while providing a foundation for tracking link performance.

Create. Shorten. Share. Track.

Problem Statement

Long URLs are difficult to share, remember, and manage. Basic URL shorteners provide compact links but may not provide the tracking and insights needed to understand how those links are used.

LinkPulse aims to combine URL shortening, reliable redirection, click tracking, and analytics in one platform.

Our Solution

LinkPulse provides a web interface and backend API for creating short links, redirecting visitors to their original destinations, and recording link activity. Its architecture uses a React frontend, an Express backend, and Supabase PostgreSQL for persistent storage.

The project is being developed incrementally, with the initial focus on URL creation, redirection, click counting, and analytics.

Features

Core functionality

- Create short links from valid HTTP and HTTPS URLs.
- Generate unique short codes for links.
- Redirect visitors from short URLs to their original destinations.
- Validate submitted URLs and handle invalid or unknown codes.
- Store link records and click counts in a database.
- Provide API endpoints for retrieving links and analytics.
- Display a responsive web interface.

«Implementation status: Database-dependent functionality requires valid Supabase configuration and the SQL schema to be applied before it can be considered fully verified. Additional dashboard and analytics features will be documented as they are implemented and tested.»

Tech Stack

Component| Technology
Frontend| React, Vite
Backend| Node.js, Express
Database| Supabase PostgreSQL
API communication| HTTP and JSON
Version control| Git and GitHub
Deployment| To be configured

Project Architecture

LinkPulse/
├── frontend/
│   ├── index.html
│   ├── src/
│   │   ├── main.jsx
│   │   └── styles.css
│   └── vite.config.js
├── server/
│   └── src/
│       ├── index.js
│       └── supabase.js
├── supabase/
│   └── schema.sql
├── .env.example
├── .gitignore
├── package.json
└── README.md

The frontend communicates with the Express API. The backend validates requests and interacts with Supabase to store and retrieve link information.

API Endpoints

Method| Endpoint| Purpose
GET| "/api/health"| Check backend availability
GET| "/api/health/db"| Check database configuration and connectivity
POST| "/api/links"| Create a shortened link
GET| "/api/links"| Retrieve stored links
GET| "/api/analytics"| Retrieve link analytics
GET| "/r/:code"| Redirect using a short code

Database-dependent endpoints require a correctly configured database and the corresponding SQL schema.

Getting Started

Prerequisites

- Node.js and npm
- A Supabase account and project
- Git (optional for local development, required for repository collaboration)

1. Clone the repository

git clone <https://github.com/laxmanmahara2007-svg/NexGen---LinkPulse>
cd LinkPulse

Alternatively, open your existing project folder in VS Code.

2. Install dependencies

Run this command from the project root:

npm install

3. Configure environment variables

Create a ".env" file in the project root using ".env.example" as a reference.

PORT=3000
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
APP_BASE_URL=http://localhost:3000

Replace the placeholders with the actual values from your Supabase project. Do not commit ".env" to GitHub.

4. Set up the database

1. Open your Supabase project dashboard.
2. Open the SQL Editor.
3. Run the SQL statements from "supabase/schema.sql".
4. Verify that the required table, constraints, and database functions have been created.
5. Restart the application and check the database health endpoint.

Follow the security policies defined in the schema. Never expose a service-role key or database p
