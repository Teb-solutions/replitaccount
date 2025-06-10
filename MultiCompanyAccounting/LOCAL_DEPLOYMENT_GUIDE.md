# Local Deployment Guide - Multi-Company Accounting System

## Prerequisites

1. **Node.js** (version 16 or higher)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **Database Access**
   - External database: 135.235.154.222
   - Database: account_replit_staging
   - User: pguser
   - Password: StrongP@ss123

## Quick Start

### Option 1: Using the Deployment Package (Recommended)

1. **Extract the deployment package:**
   ```bash
   tar -xzf multi-company-accounting-iis-deployment.tar.gz
   cd extracted-folder
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the server:**
   ```bash
   node clean-server.js
   ```

4. **Access the application:**
   - Main interface: http://localhost:3002
   - API Documentation: http://localhost:3002/api-docs
   - API endpoint example: http://localhost:3002/api/companies

### Option 2: From Source Code

1. **Clone/copy the project files**

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables (.env file):**
   ```env
   DATABASE_URL=postgres://pguser:StrongP@ss123@135.235.154.222:5432/account_replit_staging?sslmode=disable
   PGHOST=135.235.154.222
   PGPORT=5432
   PGDATABASE=account_replit_staging
   PGUSER=pguser
   PGPASSWORD=StrongP@ss123
   PORT=3002
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

## Troubleshooting

### Common Issues:

1. **Port 3002 already in use:**
   ```bash
   # Find process using port 3002
   netstat -ano | findstr :3002  # Windows
   lsof -i :3002                 # Mac/Linux
   
   # Kill the process and restart
   ```

2. **Database connection errors:**
   - Verify internet connection
   - Check if firewall is blocking port 5432
   - Ensure the external database credentials are correct

3. **CORS errors in browser:**
   - The deployment package includes CORS fixes
   - Make sure you're using the updated clean-server.js

### Testing the Deployment:

1. **Check server status:**
   ```bash
   curl http://localhost:3002/api/companies
   ```

2. **Test API endpoints:**
   - Companies: http://localhost:3002/api/companies
   - Dashboard: http://localhost:3002/api/dashboard/stats
   - Swagger UI: http://localhost:3002/api-docs

3. **Verify database connection:**
   ```bash
   curl http://localhost:3002/api/companies
   # Should return 23 companies from the external database
   ```

## File Structure

```
deployment-package/
├── clean-server.js      # Main server file with CORS fixes
├── package.json         # Dependencies
├── index.html          # Landing page
├── web.config          # IIS configuration (if deploying to IIS)
└── intercompany-workflow-test.js  # Test utilities
```

## Key Features Available:

- **23 Companies** accessible via API
- **AR/AP Tracking** with authentic financial data
- **Intercompany Workflows** for transaction processing
- **Swagger API Documentation** at /api-docs
- **CORS Support** for cross-origin requests
- **External Database Integration** with production data

## Production Deployment:

For production deployment on Windows Server with IIS:
1. Use the web.config file included in the package
2. Install iisnode module for IIS
3. Configure IIS to handle Node.js applications
4. Set up the application pool for Node.js

## Support

If you encounter issues:
1. Check the console logs for error messages
2. Verify network connectivity to the external database
3. Ensure all dependencies are properly installed
4. Check that port 3002 is available