# FCorpse Studio

[![CI Pipeline](https://github.com/OmarTamer177/F-Corpse-Studio/actions/workflows/ci.yml/badge.svg)](https://github.com/OmarTamer177/F-Corpse-Studio/actions)
![Python 3.11](https://img.shields.io/badge/python-3.11-blue.svg)
![React 19](https://img.shields.io/badge/react-19-61dafb.svg)
![Vite 8](https://img.shields.io/badge/vite-8-646cff.svg)
![PostgreSQL](https://img.shields.io/badge/postgresql-15-336791.svg)
![Docker Compose](https://img.shields.io/badge/docker%20compose-orchestrated-2496ed.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**FCorpse Studio** is a full-stack web platform and operational management suite built for an independent game development and technical art studio. The application serves as the studio's digital storefront, commission request portal, engineering dispatches journal, customer self-service dashboard, digital asset archive, and internal project management platform.

The system is containerized with Docker Compose, secured through a multi-tiered Role-Based Access Control (RBAC) architecture, and validated by an automated continuous integration pipeline.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Main Features](#main-features)
- [Technologies Used](#technologies-used)
- [Architecture & Directory Structure](#architecture--directory-structure)
- [Setup & Installation Instructions](#setup--installation-instructions)
- [How to Run the Project](#how-to-run-the-project)
  - [Option 1: Docker Compose (Recommended)](#option-1-docker-compose-recommended)
  - [Option 2: Local Development](#option-2-local-development)
- [Default Accounts & Credentials](#default-accounts--credentials)
- [API Endpoints Reference](#api-endpoints-reference)
- [Testing & Quality Assurance](#testing--quality-assurance)
- [Continuous Integration (CI/CD)](#continuous-integration-cicd)
- [License](#license)

---

## Project Overview

FCorpse Studio connects public prospective clients with studio artisans and technical leads. Rather than operating disjointed tools, the platform unifies client communication, digital asset exchanges, and internal project deliverables into a cohesive single-page application and RESTful backend.

### Key Capabilities:
* **Client Engagement**: Prospective clients can explore technical disciplines, read engineering dispatches, submit commission inquiries with initial requirements, and upload project briefs.
* **Asset Archiving**: Built-in document repository supporting large multimedia files, design briefs, audio stems, and 3D assets with format validation and inline streaming previews.
* **Internal Operations**: Staff members review commission inquiries, assign cost estimates, manage project lifecycle milestones, link client corporate profiles, and assign multidisciplinary teams.
* **Role Governance**: Granular 3-tier security model enforcing data isolation between external customers, operational staff, and platform administrators.
* **Reliability & DevOps**: Multi-container Docker deployment orchestrated with health checks and an automated GitHub Actions CI pipeline executing 70 hermetic unit tests.

---

## Main Features

### 1. Client Project Management Platform
* **Lifecycle Tracking**: Full project state progression across four distinct phases: `Not Started`, `In Progress`, `On Hold`, and `Completed`.
* **Client Organization Linkage**: Associate projects directly with corporate client profiles, tracking organizational contacts, phone numbers, and commission history.
* **Multidisciplinary Team Assignments**: Many-to-many relationship linking multiple studio staff members to individual projects.
* **Real-Time KPI Counters**: Aggregate metric counters for total, active, pending, and completed projects.
* **Workspace Filtering**: Dedicated Projects workspace with real-time keyword search, status filtering, and client dropdown selection.

### 2. Services Catalog & Commission Inquiries
* **Architectural Disciplines Catalog**: Structured presentation of game development, custom shaders, procedural tools, audio design, and QA evaluation services.
* **Commission Quotation Workflow**: Interactive modal for submitting project inquiries with budget ranges, priority flags, and detailed scopes.
* **Multi-Criteria Search & Filtering**: Real-time keyword search across titles and descriptions, multi-facet filtering by category and pricing model, and sorting.

### 3. File & Document Management Archive
* **Secure Multipart Uploads**: Authenticated file uploads supporting assets up to 25MB.
* **Format Whitelisting**: Strict MIME validation for documents (`pdf`, `doc`, `docx`, `txt`, `md`, `csv`, `xlsx`), visual assets (`png`, `jpg`, `jpeg`, `webp`, `svg`), audio stems (`mp3`, `wav`, `flac`, `ogg`), and archives/models (`zip`, `tar`, `blend`, `fbx`, `obj`).
* **Request Linkage**: Documents can be attached directly to commission inquiries for context.
* **Inline Streaming & Previews**: Stream documents directly in the browser via `?inline=1` or download securely.

### 4. Multi-Tier Role-Based Access Control (RBAC)
* **Administrator**: Full platform clearance — manage service offerings, publish articles, review inquiries, adjust estimates, delete records, assign user roles, and register client profiles.
* **Regular Employee**: Operational staff clearance — review incoming inquiries, update project statuses, attach internal progress notes, modify estimates, and create/update projects. *Protected from destructive deletions or role changes.*
* **Customer**: Client clearance — submit inquiries, manage personal profile details, upload/download project documents, and track contracted studio deliverables.

### 5. Architectural Workshop Ledger (Staff Operations)
A consolidated, tabbed operations console replacing monolithic tables with five distinct ledgers:
* `01 // PROJECT PIPELINE`: Active deliverables, inline status transitions, and client associations.
* `02 // COMMISSION INQUIRIES`: Client requests, cost quotations, priority tags, and attached file inspections.
* `03 // DISCIPLINES CATALOG`: Complete management interface for studio service offerings.
* `04 // EDITORIAL DISPATCHES`: Engineering blog publishing with category and author metadata.
* `05 // PERSONNEL & ROLES`: Staff onboarding, user directory, and role promotions (Admin only).

### 6. Client Self-Service Portal
* **Account Profile Management**: Update personal contact details, bio, and credentials.
* **Inquiry Tracking**: Real-time status cards showing review progress (`Pending`, `In Review`, `In Progress`, `Completed`, `Rejected`), studio quotes, and admin notes.
* **Contracted Project Deliverables**: Dedicated view displaying active milestone cards for projects contracted with the client's organization.

### 7. Botanical Monograph Design System
* **Curated Visual Palette**: Grounded in paper and botanical ink tones (`#f6f1e8` paper surface, `#141715` ink solid, `#1b4d34` botanical green).
* **Craft Typography**: Clean editorial typography using Google Fonts (Cinzel, Spectral, Inter) paired with custom SVG craft glyphs.
* **Responsive Architecture**: Fully responsive layouts with desktop dropdown navigation and an interactive mobile drawer menu.

---

## Technologies Used

| Domain | Technology | Purpose & Details |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19 | Component-based UI with hooks and state management |
| **Build Tool & Bundler** | Vite 8 | Fast HMR dev server and optimized production assets |
| **Client-Side Routing** | React Router 7 | Dynamic SPA routing with protected layout guards |
| **Styling & Design System** | Vanilla CSS3 | Custom CSS custom properties, responsive grids, zero heavy utility frameworks |
| **Backend Framework** | Python 3.11 / Flask | Modular REST API built with application factories and Blueprints |
| **WSGI Server** | Gunicorn | Production-grade multi-worker WSGI application server |
| **Authentication & Tokens** | Flask-JWT-Extended | Stateless JWT token issuance, verification, and expiration handling |
| **Database & ORM** | PostgreSQL 15, SQLAlchemy | Relational schema definitions, cascade constraints, and query mapping |
| **Test Database** | SQLite (in-memory) | Hermetic, zero-dependency environment for automated CI unit tests |
| **Containerization** | Docker, Docker Compose | Multi-stage container builds (`python:3.11-slim`, `node:20 -> nginx:alpine`) |
| **Web Server & Reverse Proxy** | Nginx Alpine | Serves compiled React assets and reverse-proxies `/api/` requests to Flask |
| **Continuous Integration** | GitHub Actions | Automated 70-test unit suite and frontend production build on push/PR |

---

## Architecture & Directory Structure

```text
F-Corpse-Studio/
├── .github/
│   └── workflows/
│       └── ci.yml                 # Automated CI pipeline (70 unit tests + Vite build)
├── backend/                       # Python Flask REST API
│   ├── routes/                    # Modular API Blueprints
│   │   ├── auth.py                # Authentication, profiles, and role management
│   │   ├── blogs.py               # Dispatches blog catalog and metadata
│   │   ├── clients.py             # Client organization records and management
│   │   ├── contact.py             # Contact form message dispatch
│   │   ├── documents.py           # Multipart file uploads, streaming, and downloads
│   │   ├── projects.py            # Project lifecycle tracking and team assignments
│   │   ├── requests.py            # Commission requests, admin notes, and quotes
│   │   └── services.py            # Services catalog and admin management
│   ├── tests/                     # Automated test suites
│   │   ├── unit/                  # 70 hermetic unit tests (SQLite in-memory)
│   │   │   ├── test_documents_api.py
│   │   │   ├── test_models.py
│   │   │   ├── test_projects_api.py
│   │   │   ├── test_rbac.py
│   │   │   ├── test_requests_api.py
│   │   │   ├── test_search_filter.py
│   │   │   └── test_services_and_auth.py
│   │   ├── e2e/                   # Integration workflows against live database
│   │   └── system_test.py         # Full system diagnostic runner
│   ├── uploads/                   # Persistent storage for uploaded project assets
│   ├── app.py                     # Flask application factory, health check, root route
│   ├── config.py                  # Structured environment configurations (dev, test, prod)
│   ├── extensions.py              # Initialized extensions (db, jwt, cors)
│   ├── models.py                  # SQLAlchemy schema (User, Project, Client, Document, etc.)
│   ├── rbac.py                    # Role definitions, permission matrices, and decorators
│   ├── seed_db.py                 # Database seeding script with realistic studio data
│   ├── run_tests.py               # Unified test runner with CLI mode flags
│   ├── requirements.txt           # Pinned Python package dependencies
│   ├── Dockerfile                 # Production backend container definition
│   └── .dockerignore
│
├── frontend/                      # React 19 / Vite single-page application
│   ├── public/
│   │   ├── assets/                # Logos, monograph graphics, and SVG icons
│   │   └── css/
│   │       └── style.css          # Monograph design system tokens, ledger tabs, badges
│   ├── src/
│   │   ├── components/            # Reusable UI elements (Navbar, Footer, Route Guards)
│   │   ├── context/               # AuthContext (JWT management, role flags, permissions)
│   │   ├── pages/                 # Full-page views
│   │   │   ├── Home.jsx           # Monograph studio storefront
│   │   │   ├── Services.jsx       # Architectural Commission Studies catalog
│   │   │   ├── Blogs.jsx          # Engineering dispatches & research articles
│   │   │   ├── Dashboard.jsx      # Client portal (Inquiries, Documents, Contracted Projects)
│   │   │   ├── Documents.jsx      # Digital archive & multipart asset manager
│   │   │   ├── Projects.jsx       # Studio Project Management Platform workspace
│   │   │   ├── Admin.jsx          # Architectural Workshop Ledger (5-tab console)
│   │   │   ├── Contact.jsx        # Studio contact & message dispatch
│   │   │   ├── Login.jsx          # Secure authentication portal
│   │   │   └── Register.jsx       # Client self-registration
│   │   ├── services/
│   │   │   └── api.js             # Centralized API client with dynamic baseURL resolution
│   │   └── App.jsx                # Application root with BrowserRouter and routes
│   ├── nginx.conf                 # Production Nginx reverse-proxy & SPA fallback
│   ├── Dockerfile                 # Multi-stage production container (Node 20 -> Nginx)
│   ├── package.json               # Frontend dependencies and scripts
│   └── .dockerignore
│
├── docker-compose.yml             # Orchestration for PostgreSQL, Backend, and Frontend
├── .env.example                   # Environment configuration template
├── run_tests.py                   # Root delegator runner
└── README.md                      # Comprehensive project documentation
```

---

## Setup & Installation Instructions

### Prerequisites
* **Git** installed on your local machine.
* **Docker & Docker Compose** (Recommended for easiest evaluation), OR:
* **Python 3.11+** and **Node.js 20+** with `npm` (for bare-metal execution).

### 1. Clone the Repository
```bash
git clone https://github.com/OmarTamer177/F-Corpse-Studio.git
cd F-Corpse-Studio
```

### 2. Configure Environment Variables
Copy `.env.example` to create your local `.env`:
```bash
cp .env.example .env
```
*(The default values in `.env.example` are preconfigured to work out of the box with Docker Compose).*

---

## How to Run the Project

### Option 1: Docker Compose (Recommended)

Docker Compose provisions and orchestrates the full stack in one command:
- **`db`**: PostgreSQL 15 database container with persistent data volume.
- **`backend`**: Gunicorn WSGI server running Flask on port 5000 with persistent uploads volume.
- **`frontend`**: Production Vite build served through an Nginx Alpine container on port 3000, reverse-proxying API requests.

```bash
# 1. Build and start all containers in detached mode
docker compose up -d --build

# 2. Seed the database with demo accounts, projects, clients, and services
docker compose exec backend python seed_db.py
```

#### Access Points:
| Service | URL | Notes |
| :--- | :--- | :--- |
| **Frontend Web Application** | **[http://localhost:3000](http://localhost:3000)** | Primary web interface |
| **Backend REST API** | **[http://localhost:5000](http://localhost:5000)** | Gunicorn API root & JSON info |
| **Backend Health Check** | **[http://localhost:5000/api/health](http://localhost:5000/api/health)** | Service & DB status verification |
| **PostgreSQL Database** | `localhost:5433` | Host port `5433` mapped to internal `5432` |

To stop the containers:
```bash
docker compose down
```

---

### Option 2: Local Development

If you prefer running services directly on your host machine:

#### 1. Backend Setup
```bash
cd backend

# Create and activate a Python virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Seed database (uses SQLite locally if DATABASE_URL is not set)
python seed_db.py

# Start Flask development server
python app.py
```
*Backend API will run at `http://localhost:5000`.*

#### 2. Frontend Setup
In a new terminal window:
```bash
cd frontend

# Install Node dependencies
npm install

# Start Vite development server
npm run dev
```
*Frontend development server will run at `http://localhost:5173`.*

---

## Default Accounts & Credentials

The database seeding script (`python seed_db.py`) generates the following accounts for evaluation:

| Role | Email | Password | Access Capabilities |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@fcorpse.com` | `admin123` | **Full Platform Clearance:** Access to `/admin` and `/projects`. Manage service offerings, editorial dispatches, project lifecycles, user roles, corporate clients, and permanent record deletions. |
| **Regular Employee** | `employee@fcorpse.com` | `employee123` | **Operational Clearance:** Access to `/admin` and `/projects`. View commission requests, create and edit studio projects, assign team members, update progress notes, and adjust estimates. *Cannot delete records or change roles.* |
| **Customer** | `elena.vance@studio.com` | `customer123` | **Client Self-Service:** Access to `/dashboard` and `/documents`. Submit commission inquiries, upload briefs/assets, download files, and track contracted studio project milestones. |

*New customer accounts can also be created freely via the public registration portal at `/register`.*

---

## API Endpoints Reference

All API routes are served under `/api` (or proxied via `http://localhost:3000/api` through Nginx).

### Authentication & Role Governance
| Method | Endpoint | Clearance | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register a new customer account (strictly customer role). |
| `POST` | `/api/auth/login` | Public | Authenticate user and receive a JWT access token. |
| `GET` | `/api/auth/me` | Authenticated | Retrieve current user profile, role, and permissions list. |
| `PUT` | `/api/auth/me` | Authenticated | Update user profile fields (name, phone, age, bio). |
| `GET` | `/api/auth/roles` | Authenticated | List all available system roles and permission sets. |
| `GET` | `/api/auth/users` | Staff | List registered studio users and clients. |
| `PUT` | `/api/auth/users/<id>/role` | Admin | Change user role (`admin`, `employee`, `customer`). |
| `POST` | `/api/auth/users` | Admin | Onboard new staff team member. |
| `POST` | `/api/admin/verify` | Staff | Verify staff/admin authorization clearance. |

### Projects & Clients
| Method | Endpoint | Clearance | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/projects` | Authenticated | List projects with search, status, and client filters (Customers see only contracted projects). |
| `GET` | `/api/projects/stats` | Staff | Aggregate KPI counters across project workflow statuses. |
| `POST` | `/api/projects` | Staff | Create a new project with client linkage and assigned team members. |
| `GET` | `/api/projects/<id>` | Authenticated | Inspect full project details with team assignments and client metadata. |
| `PUT` | `/api/projects/<id>` | Staff | Update project title, description, status, client, or team members. |
| `DELETE` | `/api/projects/<id>` | Admin | Permanently delete project record. |
| `GET` | `/api/clients` | Staff | List registered client companies and profiles. |
| `POST` | `/api/clients` | Staff | Register a new client organization profile. |
| `GET` | `/api/clients/<id>` | Authenticated | View client organization profile and historical projects. |
| `PUT` | `/api/clients/<id>` | Admin | Update client company details, email, contact, or notes. |
| `DELETE` | `/api/clients/<id>` | Admin | Permanently delete client profile. |

### Commission Inquiries & Requests
| Method | Endpoint | Clearance | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/requests` | Public / Auth | Submit a new commission request inquiry. |
| `GET` | `/api/requests/my` | Customer | Retrieve customer's personal submitted requests. |
| `GET` | `/api/requests` | Staff | List and filter all submitted customer requests. |
| `GET` | `/api/requests/stats` | Staff | Aggregate KPI analytics across request statuses. |
| `GET` | `/api/requests/<id>` | Owner / Staff | View full request details with attached documents. |
| `PUT` | `/api/requests/<id>` | Staff | Update inquiry status, priority, admin notes, and quote. |
| `DELETE` | `/api/requests/<id>` | Admin | Permanently delete a customer request. |

### File & Document Management
| Method | Endpoint | Clearance | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/documents/upload` | Authenticated | Multipart file upload for briefs, audio stems, and concept art (Max 25MB). |
| `GET` | `/api/documents` | Authenticated | List documents (own assets for Customer, all assets for Staff) with search/category filters. |
| `GET` | `/api/documents/meta` | Public | Metadata listing document categories and supported formats. |
| `GET` | `/api/documents/<id>` | Owner / Staff | View document metadata. |
| `GET` | `/api/documents/<id>/download` | Owner / Staff | Stream/download file (supports `?inline=1` for browser preview). |
| `PUT` | `/api/documents/<id>` | Owner / Staff | Update document title, category, description, or linked request. |
| `DELETE` | `/api/documents/<id>` | Owner / Staff | Delete document record and clean up file on disk. |

### Services Catalog & Editorial Dispatches
| Method | Endpoint | Clearance | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/services` | Public | List services with search, category, pricing, and sort filters. |
| `GET` | `/api/services/meta` | Public | Dynamic service categories and pricing model metadata. |
| `POST` | `/api/services` | Admin | Create a new service offering. |
| `PUT` | `/api/services/<id>` | Admin | Update service offering details. |
| `DELETE` | `/api/services/<id>` | Admin | Remove service offering from catalog. |
| `GET` | `/api/blogs` | Public | List dispatches with search, author, and category filters. |
| `GET` | `/api/blogs/meta` | Public | Dynamic blog categories and authors metadata. |

### System & Health Checks
| Method | Endpoint | Clearance | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Public | API status descriptor providing direct link to the web application (`http://localhost:3000`). |
| `GET` | `/api/health` | Public | Health check reporting service status and database connectivity. |

---

## Testing & Quality Assurance

The codebase includes comprehensive automated test suites to ensure system correctness and regression protection:

### 1. Hermetic Unit Tests (70 Tests)
Unit tests run using an in-memory SQLite database in complete isolation, requiring no live PostgreSQL instance or network connectivity:

```bash
# Run all unit tests from the workspace root
python run_tests.py

# Or explicitly via the backend runner
python backend/run_tests.py --mode unit
```

*Test Suite Coverage:*
* **`test_projects_api.py`** (10 tests): Project CRUD, client linkage, multi-team assignments, status progression, query filtering, and RBAC enforcement.
* **`test_documents_api.py`** (15 tests): Multipart uploads, 25MB limits, extension whitelisting, streaming downloads, request linking, and client isolation.
* **`test_rbac.py`** (10 tests): Multi-role hierarchy, permission matrices, staff route gating, and customer boundary protections.
* **`test_requests_api.py`** (14 tests): Commission submissions, guest submissions, quote updates, and KPI stats calculations.
* **`test_search_filter.py`** (12 tests): Multi-criteria search, categories, pricing models, and chronological sorting.
* **`test_services_and_auth.py`** (5 tests): Authentication flows, profile retrieval, and service catalog management.
* **`test_models.py`** (4 tests): ORM schema relationships and dictionary serialization.

### 2. Integration & End-to-End Tests
```bash
# Run all tests (unit tests + E2E against the live database)
python backend/run_tests.py --mode all

# Run full system diagnostic script
python backend/tests/system_test.py
```

### 3. Running Tests Inside Docker
```bash
# Run unit tests inside the backend container
docker compose exec backend python run_tests.py --mode unit

# Run the complete test suite
docker compose exec backend python run_tests.py --mode all
```

---

## Continuous Integration (CI/CD)

Every push and pull request to the `main` branch triggers an automated GitHub Actions workflow ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)):

1. **Backend Test Suite Job**:
   - Sets up Python 3.11 with pip caching.
   - Installs pinned backend dependencies.
   - Executes the 70-test hermetic unit test suite in SQLite in-memory isolation.
2. **Frontend Build Verification Job**:
   - Sets up Node.js 20 with npm caching.
   - Performs a clean dependency installation (`npm ci`).
   - Verifies production bundle compilation (`npm run build`) with zero errors or warnings.
