# Deployment Guide

Quick reference for deploying Podofo to Vercel (frontend) and Railway (backend).

## Quick Start

### 1. Backend (Railway)

**Option A: Using Railway Dashboard**
1. Go to [Railway.app](https://railway.app) and sign in
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your `podofo-be` repository (or root repo with `podofo-be` folder)
4. Set root directory to `podofo-be` if deploying from monorepo
5. Railway will auto-detect Dockerfile
6. Set environment variables:
   ```
   ALLOWED_ORIGINS=https://your-frontend.vercel.app
   ```
7. Get your Railway URL (e.g., `https://your-app.railway.app`)

**Option B: Using Railway CLI**
```bash
cd podofo-be
railway login
railway init
railway up
```

### 2. Frontend (Vercel)

**Option A: Using Vercel Dashboard**
1. Go to [Vercel.com](https://vercel.com) and sign in
2. Click "Add New" → "Project"
3. Import your `podofo-fe` repository
4. Set root directory to `podofo-fe` if needed
5. Set environment variables:
   ```
   VITE_API_URL=https://your-backend.railway.app
   ```
6. Deploy!

**Option B: Using Vercel CLI**
```bash
cd podofo-fe
vercel
# Follow prompts, set VITE_API_URL when asked
```

## Environment Variables

### Frontend (Vercel)
```
VITE_API_URL=https://your-backend.railway.app
```

### Backend (Railway)
```
ALLOWED_ORIGINS=https://your-frontend.vercel.app
PORT=5000  # Auto-set by Railway
```

## Important Notes

### Ghostscript on Railway
Railway doesn't include Ghostscript by default. The `Dockerfile` includes Ghostscript installation, so make sure Railway uses the Dockerfile for deployment.

If not using Dockerfile, add Ghostscript to your build command:
```bash
apt-get update && apt-get install -y ghostscript && npm install && npm start
```

### CORS Configuration
After deploying both:
1. Copy your Vercel frontend URL
2. Set `ALLOWED_ORIGINS` in Railway to include the Vercel URL
3. Restart the Railway service

### File Size Limits
- **Vercel**: 50MB per file (can be increased with configuration)
- **Railway**: 256MB per deployment

For larger files, consider:
- Using Vercel Pro for larger limits
- Implementing chunked uploads
- Using external storage (S3, Cloudflare R2)

## Testing Deployment

1. **Test Backend Health**:
   ```bash
   curl https://your-backend.railway.app/health
   ```

2. **Test Frontend**:
   Visit `https://your-frontend.vercel.app` and check browser console for API errors

3. **Test Endpoint**:
   Try a simple operation (e.g., merge two small PDFs)

## Troubleshooting

### "Ghostscript not found" Error
- Ensure Dockerfile is being used in Railway
- Check Railway build logs for Ghostscript installation
- Verify PATH includes Ghostscript binaries

### CORS Errors
- Verify `ALLOWED_ORIGINS` includes exact frontend URL (with https://)
- Check Railway logs for CORS-related errors
- Ensure frontend URL has no trailing slash

### Connection Refused
- Verify `VITE_API_URL` is set correctly in Vercel
- Check Railway service is running (green status)
- Test backend health endpoint directly

### Build Failures
- Check Node.js version compatibility
- Verify all dependencies are in `package.json`
- Review build logs for specific errors

## Monorepo Deployment

If your repo has both `podofo-fe` and `podofo-be`:

**Vercel**: Set root directory to `podofo-fe`
**Railway**: Set root directory to `podofo-be`

Or create separate repositories for each and deploy independently.
