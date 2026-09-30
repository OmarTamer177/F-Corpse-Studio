# FCorpse Studio — Platform (Task 9: Role-Based Access Control)

FCorpse is the official web platform for **FCorpse Studio**, an independent game studio dedicated to handcrafted game development. The platform serves as the studio's public-facing website, services showcase, customer request & commission portal, blog, contact system, and internal company management suite.

---

## Overview

The application is a **decoupled full-stack project** featuring an enterprise-grade **Role-Based Access Control (RBAC)** architecture alongside customer request dispatch, search, and catalog management:

| Component   | Description                                                                 |
|-------------|-----------------------------------------------------------------------------|
| **Backend** | Flask REST API — dynamic SQLAlchemy search, multi-criteria filtering, RBAC middleware, JWT auth, requests |
| **Frontend**| React SPA (Vite) — role-aware navigation, staff operations console, team access & role management directory |
| **Database**| PostgreSQL — persistent storage for services, blogs, users with roles, requests |
| **RBAC**    | Fine-grained role and permission system (`admin`, `employee`, `customer`) with route protection decorators |
| **Testing** | Modular Unit Test Suite (`unittest`) with 43 tests across all modules (100% pass) |

---

## Tech Stack

| Layer     | Technology                            |
|-----------|---------------------------------------|
| Frontend  | React 19, Vite 8, React Router 7, Vanilla CSS |
| Backend   | Python 3.11, Flask, Flask-JWT-Extended, Flask-CORS |
| Database  | PostgreSQL, SQLAlchemy ORM (SQLite for test isolation)|
| Auth/RBAC | JWT (JSON Web Tokens), Werkzeug password hashing, RBAC decorators |

---

## Project Structure (Monorepo Architecture)

```
Task 9/
├── backend/                       # Isolated Python/Flask backend service
│   ├── routes/                    # Route Blueprints (auth, requests, services, blogs, contact)
│   ├── tests/                     # Test suites
│   │   ├── unit/                  # 43 hermetic unit tests (SQLite in-memory)
│   │   └── e2e/                   # End-to-end integration tests (RBAC, search, workflow)
│   ├── app.py                     # App factory, CORS, /api/health, /api/admin/verify
│   ├── config.py                  # Structured config management (dev, test, prod)
│   ├── extensions.py              # Shared Flask extensions (db, jwt, cors)
│   ├── models.py                  # SQLAlchemy models (User with role & permissions, etc.)
│   ├── rbac.py                    # Role definitions, granular permissions, decorators
│   ├── seed_db.py                 # Database reset & seeding script
│   ├── run_tests.py               # Unified test runner with CLI flags (--unit, --e2e, --all)
│   ├── requirements.txt           # Pinned python dependencies
│   ├── Dockerfile                 # Production backend container definition
│   └── .dockerignore
│
├── frontend/                      # Isolated React + Vite single-page application
│   ├── src/
│   │   ├── services/
│   │   │   └── api.js             # Centralized API client (dynamic environment base URL)
│   │   ├── context/
│   │   │   └── AuthContext.jsx    # Global auth & RBAC state (role, permissions, guards)
│   │   ├── components/            # Navbar, Footer, AdminRoute, Modals
│   │   ├── pages/                 # Home, Services, Blogs, Dashboard, Admin, Login, Register, Contact
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── nginx.conf                 # Production Nginx reverse-proxy & SPA routing
│   ├── Dockerfile                 # Multi-stage production container (Node 20 -> Nginx Alpine)
│   ├── package.json
│   └── .dockerignore
│
├── .github/
│   └── workflows/
│       └── ci.yml                 # Automated CI pipeline (Backend tests + Frontend build)
│
├── docker-compose.yml             # Full-stack container orchestration (db + backend + frontend)
├── .env.example                   # Environment configuration template
├── run_tests.py                   # Root delegator runner
└── README.md
```

---

## Running with Docker Compose

The complete full-stack environment (PostgreSQL 15, Flask backend with Gunicorn, and React frontend with Nginx) can be started with a single command:

```bash
# Copy sample environment configuration
cp .env.example .env

# Build and start all containers in detached mode
docker compose up -d --build
```

