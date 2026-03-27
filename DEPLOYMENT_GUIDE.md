# ShareAMeal Deployment Guide (Render + Vercel)

This guide walks you through deploying the ShareAMeal application on Render (backend) and Vercel (frontend) with free tier services.

---

## ⚡ QUICK: Redeploying to Existing Services (Same URLs)

**If you already have services running and want to update with new code:**

### **Render Backend (Same URL)**
1. Push code to GitHub: `git add . && git commit -m "update" && git push`
2. Go to https://render.com/dashboard
3. Click your `sharemeal-api` service
4. Click **Manual Deploy** → **Deploy latest commit**
5. Wait for build to complete
6. URL stays: `https://sharemeal-api.onrender.com`

### **Vercel Frontend (Same URL)**
1. Push code to GitHub: `git add . && git commit -m "update" && git push`
2. Vercel auto-detects and auto-deploys
3. Check https://vercel.com/dashboard to see build status
4. URL stays: `https://share-a-meal-1p8k.vercel.app`

**That's it!** No env var updates needed, same URLs reused.

---

## Prerequisites

- GitHub account with the project repository pushed
- Aiven account (free tier: https://aiven.io) for MySQL database
- Render account (https://render.com)
- Vercel account (https://vercel.com)
- SendGrid or Gmail account for email service

## Part 1: Database Setup (Aiven - FREE)

### 1.1 Create Aiven MySQL Database

1. Go to https://aiven.io and sign up (free tier available)
2. Create a new MySQL service:
   - Choose **Startup-4** (free tier)
   - Select **Oregon** region (matches Render)
   - Name: `sharemeal-db`
3. Once created, note these connection details from the dashboard:
   - **Host**: `xxx.aivencloud.com`
   - **Port**: `3306`
   - **Username**: `avnadmin`
   - **Password**: (displayed once, copy it!)
   - **Database**: `defaultdb`

4. Download the CA Certificate:
   - In Aiven dashboard, go to Connection info
   - Download the CA certificate (save as `ca.pem`)

### 1.2 Test Local Connection (Optional)

```bash
mysql -h your-aiven-host.aivencloud.com -u avnadmin -p -D defaultdb
# Enter password when prompted
```

If you get `ERROR 2003`: Aiven may be initializing. Wait 5-10 minutes.

---

## Part 2: Backend Deployment (Render)

### 2.1 Push Code to GitHub

```bash
# From project root
git add .
git commit -m "chore: prepare for Render deployment"
git push origin main
```

### 2.2 Connect to Render

1. Go to https://render.com and sign up
2. Click **New +** → **Web Service**
3. Select your GitHub repository `share-a-meal`
4. Configure:
   - **Name**: `sharemeal-api`
   - **Environment**: `node`
   - **Build Command**: `cd backend && npm ci && npm run migrate-prod`
   - **Start Command**: `cd backend && npm start`
   - **Plan**: Free

### 2.3 Add Environment Variables in Render Dashboard

In Render dashboard for your service, go to **Environment** and add:

```
NODE_ENV=production
PORT=3000
DB_HOST=your-aiven-host.aivencloud.com
DB_PORT=3306
DB_USER=avnadmin
DB_PASSWORD=your-aiven-password
DB_NAME=defaultdb
DB_SSL=true
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM=noreply@yourdomain.com
API_URL=https://sharemeal-api.onrender.com
FRONTEND_URL=https://your-frontend.vercel.app
MODEL_URL=https://your-model-url.com/model.pkl (if using ML)
```

**Note**: Render will auto-generate `JWT_SECRET` and `SERVICE_TOKEN`

### 2.4 Deploy

1. Click **Deploy**
2. Watch the build logs
3. Once deployed, visit: `https://sharemeal-api.onrender.com/health`
4. Should see: `{"status":"ok","service":"shareameal-api",...}`

---

## Part 3: Frontend Deployment (Vercel)

### 3.1 Connect to Vercel

1. Go to https://vercel.com and sign up
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. Configure:
   - **Framework**: Vite
   - **Root Directory**: `frontend`

### 3.2 Add Environment Variables

In Vercel dashboard, go to **Settings** → **Environment Variables**:

```
VITE_API_URL=https://sharemeal-api.onrender.com
```

### 3.3 Deploy

1. Click **Deploy**
2. Wait for build to complete
3. Visit your frontend URL: `https://your-app.vercel.app`

### 3.4 Update Backend with Frontend URL

In Render dashboard:
- Update `FRONTEND_URL` to your Vercel domain
- Trigger a redeploy

---

## Part 4: Email Service Setup

### Option A: SendGrid (Recommended)

1. Go to https://sendgrid.com and sign up (free tier: 100 emails/day)
2. Create API key:
   - **Settings** → **API Keys** → **Create API Key**
   - Name: `sharemeal-prod`
   - Copy the key
3. In Render, set:
   ```
   SMTP_HOST=smtp.sendgrid.net
   SMTP_USER=apikey
   SMTP_PASS=your-api-key
   SMTP_FROM=noreply@yourdomain.com
   ```

### Option B: Gmail

1. Enable 2-Factor Authentication on Gmail account
2. Create App Password:
   - Go to https://myaccount.google.com/apppasswords
   - Select Mail → Windows/Mac/Linux
   - Copy generated password
3. In Render, set:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_USER=your-gmail@gmail.com
   SMTP_PASS=your-app-password
   SMTP_FROM=your-gmail@gmail.com
   ```

---

## Part 5: AI/ML Service (Optional)

### 5.1 Deploy Python ML Service

The ML model service is optional. To set it up:

1. Create a separate Render Web Service for the Python app
2. Configure:
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r backend/ml/requirements.txt`
   - **Start Command**: `python -m uvicorn backend.ml.model_service:app --host 0.0.0.0 --port 10000`

3. Set `MODEL_URL` in backend to point to this service

---

## Part 6: Health Checks & Monitoring

### Check Backend Health

```bash
curl https://sharemeal-api.onrender.com/health
curl https://sharemeal-api.onrender.com/test-db
```

### View Logs

**Render**: Dashboard → Service → Logs (bottom of screen)

**Vercel**: Dashboard → Deployments → Select deployment → View logs

### Monitor Database

In Aiven dashboard:
- **Metrics** tab shows disk usage, connections
- **Logs** tab for database errors

---

## Troubleshooting

### Backend won't start
- Check Render logs: **Settings** → **Build & Deploy Logs**
- Common issues:
  - Database connection: Verify `DB_HOST`, `DB_USER`, `DB_PASSWORD`
  - Migration errors: Check `scripts/migrate.js` compatibility
  - Missing env vars: See "Add Environment Variables" section

### Frontend can't reach API
- Check `VITE_API_URL` in Vercel environment variables
- Verify backend `CORS` settings in `src/config/cors.js`
- Check browser console for errors

### Database connection timeout
- Aiven initialization can take 5-10 minutes
- Check Aiven dashboard status
- Verify firewall/IP allowlist in Aiven

### Model service not working
- Verify `MODEL_URL` is accessible
- Check Python service logs
- Ensure model file is downloadable

---

## Costs (as of 2024)

- **Render**: Free (backend, 0.5GB RAM, pauses after 15 mins inactivity)
- **Vercel**: Free (frontend)
- **Aiven MySQL**: Free (1GB, Startup-4 tier)
- **SendGrid**: Free (100 emails/day)
- **Total**: $0/month (if email volume stays under 100/day)

---

## Next Steps

1. Test user registration and email verification
2. Test meals creation and claiming
3. Monitor logs for any issues
4. Set up uptime monitoring (https://uptimerobot.com)
5. Configure Aiven backups for production data

---

## Support

For deployment issues:
- Check Render logs
- Verify all environment variables are set
- Ensure GitHub repo is up to date
- Test locally with `npm run dev` first

