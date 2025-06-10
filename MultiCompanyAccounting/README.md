# Multi-Company Accounting System

A sophisticated multi-tenant accounting platform with advanced enterprise financial management capabilities, focusing on robust API infrastructure and comprehensive reference tracking systems.

## 🚀 Features

### Core Accounting
- **Multi-Company Management** - Handle multiple companies with separate chart of accounts
- **Double-Entry Bookkeeping** - Automatic journal entries for all transactions
- **Intercompany Transactions** - Seamless transactions between related companies
- **Cash Flow Tracking** - Complete receipts and bill payments system

### Financial Operations
- **Sales Orders & Purchase Orders** - Full order management lifecycle
- **Invoicing & Billing** - Automated invoice generation and tracking
- **Payment Processing** - Receipt and payment tracking with reference numbers
- **Account Balances** - Real-time account balance calculations

### Reporting & Analytics
- **Financial Reports** - Balance sheet, P&L, cash flow statements
- **Dashboard Analytics** - Real-time financial KPIs and summaries
- **Intercompany Balances** - Track receivables/payables between companies
- **Reference Tracking** - Comprehensive transaction reference system

## 🛠 Technical Stack

- **Frontend**: React.js with TypeScript, TailwindCSS, shadcn/ui
- **Backend**: Node.js/Express with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with session management
- **API Documentation**: Swagger/OpenAPI integration

## 📦 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Environment variables configured

### Installation

1. **Clone and install dependencies**
```bash
npm install
```

2. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. **Set up database**
```bash
npm run db:push
npm run db:seed
```

4. **Start development server**
```bash
npm run dev
```

5. **Build for production**
```bash
npm run build
npm start
```

## 🌐 Deployment Ready

The application is optimized for production deployment with:
- Production build scripts
- Environment variable configuration
- Session management
- Database connection pooling
- Comprehensive error handling

## 📊 API Endpoints

### Companies
- `GET /api/companies` - List all companies
- `POST /api/companies` - Create new company

### Financial Transactions
- `GET /api/sales-orders` - Sales orders management
- `GET /api/purchase-orders` - Purchase orders management
- `GET /api/invoices` - Invoice management
- `GET /api/bills` - Bill management

### Payments
- `GET /api/receipts` - Payment receipts
- `GET /api/bill-payments` - Outgoing payments
- `POST /api/bill-payments/from-purchase-order` - Create payment from PO

### Reporting
- `GET /api/reports/balance-sheet` - Balance sheet data
- `GET /api/reports/profit-loss` - P&L statements
- `GET /api/intercompany-balances` - Intercompany relationships

## 🔧 Configuration

### Environment Variables
See `.env.example` for required configuration:
- Database connection settings
- Session secrets
- Optional third-party integrations

### Database Schema
The system uses PostgreSQL with these core tables:
- `companies` - Company master data
- `accounts` - Chart of accounts
- `sales_orders` / `purchase_orders` - Order management
- `invoices` / `bills` - Billing documents
- `receipts` / `bill_payments` - Payment tracking
- `journal_entries` - Double-entry bookkeeping

## 🔐 Security Features

- Session-based authentication
- Environment variable protection
- SQL injection prevention via ORM
- CORS configuration for production
- Secure cookie settings

## 📈 Production Deployment

Ready for deployment on platforms like:
- Replit Deployments
- Vercel
- Railway
- AWS/GCP/Azure
- Docker containers

The build process creates optimized bundles for both frontend and backend, with all dependencies properly configured for production environments.