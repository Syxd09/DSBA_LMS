# OBE Management System

A comprehensive Outcome-Based Education (OBE) management platform for NBA/NAAC accreditation compliance.
**Version 2.0 - Hardened & Enhanced**

## 🌟 Key Enhancements (v2.0)
This system has recently undergone a major hardening and feature upgrade phase:
-   **🛡️ Strict Security**: Implemented `Zod` schema validation for all critical inputs, preventing malformed data and injection attacks.
-   **📝 API Documentation**: Integrated **Swagger/OpenAPI** (`/api-docs`) for interactive API exploration.
-   **🪵 Structured Logging**: Replaced console logs with **Winston** for production-grade observability (file rotation, severity levels).
-   **📈 Attainment Engine**: Dedicated service for accurate **CO** (Course Outcome) and **PO** (Program Outcome) attainment calculations.

---

## 🚀 Quick Start

### Development

```bash
# Clone the repository
git clone https://github.com/yourusername/outcome-master.git
cd outcome-master

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Setup database
cp .env.example .env
# Edit .env with your database credentials
npx prisma db push
npx prisma generate

# Start development servers
npm run dev          # Backend (port 3000)
cd ..
npm run dev          # Frontend (port 8080)
```

### 📚 API Documentation
Once the backend is running, verify endpoints at:
**http://localhost:3000/api-docs**

---

## 🐳 Docker Deployment

### Prerequisites
- Docker & Docker Compose installed
- Port 80 and 3000 available

### Quick Deploy

```bash
# Copy and edit environment file
cp .env.production .env
# IMPORTANT: Update passwords and JWT secret!

# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f
```

### Access
- Frontend: http://localhost
- API: http://localhost:3000
- API Docs: http://localhost:3000/api-docs
- Health: http://localhost:3000/health

---

## 🏗️ System Architecture

### Tech Stack
-   **Frontend**: React, TypeScript, Vite, Tailwind CSS, Shadcn UI.
-   **Backend**: Node.js, Express, TypeScript.
-   **Database**: PostgreSQL (via Prisma ORM).
-   **Validation**: Zod.
-   **Logging**: Winston.

### Folder Structure
```
outcome-master/
├── src/                    # Frontend React source
│   ├── components/         # UI components (Shadcn)
│   ├── pages/              # Page components
│   └── services/           # API integration
├── backend/                # Backend Express source
│   ├── src/
│   │   ├── controllers/    # Route handlers
│   │   ├── middleware/     # Validation (Zod), Auth, Logging (Winston)
│   │   ├── routes/         # API definition
│   │   ├── services/       # Business logic (AttainmentService)
│   │   └── utils/          # Swagger config, Logger
│   └── prisma/             # Database schema
└── docker-compose.yml      # Orchestration
```

---

## 🧠 Attainment Engine

The system features a robust engine for calculating OBE metrics:

### 1. CO Attainment
-   **Logic**: Aggregates student marks for specific questions mapped to a CO.
-   **Threshold**: Configurable target percentage (default 60%).
-   **Formula**: `(Students scoring > Target%) / Total Students * 100`
-   **Optimization**: Batched queries minimize database load during calculation.

### 2. PO Attainment
-   **Logic**: Aggregates CO attainment based on the CO-PO Mapping Matrix.
-   **Formula**: `PO = Σ(CO_Attainment * Weighted_Correlation) / Σ(Weights)`
-   **Integration**: Automatically pulls approved CO data.

---

## 🔧 API Endpoints (Snapshot)

For full details, visit `/api-docs`.

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### OBE Management (Hardened)
- `POST /api/assignments` - Create Assignment (Validated)
- `POST /api/enrollments` - Enroll Students (Validated)
- `POST /api/attainment/calculate` - Trigger CO Calculation

### Workflows
- `POST /api/marks-unlock/request` - Request marks unlock
- `POST /api/attainment/approve` - Approve calculated attainment

---

## 🔒 Security Features
- **Input Validation**: Zod schemas for request body/params.
- **RBAC**: Middleware enforces `ADMIN`, `PRINCIPAL`, `HOD`, `TEACHER` roles.
- **Auth**: JWT with strict expiry.
- **Headers**: Helmet security headers.
- **CORS**: Environment-aware configuration.

---

## 🤝 Contributing
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

---

*Built for robust educational compliance.*
