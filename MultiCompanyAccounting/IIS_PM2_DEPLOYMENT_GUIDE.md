# PM2 + IIS Windows Server Deployment Guide

## Prerequisites
1. **Node.js** installed on Windows Server (v16 or higher)
2. **PM2** installed globally: `npm install -g pm2`
3. **IIS** with URL Rewrite Module installed
4. **iisnode** module installed (for IIS + Node.js integration)

## Step 1: Extract and Install Dependencies
```bash
# Extract the deployment package
tar -xzf multi-company-accounting-public-ready.tar.gz

# Navigate to the project folder
cd multi-company-accounting-public-ready

# Install dependencies
npm install
```

## Step 2: Configure PM2
```bash
# Install PM2 globally (if not already installed)
npm install -g pm2

# Start the application using PM2
pm2 start pm2-ecosystem.config.js

# Save PM2 configuration for auto-restart
pm2 save

# Generate startup script for Windows
pm2 startup

# Check application status
pm2 status
pm2 logs multi-company-accounting
```

## Step 3: Configure IIS

### Option A: Direct IIS with iisnode (Recommended)
1. **Install iisnode** from: https://github.com/Azure/iisnode/releases
2. **Copy files** to IIS website directory (e.g., `C:\inetpub\wwwroot\accounting`)
3. **Configure Application Pool**:
   - Set .NET Framework version to "No Managed Code"
   - Set Identity to ApplicationPoolIdentity or custom account
4. **The web.config file is already provided** - it will handle routing

### Option B: IIS as Reverse Proxy to PM2
1. **Install URL Rewrite Module** for IIS
2. **Create new website** in IIS Manager
3. **Add web.config** with reverse proxy rules:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="ReverseProxyToNode" stopProcessing="true">
          <match url="(.*)" />
          <action type="Rewrite" url="http://localhost:3003/{R:1}" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

## Step 4: Configure Port and Firewall
```bash
# Configure Windows Firewall to allow port 3003
netsh advfirewall firewall add rule name="Node.js App Port 3003" dir=in action=allow protocol=TCP localport=3003

# Or if using IIS on port 80/443, ensure IIS can access localhost:3003
```

## Step 5: Environment Variables (Optional)
Create `.env` file if you need custom configuration:
```env
NODE_ENV=production
PORT=3003
```

## Step 6: Test Deployment
1. **Check PM2 status**: `pm2 status`
2. **Test direct Node.js**: `http://localhost:3003`
3. **Test through IIS**: `http://your-server-domain.com`
4. **API Documentation**: `http://your-server-domain.com/api-docs`

## Common Commands

### PM2 Management
```bash
# View application logs
pm2 logs multi-company-accounting

# Restart application
pm2 restart multi-company-accounting

# Stop application
pm2 stop multi-company-accounting

# Monitor resources
pm2 monit

# Delete application
pm2 delete multi-company-accounting
```

### Troubleshooting
```bash
# Check if Node.js is accessible
node --version

# Check if port 3003 is in use
netstat -an | findstr :3003

# Test direct connection
curl http://localhost:3003/api/companies

# View detailed PM2 logs
pm2 logs multi-company-accounting --lines 100
```

## Production Checklist
- [ ] Node.js installed and accessible
- [ ] PM2 installed globally
- [ ] Application started with PM2
- [ ] PM2 startup script configured
- [ ] IIS configured (either iisnode or reverse proxy)
- [ ] Firewall rules configured
- [ ] External database connection working
- [ ] API documentation accessible at /api-docs
- [ ] All 23 companies loading correctly

## Security Notes
- The application connects to external database at 135.235.154.222 without SSL
- Ensure your server can reach this database IP
- Consider setting up VPN if required for database access
- The web.config includes security headers for production use

## Performance Tips
- PM2 is configured with memory restart at 1GB
- Log rotation is enabled to prevent disk space issues
- Application runs in production mode for optimal performance
- Static files are served efficiently through IIS