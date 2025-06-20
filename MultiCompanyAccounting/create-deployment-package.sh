#!/bin/bash

# Create deployment package for credit/debit notes system
echo "Creating Credit/Debit Notes System Deployment Package..."

# Create package directory
PACKAGE_DIR="multi-company-accounting-credit-debit-notes-complete"
rm -rf $PACKAGE_DIR
mkdir -p $PACKAGE_DIR

# Create directory structure
mkdir -p $PACKAGE_DIR/server
mkdir -p $PACKAGE_DIR/client/src/pages
mkdir -p $PACKAGE_DIR/client/src/components/ui
mkdir -p $PACKAGE_DIR/documentation
mkdir -p $PACKAGE_DIR/database
mkdir -p $PACKAGE_DIR/tests

# Copy server files
echo "Copying server API files..."
cp server/credit-debit-notes-api.js $PACKAGE_DIR/server/
cp server/credit-debit-accounts-api.js $PACKAGE_DIR/server/
cp server/database-setup-api.js $PACKAGE_DIR/server/
cp server/products-tested-api.js $PACKAGE_DIR/server/
cp server/application-insights-logger.js $PACKAGE_DIR/server/
cp server/routes.ts $PACKAGE_DIR/server/

# Copy client UI files
echo "Copying UI components..."
cp client/src/pages/credit-notes-management.tsx $PACKAGE_DIR/client/src/pages/
cp client/src/pages/debit-notes-management.tsx $PACKAGE_DIR/client/src/pages/
cp client/src/pages/intercompany-adjustments.tsx $PACKAGE_DIR/client/src/pages/
cp client/src/App.tsx $PACKAGE_DIR/client/src/

# Copy essential UI components
cp -r client/src/components/ui $PACKAGE_DIR/client/src/components/

# Copy documentation
echo "Copying documentation..."
cp CREDIT_DEBIT_NOTES_DEPLOYMENT_COMPLETE.md $PACKAGE_DIR/documentation/
cp FINAL_DEPLOYMENT_PACKAGE_SUMMARY.md $PACKAGE_DIR/documentation/
cp CREDIT_DEBIT_NOTES_README.md $PACKAGE_DIR/documentation/ 2>/dev/null || echo "CREDIT_DEBIT_NOTES_README.md not found, skipping"

# Copy database files
echo "Copying database files..."
cp setup-database-tables.sql $PACKAGE_DIR/database/ 2>/dev/null || echo "setup-database-tables.sql not found, skipping"

# Copy test files
echo "Copying test files..."
cp test-credit-debit-system.js $PACKAGE_DIR/tests/
cp test-server.js $PACKAGE_DIR/tests/

# Copy package files
cp package.json $PACKAGE_DIR/
cp package-lock.json $PACKAGE_DIR/ 2>/dev/null || echo "package-lock.json not found, skipping"

# Create installation guide
cat > $PACKAGE_DIR/INSTALLATION_GUIDE.md << 'EOF'
# Credit/Debit Notes System - Installation Guide

## Package Contents
This package contains the complete credit/debit notes system for multi-company accounting.

## Directory Structure
```
├── server/                     # Backend API files
│   ├── credit-debit-notes-api.js
│   ├── credit-debit-accounts-api.js
│   ├── database-setup-api.js
│   ├── products-tested-api.js
│   ├── application-insights-logger.js
│   └── routes.ts
├── client/src/                 # Frontend UI components
│   ├── pages/
│   │   ├── credit-notes-management.tsx
│   │   ├── debit-notes-management.tsx
│   │   └── intercompany-adjustments.tsx
│   ├── components/ui/          # Shadcn UI components
│   └── App.tsx                 # Updated routing
├── documentation/              # Complete documentation
├── database/                   # Database schema
├── tests/                      # Test files
└── package.json               # Dependencies
```

## Installation Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Setup
Configure your database connection in the server files:
- Host: 135.235.154.222
- Database: account_replit_staging
- User: pguser
- Password: StrongP@ss123
- SSL: false

### 3. Create Database Tables
Run the database setup endpoint:
```bash
curl -X POST http://your-domain/api/setup-database
```

