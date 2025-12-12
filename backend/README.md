# EduMetrics Backend

FastAPI backend for the EduMetrics Outcome-Based Education platform.

## Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start development server
uvicorn app.main:app --reload --port 8000
```

## Docker Setup

```bash
docker-compose up --build
```

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Environment Variables

Copy `.env.example` to `.env` and configure:

```
DATABASE_URL=postgresql://user:pass@localhost:5432/edumetrics
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```
