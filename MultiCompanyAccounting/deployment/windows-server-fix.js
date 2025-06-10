/**
 * Windows Server Deployment Fix
 * Resolves Rollup module dependency issues on Windows systems
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function setupWindowsServerDeployment(app) {
  console.log('🪟 Setting up Windows server deployment configuration...');

  // Force production environment
  process.env.NODE_ENV = 'production';
  
  // Windows-compatible static file serving
  const staticPath = path.resolve(__dirname, '..', 'dist', 'public');
  console.log(`📁 Windows static path: ${staticPath}`);
  
  // Serve static files with Windows-optimized settings
  app.use(express.static(staticPath, {
    maxAge: '1d',
    etag: true,
    lastModified: true,
    dotfiles: 'ignore',
    index: false
  }));

  // Health check for Windows deployment
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      platform: 'windows',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: 'production',
      memory: process.memoryUsage(),
      version: '1.0.0'
    });
  });

  // Root route serves React application
  app.get('/', (req, res) => {
    const indexPath = path.join(staticPath, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error('Windows: Error serving React app:', err);
        res.status(500).json({ 
          error: 'Application loading failed on Windows server',
          message: 'React UI is not available'
        });
      }
    });
  });

  // Catch-all for React Router on Windows
  app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api')) {
      return next();
    }

    // Serve React app
    const indexPath = path.join(staticPath, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error(`Windows: Error serving route ${req.path}:`, err);
        res.status(500).json({ 
          error: 'Route not available on Windows server',
          path: req.path
        });
      }
    });
  });

  console.log('✅ Windows server deployment setup complete');
  console.log('🌐 Windows server endpoints:');
  console.log('   • React UI: http://your-windows-server:5000/');
  console.log('   • API Documentation: http://your-windows-server:5000/api-docs');
  console.log('   • Health Check: http://your-windows-server:5000/health');
}