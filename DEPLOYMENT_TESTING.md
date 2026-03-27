# Deployment & Testing Checklist

## Pre-Deployment Checklist

### Code Readiness
- [ ] All changes committed to Git
- [ ] No uncommitted files or conflicts
- [ ] Backend .env.example updated with all variables
- [ ] Frontend .env.example created/updated
- [ ] README.md updated with deployment instructions
- [ ] Dependencies are locked (package.json)

### Backend Testing (Local)
```bash
cd backend
npm install
npm run dev
# Test endpoints
curl http://localhost:3000/health
curl http://localhost:3000/test-db
```

- [ ] Backend starts without errors
- [ ] Database connection works
- [ ] All routes respond (check /ai-docs for API docs)

### Frontend Testing (Local)
```bash
cd frontend
npm install
npm run dev
# Visit http://localhost:5173
```

- [ ] Frontend loads without errors
- [ ] Can navigate between pages
- [ ] Forms work (Login, Signup)
- [ ] API calls connect to backend
- [ ] Responsive design on mobile (DevTools)

---

## Deployment Steps

### 1. Database Setup (Aiven)

```bash
# Verify Aiven MySQL is accessible
mysql -h your-host.aivencloud.com -u avnadmin -p
# Run migrations manually first (optional)
```

**Checklist**:
- [ ] Aiven account created
- [ ] MySQL service initialized
- [ ] Connection details saved securely
- [ ] CA certificate downloaded (if needed)

### 2. Create Render Backend Service

**Steps**:
1. Go to https://render.com/dashboard
2. Click **New +** → **Web Service**
3. Connect GitHub repository
4. Configure as per `render.yaml`
5. Add environment variables (see DEPLOYMENT_GUIDE.md)
6. Deploy

**Environment Variables to Add** (copy from vault/notes):
```
DB_HOST=your-aiven-host.aivencloud.com
DB_PORT=3306
DB_USER=avnadmin
DB_PASSWORD=your-password
DB_NAME=defaultdb
SMTP_HOST=smtp.sendgrid.net  (or smtp.gmail.com)
SMTP_PORT=587
SMTP_USER=apikey (or your-email@gmail.com)
SMTP_PASS=your-sendgrid-key (or gmail-app-password)
SMTP_FROM=noreply@yourdomain.com
API_URL=https://sharemeal-api.onrender.com
FRONTEND_URL=https://your-site.vercel.app
```

### 3. Create Vercel Frontend Service

**Steps**:
1. Go to https://vercel.com
2. Click **Add New** → **Project**
3. Import GitHub repository
4. Set Root Directory: `frontend`
5. Add environment variables:
   ```
   VITE_API_URL=https://sharemeal-api.onrender.com
   ```
6. Deploy

### 4. Test Backend Endpoint

```bash
# Test health check
curl https://sharemeal-api.onrender.com/health

# Test database
curl https://sharemeal-api.onrender.com/test-db

# Expected responses:
# {"status":"ok","service":"shareameal-api",...}
# {"success":true,"data":[...]}
```

**Checklist**:
- [ ] Backend health check responds
- [ ] Database test passes
- [ ] No error logs in Render dashboard

### 5. Test Frontend Deployment

```bash
# Visit your Vercel domain
https://your-site.vercel.app
```

**Checklist**:
- [ ] Page loads without 404 errors
- [ ] Can navigate between pages
- [ ] Logo and styling load correctly
- [ ] No CORS errors in browser console

### 6. Test User Authentication Flow

**Steps**:
1. Go to https://your-site.vercel.app/signup
2. Create new account (SME/NGO/Sponsor)
3. Check email for verification link (check spam)
4. Verify email (if implemented)
5. Login with credentials
6. Should redirect to appropriate dashboard

**Checklist**:
- [ ] Signup form submits without errors
- [ ] Email sent (check inbox/spam)
- [ ] Email verification link works (if enabled)
- [ ] Can login with credentials
- [ ] Redirects to correct dashboard
- [ ] Token stored in localStorage

### 7. Test API Integration

**From Frontend Dashboard**:
1. SME creates meal
2. View created meal in list
3. NGO searches and claims meal
4. SME sees meal status change
5. NGO picks up meal

