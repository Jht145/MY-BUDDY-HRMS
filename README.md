# 🚀 My Buddy HRMS

> **Full-Stack Core HR Operations with Automated, Photo- & Location-Verified Kiosk Attendance**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](#)
[![Version](https://img.shields.io/badge/version-1.0.0--beta-orange.svg)](#)
[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](#)
[![React](https://img.shields.io/badge/React-v18-blue.svg)](#)

---

## 📌 Executive Summary

**My Buddy HRMS** is an enterprise-grade Human Resource Management System built to bridge core administrative workflows with modern, location-aware field and office attendance tracking. By integrating a **Smart Kiosk Attendance Engine** featuring real-time photo capture, spatial geofencing verification, and automated flag queues, My Buddy ensures accurate time tracking while streamlining employee self-service, leave workflows, and payroll calculations.

---

## ✨ Key System Modules

### 1. 🔐 Authentication & Security (RBAC)
* **Role-Based Registration & Sign In**: Dual-mode enrollment supporting `EMPLOYEE` and `HR_ADMIN` roles with `employee_id`, work email, and encrypted credentials.
* **Server-Side Validation**:
  * Strong password policy enforcement (minimum length, complexity rules).
  * Unique email and `employee_id` uniqueness verification.
  * Verified email status checking prior to issuing session tokens.
* **Protected Routes & Token Handling**:
  * JWT-based short-lived access tokens paired with secure HTTP-only refresh cookies.
  * Middleware-level route protection restricting standard employees to operational screens while enforcing full administrative isolation for `/admin/*` routes.

---

### 2. 📊 Role-Specific Dashboards
* **Employee Portal**:
  * High-level personal overview cards for quick profile navigation.
  * Real-time daily/weekly interactive attendance activity logs.
  * Active leave balance summaries and pending request statuses.
  * Real-time activity feeds and system notifications.
* **Admin Portal**:
  * Live company metrics: Active workforce headcount, present vs. absent ratios, and pending leave queue size.
  * **Flagged Location Check-ins Widget**: Immediate alerts for attendance logs recorded outside authorized geofences.
  * **Global Employee Context Switcher**: Allows HR personnel to inspect individual employee views with read/edit capabilities.

---

### 3. 👤 Profile Management
* **Centralized Employee Directory**:
  * Comprehensive master record storing contact details, job title, department, date of joining, reporting manager, and base compensation.
* **Granular Role-Restricted Editing**:
  * **Employee Permissions**: Self-service update access limited to personal contact info (`phone`, `address`, `profile_picture_url`).
  * **Admin Permissions**: Unrestricted edit control across organizational data, including job titles, department transfers, employment status, and base pay structures.

---

### 4. 📸 Smart Kiosk Attendance System
* **Biometric & Spatial Verification**:
  * Web-camera snapshot capture (`check_in_photo_url` / `check_out_photo_url`) at point-of-interaction.
  * High-accuracy device GPS tracking (`check_in_latitude`, `check_in_longitude`).
* **Automated Geofencing Engine**:
  * **Within Allowed Radius**: System automatically sets status to `PRESENT` and auto-approves the log.
  * **Outside Allowed Radius**: System sets status to `PENDING_ADMIN_APPROVAL` and flags entry for mandatory manual review.
* **Admin Verification Interface**:
  * Visual verification desk rendering candidate photo evidence alongside mapped GPS coordinates.
  * Quick-action **Approve / Reject** buttons with mandatory comment triggers for denied check-ins.
* **Auditable Logs**: Personal history view for individual employees and searchable, filterable master logs for HR Officers.

---

### 5. 🌴 Leave & Time-Off Management
* **Employee Request Portal**:
  * Standardized application form for `PAID`, `SICK`, and `UNPAID` leave types.
  * Inclusive start/end date selectors with automated net-working-day calculation.
  * Mandatory reason field and support for supporting document uploads.
* **Approval Workflow Queue**:
  * Dedicated administrative review inbox.
  * Real-time state transitions (`PENDING` → `APPROVED` / `REJECTED`) with optional reviewer notes.
  * Automated leave balance deduction upon approval.

---

### 6. 💰 Payroll Management
* **Employee Payslip Portal**:
  * Read-only financial breakdown listing itemized base salary, statutory allowances, tax/benefit deductions, and final calculated net pay.
  * Downloadable PDF payslips per pay period.
* **Admin Payroll Control Center**:
  * Dynamic workspace for HR Officers to edit compensation structures per employee.
  * Auto-calculation engine that integrates leave deductions and working days into gross/net pay.
  * Database transaction commits and bulk payroll locks for end-of-month cycles.

---

## 📐 System Architecture & Flow

```
                     +-----------------------------------+
                     |      My Buddy Frontend App        |
                     |   (React / Next.js + Tailwind)    |
                     +-----------------+-----------------+
                                       |
                   +-------------------+-------------------+
                   |                                       |
                   v                                       v
      [ Employee Dashboard ]                      [ Kiosk Interface ]
      - Self-Service Profile                      - Camera Capture
      - Leave Requests                            - Geolocation Capture
      - Payslip Inspection                        - Check-in/out trigger
                   |                                       |
                   +-------------------+-------------------+
                                       | HTTPS (REST API / JWT)
                                       v
                     +-----------------------------------+
                     |       My Buddy Core Backend       |
                     |      (Node.js / Express API)      |
                     +-----------------+-----------------+
                                       |
          +----------------------------+----------------------------+
          |                            |                            |
          v                            v                            v
  [ RBAC Guard ]            [ Geofencing Engine ]        [ Payroll Engine ]
  - JWT Verify              - Haversine Formula          - Salary Computations
  - Admin Isolation          - Radius Validation          - Tax & Deductions
          |                            |                            |
          +----------------------------+----------------------------+
                                       |
                                       v
                     +-----------------------------------+
                     |     PostgreSQL / MongoDB Database |
                     |   Users, Attendance, Leaves, Pay  |
                     +-----------------------------------+
```

---

## 🛠️ Tech Stack & Dependencies

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18 / Next.js | SPA rendering, SSG/SSR dashboard views |
| **Styling & UI** | Tailwind CSS, Lucide Icons | Responsive modern interface components |
| **State Management** | Zustand / TanStack Query | Client state & cached server data hydration |
| **Backend Framework** | Node.js / Express / TypeScript | RESTful API routes & business logic orchestration |
| **Database** | PostgreSQL (Prisma ORM) | Relational data persistence with strict schemas |
| **Authentication** | JWT, bcrypt, HttpOnly Cookies | Role-Based Access Control (RBAC) & session management |
| **Media Storage** | AWS S3 / Cloudinary | Secure storage for `check_in_photo_url` & avatars |
| **Location Verification** | HTML5 Geolocation API + Haversine | Spatial radius evaluation |

---

## 🗄️ Database Schema Summary

### `users`
* `id` (UUID, Primary Key)
* `employee_id` (String, Unique)
* `email` (String, Unique)
* `password_hash` (String)
* `role` (`EMPLOYEE` | `HR_ADMIN`)
* `phone`, `address`, `profile_picture_url`
* `job_title`, `department`, `joining_date`, `base_salary`
* `created_at`, `updated_at`

### `attendance_logs`
* `id` (UUID, Primary Key)
* `user_id` (FK → `users.id`)
* `check_in_timestamp` (DateTime)
* `check_out_timestamp` (DateTime, Nullable)
* `check_in_photo_url` (String)
* `check_in_latitude` (Float), `check_in_longitude` (Float)
* `status` (`PRESENT` | `PENDING_ADMIN_APPROVAL` | `FLAGGED` | `REJECTED`)
* `approval_notes` (Text, Nullable)
* `verified_by` (FK → `users.id`, Nullable)

### `leave_requests`
* `id` (UUID, Primary Key)
* `user_id` (FK → `users.id`)
* `type` (`PAID` | `SICK` | `UNPAID`)
* `start_date` (Date), `end_date` (Date)
* `reason` (Text)
* `status` (`PENDING` | `APPROVED` | `REJECTED`)
* `admin_comments` (Text, Nullable)

### `payroll_records`
* `id` (UUID, Primary Key)
* `user_id` (FK → `users.id`)
* `pay_period` (String, e.g., "2026-08")
* `base_salary` (Decimal)
* `allowances` (Decimal)
* `deductions` (Decimal)
* `net_pay` (Decimal)
* `status` (`DRAFT` | `FINALIZED` | `PAID`)

---

## 🚀 Quick Start & Installation

### Prerequisites
* **Node.js**: `v18.x` or higher
* **npm** or **pnpm**
* **PostgreSQL**: `v14+` or Cloud Database URI

### 1. Repository Setup
```bash
git clone https://github.com/your-org/mybuddy-hrms.git
cd mybuddy-hrms
```

### 2. Environment Configuration
Copy the sample environment file and configure local variables:
```bash
cp .env.example .env
```
Ensure your `.env` contains:
```env
PORT=5000
DATABASE_URL="postgresql://user:password@localhost:5432/mybuddy_db?schema=public"
JWT_SECRET="your_jwt_secret_key_here"
JWT_EXPIRES_IN="1d"
GEOFENCE_LATITUDE=12.9716
GEOFENCE_LONGITUDE=77.5946
GEOFENCE_RADIUS_METERS=100
AWS_S3_BUCKET_NAME="mybuddy-uploads"
AWS_ACCESS_KEY_ID="your_aws_key"
AWS_SECRET_ACCESS_KEY="your_aws_secret"
```

### 3. Backend & Database Migration
```bash
# Install server dependencies
cd server
npm install

# Run database migrations
npx prisma migrate dev --name init

# Seed database with initial HR Admin account
npm run seed

# Start development server
npm run dev
```

### 4. Frontend Application Setup
```bash
# In a new terminal tab
cd client
npm install

# Start React/Next.js development frontend
npm run dev
```
Navigate to `http://localhost:3000` to access the application.

---

## 📡 API Endpoint Overview

### Auth Routes (`/api/v1/auth`)
* `POST /register` - Register a new employee/admin account
* `POST /login` - Authenticate user & issue session JWT
* `GET /me` - Fetch currently authenticated user context

### Profile Routes (`/api/v1/profile`)
* `GET /` - Fetch logged-in user profile details
* `PATCH /self` - Update personal profile data (`phone`, `address`, `photo`)
* `PATCH /admin/:id` - Admin route to update job, department, or salary

### Attendance Kiosk Routes (`/api/v1/attendance`)
* `POST /kiosk/check-in` - Submit webcam snapshot + GPS coordinates for verification
* `POST /kiosk/check-out` - Record shift check-out timestamp
* `GET /my-logs` - Retrieve personal attendance history
* `GET /admin/flagged` - List all entries requiring manual geofence approval
* `PATCH /admin/verify/:id` - Admin endpoint to approve or reject flagged logs

### Leave Routes (`/api/v1/leaves`)
* `POST /apply` - Submit new leave request
* `GET /my-requests` - Fetch status of submitted leave applications
* `GET /admin/queue` - Retrieve pending leave approvals queue
* `PATCH /admin/action/:id` - Approve or reject leave application

### Payroll Routes (`/api/v1/payroll`)
* `GET /my-payslips` - Fetch historical payslips for logged-in user
* `GET /admin/overview` - Admin workspace for payroll processing
* `PUT /admin/adjust/:id` - Update employee salary structure & re-calculate net pay

---

## 🛡️ Security & Compliance
* **Data Sanitization**: All incoming payload fields are sanitized using schema validators (Zod/Joi) to prevent SQL Injection & XSS.
* **Password Hashing**: Passwords stored using `bcrypt` with a minimum cost factor of 12.
* **CORS & Rate Limiting**: API routes protected with strict CORS policies and IP-based rate limiting on sensitive endpoints (`/auth/login`, `/kiosk/check-in`).

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.
