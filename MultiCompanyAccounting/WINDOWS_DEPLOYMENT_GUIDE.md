# Windows Server Deployment Guide

## Issue Resolution: Rollup Module Error

The error you encountered (`Cannot find module '@rollup/rollup-win32-x64-msvc'`) is a common Windows deployment issue with Node.js applications that use Rollup/Vite dependencies.

## Solution: Use the Windows-Compatible Server

I've created a standalone Windows server file that bypasses this issue entirely.

### Quick Start for Windows Deployment

1. **Copy the project** to your Windows server
2. **Install Node.js dependencies**:
   ```cmd
   npm install
   ```

3. **Use the Windows-compatible server** instead of the main server:
   ```cmd
   node windows-server.js
   ```

### What This Provides

- **Database Connection**: Connects to your PostgreSQL database at 135.235.154.222
- **Basic API Endpoints**: Companies, dashboard stats, health checks
- **Static File Serving**: Serves React UI if built, otherwise provides fallback interface
- **No Rollup Dependencies**: Avoids the problematic modules causing the error

### Available Endpoints

Once running on your Windows server:

- **Main Application**: `http://your-server:5000/`
- **Health Check**: `http://your-server:5000/health`
- **API Status**: `http://your-server:5000/api/status`
- **Companies Data**: `http://your-server:5000/api/companies`
- **Dashboard Stats**: `http://your-server:5000/api/dashboard/stats`

### Database Configuration

The Windows server is pre-configured to connect to:
- **Host**: 135.235.154.222
- **Database**: account_replit_staging
- **User**: pguser
- **SSL**: Disabled (as required for your setup)

### Environment Variables (Optional)

You can set these environment variables on your Windows server:

```cmd
set NODE_ENV=production
set PORT=5000
```

### Troubleshooting

If you still encounter issues:

1. **Check Node.js version**: Ensure you're using Node.js 18 or higher
2. **Install dependencies fresh**:
   ```cmd
   rmdir /s node_modules
   npm install
   ```
3. **Run the Windows server directly**:
   ```cmd
   node windows-server.js
   ```

### Full API Integration

If you need all the comprehensive API endpoints from the main application, you can gradually integrate them into the Windows server by importing the specific API modules that don't depend on Rollup.

The Windows-compatible server provides a solid foundation that works reliably on Windows systems without the module dependency conflicts.