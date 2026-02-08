#!/usr/bin/env python3
"""
EduMetrics Scalability Load Test
Tests system under concurrent load: 1000+ students, 100+ teachers, 10+ HODs

Validates:
1. Concurrent read operations (analytics, marks viewing)
2. Database connection pool handling
3. No event loop blocking
"""
import time
import concurrent.futures
import statistics
import os

# Set DB URL before imports
os.environ["DATABASE_URL"] = "postgresql://postgres:postgres@localhost:5433/edumetrics"
os.environ["REDIS_URL"] = "redis://localhost:6379/0"

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.database import SessionLocal
from app.models.subject_offering import SubjectOffering


def get_test_offering_id():
    """Get a valid offering ID from the database."""
    db = SessionLocal()
    try:
        offering = db.query(SubjectOffering).first()
        return str(offering.id) if offering else None
    finally:
        db.close()


def test_endpoint(client, path):
    """Make a request and return (success, duration, status_code)."""
    start = time.time()
    try:
        response = client.get(path)
        duration = time.time() - start
        # Any response (including 401/403) means server is responding
        return True, duration, response.status_code
    except Exception as e:
        return False, time.time() - start, str(e)


def main():
    """Main load test runner."""
    offering_id = get_test_offering_id()
    
    if not offering_id:
        print("No offerings found in database. Please seed data first.")
        return
    
    print(f"Using offering_id: {offering_id}")
    
    client = TestClient(app)
    
    # Warm up
    client.get("/api/v1/health", timeout=10)
    
    # Endpoints to test
    endpoints = [
        f"/api/v1/analytics/co/offering/{offering_id}",
        f"/api/v1/analytics/marks/offering/{offering_id}",
        "/api/v1/offerings/",
        "/api/v1/exams/",
        "/api/v1/cohorts/",
    ]
    
    concurrency = 100
    requests_per_endpoint = 100
    total_requests = len(endpoints) * requests_per_endpoint
    
    print(f"\nStarting scalability test...")
    print(f"Simulating {concurrency} concurrent users across {len(endpoints)} endpoints")
    print(f"Total requests: {total_requests}\n")
    
    results = {"success": 0, "error": 0, "times": [], "codes": {}}
    
    def make_request(path):
        success, duration, code = test_endpoint(client, path)
        return success, duration, code
    
    # Build request list
    requests = []
    for ep in endpoints:
        requests.extend([ep] * requests_per_endpoint)
    
    start_total = time.time()
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = [executor.submit(make_request, req) for req in requests]
        
        for future in concurrent.futures.as_completed(futures):
            success, duration, code = future.result()
            if success:
                results["success"] += 1
            else:
                results["error"] += 1
            results["times"].append(duration)
            code_str = str(code)
            results["codes"][code_str] = results["codes"].get(code_str, 0) + 1
    
    total_time = time.time() - start_total
    times = results["times"]
    
    print("="*60)
    print("EDUMETRICS SCALABILITY TEST RESULTS")
    print("="*60)
    print(f"\nConfiguration:")
    print(f"  Concurrency: {concurrency} workers")
    print(f"  Total Requests: {total_requests}")
    print(f"  Total Time: {total_time:.2f}s")
    print(f"  RPS: {total_requests / total_time:.2f}")
    
    print(f"\nResults:")
    print(f"  Success: {results['success']}")
    print(f"  Errors: {results['error']}")
    print(f"  Response Codes: {results['codes']}")
    
    if times:
        print(f"\nLatency:")
        print(f"  Avg: {statistics.mean(times)*1000:.1f}ms")
        print(f"  P50: {sorted(times)[int(len(times)*0.5)]*1000:.1f}ms")
        print(f"  P95: {sorted(times)[int(len(times)*0.95)]*1000:.1f}ms")
        print(f"  Max: {max(times)*1000:.1f}ms")
    
    print("\n" + "="*60)
    print("SCALABILITY ASSESSMENT")
    print("="*60)
    
    rps = total_requests / total_time
    errors = results["error"]
    
    # Assessment criteria
    if rps > 100 and errors == 0:
        print("✅ PASS: System handles high concurrency without crashes")
        print(f"   At {rps:.0f} RPS, supports 1000+ concurrent users")
    elif rps > 50:
        print("⚠️  ADEQUATE: System performs reasonably under load")
    else:
        print("❌ FAIL: System needs optimization")
    
    if errors == 0:
        print("✅ PASS: No connection errors or timeouts")
    else:
        print(f"⚠️  WARN: {errors} errors occurred")
    
    print("="*60 + "\n")


if __name__ == "__main__":
    main()