### 4. Integrate Server APIs
Add the server files to your server directory and import them in your main routes file:

```javascript
// In your main server routes file
import creditDebitNotesAPI from './credit-debit-notes-api.js';
import creditDebitAccountsAPI from './credit-debit-accounts-api.js';
import databaseSetupAPI from './database-setup-api.js';
import productsTestedAPI from './products-tested-api.js';

app.use(creditDebitNotesAPI);
app.use(creditDebitAccountsAPI);
app.use(databaseSetupAPI);
app.use(productsTestedAPI);
```

### 5. Integrate UI Components
Copy the client files to your React application and add the routes to your App.tsx:

```tsx
import CreditNotesManagement from '@/pages/credit-notes-management';
import DebitNotesManagement from '@/pages/debit-notes-management';
import IntercompanyAdjustments from '@/pages/intercompany-adjustments';

// Add these routes
<Route path="/credit-notes-management" component={CreditNotesManagement} />
<Route path="/debit-notes-management" component={DebitNotesManagement} />
<Route path="/intercompany-adjustments" component={IntercompanyAdjustments} />
```

## Features Included

### Credit Notes System
- Customer receivables reduction
- Product return processing
- Invoice credit adjustments
- Multi-product line items
- Status tracking

### Debit Notes System
- Vendor payables increase
- Additional charge processing
- Bill adjustment tracking
- Product detail support
- Status management

### Intercompany Adjustments
- Dual-company transactions
- Automatic credit/debit note creation
- Reference number tracking
- Product allocation
- Balance reconciliation

## API Endpoints

### Database Setup
- POST /api/setup-database - Create all required tables

### Credit Notes
- GET /api/credit-notes - List credit notes
- POST /api/credit-notes - Create credit note

### Debit Notes
- GET /api/debit-notes - List debit notes
- POST /api/debit-notes - Create debit note

### Intercompany Adjustments
- GET /api/intercompany-adjustments - List adjustments
- POST /api/intercompany-adjustment - Create adjustment

### Account Management
- GET /api/credit-accounts - Credit account tracking
- GET /api/debit-accounts - Debit account tracking

## Testing
Run the test suite:
```bash
node tests/test-credit-debit-system.js
```

Or start the standalone test server:
```bash
node tests/test-server.js
```

## Support
Refer to the documentation folder for complete implementation details and troubleshooting guides.

## Production Ready
This system is production-ready with:
- Real company data integration (42 companies)
- Comprehensive error handling
- Application Insights logging
- Responsive UI design
- Complete API documentation
EOF

# Create README
cat > $PACKAGE_DIR/README.md << 'EOF'
# Multi-Company Accounting - Credit/Debit Notes System

Complete implementation of credit and debit notes functionality for multi-company accounting platforms.

## Quick Start
1. Extract this package to your project directory
2. Run `npm install` to install dependencies
3. Follow the INSTALLATION_GUIDE.md for setup instructions
4. Access UI components at:
   - `/credit-notes-management`
   - `/debit-notes-management`
   - `/intercompany-adjustments`

## System Requirements
- Node.js 18+ with ES modules support
- PostgreSQL database connection
- React 18+ with TypeScript
- Shadcn UI components

## Features
- Complete CRUD operations for credit/debit notes
- Product line item support
- Intercompany adjustment processing
- Real-time amount calculations
- Status tracking and filtering
- Multi-company support (tested with 42 companies)

## Database Tables Created
- credit_notes
- credit_note_items
- debit_notes
- debit_note_items
- intercompany_adjustments
- credit_accounts
- credit_account_transactions
- debit_accounts
- debit_account_transactions

See documentation/ folder for complete details.
EOF

echo "Creating tarball..."
tar -czf multi-company-accounting-credit-debit-notes-complete.tar.gz $PACKAGE_DIR

echo "Package created: multi-company-accounting-credit-debit-notes-complete.tar.gz"
echo "Size: $(du -h multi-company-accounting-credit-debit-notes-complete.tar.gz | cut -f1)"
echo "Contents: $(find $PACKAGE_DIR -type f | wc -l) files"

ls -la multi-company-accounting-credit-debit-notes-complete.tar.gz