#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${GREEN}Starting EduMetrics via Docker...${NC}"

# Stop existing containers
echo "Stopping existing containers..."
docker compose down

# Build and start
echo "Building and starting services..."
docker compose up -d --build

# Wait for database availability (basic check via backend health or sleep)
echo "Waiting for services to initialize (10s)..."
sleep 10

# Run migrations
echo -e "${GREEN}Running Database Migrations...${NC}"
docker compose exec -T backend alembic upgrade head

# Seed Data
echo -e "${GREEN}Seeding Pilot Data...${NC}"
docker compose exec -T backend python seed_pilot_data.py

# Fix Passwords & Data Gaps
echo -e "${GREEN}Applying Data Fixes...${NC}"
docker compose exec -T backend python fix_pilot_passwords.py

echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "Frontend: ${GREEN}http://localhost:5173${NC}"
echo -e "Backend:  ${GREEN}http://localhost:8000/docs${NC}"
echo -e "DB Admin: (Connect via localhost:5432)"
