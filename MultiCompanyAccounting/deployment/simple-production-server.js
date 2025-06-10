import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PROD_PORT || 3000;
const API_PORT = 5000; // Current development server port

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health check for production server
app.get('/health-prod', (req, res) => {
  res.json({
    message: 'Production Server',
    status: 'running',
    apiProxy: `http://localhost:${API_PORT}`,
    port: PORT
  });
});

// Proxy API requests to the main development server
app.use('/api', createProxyMiddleware({
  target: `http://localhost:${API_PORT}`,
  changeOrigin: true,
  onError: (err, req, res) => {
    res.status(500).json({ 
      error: 'API server unavailable', 
      message: 'Make sure the main server is running on port 5000' 
    });
  }
}));

// Proxy API docs to main server
app.use('/api-docs', createProxyMiddleware({
  target: `http://localhost:${API_PORT}`,
  changeOrigin: true
}));

// Serve the React app from client directory
app.use(express.static(path.join(__dirname, '../client')));

// Handle client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Production UI Server running on port ${PORT}`);
  console.log(`Main Application: http://localhost:${PORT}/`);
  console.log(`API proxied from: http://localhost:${API_PORT}/api`);
  console.log(`Note: Ensure main server is running on port ${API_PORT}`);
});