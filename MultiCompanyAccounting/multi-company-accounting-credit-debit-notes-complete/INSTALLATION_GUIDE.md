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
