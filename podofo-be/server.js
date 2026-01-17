import express from "express";
import cors from "cors";
import pdfRoutes from "./routes/pdfRoutes.js";

const app = express();

// CORS configuration - allow frontend origin
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:5173', 'http://localhost:3000', 'https://podofo.vercel.app'];

// Log allowed origins for debugging
console.log('Allowed CORS origins:', allowedOrigins);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl, etc.)
    if (!origin) {
      console.log('CORS: No origin header, allowing request');
      return callback(null, true);
    }
    
    // Check if wildcard is set (allow all)
    if (allowedOrigins.includes('*')) {
      console.log(`CORS: Wildcard enabled, allowing origin: ${origin}`);
      return callback(null, true);
    }
    
    // Check if origin is explicitly allowed
    if (allowedOrigins.includes(origin)) {
      console.log(`CORS: Origin allowed: ${origin}`);
      return callback(null, true);
    }
    
    // In development, allow localhost even if not in ALLOWED_ORIGINS
    const isDevelopment = process.env.NODE_ENV !== 'production';
    if (isDevelopment && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
      console.log(`CORS: Development mode, allowing localhost: ${origin}`);
      return callback(null, true);
    }
    
    // Origin not allowed
    console.error(`CORS: Origin not allowed: ${origin}`);
    console.error(`CORS: Allowed origins: ${allowedOrigins.join(', ')}`);
    callback(new Error(`CORS: Origin ${origin} not allowed. Allowed origins: ${allowedOrigins.join(', ')}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Original-Size', 'X-Compressed-Size'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/pdf", pdfRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`PDF server running on port ${PORT}`);
});
