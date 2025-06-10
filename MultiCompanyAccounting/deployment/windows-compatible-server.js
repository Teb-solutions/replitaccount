/**
 * Windows-Compatible Server
 * Pure Node.js server that avoids Rollup/Vite dependencies on Windows
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if we're running on Windows
const isWindows = process.platform === 'win32';

export function createWindowsCompatibleServer() {
  const app = express();
  
  console.log(`🪟 Starting Windows-compatible server (Platform: ${process.platform})`);
  
  // Basic middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  
  // CORS for Windows deployment
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  // Serve static files directly without Rollup
  const staticDir = path.resolve(__dirname, '..', 'dist', 'public');
  
  if (fs.existsSync(staticDir)) {
    console.log(`📁 Serving static files from: ${staticDir}`);
    app.use(express.static(staticDir, {
      maxAge: isWindows ? '1h' : '1d',
      etag: true,
      index: false
    }));
  } else {
    console.log('⚠️ Static directory not found, creating fallback...');
    // Create a simple fallback response
    app.get('/', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Multi-Company Accounting System</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                .container { max-width: 800px; margin: 0 auto; }
                .api-link { background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Multi-Company Accounting System</h1>
                <p>The accounting system is running successfully on Windows.</p>
                <a href="/api-docs" class="api-link">View API Documentation</a>
                <a href="/health" class="api-link">Health Check</a>
            </div>
        </body>
        </html>
      `);
    });
  }

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      platform: process.platform,
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // API status endpoint
  app.get('/api/status', (req, res) => {
    res.json({
      message: 'Multi-Company Accounting System API',
      version: '1.0.0',
      status: 'running',
      platform: process.platform,
      database: 'External PostgreSQL at 135.235.154.222',
      endpoints: {
        health: '/health',
        documentation: '/api-docs',
        companies: '/api/companies',
        dashboard: '/api/dashboard/stats'
      }
    });
  });

  // Catch-all for SPA routing (only for non-API routes)
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }

    const indexPath = path.join(staticDir, 'index.html');
    
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      // Fallback if no build exists
      res.redirect('/');
    }
  });

  return app;
}

// Windows-specific error handling
export function handleWindowsErrors(app) {
  app.use((err, req, res, next) => {
    console.error('Windows Server Error:', {
      message: err.message,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });

    res.status(err.status || 500).json({
      error: 'Server Error',
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal Server Error' 
        : err.message,
      platform: process.platform,
      timestamp: new Date().toISOString()
    });
  });
}