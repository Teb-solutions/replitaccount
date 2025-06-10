/**
 * Server Static Files Fix for Deployment
 * Ensures React UI serves properly from root path alongside API docs
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function setupStaticFilesForDeployment(app) {
  console.log('🔧 Setting up static files for server deployment...');

  // Serve static files from client/dist (production build)
  const clientDistPath = path.join(__dirname, '../client/dist');
  console.log(`📁 Serving static files from: ${clientDistPath}`);
  
  app.use(express.static(clientDistPath, {
    index: false, // Don't auto-serve index.html for all routes
    maxAge: '1d'   // Cache static assets for 1 day
  }));

  // Serve React app for all non-API routes
  app.get('*', (req, res, next) => {
    // Skip API routes and let them be handled by API handlers
    if (req.path.startsWith('/api')) {
      return next();
    }

    // Serve index.html for all other routes (React Router)
    const indexPath = path.join(clientDistPath, 'index.html');
    console.log(`🌐 Serving React app for route: ${req.path}`);
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error('Error serving React app:', err);
        res.status(500).send('Error loading application');
      }
    });
  });

  console.log('✅ Static files setup complete for deployment');
  console.log('📋 Available endpoints:');
  console.log('   - React UI: http://your-server:5000/');
  console.log('   - API Docs: http://your-server:5000/api-docs');
  console.log('   - Health: http://your-server:5000/api/health');
}