# CORS Error Fix

## Problem
Error: `CORS: Origin https://podofo.vercel.app not allowed`

## Solution

The backend needs to have your Vercel frontend URL in the `ALLOWED_ORIGINS` environment variable.

### Step 1: Update Railway Environment Variable

1. Go to your Railway dashboard
2. Select your backend service
3. Go to "Variables" tab
4. Set or update `ALLOWED_ORIGINS`:

```
ALLOWED_ORIGINS=https://podofo.vercel.app
```

Or if you have multiple origins (including localhost for testing):

```
ALLOWED_ORIGINS=https://podofo.vercel.app,http://localhost:5173
```

### Step 2: Restart Railway Service

After updating the environment variable:
1. Click "Deployments" in Railway
2. Click "Redeploy" or restart the service

### Step 3: Verify Fix

1. Check Railway logs - you should see:
   ```
   Allowed CORS origins: [ 'https://podofo.vercel.app' ]
   ```

2. Test from your frontend:
   - Visit https://podofo.vercel.app
   - Open browser DevTools Console
   - Try uploading a PDF
   - Should no longer see CORS errors

## Alternative: Allow All Origins (Development Only)

⚠️ **Not recommended for production**, but if you want to allow all origins temporarily:

Set in Railway:
```
ALLOWED_ORIGINS=*
```

This will allow any origin to access your backend.

## Debugging

The updated server.js now logs CORS decisions:
- Check Railway logs for: `CORS: Origin allowed: ...` or `CORS: Origin not allowed: ...`
- This helps identify what origins are being checked

## After Fix

Your CORS configuration should work correctly. The backend will:
- Allow requests from `https://podofo.vercel.app`
- Allow requests with no origin (Postman, curl, etc.)
- Block requests from other origins (in production mode)
