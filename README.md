# Podofo - PDF Tools

A Windows 95-style web application for PDF manipulation built with React and Node.js.

## Features

- **Merge PDFs**: Combine multiple PDFs in custom order with drag-and-drop reordering
- **Split PDF**: Split by all pages, custom ranges, or fixed page counts
- **Compress PDF**: Reduce file size with selectable quality settings
- **PDF → Images**: Convert PDF pages to images with DPI selection (ZIP output)
- **Images → PDF**: Convert multiple images to PDF preserving order

## Prerequisites

### Ghostscript Installation (Required)

Ghostscript is required for PDF compression and PDF-to-image conversion.

#### Windows

1. Download Ghostscript from: https://www.ghostscript.com/download/gsdnld.html
2. Install the Windows installer (gswin64c.exe or gswin32c.exe)
3. During installation, ensure "Add Ghostscript to PATH" is checked
4. Verify installation:
   ```cmd
   gswin64c.exe --version
   ```

#### Linux / macOS

```bash
# Ubuntu/Debian
sudo apt-get install ghostscript

# macOS (with Homebrew)
brew install ghostscript

# Verify installation
gs --version
```

## Installation

### Backend

```bash
cd podofo-be
npm install
npm start
```

The backend server will run on `http://localhost:5000`

### Frontend

```bash
cd podofo-fe
npm install
npm run dev
```

The frontend will run on `http://localhost:5173`

## Usage

1. Open `http://localhost:5173` in your browser
2. Select a tool from the tabs
3. Upload files using drag-and-drop or click to browse
4. Configure options (for split, compress, and PDF→Images)
5. Click the action button to process
6. Files will download automatically when processing completes

## Technical Details

- **Frontend**: React (Vite), Windows 95-style CSS
- **Backend**: Node.js + Express
- **PDF Processing**: pdf-lib, Ghostscript (CLI)
- **ZIP Creation**: archiver
- **File Upload**: multer

## Output Location

- **Server-side**: `podofo-be/output/` (temporary files)
- **Client-side**: Browser's default Downloads folder

## Notes

- All operations produce downloadable files (PDF or ZIP)
- Temporary files are cleaned up after download
- Ghostscript must be installed and accessible in PATH for compression and PDF→Images features

## Deployment

### Frontend Deployment (Vercel)

1. **Install Vercel CLI** (optional):
   ```bash
   npm i -g vercel
   ```

2. **Deploy to Vercel**:
   ```bash
   cd podofo-fe
   vercel
   ```

   Or connect your GitHub repository to Vercel through the [Vercel Dashboard](https://vercel.com).

3. **Set Environment Variables** in Vercel Dashboard:
   - `VITE_API_URL`: Your backend URL (e.g., `https://your-backend.railway.app`)

4. **Redeploy** after setting environment variables.

### Backend Deployment (Railway)

1. **Install Railway CLI** (optional):
   ```bash
   npm i -g @railway/cli
   ```

2. **Deploy to Railway**:
   ```bash
   cd podofo-be
   railway login
   railway init
   railway up
   ```

   Or connect your GitHub repository through the [Railway Dashboard](https://railway.app).

3. **Set Environment Variables** in Railway Dashboard:
   - `PORT`: Railway sets this automatically
   - `ALLOWED_ORIGINS`: Comma-separated list of allowed origins (e.g., `https://your-frontend.vercel.app`)
   - **Note**: Railway doesn't include Ghostscript by default. You'll need to:
     - Use a Railway Nixpacks buildpack that includes Ghostscript
     - Or use a Dockerfile with Ghostscript pre-installed

4. **Configure Ghostscript for Railway**:
   Railway uses Ubuntu-based containers. Add Ghostscript installation:
   - Option 1: Add to `railway.json` build command
   - Option 2: Use a `Dockerfile` with `apt-get install ghostscript`

5. **Get your Railway URL**:
   After deployment, Railway provides a URL like `https://your-app.railway.app`
   Set this as `VITE_API_URL` in your Vercel frontend environment variables.

### Environment Variables Reference

#### Frontend (.env or Vercel Environment Variables):
```
VITE_API_URL=https://your-backend.railway.app
```

#### Backend (Railway Environment Variables):
```
PORT=5000  # Automatically set by Railway
ALLOWED_ORIGINS=https://your-frontend.vercel.app,http://localhost:5173
```

### Troubleshooting

- **CORS Errors**: Ensure `ALLOWED_ORIGINS` in backend includes your frontend URL
- **Ghostscript Not Found**: Ensure Ghostscript is installed in Railway container (requires Dockerfile or Nixpacks configuration)
- **File Upload Size Limits**: Vercel and Railway have limits; large files may need configuration adjustments
