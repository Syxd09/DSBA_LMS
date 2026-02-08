# Academic Intelligence System

[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](#license)
[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.x-cyan.svg)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)](https://www.postgresql.org/)

A comprehensive **Outcome-Based Education (OBE)** analytics platform designed for NBA/NAAC compliance. This system provides question-level intelligence, CO/PO attainment tracking, and automated reporting for academic institutions.

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [User Roles](#user-roles)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Setup](#environment-setup)
  - [Running the Application](#running-the-application)
  - [Docker Deployment](#docker-deployment)
- [API Reference](#api-reference)
- [Development Phases](#development-phases)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## Overview

The Academic Intelligence System is a six-phase project that transforms traditional academic management into an intelligent, data-driven ecosystem. Built with precision for NBA and NAAC accreditation requirements, it provides granular analytics at the question level, enabling institutions to demonstrate educational effectiveness with confidence.

### Core Philosophy

- **No approximation**: Every metric traces back to questions → CO → PO → Bloom → student
- **Explainability**: All scores are transparent and auditable
- **Compliance-first**: Designed from ground up for NBA/NAAC requirements
- **Version-aware**: Old batches preserve old regulations forever

## Key Features

### Phase 1: Academic Data Model

- Multi-college, multi-department support
- Program and batch management with OBE definitions
- Subject catalog with offering-specific configurations
- CO (Course Outcome), PO (Program Outcome), PSO definitions
- Question-level traceability with Bloom's Taxonomy
- Unit and topic mapping for granular analytics

### Phase 2: Assessment & Exam Workflow

- Internal and external exam management
- Question paper builder with section rules
- Optional question handling with automatic highest-score selection
- Question-wise marks entry
- Multi-level locking and approval workflow
- Backlog attempt tracking (lightweight)

### Phase 3: Analytics & Reporting Engine

- **Student Analytics**: Subject performance, CO attainment, unit/topic weakness detection, Bloom's profile
- **Faculty Analytics**: Question analysis, topic coverage, bloom balance, teaching effectiveness
- **HOD Analytics**: Batch comparison, semester health, faculty performance, backlog insights
- **Principal Analytics**: Department comparison, institutional outcomes, audit compliance
- NBA/NAAC template generation with Excel/PDF export

### Phase 4: Access Control & Workflows

- Role-based access control (RBAC) with context filters
- Multi-level approval workflows
- Complete audit trail for all sensitive actions
- Data visibility matrix ensuring appropriate information access

### Phase 5: System Modules

- Academic Configuration Module
- Assessment & Examination Module
- Workflow & Approval Module
- Analytics Engine
- Reporting Engine
- User & Access Control Module
- Audit & Compliance Module

### Phase 6: Development Roadmap
- ✅ **Phase 1**: Academic Data Model & Database Schema
- ✅ **Phase 2**: Assessment Engine & Question Papers
- ✅ **Phase 3**: Analytics Engine & CO/PO Calculations
- ✅ **Phase 4**: Reporting Templates & Exports
- ✅ **Phase 5**: UI Development & Role-Based Dashboards
- ✅ **Phase 6**: Pilot Testing, Security Hardening & Documentation

### MVP Scope (Completed)

**Implemented features:**
- ✅ Department, Program, Batch, Semester setup
- ✅ Subject Offering configuration
- ✅ CO, PO definitions and CO-PO mapping
- ✅ Internal Exam 1 & 2
- ✅ Question paper builder with sections
- ✅ Question-wise marks entry
- ✅ CO attainment calculations
- ✅ Unit and topic analysis
- ✅ Basic reporting (CO attainment, CO-PO matrix)
- ✅ Principal Dashboard & Institution Analytics
- ✅ NAAC/NBA Report Templates

## Tech Stack

### Recommended Stack (Production-Grade)

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Backend** | Python + FastAPI | Clean APIs, async support, easy analytics integration |
| **Database** | PostgreSQL | Complex joins, JSON support, strong consistency for audits |
| **Analytics** | SQL + Python (NumPy, Pandas) | Transparent calculations, no black box ML |
| **Cache** | Redis | Dashboard speed, heavy aggregation caching |
| **Frontend** | React (TypeScript) | Modular dashboards, role-based UI |
| **Reporting** | Jinja + WeasyPrint/ReportLab | Pixel-perfect NBA PDFs, no browser dependency |

### Why NOT:

- ❌ **MongoDB**: Audits reject schema drift
- ❌ **Excel-based logic**: Introduces inconsistency
- ❌ **Heavy ML**: NBA doesn't trust opaque algorithms

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React/TS)                      │
│         Dashboards · Reports · Role-Based UI               │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend (FastAPI/Python)                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Academic  │  │ Assessment  │  │     Analytics       │  │
│  │  Config     │  │   Engine    │  │      Engine         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Workflow   │  │  Reporting  │  │   Audit &合规       │  │
│  │  Engine     │  │   Engine    │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     Database (PostgreSQL)                   │
│   Academic Schema · Marks · Analytics Cache · Audit Logs     │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      Cache (Redis)                           │
│    Dashboard Performance · Aggregation Cache                 │
└─────────────────────────────────────────────────────────────┘
```

### High-Level Data Flow

```
Academic Setup → Assessment Entry → Approval & Lock → Analytics Engine → Reports/Dashboards
```

## Project Structure

```
outcome-master/
├── backend/
│   ├── app/
│   │   ├── api/                    # REST API endpoints
│   │   │   └── v1/
│   │   │       ├── analytics/      # CO/PO attainment calculations
│   │   │       ├── assessments/    # Exam management
│   │   │       ├── auth/           # Authentication
│   │   │       ├── dashboard/      # Dashboard data
│   │   │       ├── templates/      # Report templates
│   │   │       └── ...             # Other API endpoints
│   │   ├── core/                   # Security, permissions, guards
│   │   ├── models/                 # SQLAlchemy models
│   │   ├── repositories/           # Data access layer
│   │   ├── schemas/                # Pydantic schemas
│   │   └── services/               # Business logic
│   │       ├── analytics/          # Attainment calculations
│   │       ├── computation/        # CGPA/SGPA, grading logic
│   │       ├── insights/            # Rule-based insights
│   │       └── templates/          # Report generation
│   ├── migrations/                 # Alembic migrations
│   ├── tests/                     # Test suite
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── requirements.txt
│   └── README.md                  # Backend documentation
├── src/                           # Frontend React application
├── docker-compose.yml             # Development environment
├── docker-compose.prod.yml       # Production deployment
├── Dockerfile.frontend
├── start_docker.sh
├── .env.example
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
└── README.md                      # This file
```

## User Roles

| Role | Scope | Key Capabilities |
|------|-------|------------------|
| **Student** | Self | View marks, CO/PO attainment, analytics, download reports |
| **Faculty** | Assigned subjects | Create exams, enter marks, question mapping, subject analytics |
| **HOD** | Department | Approve marks, promote batches, define CO/PO, department analytics |
| **Principal** | College | Override marks, view all dashboards, audit logs, compliance reports |
| **System Admin** | Technical | User management, role assignment, bulk uploads |

### Permission Model

```
Permission = Role × Department × SubjectOffering × Action
```

Example: `Faculty A → Subject X → Enter marks ✓` but `Faculty A → Subject Y → ✗`

## Getting Started

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Python | 3.11+ | Backend development |
| PostgreSQL | 15+ | Primary database |
| Redis | 7+ | Caching layer |
| Node.js | 20+ | Frontend development |
| Docker | Latest | Containerization |
| Git | Latest | Version control |

### Environment Setup

#### 1. Clone the Repository

```bash
git clone <repository-url>
cd outcome-master
```

#### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your database and Redis connection strings

# Run database migrations
alembic upgrade head
```

#### 3. Frontend Setup

```bash
# From root directory
cd src

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with API endpoint configuration
```

#### 4. Environment Variables

**Backend (.env)**

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/edumetrics

# Redis
REDIS_URL=redis://localhost:6379

# Security
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Application
DEBUG=true
LOG_LEVEL=INFO
```

**Frontend (.env)**

```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_APP_TITLE=Academic Intelligence System
```

### Running the Application

#### Development Mode

**Using Docker Compose (Recommended)**

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

**Manual Start**

```bash
# Terminal 1: Backend
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend
cd src
npm run dev
```

#### Access Points

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:5173 | React application |
| Backend API | http://localhost:8000 | REST API base |
| API Docs | http://localhost:8000/docs | Swagger UI |
| API Redoc | http://localhost:8000/redoc | ReDoc documentation |
| Health Check | http://localhost:8000/health | System health status |

### Docker Deployment

#### Development Environment

```bash
# Build and start containers
docker-compose up --build

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop containers
docker-compose down -v
```

#### Production Deployment

```bash
# Using the deployment script
chmod +x start_docker.sh
./start_docker.sh

# Or manually
docker-compose -f docker-compose.prod.yml up --build -d
```

#### Production Environment Variables

For production, ensure the following environment variables are properly configured:

```env
# Database (Use managed service in production)
DATABASE_URL=postgresql://user:password@db-host:5432/edumetrics

# Redis (Use managed service in production)
REDIS_URL=redis://redis-host:6379

# Security (Generate strong keys)
SECRET_KEY=<your-256-bit-secret-key>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Application
DEBUG=false
LOG_LEVEL=WARNING
```

## API Reference

### Base URL

```
http://localhost:8000/api/v1
```

### Authentication

All API endpoints require authentication via JWT Bearer token.

```bash
# Example authenticated request
curl -H "Authorization: Bearer <your-token>" \
     http://localhost:8000/api/v1/dashboard
```

### Main Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/login` | POST | User authentication |
| `/auth/me` | GET | Current user info |
| `/dashboard` | GET | Dashboard data based on role |
| `/exams` | GET/POST | Exam management |
| `/exams/{id}` | GET/PUT/DELETE | Single exam operations |
| `/marks` | GET/POST | Marks entry and retrieval |
| `/marks/entry` | POST | Bulk marks entry |
| `/analytics/co` | GET | CO attainment analytics |
| `/analytics/po` | GET | PO attainment analytics |
| `/analytics/pso` | GET | PSO attainment analytics |
| `/analytics/sgpa-cgpa` | GET | SGPA/CGPA calculations |
| `/reports/templates` | GET | Available report templates |
| `/reports/generate` | POST | Generate custom reports |
| `/users` | GET | User management |
| `/departments` | GET | Department listings |
| `/programs` | GET | Program listings |
| `/subjects` | GET | Subject catalog |
| `/cohorts` | GET | Cohort management |
| `/enrollments` | GET | Enrollment information |
| `/assignments` | GET/POST | Assignment management |
| `/backlog` | GET | Backlog tracking |
| `/promotions` | GET/POST | Batch promotions |
| `/units` | GET | Unit configurations |
| `/grading` | GET | Grading schemes |
| `/audit` | GET | Audit logs |
| `/external-exams` | GET/POST | External exam management |

### API Documentation

For complete API documentation, interactive Swagger UI is available at:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Development Phases

| Phase | Duration | Focus Area |
|-------|----------|------------|
| **Phase 1** | Weeks 1-2 | Academic Data Model & Database Schema |
| **Phase 2** | Weeks 3-5 | Assessment Engine & Question Papers |
| **Phase 3** | Weeks 6-7 | Analytics Engine & CO/PO Calculations |
| **Phase 4** | Week 8 | Reporting Templates & Exports |
| **Phase 5** | Weeks 9-10 | UI Development & Role-Based Dashboards |
| **Phase 6** | Weeks 11-12 | Pilot Testing & Hardening |

### MVP Scope (Phase 6.1)

**In Scope:**
- ✅ Department, Program, Batch, Semester setup
- ✅ Subject Offering configuration
- ✅ CO, PO definitions and CO-PO mapping
- ✅ Internal Exam 1 & 2
- ✅ Question paper builder with sections
- ✅ Question-wise marks entry
- ✅ CO attainment calculations
- ✅ Unit and topic analysis
- ✅ Basic reporting (CO attainment, CO-PO matrix)

**Out of Scope (for MVP)::**
- ❌ External exam analytics
- ❌ PSO support
- ❌ Multi-college tenancy
- ❌ Attendance tracking
- ❌ Principal dashboard
- ❌ Deep backlog analysis
- ❌ NAAC automation

## Documentation

Comprehensive documentation is available in the `docs/` directory:

- [**Deployment Guide**](docs/DEPLOYMENT.md): Docker setup, environment configuration, and maintenance.
- [**User Manual**](docs/USER_MANUAL.md): Role-based guide for Students, Faculty, HODs, and Principals.
- [**API Documentation**](docs/API.md): Details on REST endpoints (also see Swagger UI).
- [**Architecture Guide**](docs/ARCHITECTURE.md): System design and component interaction.


## Performance & Safety Guarantees

- **Immutability**: Marks once locked cannot be changed without full audit trail
- **Determinism**: All calculations produce identical results
- **Reproducibility**: Reports can be regenerated years later
- **Version Preservation**: Old batches retain original regulations forever
- **No Data Loss**: Deletion is replaced with archival

## Contributing

We welcome contributions! Please follow these steps to contribute:

### 1. Fork the Repository

Fork the repository on GitHub and clone your fork locally:

```bash
git clone https://github.com/YOUR-USERNAME/outcome-master.git
cd outcome-master
```

### 2. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 3. Set Up Development Environment

Follow the [Environment Setup](#environment-setup) instructions.

### 4. Make Changes

Ensure your code follows the project's coding standards:

- **Python**: Follow PEP 8, use type hints
- **TypeScript**: Follow project ESLint rules
- **Commit Messages**: Use conventional commit format
- **Tests**: Write tests for new functionality

### 5. Run Tests

```bash
# Backend tests
cd backend
pytest tests/ -v

# Frontend tests
cd src
npm test
```

### 6. Submit a Pull Request

1. Push your branch to your fork
2. Navigate to the original repository
3. Click "Compare & pull request"
4. Fill out the PR template
5. Submit for review

### Code Style Guidelines

**Python (Backend)**

```bash
# Format code
black app/
isort app/

# Lint
flake8 app/
mypy app/
```

**TypeScript/React (Frontend)**

```bash
# Format code
cd src
npm run format

# Lint
npm run lint
```

## License

This project is proprietary software. All rights reserved.

Permission to use, copy, modify, and distribute this software for academic and non-commercial purposes is hereby granted, without fee and without a written agreement, provided that the above copyright notice and this permission notice appear in all copies.

For commercial use or licensing inquiries, please contact the project maintainers.

## Contact

For support, questions, or issues:

- **Issue Tracker**: Submit issues via GitHub Issues
- **Documentation**: See [backend/README.md](backend/README.md) for detailed backend documentation
- **API Documentation**: http://localhost:8000/docs (when running locally)

---

**Built for NBA/NAAC Compliance** | **Question-Level Intelligence** | **Audit-Ready Analytics**
