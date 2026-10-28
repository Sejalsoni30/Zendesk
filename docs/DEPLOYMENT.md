# Enterprise Deployment Guide

This guide details how to deploy the **Zendesk–Darwinbox–Box Support Workflow Automation Engine** to production.

---

## 🚀 Option 1: Vercel (Frontend) + Render (Backend) [Recommended]

This is the fastest, completely free, and most reliable setup:
- **Frontend:** Hosted on **Vercel** (Global Edge CDN, auto-builds on Git push).
- **Backend:** Hosted on **Render** (Node.js web service supporting WebSockets).

---

### Step 1: Deploy Backend to Render (2 mins)

1. Sign up or log into [Render.com](https://render.com) using your GitHub account.
2. Click **New +** → **Web Service**.
3. Select your repository: `Sejalsoni30/Zendesk`.
4. Configure the service settings:
   * **Name:** `zendesk-automation-backend`
   * **Region:** Any (e.g., Singapore or Oregon)
   * **Branch:** `main`
   * **Root Directory:** `backend`
   * **Runtime:** `Node`
   * **Build Command:** `npm install && npm run build`
   * **Start Command:** `node dist/server.js`
   * **Instance Type:** `Free`
5. Under **Environment Variables**, add:
   | Key | Value | Notes |
   | :--- | :--- | :--- |
   | `NODE_ENV` | `production` | Production mode |
   | `USE_MOCK_SERVICES` | `true` | Allows deployment without live vendor API keys |
   | `CORS_ORIGIN` | `*` | Permits frontend connections |
   | `ZENDESK_WEBHOOK_SECRET` | `demo_webhook_signing_secret_key_883399` | HMAC validation key |
6. Click **Create Web Service**.
7. Once deployed, copy your backend URL (e.g., `https://zendesk-automation-backend.onrender.com`).

---

### Step 2: Deploy Frontend to Vercel (1 min)

1. Log into [Vercel.com](https://vercel.com) using your GitHub account.
2. Click **Add New...** → **Project**.
3. Import the repository: `Sejalsoni30/Zendesk`.
4. Configure project settings:
   * **Framework Preset:** `Vite`
   * **Root Directory:** Click **Edit** and choose `frontend`.
   * **Build Command:** `npm run build`
   * **Output Directory:** `dist`
5. Under **Environment Variables**, add:
   | Key | Value |
   | :--- | :--- |
   | `VITE_BACKEND_URL` | `https://your-backend-app.onrender.com` (from Step 1) |
6. Click **Deploy**.
7. Your app is live! Vercel will provide an SSL-secured URL (e.g. `https://zendesk-automation.vercel.app`).

---

## 🛠️ Option 2: 1-Click Render Blueprint (`render.yaml`)

Both backend and frontend can be deployed automatically together using the included [`render.yaml`](../render.yaml):

1. Go to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** → **Blueprint**.
3. Connect `https://github.com/Sejalsoni30/Zendesk`.
4. Render automatically parses `render.yaml` and sets up:
   * `zendesk-automation-backend` (Node Web Service)
   * `zendesk-automation-frontend` (Static Site with SPA rewrites)
5. Click **Apply**.

---

## 🔒 Upstream Webhook Configuration

Once deployed, point your Zendesk Webhook trigger to your deployed endpoint:

* **Endpoint URL:** `https://your-backend-app.onrender.com/api/webhooks/zendesk`
* **HTTP Method:** `POST`
* **Secret Signing Key:** The value of `ZENDESK_WEBHOOK_SECRET`
* **Trigger Conditions:** Ticket Created / Ticket Updated with tag `hr_employee_support`.

---

## 🧪 Post-Deployment Verification Checklist

- [ ] Visit frontend URL: Ensure Landing Page loads and displays 99.99% SLA badge.
- [ ] Check WebSocket status in top bar: Should show green pulsating dot with **"Live Sync"**.
- [ ] Open Workspace: Simulate an inbound webhook event (`ZD-9001`) and verify instant real-time table update.
- [ ] Inspect modal: Verify Process Timeline, Zendesk Payload, and Audit Logs tabs render correctly.
- [ ] Role switcher test: Verify that switching to `Viewer` disables action buttons.

