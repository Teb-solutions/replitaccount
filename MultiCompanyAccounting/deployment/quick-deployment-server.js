import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import session from 'express-session';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(cookieParser());

// CORS configuration
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') res.sendStatus(200);
  else next();
});

// Session configuration
app.use(session({
  secret: 'accounting-app-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }
}));

// Authentication endpoints
app.get('/api/auth/me', (req, res) => {
  res.json({
    authenticated: true,
    user: {
      id: 2,
      email: "anuradha.k@tebs.co.in",
      name: "tebs",
      role: "admin",
      tenantId: 2,
      tenantName: "tebs"
    }
  });
});

// Basic API endpoints for testing
app.get('/health', (req, res) => {
  res.json({
    message: 'Multi-Company Accounting System',
    version: '1.0.0',
    status: 'running',
    port: PORT,
    endpoints: {
      ui: '/',
      api: '/api/*',
      health: '/health'
    }
  });
});

// Proxy API calls to main server on port 5000
app.use('/api', async (req, res) => {
  try {
    const fetch = (await import('node-fetch')).default;
    const targetUrl = `http://localhost:5000${req.path}`;
    const queryString = Object.keys(req.query).length ? '?' + new URLSearchParams(req.query).toString() : '';
    
    const response = await fetch(targetUrl + queryString, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    });
    
    const data = await response.text();
    res.status(response.status).send(data);
  } catch (error) {
    res.status(500).json({ 
      error: 'API proxy failed', 
      message: 'Ensure main server is running on port 5000',
      details: error.message 
    });
  }
});

// Serve static files from client directory
app.use(express.static(path.join(__dirname, '../client')));

// Handle React routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Deployment server running on http://localhost:${PORT}`);
  console.log('React UI served from client directory');
  console.log('API calls proxied to main server on port 5000');
});