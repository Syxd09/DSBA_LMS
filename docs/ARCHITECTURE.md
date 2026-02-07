# EduMetrics Architecture

## System Overview

```mermaid
flowchart TB
    subgraph Client["Frontend (React)"]
        UI[React UI]
        RQ[React Query]
        Auth[Auth Context]
    end
    
    subgraph Backend["Backend (FastAPI)"]
        API[FastAPI Server]
        MW[Middleware]
        RBAC[RBAC Layer]
        Services[Business Logic]
    end
    
    subgraph Data["Data Layer"]
        PG[(PostgreSQL)]
        Redis[(Redis Cache)]
    end
    
    subgraph External["External"]
        Email[SMTP Server]
    end
    
    UI --> RQ
    RQ --> API
    Auth --> API
    API --> MW
    MW --> RBAC
    RBAC --> Services
    Services --> PG
    Services --> Redis
    Services --> Email
```

## Component Architecture

### Frontend Stack
| Component | Technology | Purpose |
|-----------|------------|---------|
| UI Framework | React 18 + TypeScript | Component-based UI |
| State Management | React Query | Server state caching |
| Routing | React Router v6 | Client-side navigation |
| Styling | TailwindCSS + shadcn/ui | Modern design system |
| Build Tool | Vite | Fast development builds |

### Backend Stack
| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | FastAPI | Async REST API |
| ORM | SQLAlchemy 2.0 | Database abstraction |
| Auth | JWT + bcrypt | Token-based auth |
| Migrations | Alembic | Schema versioning |
| Cache | Redis | Analytics caching |
| Scheduler | APScheduler | Background jobs |

## Data Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as API
    participant C as Cache
    participant D as Database
    
    U->>F: Action (e.g., View CO Attainment)
    F->>A: GET /analytics/co-attainment/{id}
    A->>C: Check cache
    alt Cache Hit
        C-->>A: Return cached data
    else Cache Miss
        A->>D: Query marks data
        D-->>A: Return raw data
        A->>A: Compute attainment
        A->>C: Store in cache (TTL: 5min)
    end
    A-->>F: Return analytics JSON
    F-->>U: Display charts
```

## Database Schema

```mermaid
erDiagram
    COLLEGE ||--o{ DEPARTMENT : has
    DEPARTMENT ||--o{ PROGRAM : offers
    PROGRAM ||--o{ COHORT : admits
    COHORT ||--o{ STUDENT : enrolls
    COHORT ||--o{ SUBJECT_OFFERING : schedules
    SUBJECT_OFFERING ||--o{ EXAM : creates
    EXAM ||--o{ SECTION : contains
    SECTION ||--o{ QUESTION : includes
    QUESTION ||--o{ SUB_QUESTION : has
    STUDENT ||--o{ STUDENT_QUESTION_MARK : earns
    SUB_QUESTION ||--o{ STUDENT_QUESTION_MARK : scores
    SUBJECT ||--o{ CO : defines
    CO ||--o{ CO_PO_MAPPING : maps
    PO }|--o{ CO_PO_MAPPING : receives
    STUDENT ||--o{ BACKLOG_ATTEMPT : attempts
    COHORT ||--o{ SEMESTER_PROMOTION : advances
```

## Security Architecture

```mermaid
flowchart LR
    subgraph Request["Incoming Request"]
        Token[JWT Token]
        CSRF[CSRF Token]
    end
    
    subgraph Middleware["Middleware Stack"]
        CORS[CORS Check]
        CSRFCheck[CSRF Validation]
        JWTAuth[JWT Verification]
    end
    
    subgraph RBAC["Role-Based Access"]
        RoleCheck[Role Checker]
        ScopeFilter[College Scope]
    end
    
    subgraph Handler["API Handler"]
        Endpoint[Business Logic]
        Audit[Audit Log]
    end
    
    Token --> CORS
    CSRF --> CORS
    CORS --> CSRFCheck
    CSRFCheck --> JWTAuth
    JWTAuth --> RoleCheck
    RoleCheck --> ScopeFilter
    ScopeFilter --> Endpoint
    Endpoint --> Audit
```

## Deployment Architecture

```mermaid
flowchart TB
    subgraph Docker["Docker Compose"]
        FE[Frontend Container<br/>Port 5173]
        BE[Backend Container<br/>Port 8000]
        DB[PostgreSQL<br/>Port 5432]
        RD[Redis<br/>Port 6379]
    end
    
    subgraph Volumes
        PGData[(postgres_data)]
        RedisData[(redis_data)]
    end
    
    FE --> BE
    BE --> DB
    BE --> RD
    DB --> PGData
    RD --> RedisData
```

## Role Hierarchy

| Role | Access Level | Key Permissions |
|------|--------------|-----------------|
| Student | Self-only | View own marks, analytics |
| Teacher | Assigned subjects | Enter marks, view subject analytics |
| HOD | Department-wide | Approve marks, manage dept, promotions |
| Principal | Institution-wide | Override actions, full analytics, user management |
