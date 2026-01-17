# Deployment Checklist

Use this checklist before deploying to ensure everything is ready.

## Pre-Deployment Checklist

### Backend (Railway)

- [ ] **Environment Variables Set:**
  - [ ] `ALLOWED_ORIGINS` - Set to your Vercel frontend URL (e.g., `https://your-app.vercel.app`)
  - [ ] `PORT` - Automatically set by Railway
  - [ ] `NODE_ENV` - Set to `production` (optional but recommended)

- [ ] **Railway Configuration:**
  - [ ] Root directory set to `podofo-be` (if monorepo)
  - [ ] Build command: Uses Dockerfile (includes Ghostscript)
  - [ ] Start command: `node server.js`

- [ ] **Ghostscript:**
  - [ ] Dockerfile includes Ghostscript installation
  - [ ] Verify build logs show Ghostscript installation

- [ ] **File Storage:**
  - [ ] `output/` directory exists (created in Dockerfile)
  - [ ] `uploads/` directory exists (created in Dockerfile)
  - [ ] Files are cleaned up after processing

- [ ] **Health Check:**
  - [ ] Test `/health` endpoint: `https://your-backend.railway.app/health`

### Frontend (Vercel)

- [ ] **Environment Variables Set:**
  - [ ] `VITE_API_URL` - Set to your Railway backend URL (e.g., `https://your-backend.railway.app`)

- [ ] **Vercel Configuration:**
  - [ ] Root directory set to `podofo-fe` (if monorepo)
  - [ ] Build command: `npm run build`
  - [ ] Output directory: `dist`

- [ ] **API Connection:**
  - [ ] Frontend can reach backend (no CORS errors)
  - [ ] Test with browser DevTools network tab

### Code Review

- [ ] **No Hardcoded URLs:**
  - [ ] All API calls use environment variables
  - [ ] No `localhost` or `127.0.0.1` in production code

- [ ] **Error Handling:**
  - [ ] All routes have error handling
  - [ ] Proper HTTP status codes returned
  - [ ] User-friendly error messages

- [ ] **File Upload Limits:**
  - [ ] Multer configured with reasonable limits (100MB)
  - [ ] Frontend can handle large file uploads

- [ ] **Security:**
  - [ ] CORS properly configured
  - [ ] No sensitive data in code
  - [ ] Environment variables used for configuration

## Post-Deployment Verification

### Backend Tests

1. **Health Check:**
   ```bash
   curl https://your-backend.railway.app/health
   ```
   Should return: `{"status":"ok","timestamp":"..."}`

2. **CORS Test:**
   ```bash
   curl -H "Origin: https://your-frontend.vercel.app" \
        -H "Access-Control-Request-Method: POST" \
        -X OPTIONS \
        https://your-backend.railway.app/api/pdf/merge
   ```
   Should return CORS headers

3. **Test Endpoint:**
   - Upload a small test PDF
   - Verify response is correct
   - Check Railway logs for errors

### Frontend Tests

1. **Load Application:**
   - Visit your Vercel URL
   - Check browser console for errors
   - Verify API calls are going to Railway backend

2. **Test Features:**
   - [ ] Merge PDFs
   - [ ] Split PDF
   - [ ] Compress PDF
   - [ ] PDF → Images
   - [ ] Images → PDF

3. **Error Handling:**
   - Test with invalid files
   - Test with missing files
   - Verify error messages display correctly

## Common Issues & Solutions

### Issue: CORS Errors
**Solution:** 
- Verify `ALLOWED_ORIGINS` includes exact frontend URL (with https://)
- Check Railway logs for CORS rejection messages
- Ensure no trailing slashes in URLs

### Issue: Ghostscript Not Found
**Solution:**
- Verify Dockerfile is being used in Railway
- Check Railway build logs for Ghostscript installation
- Ensure PATH includes Ghostscript binaries

### Issue: File Upload Fails
**Solution:**
- Check file size limits (max 100MB configured)
- Verify multer is configured correctly
- Check Railway logs for specific errors

### Issue: ZIP Files Won't Extract
**Solution:**
- Already fixed: ZIP files stream directly to response
- Verify Content-Type headers are set correctly
- Check browser download isn't corrupted

### Issue: Build Fails
**Solution:**
- Verify all dependencies in package.json
- Check Node.js version compatibility (using Node 20)
- Review build logs for specific errors

## Monitoring

### Railway Logs
- Monitor for errors
- Check Ghostscript execution logs
- Watch for file cleanup issues

### Vercel Logs
- Monitor build logs
- Check runtime errors
- Verify environment variables are set

### User Experience
- Monitor for CORS errors in browser console
- Check file download success rates
- Track error frequency

## Rollback Plan

If deployment fails:

1. **Backend:**
   - Revert to previous Railway deployment
   - Check environment variables
   - Review logs for errors

2. **Frontend:**
   - Revert to previous Vercel deployment
   - Verify environment variables
   - Test API connectivity

## Ready to Deploy?

If all checklist items are completed, you're ready to deploy! 🚀
