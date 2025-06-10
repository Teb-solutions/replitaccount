# Simple Local Deployment Instructions

## Quick Setup (3 Steps)

### Step 1: Download and Extract
Extract the deployment package to any folder on your computer.

### Step 2: Install Dependencies
Open command prompt/terminal in the extracted folder and run:
```bash
npm install
```

### Step 3: Start the Server
Run this command:
```bash
node simple-local-server.js
```

## What You'll See

The server will start and show:
```
🚀 Multi-Company Accounting System running on http://localhost:3002
📊 Dashboard: http://localhost:3002
🔗 Companies API: http://localhost:3002/api/companies
💡 Health Check: http://localhost:3002/health
```

## Access Your System

Open your web browser and go to:
- **Main Page**: http://localhost:3002
- **Companies Data**: http://localhost:3002/api/companies
- **System Health**: http://localhost:3002/health

## If Port 3002 is Busy

Change the port by setting an environment variable:
```bash
# Windows
set PORT=3003 && node simple-local-server.js

# Mac/Linux
PORT=3003 node simple-local-server.js
```

## Troubleshooting

**Cannot connect to database**: Check your internet connection. The system connects to the external database at 135.235.154.222.

**Port already in use**: Try a different port using the instructions above.

**Module not found**: Make sure you ran `npm install` first.

## What's Included

The simple server provides:
- Connection to your production database with 23 companies
- Basic company listing and dashboard statistics
- Health monitoring
- CORS support for web access
- Clean error handling

This simplified version avoids the connection issues you were experiencing while maintaining access to your authentic financial data.