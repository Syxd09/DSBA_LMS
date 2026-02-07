# EduMetrics API Documentation

## Base URL
```
http://localhost:8000/api/v1
```

## Authentication

All protected endpoints require a Bearer token:
```
Authorization: Bearer <access_token>
```

### POST /auth/login
Login and receive access token.

**Request:**
```json
{
  "username": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "user": { "id": "...", "email": "...", "role": "teacher" }
}
```

---

## Core Endpoints

### Departments
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | /departments | Any | List departments |
| POST | /departments | Principal | Create department |
| GET | /departments/{id} | Any | Get department |
| PUT | /departments/{id} | Principal | Update department |
| DELETE | /departments/{id} | Principal | Delete department |

### Programs
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | /programs | Any | List programs |
| POST | /programs | HOD+ | Create program |
| GET | /programs/{id} | Any | Get program |
| PUT | /programs/{id} | HOD+ | Update program |
| DELETE | /programs/{id} | HOD+ | Delete program |

### Cohorts
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | /cohorts | Any | List cohorts |
| POST | /cohorts | HOD+ | Create cohort |
| GET | /cohorts/{id} | Any | Get cohort |
| PUT | /cohorts/{id} | HOD+ | Update cohort |
| DELETE | /cohorts/{id} | HOD+ | Delete cohort |

### Subjects
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | /subjects | Any | List subjects |
| POST | /subjects | HOD+ | Create subject |
| GET | /subjects/{id} | Any | Get subject details |
| PUT | /subjects/{id} | HOD+ | Update subject |
| DELETE | /subjects/{id} | HOD+ | Delete subject |
| GET | /subjects/{id}/outcomes | Any | Get COs for subject |
| POST | /subjects/{id}/outcomes | HOD+ | Create CO |

---

## Exam Management

### Exams
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | /exams | Teacher+ | List exams |
| POST | /exams | Teacher+ | Create exam |
| GET | /exams/{id} | Teacher+ | Get exam details |
| PUT | /exams/{id}/structure | Teacher+ | Update exam structure |
| POST | /exams/{id}/publish | Teacher+ | Publish exam |
| POST | /exams/{id}/submit | Teacher+ | Submit for approval |
| POST | /exams/{id}/approve | HOD+ | Approve exam |
| POST | /exams/{id}/lock | HOD+ | Lock exam |
| POST | /exams/{id}/unlock | Principal | Unlock with reason |

### Marks
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | /marks/exam/{examId} | Teacher+ | Get exam marks |
| POST | /marks/exam/{examId} | Teacher+ | Save marks |
| POST | /marks/compute/{examId} | Teacher+ | Compute totals |
| GET | /marks/student/{studentId} | Any | Get student marks |

---

## Backlog Management

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | /backlogs | HOD+ | List backlog attempts |
| POST | /backlogs/record | HOD+ | Record new attempt |
| GET | /backlogs/student/{usn}/summary | HOD+ | Student backlog summary |
| PUT | /backlogs/{id}/result | HOD+ | Update result |
| GET | /backlogs/cohort/{id}/analytics | HOD+ | Cohort analytics |

**Query Parameters for GET /backlogs:**
- `usn` - Filter by student USN
- `offering_id` - Filter by subject offering
- `cohort_id` - Filter by cohort
- `result` - Filter by result (pass/fail/pending)
- `skip`, `limit` - Pagination

---

## Semester Promotions

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | /promotions | HOD+ | List promotions |
| GET | /promotions/cohort/{id}/eligibility | HOD+ | Check eligibility |
| POST | /promotions/execute | HOD+ | Execute promotion |
| GET | /promotions/{id} | HOD+ | Get promotion details |
| POST | /promotions/{id}/rollback | Principal | Rollback promotion |

**POST /promotions/execute:**
```json
{
  "cohort_id": "uuid",
  "academic_year": "2025-26",
  "approval_notes": "Optional notes"
}
```

---

## Analytics

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | /analytics/co-attainment/{subjectId} | Teacher+ | CO attainment |
| GET | /analytics/bloom/{examId} | Teacher+ | Bloom distribution |
| GET | /analytics/subject-performance/{cohortId} | Teacher+ | Subject stats |
| GET | /analytics/department-stats | HOD+ | Department overview |
| GET | /analytics/pso-attainment/{programId} | HOD+ | PSO attainment |

### Role-Scoped Analytics
| Endpoint | Role | Description |
|----------|------|-------------|
| /analytics/role/student/performance | Student | Own performance |
| /analytics/role/faculty/subject-health/{id} | Teacher | Subject health |
| /analytics/role/hod/department-health | HOD | Department health |
| /analytics/role/principal/institution-overview | Principal | Full overview |

---

## Reports

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | /templates/reports/co-attainment/{id} | HOD+ | CO report |
| GET | /templates/reports/po-matrix/{programId} | HOD+ | PO matrix |
| GET | /templates/reports/naac/criterion-2/{id} | HOD+ | NAAC Criterion 2 |
| GET | /templates/reports/nba/sar/{programId} | HOD+ | NBA SAR |

**Query Parameters:**
- `format` - json/pdf/xlsx
- `academic_year` - e.g., "2025-26"

---

## Audit Logs

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | /audit | HOD+ | List audit entries |

**Query Parameters:**
- `table_name` - Filter by entity type
- `action` - insert/update/delete
- `limit` - Max records

---

## Error Responses

All errors follow this format:
```json
{
  "detail": "Error message here"
}
```

| Status | Meaning |
|--------|---------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid/missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Optimistic lock failure |
| 422 | Validation Error - Input validation failed |
| 500 | Server Error - Internal error |
