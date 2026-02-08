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

## Documentation

- **Deployment**: See [`../docs/DEPLOYMENT.md`](../docs/DEPLOYMENT.md) for production setup.
- **API Reference**: See [`../docs/API.md`](../docs/API.md) or visit `/docs` when running.

## Environment Variables

Copy `.env.example` to `.env`. See the [Deployment Guide](../docs/DEPLOYMENT.md) for detailed variable descriptions.

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/edumetrics
SECRET_KEY=your-secret-key
```
