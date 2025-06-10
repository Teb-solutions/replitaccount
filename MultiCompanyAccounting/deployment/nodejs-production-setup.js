/**
 * Node.js Production Build Setup
 * Configures the application for server deployment with proper environment handling
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function setupNodeJSProduction(app) {
  console.log('🔧 Setting up Node.js production configuration...');

  // Force production environment
  process.env.NODE_ENV = 'production';
  
  // Production static file serving
  const staticPath = path.join(__dirname, '../dist/public');
  console.log(`📁 Serving static files from: ${staticPath}`);
  
  // Configure static file serving with production optimizations
  app.use(express.static(staticPath, {
    maxAge: '1y',      // Cache static assets for 1 year
    etag: true,        // Enable ETags for caching
    lastModified: true, // Enable Last-Modified headers
    immutable: true,   // Mark assets as immutable
    index: false       // Don't auto-serve index.html
  }));

  // Health check endpoint for deployment monitoring
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: 'production',
      memory: process.memoryUsage(),
      version: '1.0.0'
    });
  });

  // Root endpoint to serve React application
  app.get('/', (req, res, next) => {
    const indexPath = path.join(staticPath, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error('Error serving React app:', err);
        res.status(500).json({ 
          error: 'Application loading failed',
          message: 'React UI is not available'
        });
      }
    });
  });

  // Catch-all route for React Router (SPA handling)
  app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api')) {
      return next();
    }

    // Serve React app for all non-API routes
    const indexPath = path.join(staticPath, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error(`Error serving React route ${req.path}:`, err);
        res.status(500).json({ 
          error: 'Route not available',
          path: req.path
        });
      }
    });
  });

  console.log('✅ Node.js production setup complete');
  console.log('🌐 Application endpoints:');
  console.log('   • React UI: http://your-server:5000/');
  console.log('   • API Documentation: http://your-server:5000/api-docs');
  console.log('   • Health Check: http://your-server:5000/health');
  console.log('   • Database Status: http://your-server:5000/api/health');
}