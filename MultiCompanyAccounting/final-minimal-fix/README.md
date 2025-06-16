# Multi-Company Accounting System - Complete Deployment

## Overview
This is a complete multi-company accounting system with all required endpoints and authentic data from external database at 135.235.154.222.

## Features Included

### 1. Company Management
- **GET /api/companies** - Get all companies (returns 23 authentic companies)
- **POST /api/companies** - Create new company with automatic chart of accounts generation

### 2. Intercompany Operations (Dual-Company Transactions)
- **POST /api/intercompany/sales-order** - Creates sales order in source company + purchase order in target company
- **POST /api/intercompany/invoice** - Creates sales invoice in source company + purchase bill in target company
- **POST /api/intercompany/payment** - Creates payment in source company + receipt in target company

### 3. Transaction Reference System
- **GET /api/reference/:reference** - Lookup any transaction by reference number

### 4. Chart of Accounts
- **GET /api/accounts?companyId={id}** - Get chart of accounts for specific company
- **POST /api/accounts** - Create new account for company

### 5. Enhanced Financial Summaries with Complete Workflow Tracking
- **GET /api/invoices/summary?companyId={id}** - Enhanced AR summary with sales order → invoice → receipt tracking, customer breakdown, and intercompany relationship identification
- **GET /api/bills/summary?companyId={id}** - Enhanced AP summary with purchase order → bill → payment tracking, vendor breakdown, and intercompany relationship identification  
- **GET /api/intercompany-balances?companyId={id}** - Intercompany balance tracking

## Installation

1. Extract the tar file
2. Install dependencies: `npm install`
3. Start the server: `npm start`

## Database Connection
The system connects to the external database at 135.235.154.222 with authentic business data from 23 real companies.

## Test Data Available
- Gas Manufacturing Company (ID: 7): 84 sales orders, $442K invoices
- Gas Distributor Company (ID: 8): $153K purchase orders, $229.6K bills
- Existing intercompany relationship with Sales Order 134 ($5,000)

## Port
Server runs on port 3002 by default, configurable via PORT environment variable.