### Container Endpoints:
* **Frontend Web App**: `http://localhost:3000` (Served via Nginx, with `/api/` reverse-proxied internally)
* **Backend REST API**: `http://localhost:5000` (Direct API access & `/api/health` status)
* **PostgreSQL Database**: `localhost:5433` (Mapped to container port `5432` to avoid host collisions, volume `db_data`)

To view container logs or stop the stack:
```bash
# View live logs
docker compose logs -f

# Stop and remove containers
docker compose down
```

---

## Continuous Integration (GitHub Actions)

The repository includes an automated CI workflow at `.github/workflows/ci.yml` that triggers on every push and pull request targeting `main` or `master`:
1. **Backend Job**: Sets up Python 3.11, caches pip dependencies, installs `backend/requirements.txt`, and runs the hermetic 43-unit test suite (`python run_tests.py --mode unit`).
2. **Frontend Job**: Sets up Node 20, caches npm packages, installs dependencies (`npm ci`), and verifies production TypeScript/JSX compilation (`npm run build`).

---

## Default Accounts & Roles

| Role | Email | Password | Platform Permissions |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@fcorpse.com` | `admin123` | **Full Platform Control:** Manage & delete services and blogs, view & search all customer requests, update status/notes/cost, permanently delete requests, reassign user roles. |
| **Regular Employee** | `employee@fcorpse.com` | `employee123` | **Operational Access:** View & search all customer requests, view KPI stats, update request status, priority, admin progress notes, and quotes. *Forbidden from deleting requests or managing service offerings.* |
| **Client Customer** | `elena.vance@studio.com` | `customer123` | **Customer Access:** Submit new service requests, view and track personal requests in Dashboard, manage personal contact profile. *Forbidden from staff endpoints.* |

*Additional accounts can be registered at `/register`.*

---

## How to Run

### 1. Database Setup

Ensure PostgreSQL is running and the database `voltix_task` exists:

```sql
CREATE DATABASE voltix_task;
```

> Connection string default: `postgresql://postgres:123456@localhost:5432/voltix_task`  
> Configurable in `app.py` or via the `DATABASE_URL` environment variable.

### 2. Install Dependencies

```bash
# Python Backend
pip install flask flask-sqlalchemy flask-jwt-extended flask-cors psycopg2-binary werkzeug

# React Frontend
cd frontend
npm install
cd ..
```

### 3. Seed Database

Resets tables and seeds admin, sample customer, services, and realistic requests across multiple statuses:

```bash
python seed_db.py
```

### 4. Start Servers

**Terminal 1 — Backend (Flask API on port 5000):**
```bash
python app.py
```

**Terminal 2 — Frontend (Vite Dev Server on port 5173):**
```bash
cd frontend
npm run dev
```

Visit the application at: **http://localhost:5173**

---

## Running Unit & Integration Tests

The project includes a comprehensive, isolated unit testing suite utilizing Python's `unittest` framework with in-memory SQLite:

```bash
# Run all unit tests with execution summary
python run_tests.py

# Alternatively via unittest module
python -m unittest discover tests

# Run end-to-end integration verification (against running Flask server)
python test_e2e.py
```

### Test Coverage Highlights
- **`test_models.py`**: Model defaults, constraints, serialization (`to_dict`), and `User` / `ServiceRequest` relationships.
- **`test_requests_api.py`**:
  - Guest request submission (`POST /api/requests`) with validation checks.
  - Authenticated request submission with automatic `user_id` association.
  - Personal request retrieval (`GET /api/requests/my`) and route protection (401).
  - Detail inspection permissions (owner and admin allowed; third-party blocked with 403).
  - Admin request listing, filtering (`?status=...`, `?priority=...`), and full-text search (`?search=...`).
  - Admin live KPI metrics (`GET /api/requests/stats`).
  - Admin status transition (`PUT /api/requests/<id>`), priority updates, quotes, and notes.
  - Admin request deletion (`DELETE /api/requests/<id>`) and permission enforcement.
- **`test_services_and_auth.py`**: Regression testing for services catalog, JWT issuance, and profile endpoints.

---

