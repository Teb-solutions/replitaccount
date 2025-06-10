# Multi-Company Accounting System - Deployment Guide

## Project Structure

The project is now organized into separate frontend and backend folders for better deployment management:

```
├── frontend/          # React UI application
│   ├── src/          # React components and pages
│   ├── package.json  # Frontend dependencies
│   └── vite.config.ts # Build configuration
├── backend/          # Node.js API server
│   ├── *.js          # API routes and modules
│   ├── package.json  # Backend dependencies
│   └── index.js      # Production server entry point
└── deployment/       # Build and deployment scripts
    ├── build-and-deploy.sh
    └── README.md     # This file
```

## Development

### Frontend Development
```bash
cd frontend
npm install
npm run dev      # Starts development server on http://localhost:5173
```

### Backend Development
```bash
cd backend
npm install
npm run dev      # Starts API server on http://localhost:5000
```

## Production Build

### Automated Build Process
```bash
cd deployment
chmod +x build-and-deploy.sh
./build-and-deploy.sh
```

This will:
1. Build the React frontend for production
2. Install backend dependencies
3. Create deployment-ready files
4. Generate startup scripts for Windows and Linux

### Manual Build Process

#### Build Frontend
```bash
cd frontend
npm install
npm run build
```

#### Prepare Backend
```bash
cd backend
npm install --production
```

## Deployment

### Windows Server Deployment
1. Copy the deployment folder to your Windows server
2. Install Node.js (version 18 or higher)
3. Run: `start-windows.bat`
4. Access the application at `http://your-server-ip:5000`

### Linux/Unix Deployment
1. Copy the deployment folder to your server
2. Install Node.js (version 18 or higher)
3. Run: `chmod +x start.sh && ./start.sh`
4. Access the application at `http://your-server-ip:5000`

## Endpoints

### Main Application
- **UI**: `http://localhost:5000/` (React frontend)
- **Health Check**: `http://localhost:5000/health`
- **API Documentation**: `http://localhost:5000/api-docs`

### API Endpoints
- **Authentication**: `/api/auth/me`, `/api/auth/login`
- **Companies**: `/api/companies`
- **Sales Orders**: `/api/sales-orders`
- **Purchase Orders**: `/api/purchase-orders`
- **Invoices**: `/api/invoices`
- **Bills**: `/api/bills`
- **Receipts**: `/api/receipts`
- **Reports**: `/api/reports/*`

## Database Configuration

The system connects to an external PostgreSQL database:
- **Host**: 135.235.154.222
- **Database**: account_replit_staging
- **User**: pguser
- **Password**: StrongP@ss123

## Environment Variables

Create a `.env` file in the backend directory:
```
NODE_ENV=production
PORT=5000
SESSION_SECRET=your-secure-session-secret
DATABASE_HOST=135.235.154.222
DATABASE_PORT=5432
DATABASE_NAME=account_replit_staging
DATABASE_USER=pguser
DATABASE_PASSWORD=StrongP@ss123
```

## Troubleshooting

### Common Issues
1. **Port 5000 already in use**: Change PORT in .env file
2. **Database connection errors**: Verify database credentials and network access
3. **Build failures**: Ensure Node.js version 18+ is installed
4. **Static files not serving**: Check that frontend build completed successfully

### Logs
Application logs are written to console. In production, consider using PM2 or similar process manager for log management.

## Security Notes

- Change the SESSION_SECRET in production
- Use HTTPS in production environments
- Configure firewall rules appropriately
- Regularly update dependencies for security patches