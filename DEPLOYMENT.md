# 🚀 Render Deployment Guide

This guide covers deploying the **Smart Leaving and Visitor Entry Management System** on Render.

---

## Option 1: Unified Web Service (Recommended & Simplest)

Since `backend/app.js` automatically serves the built frontend (`frontend/dist`) in production, you can deploy the entire application as a single **Render Web Service**.

### Step 1: Create a MongoDB Atlas Database
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create a free M0 cluster.
2. In **Database Access**, create a database user and password.
3. In **Network Access**, add `0.0.0.0/0` (Allow Access from Anywhere).
4. In **Database Deployments**, click **Connect** → **Drivers** and copy your connection string (`MONGODB_URI`).

### Step 2: Push Your Code to GitHub
Ensure your repository is pushed to GitHub or GitLab.

### Step 3: Create a Web Service on Render
1. Log in to [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** → **Web Service**.
3. Connect your repository.
4. Configure the service settings:
   - **Name**: `smart-campus-management`
   - **Environment**: `Node`
   - **Region**: `Singapore` (or nearest to your audience)
   - **Branch**: `main`
   - **Root Directory**: leave empty
   - **Build Command**:
     ```bash
     npm run install:all && npm run build
     ```
   - **Start Command**:
     ```bash
     npm start
     ```

### Step 4: Configure Environment Variables
Under **Environment Variables**, add:
| Key | Example Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `10000` *(Render sets this automatically)* |
| `MONGODB_URI` | `mongodb+srv://<user>:<password>@cluster0.mongodb.net/smart_leaving_db?retryWrites=true&w=majority` |
| `JWT_SECRET` | A private random value of at least 32 characters |
| `JWT_EXPIRES_IN` | `7d` |

### Step 5: Initial Data Seeding (Optional)
The seed command clears existing application records and should only be run against a disposable development database. It requires `SEED_ADMIN_PASSWORD`, `SEED_SECURITY_PASSWORD`, `SEED_STAFF_PASSWORD`, `SEED_STUDENT_PASSWORD`, and `SEED_STUDENT2_PASSWORD`, each at least 12 characters.
```bash
npm run seed
```

---

## Option 2: Split Architecture (Static Site + Web Service)

If you prefer separating the Frontend and Backend:

### Backend (Web Service)
- **Root Directory**: `backend`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Environment Variables**:
  - `NODE_ENV`: `production`
  - `MONGODB_URI`: `your_atlas_connection_string`
  - `JWT_SECRET`: a private random value of at least 32 characters
  - `FRONTEND_URL`: `https://your-frontend-site.onrender.com`

### Frontend (Static Site)
- **Root Directory**: `frontend`
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `dist`
- **Redirects / Rewrites**:
  - Add rewrite rule: `/*` → `/index.html` (Status: 200)
- **API Proxy**: Set `VITE_API_URL` to point to your deployed backend URL.

---

## 🔒 Post-Deployment Verification Checklist

1. Access your deployed Render URL:
   - [x] Landing page loads with dark navy blue & electric blue styling.
   - [x] Public registration (`/visitor-registration`) accepts submissions and returns a tracking ID.
   - [x] Student login loads the student dashboard.
   - [x] Admin login loads overview, approvals, reports, and logs.
   - [x] Security login loads the camera scanner and verification view.
   - [x] Healthcheck endpoint `/api/health` returns `{ "status": "healthy" }`.
