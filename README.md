# OBE Management System

A comprehensive Outcome-Based Education (OBE) management platform for NBA/NAAC accreditation compliance.

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

### Default Credentials

After running seed data:
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@college.edu | Admin@123 |
| Principal | principal@college.edu | Admin@123 |
| HOD | hod.cs@college.edu | Admin@123 |
| Teacher | john.doe@college.edu | Teacher@123 |
| Student | student1@college.edu | Student@123 |

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

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Access
- Frontend: http://localhost
- API: http://localhost:3000
- Health: http://localhost:3000/health

---

## ☁️ Cloud Deployment

### Railway (Recommended)

1. **Create Account** at [railway.app](https://railway.app)
2. **Connect GitHub** and select this repository
3. **Add PostgreSQL** from the Railway dashboard
4. **Set Environment Variables:**
   ```
   DATABASE_URL=<auto-provided by Railway>
   JWT_SECRET=<your-secret>
   NODE_ENV=production
   FRONTEND_URL=<your-railway-url>
   ```
5. **Deploy** - Railway auto-builds on push

### Render

1. **Create Account** at [render.com](https://render.com)
2. **Create PostgreSQL Database** (free tier available)
3. **Create Web Service** for backend:
   - Root Directory: `backend`
   - Build: `npm install && npm run build`
   - Start: `npm run start:prod`
4. **Create Static Site** for frontend:
   - Build: `npm install && npm run build`
   - Publish: `dist`

### AWS EC2

```bash
# SSH into EC2 instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Clone and deploy
git clone https://github.com/yourusername/outcome-master.git
cd outcome-master
cp .env.production .env
# Edit .env with production values
docker-compose up -d --build

# Setup SSL (Certbot)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## 📁 Project Structure

```
outcome-master/
├── src/                    # Frontend React source
│   ├── components/         # UI components
│   ├── pages/              # Page components
│   ├── services/           # API services
│   └── lib/                # Utilities
├── backend/                # Backend Express source
│   ├── src/
│   │   ├── controllers/    # Route handlers
│   │   ├── middleware/     # Express middleware
│   │   ├── routes/         # API routes
│   │   └── services/       # Business logic
│   └── prisma/             # Database schema
├── docker-compose.yml      # Docker orchestration
├── Dockerfile              # Frontend container
└── nginx.conf              # Nginx configuration
```

---

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Academic Structure
- `GET/POST /api/departments` - Department CRUD
- `GET/POST /api/programs` - Program CRUD
- `GET/POST /api/cohorts` - Cohort CRUD
- `GET/POST /api/subjects` - Subject CRUD

### OBE Management
- `GET/POST /api/course-outcomes` - CO management
- `POST /api/bulk/program-outcomes` - Bulk PO creation
- `POST /api/bulk/co-po-mappings` - CO-PO mapping

### Assessment
- `GET/POST /api/exams` - Exam management
- `POST /api/marks/save` - Save marks
- `POST /api/marks/submit` - Submit for approval

### Attainment
- `POST /api/attainment/calculate` - Calculate CO attainment
- `POST /api/po-attainment/calculate/:cohortId` - Calculate PO
- `POST /api/attainment/approve` - Approve attainment
- `POST /api/attainment/lock` - Lock attainment

### Workflows
- `POST /api/marks-unlock/request` - Request marks unlock
- `POST /api/marks-unlock/hod-decision/:id` - HOD decision
- `POST /api/marks-unlock/principal-decision/:id` - Principal decision

---

## 📊 Features

### For NBA/NAAC Compliance
- ✅ CO/PO definition and mapping
- ✅ Automated attainment calculation
- ✅ Multi-level approval workflows
- ✅ Data lock for audit integrity
- ✅ Complete audit trail

### For Administrators
- ✅ Role-based access (5 roles)
- ✅ Bulk operations
- ✅ Activity timeline
- ✅ Department-wise isolation

### For Faculty
- ✅ Guided mark entry
- ✅ Automatic calculations
- ✅ Correction workflows
- ✅ Progress tracking

---

## 🔒 Security Features

- JWT authentication with 24h expiry
- bcrypt password hashing
- Rate limiting (100 req/15min)
- Helmet security headers
- CORS protection
- Audit logging

---

## 📝 License

MIT License - See LICENSE file for details.

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

---

*Built with ❤️ for educational institutions*
