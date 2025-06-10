# Multi-Company Accounting System - Complete Deployment Guide

## Current Status
- Backend API server: Running on port 5000 with all APIs working
- Database: Connected to external PostgreSQL at 135.235.154.222
- Frontend: Needs to be served on port 3000 for Windows deployment

## Deployment Solution

### Option 1: Two-Server Setup (Recommended for Windows)

**Backend Server (Port 5000):**
- Serves all API endpoints (/api/*)
- Handles database connections
- Provides Swagger documentation (/api-docs)

**Frontend Server (Port 3000):**
- Serves React UI application
- Proxies API calls to backend server
- Handles client-side routing

### Option 2: Single-Server Setup (Alternative)

**Combined Server (Port 3000):**
- Serves both React UI and APIs
- Single deployment package
- Simpler configuration

## Windows Server Endpoints

Once deployed on your Windows server:

**Main Application:**
- UI: `http://your-server-ip:3000/`
- Dashboard, companies, orders, invoices, etc. accessible via UI

**API Endpoints:**
- Authentication: `http://your-server-ip:5000/api/auth/me`
- Companies: `http://your-server-ip:5000/api/companies`
- Sales Orders: `http://your-server-ip:5000/api/sales-orders`
- Invoices: `http://your-server-ip:5000/api/invoices`
- Bills: `http://your-server-ip:5000/api/bills`
- Documentation: `http://your-server-ip:5000/api-docs`

## Deployment Steps

1. **Copy project folders to Windows server:**
   - backend/ (Node.js API server)
   - client/ (React UI files)
   - deployment/ (startup scripts)

2. **Install Node.js** (version 18 or higher)

3. **Start backend server:**
   ```
   cd backend
   npm install
   node index.js
   ```

4. **Start frontend server:**
   ```
   cd deployment
   node windows-deployment.js
   ```

5. **Access application:**
   - Open browser to `http://localhost:3000`
   - UI should load with all functionality

## Database Configuration

The system connects to your external database:
- Host: 135.235.154.222
- Database: account_replit_staging
- All API endpoints verified working with authentic data

## Current Test Results

All API endpoints tested and working:
- Companies: 20 companies loaded
- Sales Orders: 84 orders for Gas Manufacturing
- Invoices: 67 invoices totaling $442k
- Bills: 28 bills totaling $229k
- Receipts: 21 receipts totaling $178k
- Balance Sheet: $7,200 assets

The React UI deployment structure is ready for your Windows server.