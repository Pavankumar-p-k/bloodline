<div align="center">
  <img src="https://img.shields.io/badge/status-active-success" alt="Status" />
  <img src="https://img.shields.io/badge/license-BSD%203--Clause-blue" alt="License" />
  <img src="https://img.shields.io/badge/next.js-16.1.6-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/supabase-FFE000?logo=supabase" alt="Supabase" />
</div>

<br />

<p align="center">
  <h1 align="center">🩸 BloodLine</h1>
  <p align="center">
    A production-grade blood logistics platform connecting donors, hospitals, and admins
    <br />
    in one secure, real-time workflow.
    <br />
    <br />
    <a href="#-quick-start"><strong>Quick Start »</strong></a>
    ·
    <a href="#-architecture">Architecture</a>
    ·
    <a href="#-routes">Routes</a>
    ·
    <a href="#-deployment">Deployment</a>
  </p>
</p>

---

## 📋 Table of Contents

- [✨ Features](#-features)
- [🏗 Architecture](#-architecture)
- [🚀 Quick Start](#-quick-start)
- [🧪 Test Accounts](#-test-accounts)
- [🗺 Routes](#-routes)
- [⚙️ Tech Stack](#️-tech-stack)
- [📁 Project Structure](#-project-structure)
- [🔐 Environment Variables](#-environment-variables)
- [🧰 Local Development](#-local-development)
- [📦 Deployment](#-deployment)
- [📄 License](#-license)

---

## ✨ Features

### 👤 Donor
- **Live Location Sharing** — Mandatory real-time geolocation tracking with `watchPosition`; updated to the database every 15 seconds
- **Interactive Map** — See nearby hospitals and donors on a Leaflet-powered map with blood group, phone, and distance info
- **Donor Registration** — Register with blood group, city, age, and contact details
- **Hospital Directory** — Browse registered hospitals with contact info and details

### 🏥 Hospital
- **Dashboard** — View and manage incoming emergency requests
- **Donor Discovery** — See nearby active donors on the interactive map with blood group filtering
- **Blood Inventory Management** — Track stock levels, expiry dates, and blood types
- **Emergency Request Fulfillment** — Accept and fulfill requests with automatic stock deduction

### 🛡 Admin
- **Real-time Analytics** — Live counts of donors, hospitals, and active requests
- **User Management** — View, filter, and change user roles across the platform
- **System Monitoring** — Track platform usage and emergency request trends

### 🔄 Platform-wide
- **Role-based Access Control** — Middleware-enforced route protection (donor / hospital / admin)
- **Emergency Request Pipeline** — Create, track, accept, and fulfill blood requests
- **Live Interactive Map** — Real-time view of all active users with clustering
- **PWA Support** — Manifest file and service worker for progressive web app capabilities
- **Responsive UI** — Tailwind CSS design optimized for desktop and mobile

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Next.js)                     │
│  ┌───────────┐  ┌──────────┐  ┌──────────────────────┐ │
│  │ AuthContext│  │ React    │  │ Leaflet Map          │ │
│  │ (local or │  │ Hook     │  │ (live donor tracking) │ │
│  │ Supabase) │  │ Forms    │  └──────────────────────┘ │
│  └─────┬─────┘  └────┬─────┘                             │
│        │              │                                   │
│  ┌─────┴──────────────┴──────────────────────────────┐   │
│  │           API Layer (lib/api.ts)                   │   │
│  └─────────────────────┬──────────────────────────────┘   │
└────────────────────────┼──────────────────────────────────┘
                         │ HTTP (axios)
┌────────────────────────┼──────────────────────────────────┐
│              Express.js Backend (port 5000)               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐│
│  │ Auth     │ │ Donor    │ │ Hospital │ │ Emergency    ││
│  │ Routes   │ │ Routes   │ │ Routes   │ │ Routes       ││
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬───────┘│
│       └────────────┴────────────┴───────────────┘        │
│                          │                                │
│              ┌───────────┴───────────┐                    │
│              │   Supabase (Postgres) │                    │
│              │   • Auth              │                    │
│              │   • Profiles          │                    │
│              │   • Emergency Requests│                    │
│              │   • Blood Inventory   │                    │
│              │   • User Locations    │                    │
│              └───────────────────────┘                    │
└───────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Authentication** — Login/signup flows through Supabase Auth or local dev storage
2. **Profile Management** — User profiles stored in `profiles` table with role-based access
3. **Emergency Requests** — Hospitals create requests → Donors see them → Hospitals fulfill with inventory check
4. **Live Location** — `watchPosition` pushes coordinates → `user_locations` table → Map queries nearby users

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- npm or yarn

### 1. Clone & Install

```bash
git clone https://github.com/Pavankumar-p-k/bloodline.git
cd bloodline

# Install backend dependencies
cd backend && npm install && cd ..

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### 2. Run with Local Auth (no Supabase needed)

```bash
# Terminal 1: Start the backend (local dev server with mock auth)
cd backend && node local-dev.js

# Terminal 2: Start the frontend
cd frontend && npm run dev
```

Open **http://localhost:3000** and log in with any test account below.

### 3. Run with Supabase (production)

Copy the env files and fill in your Supabase credentials:

```bash
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
```

Then:

```bash
cd backend && npm start     # Terminal 1
cd frontend && npm run dev  # Terminal 2
```

---

## 🧪 Test Accounts

When running with `node local-dev.js` (local mode), these accounts are pre-seeded:

| Role     | Email                 | Password     |
|----------|-----------------------|--------------|
| Admin    | admin@test.com        | admin123     |
| Donor    | donor@test.com        | donor123     |
| Hospital | hospital@test.com     | hospital123  |

When running with Supabase (production mode), seed accounts can be enabled by setting `SEED_DEFAULT_USERS=true` in `backend/.env`:

| Role     | Email                       | Password         |
|----------|-----------------------------|------------------|
| Admin    | admin@bloodline.local       | AdminPass123!    |
| Donor    | donor@bloodline.local       | DonorPass123!    |
| Hospital | hospital@bloodline.local    | HospitalPass123! |

---

## 🗺 Routes

### Public Pages
| Route         | Description            |
|---------------|------------------------|
| `/`           | Landing page           |
| `/about`      | About BloodLine        |
| `/auth/login` | Sign in                |
| `/auth/signup`| Create account         |
| `/auth/setup` | Supabase setup guide   |
| `/emergency`  | Submit emergency request|
| `/403`        | Access denied          |

### Protected — Donor
| Route               | Description               |
|---------------------|---------------------------|
| `/donor/dashboard`  | Main donor dashboard      |
| `/donor/register`   | Donor registration form   |
| `/dashboard/donor`  | Dashboard alias           |

### Protected — Hospital
| Route                        | Description                  |
|------------------------------|------------------------------|
| `/hospital/dashboard`        | Hospital dashboard           |
| `/dashboard/hospital`        | Dashboard alias              |
| `/dashboard/hospital/profile`| Hospital profile             |
| `/emergency/status/[id]`     | Emergency request tracking   |

### Protected — Admin
| Route              | Description         |
|--------------------|---------------------|
| `/admin/dashboard` | Admin panel         |
| `/dashboard/admin` | Dashboard alias     |

### Global
| Route  | Description           |
|--------|-----------------------|
| `/map` | Full-screen live map  |

### API Endpoints

| Method | Endpoint                       | Auth Required | Description                     |
|--------|--------------------------------|:-------------:|---------------------------------|
| POST   | `/api/auth/signup`             | ❌            | Create new user                 |
| POST   | `/api/auth/login`              | ❌            | Sign in                         |
| POST   | `/api/donor/register`          | ✅            | Register donor profile          |
| GET    | `/api/donor/profile`           | ✅            | Get donor profile               |
| POST   | `/api/emergency`               | ✅            | Create emergency request        |
| GET    | `/api/emergency`               | ✅            | List all emergency requests     |
| GET    | `/api/hospital/emergencies`    | ✅            | Get pending emergency requests  |
| PATCH  | `/api/emergency/fulfill`       | ✅            | Fulfill an emergency request    |
| GET    | `/api/hospital/inventory`      | ✅            | List hospital blood inventory   |
| POST   | `/api/hospital/inventory`      | ✅            | Add blood inventory             |
| GET    | `/api/hospital/profile`        | ✅            | Get hospital profile            |

---

## ⚙️ Tech Stack

| Layer          | Technology                                             |
|----------------|--------------------------------------------------------|
| **Frontend**   | Next.js 16, React 18, TypeScript, Tailwind CSS         |
| **State**      | React Context API, React Hook Form + Zod               |
| **Maps**       | Leaflet, react-leaflet, OpenStreetMap tiles            |
| **Backend**    | Node.js, Express 4, Supabase JS Client                 |
| **Database**   | Supabase (PostgreSQL) with Row Level Security          |
| **Auth**       | Supabase Auth (production) / Local Storage (dev)       |
| **HTTP**       | Axios                                                  |
| **Icons**      | Lucide React                                           |
| **PWA**        | Web App Manifest, Service Worker                       |

---

## 📁 Project Structure

```
bloodline/
├── backend/                    # Express.js API server
│   ├── config/
│   │   └── supabase.js         # Supabase client init
│   ├── controllers/
│   │   ├── authController.js   # Signup / login logic
│   │   └── emergencyController.js # CRUD emergency requests
│   ├── middleware/
│   │   ├── authMiddleware.js   # JWT verification
│   │   └── roleMiddleware.js   # Role-based access
│   ├── models/
│   │   └── Donor.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── donorRoutes.js
│   │   ├── hospitalRoutes.js
│   │   └── emergencyRoutes.js
│   ├── index.js                # Server entry point
│   └── local-dev.js            # Local dev server (no Supabase)
│
├── frontend/                   # Next.js application
│   ├── app/                    # App Router pages
│   │   ├── admin/dashboard/    # Admin panel
│   │   ├── auth/               # Login, signup, setup
│   │   ├── dashboard/          # Dashboard aliases
│   │   ├── donor/              # Donor pages
│   │   ├── hospital/           # Hospital pages
│   │   ├── emergency/          # Emergency requests
│   │   ├── map/                # Full-screen map
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Landing page
│   ├── components/
│   │   ├── ui/                 # Reusable UI primitives
│   │   ├── forms/              # Login & signup forms
│   │   ├── DonorMap.tsx        # Leaflet map component
│   │   ├── LiveLocationSharing.tsx  # Mandatory live tracking
│   │   ├── LiveInteractiveMap.tsx   # Full interactive map
│   │   └── LocationPickerMap.tsx    # Location selector
│   ├── context/
│   │   └── AuthContext.tsx     # Auth state (local/Supabase)
│   ├── lib/
│   │   ├── auth.ts             # Route helpers
│   │   ├── auth-server.ts      # Server-side auth
│   │   ├── api.ts              # Axios API client
│   │   ├── supabaseClient.ts   # Supabase browser client
│   │   ├── supabase-env.ts     # Env validation
│   │   ├── types.ts            # TypeScript types
│   │   └── services/auth.ts    # Auth service
│   ├── middleware.ts            # Route protection
│   └── public/
│       ├── manifest.json        # PWA manifest
│       └── sw.js               # Service worker
│
├── db/
│   └── supabase_setup.sql      # Database schema & RLS policies
│
├── package.json
└── README.md
```

---

## 🔐 Environment Variables

### Frontend (`frontend/.env.local`)

| Variable                      | Required | Description                          |
|-------------------------------|:--------:|--------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`    | ✅       | Supabase project URL                 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅    | Supabase anonymous/public key        |
| `NEXT_PUBLIC_API_URL`         | ❌       | Backend API URL (default: localhost) |

### Backend (`backend/.env`)

| Variable                | Required | Description                                      |
|-------------------------|:--------:|--------------------------------------------------|
| `SUPABASE_URL`          | ✅       | Supabase project URL                             |
| `SUPABASE_SERVICE_KEY`  | ✅       | Supabase service role key (admin operations)     |
| `PORT`                  | ❌       | Server port (default: 5000)                      |
| `SEED_DEFAULT_USERS`    | ❌       | Set `true` to auto-seed test users on startup    |

---

## 🧰 Local Development

### Without Supabase (recommended for testing)

The `local-dev.js` server handles all auth and API endpoints in memory:

```bash
cd backend && node local-dev.js
```

It seeds 3 test accounts automatically and simulates all Supabase REST endpoints. The frontend detects the missing Supabase env vars and falls back to localStorage-based auth automatically.

### With Supabase

1. Create a project on [supabase.com](https://supabase.com)
2. Run the SQL from `db/supabase_setup.sql` in the Supabase SQL editor
3. Copy the project URL and anon key to `frontend/.env.local`
4. Copy the project URL and service role key to `backend/.env`
5. Set `SEED_DEFAULT_USERS=true` in `backend/.env` to seed test accounts

---

## 📦 Deployment

### Frontend (Vercel)

```bash
cd frontend
npm run build        # Verify build succeeds
vercel --prod        # Or connect your GitHub repo
```

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the Vercel dashboard.

### Backend (Render / Railway / Fly.io)

```bash
cd backend
npm start
```

Set `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, and `PORT` in the hosting dashboard.

See [DEPLOY.md](./DEPLOY.md) for detailed deployment instructions.

---

## 📄 License

Distributed under the BSD 3-Clause License. See [LICENSE](./LICENSE) for more information.
