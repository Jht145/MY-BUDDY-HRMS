import os
from fastapi import FastAPI, Request, status
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from dotenv import load_dotenv

load_dotenv()

# Import database, rate limiter, and all modular routers
from backend.db import init_db
from backend.rate_limiter import RateLimitMiddleware
from backend.routers.auth import router as auth_router
from backend.routers.admin import router as admin_router
from backend.routers.employee import router as employee_router
from backend.routers.users import router as users_router
from backend.routers.profile import router as profile_router
from backend.routers.attendance import router as attendance_router
from backend.routers.leaves import router as leaves_router
from backend.routers.payroll import router as payroll_router

# Initialize database schema and seeds
init_db()

app = FastAPI(
    title="My Buddy HRMS API",
    description="Enterprise-grade Core HR Operations with Automated, Photo- & Location-Verified Kiosk Attendance",
    version="1.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining", "Retry-After"]
)

# Global Rate Limiting Middleware (6 requests max per window)
app.add_middleware(RateLimitMiddleware)

# Include All Routers
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(employee_router)
app.include_router(users_router)
app.include_router(profile_router)
app.include_router(attendance_router)
app.include_router(leaves_router)
app.include_router(payroll_router)

# Health Check
@app.get("/api/health", tags=["System"])
@app.get("/api/v1/health", tags=["System"])
async def health_check():
    return {
        "status": "online",
        "service": "My Buddy HRMS Core API Engine",
        "modules": [
            "Authentication & Security (RBAC)",
            "Profile Management",
            "Smart Kiosk Attendance (Webcam + Haversine Geofencing)",
            "Leave & Time-Off Management",
            "Payroll Management Engine"
        ],
        "version": "1.0.0"
    }

# Static file serving
PUBLIC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "public"))

# Mount CSS & JS subdirectories if they exist
css_dir = os.path.join(PUBLIC_DIR, "css")
js_dir = os.path.join(PUBLIC_DIR, "js")
if os.path.exists(css_dir):
    app.mount("/css", StaticFiles(directory=css_dir), name="css")
if os.path.exists(js_dir):
    app.mount("/js", StaticFiles(directory=js_dir), name="js")

# SPA / HTML fallback routes
@app.get("/", include_in_schema=False)
@app.get("/login", include_in_schema=False)
@app.get("/signup", include_in_schema=False)
@app.get("/admin", include_in_schema=False)
@app.get("/employee", include_in_schema=False)
@app.get("/kiosk", include_in_schema=False)
async def serve_frontend():
    index_file = os.path.join(PUBLIC_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"message": "Frontend index.html not found."}
    )

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    print("=========================================")
    print(f"My Buddy HRMS Server running on http://localhost:{port}")
    print(f"OpenAPI Swagger Docs: http://localhost:{port}/docs")
    print(f"Smart Kiosk Attendance: http://localhost:{port}/api/v1/attendance")
    print(f"Leave Management: http://localhost:{port}/api/v1/leaves")
    print(f"Payroll Portal: http://localhost:{port}/api/v1/payroll")
    print("=========================================")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
