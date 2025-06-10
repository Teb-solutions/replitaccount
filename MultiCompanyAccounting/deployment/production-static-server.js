/**
 * Production Static Server Configuration
 * Serves React UI at root and API docs at /api-docs for server deployment
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function setupProductionStaticServer(app) {
  console.log('🚀 Configuring production static file serving...');

  // Serve static assets from dist/public (built React app)
  const staticPath = path.join(__dirname, '../dist/public');
  console.log(`📁 Static files location: ${staticPath}`);
  
  // Serve static files with proper headers
  app.use(express.static(staticPath, {
    maxAge: '1h',
    etag: true,
    lastModified: true
  }));

  // API routes are handled before this middleware in routes.ts
  // This catches all non-API routes and serves the React app
  app.get('*', (req, res, next) => {
    // Skip API routes - let them be handled by existing API handlers
    if (req.path.startsWith('/api')) {
      return next();
    }

    // Serve React app for all other routes
    const indexPath = path.join(staticPath, 'index.html');
    
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error(`❌ Error serving React app for ${req.path}:`, err.message);
        res.status(500).json({ 
          error: 'Application loading error',
          message: 'React UI could not be served'
        });
      } else {
        console.log(`✅ Served React UI for: ${req.path}`);
      }
    });
  });

  console.log('🎯 Production static server configured successfully');
  console.log('📋 Available routes:');
  console.log('   • React UI: / (root path)');
  console.log('   • API Documentation: /api-docs');
  console.log('   • Health Check: /api/health');
  console.log('   • All API Endpoints: /api/*');
}