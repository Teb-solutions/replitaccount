# Multi-Company Accounting System with Application Insights Logging

## Package Contents

This deployment package contains a complete multi-company accounting system with comprehensive Application Insights logging integrated throughout all APIs.

### Key Features
- **42 Authentic Companies**: Connected to external database at 135.235.154.222
- **Complete AR/AP Workflow**: Sales orders → Invoices → Receipts and Purchase orders → Bills → Payments
- **Intercompany Transactions**: Dual-company transaction processing with reference tracking
- **Credit/Debit Notes**: Full product integration with intercompany adjustments
- **Application Insights Logging**: Format [HH:mm:ss LVL] [RequestId] Message across all endpoints
- **Real-time Dashboard**: Multi-company analytics and workflow tracking

### System Architecture
- **Frontend**: React.js with TypeScript, Tailwind CSS, shadcn/ui components
- **Backend**: Node.js/Express with comprehensive API endpoints
- **Database**: PostgreSQL (external connection to 135.235.154.222)
- **Logging**: Application Insights integration (ID: e04a0cf1-8129-4bc2-8707-016ae726c876)

### Deployment Files
- `final-deployment/server.cjs` - Production server with all APIs and logging
- `client/` - React frontend application
- `server/` - TypeScript backend services
- `shared/` - Common schemas and types

### Database Configuration
```javascript
const pool = new Pool({
  host: '135.235.154.222',
  port: 5432,
  database: 'account_replit_staging',
  user: 'pguser',
  password: 'StrongP@ss123',
  ssl: false
});
```

### Application Insights Logging
Every API endpoint includes comprehensive logging:
- Unique request IDs for tracking
- Start and completion logging with timing
- Error tracking with detailed messages
- Performance monitoring for slow queries

### Running the System
1. Install dependencies: `npm install`
2. Start development: `npm run dev`
3. Production server runs on port 3002

### API Endpoints
- Companies management
- Products with multi-company support
- Sales orders and purchase orders
- Invoices and bills with AR/AP tracking
- Receipts and payments
- Intercompany balances
- Credit/debit notes with product details
- Real-time reporting and analytics

### Deployment Ready
This package is production-ready with:
- External database connectivity
- Comprehensive error handling
- Performance monitoring
- Complete workflow tracking
- Enterprise-level logging

Built for multi-tenant accounting with authentic data from 42 companies.