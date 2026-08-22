# MY BUDDY HRMS — Full Stack Human Resource Management System

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18.3-blue?style=flat&logo=react)](https://react.js.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-teal?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![Python](https://img.shields.io/badge/Python-FastAPI-green?style=flat&logo=python)](https://fastapi.tiangolo.com/)

A modern, enterprise-grade Human Resource Management System (HRMS) featuring a minimalist **Next.js** authentication gateway with light/dark adaptive brand logos, dual-factor verified kiosk attendance, role-based access control, leaves, payroll, and backend services.

---

## 🎨 Brand Color Scheme

| Role | Color Name | Hex Code | Purpose |
|---|---|---|---|
| **Primary Brand** | **Teal / Cyan** | `#0D9488` / `#14B8A6` | Brand logo line art, primary CTA buttons (`SIGN IN`, `Sign Up`), focus rings |
| **Brand Hover** | **Deep Teal** | `#0F766E` / `#0B7A6E` | Button hover and active press states |
| **Secondary Brand** | **Deep Navy** | `#0B192C` | Light-mode wordmark typography and primary headers |
| **Dark Theme Bg** | **Matte Obsidian** | `#09090B` / `#121215` | Minimalist dark canvas and elevated card surfaces |
| **Light Theme Bg** | **Clean Slate** | `#F8FAFC` / `#FFFFFF` | Soft light canvas and crisp white card surfaces |

---

## 📁 Repository Structure

```text
MY-BUDDY-HRMS/
├── backend/                               # Python FastAPI backend services
│   ├── config.py
│   ├── database.py
│   ├── models.py
│   ├── routes/
│   │   ├── auth.py
│   │   ├── attendance.py
│   │   ├── leave.py
│   │   └── payroll.py
│   └── schemas.py
│
├── src/                                   # Next.js Frontend Application
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx             # Dedicated /login route
│   │   │   └── signup/page.tsx            # Dedicated /signup route
│   │   ├── globals.css                    # Theme tokens & animations
│   │   ├── layout.tsx                     # Root layout & providers
│   │   └── page.tsx                       # Main gateway (Company Intro left + Auth Card right)
│   │
│   ├── components/
│   │   ├── auth/
│   │   │   ├── AuthCard.tsx               # Minimal card with tabbed Sign In / Sign Up toggle
│   │   │   ├── SignInForm.tsx             # Sign In view (Login Id/Email :-, Password :-)
│   │   │   └── SignUpForm.tsx             # Sign Up view (Company Name :- + Logo upload, etc.)
│   │   └── common/
│   │       ├── BrandLogo.tsx              # Adaptive transparent logo (Light & Dark)
│   │       └── ThemeToggle.tsx            # Top-right Sun/Moon theme switcher
│   │
│   ├── context/
│   │   ├── AuthContext.tsx                # Authentication state management
│   │   └── ThemeContext.tsx               # Dark/Light mode theme provider
│   │
│   ├── lib/
│   │   └── auth.ts                        # JWT token handling & local storage store
│   └── types/
│       └── auth.ts                        # TypeScript types
│
├── public/
│   ├── logo_light.png                     # Transparent light-mode logo
│   └── logo_dark.png                      # Transparent dark-mode logo
│
├── .env.example                           # Environment configuration template
├── .gitignore                             # Combined gitignore
├── next.config.mjs                        # Next.js configuration
├── package.json                           # Frontend dependencies & scripts
├── requirements.txt                       # Python backend dependencies
├── tailwind.config.ts                     # Tailwind CSS design system
└── tsconfig.json                          # TypeScript configuration
```

---

## 🚀 Getting Started

### Frontend (Next.js)

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Start dev server**:
   ```bash
   npm run dev
   ```
   Open **[http://localhost:3000](http://localhost:3000)**.

### Backend (FastAPI)

1. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
2. **Start backend server**:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
