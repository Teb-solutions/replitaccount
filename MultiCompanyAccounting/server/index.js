import express from "express";
import { registerRoutes } from "./routes.js";
import productApiFixRouter from './product-api-fix.js';
import swaggerRouter from './swagger.js';
import { setupVite, serveStatic, log } from "./vite.js";
import { applyDeploymentFixes } from "../deployment/deployment-fixes.js";
import { applyNodeJSFixes } from "../deployment/nodejs-compatibility-fixes.js";
import session from 'express-session';
import cookieParser from 'cookie-parser';
// Add passport for authentication
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
// Import logger for HTTP request tracking (will be added after fixing module issues)

const app = express();

// Production-ready middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(cookieParser());

// CORS configuration for all environments including Windows IIS
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const host = req.get('host');
  
  // Allow same-origin requests and common deployment scenarios
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Production-ready session configuration
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'default-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
};

app.use(session(sessionConfig));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Simple user serialization/deserialization
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  // Simple user object for demo purposes
  done(null, { id: id, name: 'Test User' });
});

// Local strategy for authentication
passport.use(new LocalStrategy(
  (username, password, done) => {
    // Simple authentication for demo purposes
    if (username === 'admin' && password === 'admin') {
      return done(null, { id: 1, username: 'admin' });
    }
    return done(null, false);
  }
));

// Apply deployment fixes
applyDeploymentFixes(app);
applyNodeJSFixes(app);

// Mount Swagger documentation
app.use('/', swaggerRouter);
console.log('✅ Swagger API documentation mounted at /api-docs');

/**
 * @swagger
 * /api/test:
 *   get:
 *     summary: Test endpoint
 *     tags: [System]
 *     responses:
 *       200:
 *         description: System status
 */
app.get('/api/test', (req, res) => {
  res.json({ status: 'OK', message: 'Multi-Company Accounting API is running' });
});

/**
 * @swagger
 * /api/companies:
 *   get:
 *     summary: Get all companies
 *     tags: [Companies]
 *     responses:
 *       200:
 *         description: List of all companies
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   code:
 *                     type: string
 *                   company_type:
 *                     type: string
 *                   address:
 *                     type: string
 *                   phone:
 *                     type: string
 *                   email:
 *                     type: string
 *                   tax_id:
 *                     type: string
 *                   industry:
 *                     type: string
 *                   base_currency:
 *                     type: string
 *                   tenant_id:
 *                     type: integer
 *       500:
 *         description: Server error
 */
app.get('/api/companies', async (req, res) => {
  try {
    console.log('🔍 API: /api/companies requested - FIXED ENDPOINT');
    
    // Import the database pool
    const { pool } = await import('./database-checker.js');
    
    const result = await pool.query(`
      SELECT id, name, code, company_type, address, phone, email, 
             tax_id, industry, base_currency, tenant_id, created_at, updated_at
      FROM companies 
      ORDER BY name
    `);
    
    console.log(`✅ Found ${result.rows.length} companies in database`);
    console.log(`✅ Returning ${result.rows.length} companies (0 added manually)`);
    
    res.json(result.rows);
    
  } catch (error) {
    console.error('❌ Error fetching companies:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

/**
 * @swagger
 * /api/companies:
 *   get:
 *     tags:
 *       - Company Management
 *     summary: Get All Companies
 *     description: Retrieve a list of all companies in the system
 *     responses:
 *       200:
 *         description: Successfully retrieved companies
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     description: Company ID
 *                     example: 1
 *                   name:
 *                     type: string
 *                     description: Company name
 *                     example: "Acme Manufacturing Inc"
 *                   code:
 *                     type: string
 *                     description: Company code
 *                     example: "ACME"
 *                   type:
 *                     type: string
 *                     description: Company type
 *                     example: "manufacturer"
 *                   address:
 *                     type: string
 *                     description: Company address
 *                     example: "123 Business St, City, State 12345"
 *                   phone:
 *                     type: string
 *                     description: Company phone number
 *                     example: "+1-555-123-4567"
 *                   email:
 *                     type: string
 *                     description: Company email
 *                     example: "contact@acme.com"
 *                   currency:
 *                     type: string
 *                     description: Company currency
 *                     example: "USD"
 *                   tenant_id:
 *                     type: integer
 *                     description: Tenant ID
 *                     example: 1
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to fetch companies"
 */

// Initialize server function
async function initializeServer() {
  // Load comprehensive APIs
  const comprehensiveAPIs = [
    './comprehensive-ar-ap-api.js',
    './fixed-comprehensive-ar-ap-api.js',
    './transaction-reference-lookup-api.js',
    './comprehensive-sales-order-summary-api.js',
    './chart-of-accounts-api.js',
    './final-comprehensive-tracking.js',
    './deployment-ready-comprehensive-api.js',
    './enhanced-comprehensive-tracking-api.js'
  ];

  for (const apiPath of comprehensiveAPIs) {
    try {
      const apiModule = await import(apiPath);
      if (typeof apiModule.default === 'function') {
        apiModule.default(app);
      } else if (apiModule.register && typeof apiModule.register === 'function') {
        apiModule.register(app);
      }
    } catch (error) {
      console.log(`⚠️ Optional API module not loaded: ${apiPath}`);
    }
  }

  // Mount product API fix router
  app.use(productApiFixRouter);

  // Register all routes
  try {
    const httpServer = await registerRoutes(app);
    const port = parseInt(process.env.PORT) || 3002;
    
    httpServer.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Multi-Company Accounting System serving on port ${port}`);
      console.log(`📊 API endpoints available at port ${port}/api/`);
      console.log(`🌐 Frontend available at port ${port}/`);
      
      if (process.env.NODE_ENV === 'production') {
        console.log('🔐 Running in production mode');
      } else {
        console.log('🔧 Running in development mode');
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
initializeServer();

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

export default app;