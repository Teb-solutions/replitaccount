# Multi-Company Accounting System - Server Deployment Guide

## Essential Files for Deployment

Copy these key files to your server:

### Core Application Files
- `server/index.js` - Main server entry point (ES modules)
- `server.js` - Alternative Node.js entry point (CommonJS)
- `package.json` - Dependencies configuration
- `package-lock.json` - Dependency lock file

### API Modules (server/ directory)
- `server/routes.js` - Main routing
- `server/swagger.js` - API documentation
- `server/company-management-api.js` - Company management
- `server/intercompany-workflow-api.js` - Intercompany transactions
- `server/database-checker.js` - Database connectivity
- `server/product-api-fix.js` - Product management
- All other API files in server/ directory

### Database Configuration
- `server/database-config.js` - Database connection settings
- `drizzle.config.ts` - ORM configuration

### Frontend (if serving from same server)
- `client/` directory (complete React application)
- `vite.config.ts` - Build configuration

## Deployment Steps

1. **Install Node.js 20.x or higher**
2. **Copy files to server**
3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Set environment variables:**
   ```bash
   export DATABASE_URL="postgresql://pguser:StrongP@ss123@135.235.154.222:5432/account_replit_staging?sslmode=disable"
   export PORT=3002
   export NODE_ENV=production
   ```

5. **Start the application:**
   ```bash
   # Option 1: ES modules entry point
   node server/index.js
   
   # Option 2: CommonJS entry point
   node server.js
   ```

## Server Requirements

- Node.js 20.x or higher
- PostgreSQL client libraries (included in dependencies)
- Internet connection for external database access
- Ports 3002 accessible

## Access Points After Deployment

- Main Application: http://your-server:3002/
- API Documentation: http://your-server:3002/api-docs
- API Endpoints: http://your-server:3002/api/

## Database Configuration

The system connects to external PostgreSQL database:
- Host: 135.235.154.222
- Database: account_replit_staging
- User: pguser
- Password: StrongP@ss123
- SSL: Disabled

## Production Considerations

1. Use a process manager like PM2 for production:
   ```bash
   npm install -g pm2
   pm2 start server/index.js --name "accounting-system"
   ```

2. Set up reverse proxy (nginx) for domain mapping
3. Configure SSL certificates for HTTPS
4. Set up log rotation and monitoring

## Verification

After deployment, verify:
- Server responds at http://your-server:3002/
- API documentation loads at /api-docs
- Companies endpoint returns data: /api/companies
- Database connectivity working properly

The system includes 21 companies with authentic financial data and complete intercompany transaction workflows.