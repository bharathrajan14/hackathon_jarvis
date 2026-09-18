# Project Architecture & Setup

This repository is a monorepo containing the frontend client and backend API service.

## Architecture

```
React (Frontend)  ──[ HTTP / REST + Bearer JWT ]──>  Express (Backend)  ──[ SQL / Pool ]──>  PostgreSQL
```

- **Frontend (`/frontend`)**: Built with React and Vite. Handles user interface rendering, client-side routing via React Router, and sends authenticated API requests containing JWT tokens.
- **Backend (`/backend`)**: Built with Node.js and Express. Exposes REST endpoints, validates JWTs through authentication middleware, and interfaces with PostgreSQL via `pg`.
- **Database (`Postgres`)**: Relational data store connected via connection string (`DATABASE_URL`).

### Authentication Flow
1. Client authenticates via backend auth routes (issuing a signed JSON Web Token using `JWT_SECRET`).
2. Subsequent requests to protected routes include the JWT header: `Authorization: Bearer <token>`.
3. Express auth middleware intercepts requests, verifies the JWT signature, and attaches decoded identity to `req.user`.

---

## Directory Structure

```
.
├── README.md
├── backend/
│   ├── .env.example
│   ├── .env
│   ├── package.json
│   └── src/
│       ├── db/
│       │   └── index.js       # Postgres pool configuration
│       ├── middleware/
│       │   └── auth.js        # JWT authentication middleware skeleton
│       ├── routes/
│       │   └── health.js      # Health check router (GET /health)
│       └── index.js           # Express app setup and server entry point
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx            # React Router shell & placeholder route
        └── main.jsx           # Client entry point mounting BrowserRouter
```

---

## Getting Started

### Backend Setup
```bash
cd backend
npm install
npm run dev
```
By default, the backend runs on `http://localhost:5000`. Test the health check with:
```bash
curl http://localhost:5000/health
# Response: {"status":"ok"}
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
By default, the Vite dev server will start at `http://localhost:5173`.
