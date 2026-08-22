# MY BUDDY HRMS

A modern, comprehensive B2B SaaS Workspace Gateway designed to streamline Human Resources management. **MY BUDDY** brings attendance, leave, payroll, profiles, and HR approvals into one secure, role-based workspace.

## 🚀 Key Features

*   **Role-Based Access Control (RBAC):** Distinct dashboards and permissions for **HR Admins** and **Employees**.
*   **Dual-Factor Smart Kiosk Attendance:** Secure check-ins utilizing webcam photo capture and geofenced GPS coordinates (100m radius).
*   **End-to-End Leave Workflows:** Employees can request paid, sick, or unpaid leave; HR Admins can review, approve, and automatically deduct from leave balances.
*   **Payroll & Compensation Control:** Track basic salary, allowances, deductions, net salary, and generate employee payslips.
*   **Employee Profile Management:** Centralized directory for managing employee information, job titles, departments, and documents.
*   **Next.js Proxy Routing:** Seamless, cross-origin resource sharing (CORS) free API communication between the frontend and the Python backend using Next.js `rewrites()`.

## 🛠 Tech Stack

*   **Frontend:** [Next.js 14](https://nextjs.org/) (React), Tailwind CSS, Lucide Icons, TypeScript
*   **Backend:** [FastAPI](https://fastapi.tiangolo.com/) (Python), Uvicorn
*   **Database:** SQLite3
*   **Authentication:** JWT (JSON Web Tokens) & bcrypt password hashing

## 📦 Project Structure

```
MY BUDDY/
├── backend/            # FastAPI Python backend
│   ├── routers/        # API route handlers (auth, admin, attendance, leaves)
│   ├── db.py           # Database connection & initialization scripts
│   ├── main.py         # FastAPI application entry point
│   └── security.py     # JWT & password hashing utilities
├── src/                # Next.js Frontend source code
│   ├── app/            # Next.js App Router pages (login, dashboard)
│   ├── components/     # Reusable React components (Auth, Dashboard tabs)
│   ├── context/        # React Context providers (AuthContext)
│   └── lib/            # Frontend utility functions
├── public/uploads/     # Local storage for captured Smart Kiosk photos
└── next.config.mjs     # Next.js configuration and API proxy rules
```

## ⚙️ Local Development Setup

### 1. Backend (FastAPI)

Ensure you have Python 3.8+ installed.

```bash
# Navigate to project root (if not already there)
cd "MY BUDDY"

# Install Python dependencies (you may want to use a venv)
pip install fastapi uvicorn sqlite3 bcrypt pyjwt

# Run the backend server on port 8000
python -m uvicorn backend.main:app --reload --port 8000
```
*The SQLite database (`hrms.db`) will be automatically initialized and seeded with mock users upon the first run.*

### 2. Frontend (Next.js)

Ensure you have Node.js 18+ installed.

```bash
# Open a new terminal in the project root
cd "MY BUDDY"

# Install NPM dependencies
npm install

# Run the development server on port 3000
npm run dev
```

### 3. Access the Application

Open your browser and navigate to `http://localhost:3000`.

**Default Seeded Accounts:**
*   **HR Admin:** `admin@mybuddyhrms.com` / `Admin@12345`
*   **Employee:** `john.doe@mybuddyhrms.com` / `Employee@12345`

## 🔒 API Proxy Configuration

To prevent CORS issues and allow seamless testing from local network devices (e.g., mobile phones), the Next.js frontend is configured to proxy all `/api/v1/*` traffic directly to the FastAPI backend.

This is managed in `next.config.mjs`:
```javascript
async rewrites() {
  return [
    {
      source: '/api/v1/:path*',
      destination: 'http://127.0.0.1:8000/api/v1/:path*'
    }
  ]
}
```

## 📄 License

© 2026 My Buddy HRMS. All rights reserved.
