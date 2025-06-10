# Port 774 Deployment Guide

## Quick Setup for Port 774

### For Local Testing
1. Extract the deployment package
2. Run the port 774 server:
```bash
node port-774-server.js
```
3. Access at: http://localhost:774

### For Public IIS Deployment

#### 1. IIS Site Configuration
- Create new site in IIS Manager
- Set **Port: 774** in site bindings
- Point to your application directory
- Use the included `port-774-web.config`

#### 2. Windows Firewall
Allow inbound connections on port 774:
```cmd
netsh advfirewall firewall add rule name="Port 774 Inbound" dir=in action=allow protocol=TCP localport=774
```

#### 3. Router Configuration (if applicable)
Forward external port 774 to your server's internal IP:774

#### 4. Testing External Access
From external network:
```bash
curl http://your-public-ip:774/health
curl http://your-domain:774/api/companies
```

## Available Endpoints on Port 774

- **Landing Page**: http://your-domain:774/
- **API Documentation**: http://your-domain:774/api-docs
- **Health Check**: http://your-domain:774/health
- **Companies API**: http://your-domain:774/api/companies
- **Dashboard Stats**: http://your-domain:774/api/dashboard/stats

## Files Included

- `port-774-server.js` - Main server configured for port 774
- `port-774-web.config` - IIS configuration for port 774
- All original functionality maintained with your authentic database connection

The system connects to your production database at 135.235.154.222 and provides access to all 23 companies with their financial data.