#!/bin/bash

echo "Starting Multi-Company Accounting System Deployment..."

# Kill any existing processes on ports 3000 and 5000
pkill -f "node.*3000" 2>/dev/null
pkill -f "node.*5000" 2>/dev/null

# Start the main API server on port 5000 (backend)
echo "Starting API server on port 5000..."
cd ../
npm run dev &
API_PID=$!

# Wait for API server to start
sleep 3

# Start the UI server on port 3000 
echo "Starting UI deployment server on port 3000..."
cd deployment
cat > temp-ui-server.js << 'EOF'
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// Serve static files from client directory
app.use(express.static(path.join(__dirname, '../client')));

// Proxy API calls to main server
app.use('/api', async (req, res) => {
  try {
    const fetch = (await import('node-fetch')).default;
    const url = `http://localhost:5000${req.originalUrl}`;
    const response = await fetch(url, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    });
    const data = await response.text();
    res.status(response.status).send(data);
  } catch (error) {
    res.status(502).json({ error: 'Backend unavailable' });
  }
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.listen(3000, () => {
  console.log('UI available at: http://localhost:3000');
  console.log('API proxied from: http://localhost:5000');
});
EOF

node temp-ui-server.js &
UI_PID=$!

echo ""
echo "Deployment ready:"
echo "UI: http://localhost:3000"
echo "API: http://localhost:5000/api"
echo "Docs: http://localhost:5000/api-docs"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for user interrupt
trap "kill $API_PID $UI_PID 2>/dev/null; exit" INT
wait