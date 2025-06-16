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