## Customer Request Management Flow (Task 7)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CUSTOMER WORKFLOW                               │
└────────────────────────────────────────────────────────────────────────┘
          │
          ├──▶ 1. Visit /services
          │     Click "Request Service" on card OR "+ Submit Service Request"
          │
          ├──▶ 2. Monograph Commission Modal
          │     - Auto-populates Name, Email, Phone if logged in
          │     - Selects service title & project priority (Normal, Urgent, etc.)
          │     - Inputs project scope, deliverables, timeline
          │
          ├──▶ 3. Submission (`POST /api/requests`)
          │     - Handled by @jwt_required(optional=True)
          │     - Stored with initial status 'Pending'
          │     - Displays confirmation modal with reference `#SR-{id}`
          │
          └──▶ 4. Client Dashboard (`/dashboard`)
                - "MY SERVICE REQUESTS" section shows live status updates
                - Inspects studio progress updates & estimated quote
```

```
┌────────────────────────────────────────────────────────────────────────┐
│                        COMPANY ADMIN WORKFLOW                          │
└────────────────────────────────────────────────────────────────────────┘
          │
          ├──▶ 1. Admin Control Suite (`/admin`)
          │     Navigate to `03 — CUSTOMER REQUESTS`
          │
          ├──▶ 2. KPI Overview Cards
          │     Real-time counters: Total, Pending, In Review, In Progress, Completed, Rejected
          │
          ├──▶ 3. Filter & Search Toolbar
          │     - Filter pills by status with dynamic counters
          │     - Priority selector
          │     - Real-time search across client, email, company, service & message
          │
          ├──▶ 4. Dispatch Table & Status Management
          │     - 1-click status dropdown selector for quick processing
          │     - "Inspect" button opening full Request Inspector Modal
          │
          └──▶ 5. Request Inspector Modal
                - Review client profile & account status (Registered Member vs Guest)
                - Full project message reading pane
                - Update status ('Pending', 'In Review', 'In Progress', 'Completed', 'Rejected')
                - Adjust priority ('Low', 'Normal', 'High', 'Urgent')
                - Enter Estimated Cost / Quote Estimate (visible to customer)
                - Enter Internal & Client Progress Notes (displayed on customer dashboard)
