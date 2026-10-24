# 🎓 Smart Leaving and Visitor Entry Management System

A full-stack, enterprise-grade **MERN** web platform designed for educational institutions to automate student campus exits (gate passes) and visitor/parent registrations with cryptographically secure QR code verification, time-locked audit logs, and automated role-based notifications.

---

## 🌟 Key Highlights & Architecture

- **Student Leaving Pass Management**: Real-time request creation, automatic timestamping (`Asia/Kolkata`), admin review, approval/rejection workflows, and dynamic digital QR pass generation.
- **Visitor & Parent Registration**: Public self-registration portal, status tracker, meeting person association, admin approval, and camera-based QR pass verification at security gates.
- **Role-Based Portals (RBAC)**:
  - 👑 **Admin Portal**: Executive KPI cards, student gate pass approvals, visitor approvals, live QR verification, CSV compliance reporting, and audit logs.
  - 🛡️ **Security Terminal**: Camera QR Scanner (`html5-qrcode`), instant student/visitor identity card lookup with photo match, and one-click exit/entry timestamp recording.
  - 🎓 **Student Portal**: New leaving pass request form, active pass banner, printable Digital QR Pass slip modal, historical logs, and profile overview.
  - 👨‍🏫 **Faculty & Staff Portal**: Scheduled visitor alerts, campus arrival notices, and meeting management.
- **Security & Privacy First**:
  - QR codes contain **opaque crypto-random tokens**—never raw personal information.
  - Rate limiting on public and auth endpoints (`express-rate-limit`).
  - Standardized Indian Standard Time (`Asia/Kolkata`) generated on the Express server.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18+ recommended)
- MongoDB Atlas or local MongoDB instance

### 1. Install Dependencies
```bash
npm run install:all
```

### 2. Environment Configuration
Copy `backend/.env.example` to `backend/.env` and configure:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/smart_leaving_visitor_db?retryWrites=true&w=majority
JWT_SECRET=<random-secret-at-least-32-characters>
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
```
The server requires `JWT_SECRET` to be at least 32 characters. Keep `.env` files private and do not commit them.

### 3. Seed Demo Records (Optional)
Set separate passwords of at least 12 characters for `SEED_ADMIN_PASSWORD`, `SEED_SECURITY_PASSWORD`, `SEED_STAFF_PASSWORD`, `SEED_STUDENT_PASSWORD`, and `SEED_STUDENT2_PASSWORD` in `backend/.env`, then run:
```bash
npm run seed
```
**Warning:** seeding clears the existing users, students, gate passes, visitors, notifications, and audit logs before creating demo records. Use only with a disposable development database.

### 4. Run Locally
Run both backend and frontend concurrently:
```bash
# Terminal 1: Backend API (Port 5000)
npm run server

# Terminal 2: Frontend Client (Port 5173)
npm run client
```

Open your browser at `http://localhost:5173`.

---

## 🌐 Deployment to Render

The system is pre-configured for deployment on Render. Follow the detailed step-by-step instructions in [DEPLOYMENT.md](file:///c:/Smart_Leaving_and_Visitor_Entry_Management_System/DEPLOYMENT.md).
