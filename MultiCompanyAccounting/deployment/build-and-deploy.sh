#!/bin/bash

# Multi-Company Accounting System - Build and Deploy Script
# This script builds both frontend and backend for production deployment

echo "🏗️  Starting build process for Multi-Company Accounting System..."

# Create deployment directory
mkdir -p deployment/dist

# Build Frontend
echo "📦 Building React frontend..."
cd frontend
npm install
npm run build
echo "✅ Frontend build complete"

# Copy frontend build to deployment
cp -r dist/* ../deployment/dist/

# Prepare Backend
echo "🔧 Preparing Node.js backend..."
cd ../backend
npm install --production

# Copy backend files to deployment
echo "📋 Copying backend files..."
cp -r ./* ../deployment/
cp package.json ../deployment/
cp .env ../deployment/ 2>/dev/null || echo "No .env file found, skipping..."

# Create production environment file
cat > ../deployment/.env << 'EOF'
NODE_ENV=production
PORT=5000
SESSION_SECRET=your-production-session-secret-here
DATABASE_HOST=135.235.154.222
DATABASE_PORT=5432
DATABASE_NAME=account_replit_staging
DATABASE_USER=pguser
DATABASE_PASSWORD=StrongP@ss123
EOF

echo "✅ Backend preparation complete"

# Create Windows batch file for deployment
cat > ../deployment/start-windows.bat << 'EOF'
@echo off
echo Starting Multi-Company Accounting System...
node index.js
pause
EOF

# Create Linux/Unix startup script
cat > ../deployment/start.sh << 'EOF'
#!/bin/bash
echo "Starting Multi-Company Accounting System..."
export NODE_ENV=production
node index.js
EOF

chmod +x ../deployment/start.sh

echo "🎉 Build and deployment preparation complete!"
echo ""
echo "📁 Deployment files are ready in: deployment/"
echo "🖥️  For Windows: Run start-windows.bat"
echo "🐧 For Linux/Unix: Run ./start.sh"
echo "🌐 Access at: http://localhost:5000"
echo "📚 API docs at: http://localhost:5000/api-docs"