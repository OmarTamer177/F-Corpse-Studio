# FCorpse Studio — Digital Platform & Management Suite

[![CI Pipeline](https://github.com/OmarTamer177/F-Corpse-Studio/actions/workflows/ci.yml/badge.svg)](https://github.com/OmarTamer177/F-Corpse-Studio/actions)
![Python 3.11](https://img.shields.io/badge/python-3.11-blue.svg)
![React 19](https://img.shields.io/badge/react-19-61dafb.svg)
![Vite 8](https://img.shields.io/badge/vite-8-646cff.svg)
![PostgreSQL](https://img.shields.io/badge/postgresql-15-336791.svg)
![Docker Compose](https://img.shields.io/badge/docker%20compose-orchestrated-2496ed.svg)

**FCorpse Studio** is the official web platform for an independent game development studio. The application serves as the studio's public-facing digital storefront, commissions and custom development portal, engineering dispatches blog, and internal company operations console.

---

## Key Features

* **Services Catalog & Commissions**: Interactive showcase of game development, custom shader engineering, audio design, and QA evaluation services with request quotation modals.
* **Search & Multi-Criteria Filtering**: Dynamic, real-time search across services and articles filtering by category, pricing model, and chronological sorting.
* **Client Self-Service Portal**: Authenticated customer dashboard to track project statuses, view studio quotes, and update personal account profiles.
* **Role-Based Access Control (RBAC)**: Multi-tiered permission architecture:
  * **Administrator**: Complete control over catalog offerings, articles, customer requests, operational statuses, and team role assignments.
  * **Regular Employee**: Operational access to search, filter, and review requests, update statuses, attach internal progress notes, and adjust estimates without deletion capabilities.
  * **Customer**: Self-service request tracking and profile management.
* **Team Operations Console**: Dedicated management dashboard for staff members to review incoming commissions and manage organizational members.
* **Full-Stack Containerization**: One-command orchestration via Docker Compose powering PostgreSQL, Flask with Gunicorn, and a React SPA served through Nginx.
* **Automated CI/CD Pipeline**: GitHub Actions workflow automatically executing 43 hermetic unit tests and frontend production build checks on every push and pull request.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 19, Vite, React Router 7, Vanilla CSS, Lucide Icons |
| **Frontend Web Server** | Nginx Alpine (Reverse proxy & SPA routing) |
| **Backend API** | Python 3.11, Flask, Gunicorn WSGI, Flask-JWT-Extended, Flask-CORS |
| **Database & ORM** | PostgreSQL 15, SQLAlchemy ORM (SQLite in-memory for testing) |
| **Containerization** | Docker, Docker Compose (Multi-stage builds) |
| **CI / Automation** | GitHub Actions |

---

## Architecture & Directory Layout

```text
F-Corpse-Studio/
├── .github/
│   └── workflows/
│       └── ci.yml                 # Automated CI pipeline
├── backend/                       # Python Flask backend service
│   ├── routes/                    # API Blueprints (auth, requests, services, blogs, contact)
│   ├── tests/                     # Test suites
│   │   ├── unit/                  # Hermetic unit tests (43 passing tests)
│   │   ├── e2e/                   # End-to-end integration workflows
│   │   └── system_test.py         # Full-stack system verification script
│   ├── app.py                     # Application factory & health checks
│   ├── config.py                  # Structured config management (dev, test, prod)
│   ├── extensions.py              # Initialized extensions (db, jwt, cors)
│   ├── models.py                  # SQLAlchemy schema definitions
│   ├── rbac.py                    # Role definitions, permissions, and route decorators
│   ├── seed_db.py                 # Database seeding script
│   ├── run_tests.py               # Unified test runner with CLI flags
│   ├── requirements.txt           # Pinned python dependencies
│   ├── Dockerfile                 # Production backend container definition
│   └── .dockerignore
│
├── frontend/                      # React / Vite single-page application
│   ├── src/
│   │   ├── components/            # Reusable UI components & route guards
│   │   ├── context/               # AuthContext (auth state, permissions, role helpers)
│   │   ├── pages/                 # Home, Services, Blogs, Dashboard, Admin, Login, Register
│   │   ├── services/              # Centralized API client (dynamic environment base URL)
│   │   └── App.jsx
│   ├── nginx.conf                 # Production Nginx reverse-proxy & routing config
│   ├── Dockerfile                 # Multi-stage container (Node 20 -> Nginx Alpine)
│   ├── package.json
│   └── .dockerignore
│
├── docker-compose.yml             # Orchestration for db, backend, and frontend
├── .env.example                   # Environment configuration template
├── run_tests.py                   # Root delegator runner
└── README.md
```

---

## Getting Started

### Option 1: Running with Docker Compose (Recommended)

The easiest way to start the complete stack (PostgreSQL, Backend API, and Frontend web app):

1. **Clone the repository**:
   ```bash
   git clone https://github.com/OmarTamer177/F-Corpse-Studio.git
   cd F-Corpse-Studio
   ```

2. **Create your environment configuration**:
   ```bash
   cp .env.example .env
   ```

3. **Build and launch containers**:
   ```bash
   docker compose up -d --build
   ```

4. **Seed sample data (Demo accounts & services)**:
   ```bash
   docker compose exec backend python seed_db.py
   ```

#### Live Container Access:
* **Frontend Web Application**: [http://localhost:3000](http://localhost:3000)
* **Backend REST API**: [http://localhost:5000](http://localhost:5000)
* **Backend Healthcheck**: [http://localhost:5000/api/health](http://localhost:5000/api/health)
* **PostgreSQL Database**: `localhost:5433` (mapped from container `5432`)

To stop the containers:
```bash
docker compose down
```

---

### Option 2: Running Locally (Development Mode)

#### 1. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate    # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Seed the database
python seed_db.py

# Start the Flask API server
python app.py
```
Backend API will be running at `http://localhost:5000`.

#### 2. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
Frontend development server will be running at `http://localhost:5173`.

---

## Default Accounts & Credentials

The seed script (`python seed_db.py`) generates the following accounts for evaluation:

| Role | Email | Password | Access Capabilities |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@fcorpse.com` | `admin123` | **Full Platform Control:** Manage catalog services, publish articles, view all customer requests, update quotes, permanently delete records, and assign user roles. |
| **Regular Employee** | `employee@fcorpse.com` | `employee123` | **Operational Access:** View and search all customer requests, view KPI analytics, update status and admin progress notes, and adjust estimates. *Cannot delete requests or alter service offerings.* |
| **Customer** | `elena.vance@studio.com` | `customer123` | **Client Access:** Submit requests, track personal submissions in Client Dashboard, manage account profile. *Forbidden from staff endpoints.* |

*New customer accounts can also be created via the public registration page.*

---

## Testing & Verification

The project includes both isolated unit test suites and comprehensive end-to-end system verification tests:

```bash
# Run all hermetic unit tests (43 tests in in-memory SQLite)
python run_tests.py

# Run unit tests explicitly
python backend/run_tests.py --mode unit

# Run full system test against live database & endpoints
python backend/tests/system_test.py
```

### Running Tests in Docker:
```bash
docker compose exec backend python run_tests.py
docker compose exec backend python tests/system_test.py
```

---

## Core API Endpoints

### Authentication & RBAC
* `POST /api/auth/register` — Register a new customer account (strictly customer role).
* `POST /api/auth/login` — Authenticate and receive a JWT access token.
* `GET /api/auth/me` — Retrieve profile data and granted permissions.
* `GET /api/auth/roles` — Retrieve available system roles and permission sets.
* `GET /api/auth/users` — List registered users (Staff only).
* `PUT /api/auth/users/<id>/role` — Change user role (Admin only).
* `POST /api/auth/users` — Onboard new staff team member (Admin only).
* `POST /api/admin/verify` — Verify staff / administrator authorization.

### Services & Dispatches
* `GET /api/services` — Public services catalog with search, category, pricing, and sort filters.
* `GET /api/services/meta` — Service categories and pricing model metadata.
* `POST /api/services` — Create a new service (Admin only).
* `PUT /api/services/<id>` — Modify service offering (Admin only).
* `DELETE /api/services/<id>` — Remove service offering (Admin only).
* `GET /api/blogs` — Public blog dispatches with search, author, and category filters.
* `GET /api/blogs/meta` — Blog categories and authors metadata.

### Customer Requests & Management
* `POST /api/requests` — Submit a service request / commission inquiry.
* `GET /api/requests/my` — Customer retrieves personal submitted requests.
* `GET /api/requests` — Staff views and filters all customer requests (Staff only).
* `GET /api/requests/stats` — KPI analytics across request statuses (Staff only).
* `GET /api/requests/<id>` — View request details (Owner or Staff).
* `PUT /api/requests/<id>` — Update status, priority, admin notes, and quote (Staff only).
* `DELETE /api/requests/<id>` — Permanently delete a request (Admin only).

### System & Health
* `GET /api/health` — Returns system status and database connectivity.

---

## Continuous Integration

Every push and pull request to `main` triggers automated validation via GitHub Actions:
1. **Backend Testing**: Sets up Python 3.11, installs pinned requirements, and executes the 43-test unit test suite.
2. **Frontend Build Verification**: Sets up Node 20, installs dependencies, and verifies clean production asset compilation (`npm run build`).

---

## License

This project is licensed under the MIT License.
