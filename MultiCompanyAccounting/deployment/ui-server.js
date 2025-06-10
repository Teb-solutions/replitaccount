import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const UI_PORT = 3000;
const API_PORT = 5000;

// Serve React app files
app.use(express.static(path.join(__dirname, '../client')));

// Proxy all API requests to the backend server
app.use('/api', createProxyMiddleware({
  target: `http://localhost:${API_PORT}`,
  changeOrigin: true,
  logLevel: 'silent'
}));

// Proxy API documentation
app.use('/api-docs', createProxyMiddleware({
  target: `http://localhost:${API_PORT}`,
  changeOrigin: true,
  logLevel: 'silent'
}));

// Handle React Router (client-side routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.listen(UI_PORT, () => {
  console.log(`UI Server running on http://localhost:${UI_PORT}`);
  console.log(`Proxying API calls to http://localhost:${API_PORT}`);
});

export default app;