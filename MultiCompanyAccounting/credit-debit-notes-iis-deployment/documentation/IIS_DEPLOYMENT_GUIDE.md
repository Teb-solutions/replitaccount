# IIS Deployment Guide - Credit/Debit Notes System

## Prerequisites
- Windows Server with IIS 10+
- Node.js 18+ installed
- iisnode module installed
- PostgreSQL connection available

## Installation Steps

### 1. Prepare IIS
1. Install iisnode module from https://github.com/Azure/iisnode
2. Enable IIS features: Static Content, Default Document, Directory Browsing
3. Configure application pool to use "No Managed Code"

### 2. Deploy Application
1. Extract package to `C:\inetpub\wwwroot\credit-debit-notes\`
2. Copy `iis-config/web.config` to root directory
3. Install dependencies: `npm install`
4. Set appropriate file permissions for IIS_IUSRS

### 3. Database Configuration
Update database connection in API files:
- Host: 135.235.154.222
- Database: account_replit_staging
- User: pguser
- Password: StrongP@ss123
- SSL: false

### 4. Create IIS Site
1. Open IIS Manager
2. Add Website:
   - Site name: "Credit-Debit-Notes"
   - Physical path: C:\inetpub\wwwroot\credit-debit-notes
   - Port: 80 (or your preferred port)
3. Set application pool to use Node.js

### 5. Setup Database Tables
Navigate to: http://your-server/api/setup-database (POST request)

### 6. Test Installation
- Health check: http://your-server/api/health
- UI Access: http://your-server/credit-notes-management

## API Endpoints

### Core Endpoints
- POST /api/setup-database - Initialize database tables
- GET /api/credit-notes - List credit notes
- POST /api/credit-notes - Create credit note
- GET /api/debit-notes - List debit notes
- POST /api/debit-notes - Create debit note
- GET /api/intercompany-adjustments - List adjustments
- POST /api/intercompany-adjustment - Create adjustment

### Account Management
- GET /api/credit-accounts - Credit account tracking
- GET /api/debit-accounts - Debit account tracking

## UI Routes
- /credit-notes-management - Credit notes interface
- /debit-notes-management - Debit notes interface
- /intercompany-adjustments - Adjustments interface

## Application Insights
- Request ID tracking enabled
- Structured logging format
- Application ID: e04a0cf1-8129-4bc2-8707-016ae726c876

## Troubleshooting

### Common Issues
1. **500 Error**: Check node.js path in web.config
2. **Database Connection**: Verify network access to PostgreSQL
3. **Permission Errors**: Ensure IIS_IUSRS has read/execute on files
4. **API Not Found**: Verify URL rewrite rules in web.config

### Log Locations
- IIS logs: C:\inetpub\logs\LogFiles
- Node.js logs: Application directory/logs
- Application Insights: Azure portal

## Performance Optimization
- Enable compression in IIS
- Configure caching headers
- Monitor memory usage
- Set up load balancing if needed

## Security Considerations
- Use HTTPS in production
- Configure proper authentication
- Restrict database access
- Enable request filtering
