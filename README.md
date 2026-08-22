# MY BUDDY HRMS — Next.js Enterprise B2B SaaS Gateway

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18.3-blue?style=flat&logo=react)](https://react.js.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-teal?style=flat&logo=tailwindcss)](https://tailwindcss.com/)

A modern, enterprise-grade Human Resource Management System (HRMS) frontend built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and **Lucide Icons**.

---

## 📁 Sorted & Modular Project Architecture

Every component and utility has been separated into clean, single-responsibility files:

```text
MY-BUDDY-HRMS/
├── src/
│   ├── app/                               # Next.js App Router
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx             # Dedicated /login route with AuthCard
│   │   │   └── signup/page.tsx            # Dedicated /signup route with AuthCard
│   │   ├── dashboard/page.tsx             # Employee Workspace (/dashboard)
│   │   ├── admin/dashboard/page.tsx       # HR Admin Command Center (/admin/dashboard)
│   │   ├── kiosk/page.tsx                 # Smart Kiosk GPS + Camera Check-In
│   │   ├── leave/page.tsx                 # Time Off & Leave Management
│   │   ├── payroll/page.tsx               # Payslips & Salary Structure
│   │   ├── profile/page.tsx               # Employee Self-Service Profile
│   │   ├── directory/page.tsx             # Searchable Employee Directory
│   │   ├── globals.css                    # CSS Variables, Animations, Matte Zinc Tokens
│   │   ├── layout.tsx                     # Root Layout (ThemeProvider + AuthProvider)
│   │   └── page.tsx                       # Landing Gateway & Unified Auth Hero
│   │
│   ├── components/
│   │   ├── auth/
│   │   │   ├── AuthCard.tsx               # Unified responsive card with Sign In / Sign Up tabs
│   │   │   ├── SignInForm.tsx             # Sign In view with validation, eye toggles & shake error
│   │   │   └── SignUpForm.tsx             # Sign Up view capturing ID, names, role dropdown & email
│   │   │
│   │   ├── common/
│   │   │   ├── BrandLogo.tsx              # Adaptive Light/Dark Brand Identity Logo
│   │   │   └── ThemeToggle.tsx            # Accessible Sun/Moon Theme Switcher
│   │   │
│   │   ├── dashboard/
│   │   │   ├── Header.tsx                 # Global Topbar with Notifications, Profile, Role badge
│   │   │   ├── Sidebar.tsx                # Role-aware Sidebar with active link highlighting
│   │   │   ├── PageHeading.tsx            # Standardized page title header
│   │   │   ├── StatCard.tsx               # Metric and KPI counter cards
│   │   │   └── QuickAction.tsx            # Action workflow launcher tiles
│   │   │
│   │   └── modules/
│   │       ├── EmployeeDashboard.tsx      # Attendance hours breakdown & employee actions
│   │       ├── AdminDashboard.tsx         # HR Command, geofence exception review & leave approvals
│   │       ├── KioskModule.tsx            # Camera verification & GPS geofence checker (100m)
│   │       ├── LeaveModule.tsx            # Leave request form, balance progress bars & history
│   │       ├── PayrollModule.tsx          # Monthly payslip preview & download generator
│   │       ├── ProfileModule.tsx          # Organizational data & editable contact form
│   │       └── DirectoryModule.tsx        # Searchable workforce table with department filter
│   │
│   ├── context/
│   │   ├── AuthContext.tsx                # Auth state, login/signup actions & session persistence
│   │   └── ThemeContext.tsx               # Light/Dark mode state with HTML data-theme sync
│   │
│   ├── lib/
│   │   ├── auth.ts                        # JWT encoder/decoder, session extractor & LocalStore
│   │   ├── mock-data.ts                   # Seed users, initial leave requests, payrolls & directory
│   │   └── utils.ts                       # Currency and style utilities
│   │
│   └── types/
│       ├── auth.ts                        # User, UserRole, Session, JWT & form credential types
│       └── hrms.ts                        # Attendance, Leave, Payslip & Directory record models
│
├── archive/                               # Preserved legacy HTML/CSS prototypes
├── public/                                # Static assets and images
├── .env.example                           # Environment configuration template
├── .gitignore                             # Standard Next.js gitignore
├── next.config.mjs                        # Next.js build configuration
├── package.json                           # NPM dependencies and scripts
├── postcss.config.mjs                     # PostCSS with Tailwind plugin
├── tailwind.config.ts                     # Tailwind CSS design system with custom animations
└── tsconfig.json                          # TypeScript compiler config with @/* path aliases
```

---

## 🌟 Key Features

1. **Unified Responsive AuthCard**:
   - Clean tab switching between **Sign In** and **Sign Up**.
   - **Sign In View**: Corporate email and password with show/hide eye toggle, interactive field-level validation, loading spinner, and animated shake on invalid credentials.
   - **Sign Up View**: Captures `company_name`, `employee_id`, `first_name`, `last_name`, `email`, `phone`, `password`, `confirm_password`, and an **Account Role dropdown** (`EMPLOYEE` / `HR_ADMIN`).
   - **1-Click Demo Accounts**: Instant evaluation for both Employee and HR Admin roles.

2. **JWT Session & Role-Based Routing**:
   - Extracts JWT session payload upon successful sign in/up.
   - Automatically redirects `EMPLOYEE` to `/dashboard` and `HR_ADMIN` to `/admin/dashboard`.
   - Protected route middleware guards ensuring role access segregation.

3. **Dual-Factor Smart Kiosk Attendance**:
   - Facial snapshot simulation.
   - High-accuracy GPS telemetry with **100m geofence validation**.
   - Exception flagging for out-of-bounds check-ins requiring HR review.

4. **Leaves, Payroll & Directory**:
   - **Leave Management**: Leave requests with live accrued balance progress meters.
   - **Payroll**: Salary breakdowns formatted in Indian Rupees (INR) with PDF download action.
   - **Workforce Directory**: Searchable directory with department filtering.

5. **Adaptive Dark / Light Theme**:
   - Default Obsidian Matte Zinc dark mode with accessible Sun/Moon toggle.
   - Persistent theme state stored in `localStorage`.

---

## 🚀 Getting Started

### 1. Install Node.js
If not already installed on your system, install Node.js 18+ or 20+ (e.g. via Homebrew: `brew install node`).

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production
```bash
npm run build
npm run start
```

---

## 🔐 Default Demo Credentials

| Role | Email | Password | Employee ID | Target Dashboard |
|---|---|---|---|---|
| **HR Admin** | `sarah.admin@mybuddy.com` | `Admin@12345` | `ADM-001` | `/admin/dashboard` |
| **Employee** | `priya.nair@mybuddy.com` | `User@12345` | `EMP-1042` | `/dashboard` |
| **Employee** | `alex.morgan@mybuddy.com` | `User@12345` | `EMP-1043` | `/dashboard` |

*(You can also use the 1-Click Demo buttons on the Auth Card)*

---

## 🔌 Connecting to Your Real Backend API

To connect with your actual backend REST API:
1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Update the API base URL in `.env.local`:
   ```env
   NEXT_PUBLIC_API_BASE_URL="http://localhost:8000/api/v1"
   ```
3. The auth functions in `src/lib/auth.ts` (`loginUser`, `registerUser`) are ready to swap `localStorage` for `fetch(NEXT_PUBLIC_API_BASE_URL + '/auth/login', ...)` calls returning your backend's JWT token.