**Checklist**:
- [ ] No API errors in browser console
- [ ] Data displays correctly
- [ ] State updates in real-time
- [ ] Error messages displayed properly

### 8. Test AI/Prediction Endpoint (Optional)

If ML service deployed:

```bash
curl -X POST https://sharemeal-api.onrender.com/api/ai/meal/1/predict \
  -H "Authorization: Bearer SERVICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"features": [1.0, 2.0, 3.0, 4.0]}'
```

**Checklist**:
- [ ] ML service endpoint responds
- [ ] Prediction format correct
- [ ] Can update meal status with predictions

---

## Post-Deployment Validation

### Performance
```bash
# Frontend Lighthouse
# In browser DevTools → Lighthouse → Analyze

# Backend response time
time curl https://sharemeal-api.onrender.com/health
```

**Targets**:
- [ ] Lighthouse score > 80
- [ ] API response time < 500ms
- [ ] No memory leaks (check Render metrics)

### Logs & Monitoring

**Render Logs**:
- [ ] No error messages
- [ ] No 500 status codes
- [ ] Database connections stable

**Vercel Logs**:
- [ ] No build errors
- [ ] No runtime errors
- [ ] Analytics dashboard working

### Security Check

```bash
# Test CORS
curl -H "Origin: https://your-site.vercel.app" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: content-type" \
  -X OPTIONS https://sharemeal-api.onrender.com/

# Should return 200 with proper CORS headers
```

**Checklist**:
- [ ] CORS properly configured
- [ ] No sensitive data in logs/error messages
- [ ] JWT tokens working correctly
- [ ] Password storage secure (hashed)
- [ ] SQL injection prevention working

---

## Troubleshooting

### Backend Won't Start
1. Check Render logs: Dashboard → Service → Logs
2. Common issues:
   - Database connection timeout: Aiven host/credentials wrong
   - Migration error: Database schema mismatch
   - Missing env var: Check environment variables dashboard

### Frontend Can't Reach API
1. Check browser console (F12 → Network/Console tab)
2. Verify `VITE_API_URL` is correct in Vercel
3. Check CORS error: See Security Check above
4. Check backend is running: curl backend health endpoint

### Email Verification Not Working
1. Check SMTP settings are correct
2. Check Render logs for email errors
3. Verify email isn't in spam folder
4. Test with simple curl command (advanced users)

### Database Full/Slow
1. Check Aiven disk usage in dashboard
2. Run `ANALYZE` on tables (MySQL)
3. Check for duplicate data in migrations
4. Consider upgrading to paid tier if needed

---

## Monitoring & Alerts

### Set Up Uptime Monitoring

**Option 1: UptimeRobot (Free)**
1. Go to https://uptimerobot.com
2. Create monitor for:
   - `https://sharemeal-api.onrender.com/health`
   - `https://your-site.vercel.app`
3. Set email alerts

**Option 2: Render's Built-in**
- Render notifications → Email alerts for failures

### Regular Maintenance

- [ ] Weekly: Check error logs
- [ ] Monthly: Review database size
- [ ] Monthly: Check dependency updates
- [ ] Quarterly: Review security vulnerabilities

---

## Success Criteria

✅ All tests passing? You're live!

- [ ] User can register successfully
- [ ] User can login successfully
- [ ] User can create meals (SME)
- [ ] User can browse meals (NGO)
- [ ] User can sponsor meals (Sponsor)
- [ ] API responds within 500ms
- [ ] No errors in logs
- [ ] CORS working correctly
- [ ] Email notifications working

---

## Next Steps

1. **Post-launch**:
   - Monitor logs for first 24 hours
   - Test with real users
   - Gather feedback

2. **Optimization**:
   - Implement caching for API responses
   - Add database indexes for slow queries
   - Consider CDN for static assets

3. **Features**:
   - Implement push notifications
   - Add real-time meal updates (WebSocket)
   - Analytics dashboard
   - Mobile app

---

## Support & Resources

- [Render Docs](https://render.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [Aiven Docs](https://docs.aiven.io/)
- [Express.js Docs](https://expressjs.com/)
- [React Docs](https://react.dev/)