```

---

## Database Models

### `ServiceRequest` (Task 7)

| Column           | Type         | Constraints                | Notes                                            |
|------------------|--------------|----------------------------|--------------------------------------------------|
| `id`             | Integer      | Primary Key, Auto-increment| Unique request reference identifier             |
| `user_id`        | Integer      | Nullable, Foreign Key      | Linked to `user.id` (set null on delete)         |
| `service_id`     | Integer      | Nullable                   | Reference to catalog service if applicable       |
| `service_title`  | String(200)  | Not Null                   | Title of service or custom project name          |
| `name`           | String(100)  | Not Null                   | Customer full name                               |
| `email`          | String(120)  | Not Null                   | Customer contact email                           |
| `phone`          | String(50)   | Nullable                   | Optional telephone number                        |
| `company`        | String(150)  | Nullable                   | Client organization / studio                     |
| `message`        | Text         | Not Null                   | Detailed project scope and requirements          |
| `status`         | String(50)   | Not Null, Default: Pending | `Pending`, `In Review`, `In Progress`, `Completed`, `Rejected` |
| `priority`       | String(20)   | Not Null, Default: Normal  | `Low`, `Normal`, `High`, `Urgent`                |
| `admin_notes`    | Text         | Nullable                   | Studio progress update / internal notes          |
| `estimated_cost` | String(100)  | Nullable                   | Official quote (e.g. `"$15,000 - $20,000"`)      |
| `created_at`     | DateTime     | Not Null, Auto-set         | Submission timestamp                             |
| `updated_at`     | DateTime     | Not Null, Auto-update      | Last modification timestamp                      |

### `Service`

| Column        | Type         | Constraints                |
|---------------|--------------|----------------------------|
| `id`          | Integer      | Primary Key, Auto-increment|
| `title`       | String(200)  | Not Null                   |
| `description` | Text         | Not Null                   |
| `icon`        | String(50)   | Nullable                   |
| `price`       | String(100)  | Nullable                   |
| `created_at`  | DateTime     | Not Null, Auto-set         |
| `updated_at`  | DateTime     | Not Null, Auto-update      |

### `User`

| Column          | Type         | Constraints                | Notes                    |
|-----------------|--------------|----------------------------|--------------------------|
| `id`            | Integer      | Primary Key, Auto-increment|                          |
| `email`         | String(120)  | Unique, Not Null           | Used for login           |
| `password_hash` | String(256)  | Not Null                   | Werkzeug hashed          |
| `is_admin`      | Boolean      | Not Null, Default: False   | Role flag                |
| `first_name`    | String(50)   | Not Null                   |                          |
| `last_name`     | String(50)   | Not Null                   |                          |
| `age`           | Integer      | Nullable                   | Profile detail           |
| `phone`         | String(20)   | Nullable                   | Profile detail           |
| `bio`           | Text         | Nullable                   | Profile detail           |
| `created_at`    | DateTime     | Not Null, Auto-set         | Registration timestamp   |

---

## API Reference

### Customer Requests — `/api/requests` (Task 7)

| Method | Endpoint    | Auth            | Body / Params                                                          | Description                                                   |
|--------|-------------|-----------------|------------------------------------------------------------------------|---------------------------------------------------------------|
| `POST` | `/`         | Optional JWT    | `{ name, email, service_title, message, phone?, company?, priority? }`   | Submit service request (auto-associates member if logged in)  |
| `GET`  | `/my`       | JWT (Customer)  | —                                                                      | List personal service requests & track live status in portal  |
| `GET`  | `/:id`      | JWT (Owner/Adm) | —                                                                      | Get full details for a single request                         |
| `GET`  | `/`         | JWT (Admin)     | `?status=...&priority=...&search=...`                                  | List all requests with status/priority filter & keyword search|
| `GET`  | `/stats`    | JWT (Admin)     | —                                                                      | KPI metric counts (total, pending, in review, etc.)           |
| `PUT`  | `/:id`      | JWT (Admin)     | `{ status?, priority?, admin_notes?, estimated_cost? }`                | Admin updates status, priority, studio progress notes, quote  |
| `DELETE`| `/:id`     | JWT (Admin)     | —                                                                      | Admin deletes a service request                               |

### Services — `/api/services`

| Method | Endpoint | Auth        | Body                                             | Description            |
|--------|----------|-------------|--------------------------------------------------|------------------------|
| `GET`  | `/`      | None        | —                                                | List all services      |
| `GET`  | `/:id`   | None        | —                                                | Get a single service   |
| `POST` | `/`      | JWT (Admin) | `{ title, description, icon?, price? }`          | Create a new service   |
| `PUT`  | `/:id`   | JWT (Admin) | `{ title?, description?, icon?, price? }`        | Update service details |
| `DELETE`| `/:id`  | JWT (Admin) | —                                                | Delete a service       |

### Authentication — `/api/auth`

| Method | Endpoint    | Auth     | Body                                                         | Description                      |
|--------|-------------|----------|---------------------------------------------------------------|----------------------------------|
| `POST` | `/register` | None     | `{ email, password, first_name, last_name, age?, phone?, bio? }`| Register a new user              |
| `POST` | `/login`    | None     | `{ email, password }`                                         | Login, returns JWT + user object |
| `GET`  | `/me`       | JWT      | —                                                             | Get current user's profile       |
| `PUT`  | `/me`       | JWT      | `{ first_name?, last_name?, age?, phone?, bio? }`             | Update current user's profile    |

---

## Status Badge Visual System

| Status        | Theme Color        | Background Tint               | Border Token                   |
|---------------|--------------------|-------------------------------|--------------------------------|
| `Pending`     | Warm Gold Amber    | `rgba(180, 120, 24, 0.14)`    | `rgba(180, 120, 24, 0.45)`     |
| `In Review`   | Sapphire Steel     | `rgba(43, 108, 176, 0.14)`    | `rgba(43, 108, 176, 0.45)`     |
| `In Progress` | Royal Violet       | `rgba(107, 70, 193, 0.14)`    | `rgba(107, 70, 193, 0.45)`     |
| `Completed`   | Botanical Green    | `rgba(27, 77, 52, 0.14)`      | `rgba(27, 77, 52, 0.45)`       |
| `Rejected`    | Crimson Rust       | `rgba(156, 47, 37, 0.14)`     | `rgba(156, 47, 37, 0.45)`      |
