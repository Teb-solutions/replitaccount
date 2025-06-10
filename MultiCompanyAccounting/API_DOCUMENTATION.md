# Multi-Company Accounting System API Documentation

This document provides a comprehensive overview of all API endpoints available in the multi-company accounting system.

## Table of Contents

- [Authentication](#authentication)
- [Tenant & Companies](#tenant--companies)
- [Chart of Accounts](#chart-of-accounts)
- [Journal Entries](#journal-entries)
- [Invoices & Receivables](#invoices--receivables)
- [Credit Notes](#credit-notes)
- [Bills & Payables](#bills--payables)
- [Sales Orders](#sales-orders)
- [Purchase Orders](#purchase-orders)
- [Intercompany Transactions](#intercompany-transactions)
- [Dashboard Data](#dashboard-data)
- [Utilities](#utilities)

## Authentication

### Check Current User
- **URL:** `/api/auth/me`
- **Method:** `GET`
- **Description:** Returns the currently authenticated user or 401 if not authenticated
- **Returns:** User object or authentication error

### Login
- **URL:** `/api/auth/login`
- **Method:** `POST`
- **Description:** Authenticates a user and creates a session
- **Body Parameters:**
  - `email` (string): User's email address
  - `password` (string): User's password
- **Returns:** User object with authentication token

## Tenant & Companies

### Get Tenant Information
- **URL:** `/api/tenant`
- **Method:** `GET`
- **Description:** Returns information about the current tenant
- **Returns:** Tenant object with companies

### Get Companies
- **URL:** `/api/companies`
- **Method:** `GET`
- **Description:** Returns all companies in the current tenant
- **Returns:** Array of company objects

### Get Active Company
- **URL:** `/api/active-company`
- **Method:** `GET`
- **Description:** Gets the currently active company from the session
- **Returns:** Active company object

### Set Active Company
- **URL:** `/api/active-company`
- **Method:** `POST`
- **Description:** Sets the active company in the session
- **Body Parameters:**
  - `companyId` (number): ID of the company to set as active
- **Returns:** Updated active company object

## Chart of Accounts

### Get Account Types
- **URL:** `/api/account-types`
- **Method:** `GET`
- **Description:** Returns all account types (Asset, Liability, Equity, Revenue, Expense)
- **Returns:** Array of account type objects

### Get Accounts
- **URL:** `/api/accounts`
- **Method:** `GET`
- **Query Parameters:**
  - `companyId` (number): ID of the company to get accounts for
- **Description:** Returns chart of accounts for a specific company
- **Returns:** Array of account objects with balances

### Get Account Transactions
- **URL:** `/api/accounts/:id/transactions`
- **Method:** `GET`
- **URL Parameters:**
  - `id` (number): Account ID
- **Description:** Returns all transactions for a specific account
- **Returns:** Array of transaction objects

## Journal Entries

### Get Journal Entries
- **URL:** `/api/journal-entries`
- **Method:** `GET`
- **Query Parameters:**
  - `companyId` (number): ID of the company to get journal entries for
- **Description:** Returns all journal entries for a specific company
- **Returns:** Array of journal entry objects with totals

### Get Journal Entry
- **URL:** `/api/journal-entries/:id`
- **Method:** `GET`
- **URL Parameters:**
  - `id` (number): Journal entry ID
- **Description:** Returns details of a specific journal entry
- **Returns:** Journal entry object with its items

### Get Journal Entry Items
- **URL:** `/api/journal-entries/:id/items`
- **Method:** `GET`
- **URL Parameters:**
  - `id` (number): Journal entry ID
- **Description:** Returns all items in a specific journal entry
- **Returns:** Array of journal entry item objects

### Create Journal Entry
- **URL:** `/api/journal-entries`
- **Method:** `POST`
- **Body Parameters:**
  - `companyId` (number): Company ID
  - `date` (string): Entry date in ISO format
  - `description` (string): Description of the journal entry
  - `reference` (string): Reference number or document
  - `items` (array): Array of journal entry items with following properties:
    - `accountId` (number): Account ID
    - `description` (string): Description of the item
    - `debit` (number): Debit amount
    - `credit` (number): Credit amount
- **Description:** Creates a new journal entry with at least two items
- **Returns:** Created journal entry object with items

## Invoices & Receivables

### Get Invoices Summary
- **URL:** `/api/invoices/summary`
- **Method:** `GET`
- **Query Parameters:**
  - `companyId` (number): ID of the company to get invoice summary for
- **Description:** Returns summary statistics about invoices
- **Returns:** Invoice summary object with counts and totals

### Get Invoices
- **URL:** `/api/invoices`
- **Method:** `GET`
- **Query Parameters:**
  - `companyId` (number): ID of the company to get invoices for
- **Description:** Returns all invoices for a specific company
- **Returns:** Array of invoice objects

### Get Receipts Summary
- **URL:** `/api/receipts/summary`
- **Method:** `GET`
- **Query Parameters:**
  - `companyId` (number): ID of the company to get receipt summary for
- **Description:** Returns summary statistics about receipts
- **Returns:** Receipt summary object with counts and totals

## Credit Notes

### Get Credit Notes Summary
- **URL:** `/api/credit-notes/summary`
- **Method:** `GET`
- **Query Parameters:**
  - `companyId` (number): ID of the company to get credit note summary for
- **Description:** Returns summary statistics about credit notes
- **Returns:** Credit note summary object with counts, totals, and recent credit notes

### Get Credit Notes
- **URL:** `/api/credit-notes`
- **Method:** `GET`
- **Query Parameters:**
  - `companyId` (number): ID of the company to get credit notes for
- **Description:** Returns all credit notes for a specific company
- **Returns:** Array of credit note objects

### Get Credit Note Details
- **URL:** `/api/credit-notes/:id`
- **Method:** `GET`
- **URL Parameters:**
  - `id` (number): Credit note ID
- **Description:** Returns details of a specific credit note
- **Returns:** Credit note object with its items

### Create Credit Note
- **URL:** `/api/credit-notes`
- **Method:** `POST`
- **Body Parameters:**
  - `companyId` (number): Company ID
  - `customerId` (number): Customer ID
  - `invoiceId` (number, optional): Invoice ID if the credit note is linked to an invoice
  - `issueDate` (string): Issue date in ISO format
  - `dueDate` (string, optional): Due date in ISO format
  - `notes` (string, optional): Notes about the credit note
  - `items` (array): Array of credit note items with following properties:
    - `productId` (number, optional): Product ID
    - `description` (string): Description of the item
    - `quantity` (number): Quantity
    - `unitPrice` (number): Unit price
    - `taxRate` (number, optional): Tax rate
    - `amount` (number): Total amount
- **Description:** Creates a new credit note which reduces accounts receivable and revenue for returns or adjustments
- **Returns:** Created credit note object with items and generated journal entries

## Bills & Payables

### Get Bills Summary
- **URL:** `/api/bills/summary`
- **Method:** `GET`
- **Query Parameters:**
  - `companyId` (number): ID of the company to get bill summary for
- **Description:** Returns summary statistics about bills
- **Returns:** Bill summary object with counts and totals

### Get Payments Summary
- **URL:** `/api/payments/summary`
- **Method:** `GET`
- **Query Parameters:**
  - `companyId` (number): ID of the company to get payment summary for
- **Description:** Returns summary statistics about payments
- **Returns:** Payment summary object with counts and totals

## Sales Orders

### Get Sales Orders Summary
- **URL:** `/api/sales-orders/summary`
- **Method:** `GET`
- **Query Parameters:**
  - `companyId` (number): ID of the company to get sales order summary for
- **Description:** Returns summary statistics about sales orders
- **Returns:** Sales order summary object with counts and totals

### Get Sales Orders
- **URL:** `/api/sales-orders`
- **Method:** `GET`
- **Query Parameters:**
  - `companyId` (number): ID of the company to get sales orders for
- **Description:** Returns all sales orders for a specific company
- **Returns:** Array of sales order objects

### Get Customers
- **URL:** `/api/customers`
- **Method:** `GET`
- **Query Parameters:**
  - `companyId` (number): ID of the company to get customers for
- **Description:** Returns all customers for a specific company
- **Returns:** Array of customer objects

## Purchase Orders

### Get Purchase Orders Summary
- **URL:** `/api/purchase-orders/summary`
- **Method:** `GET`
- **Query Parameters:**
  - `companyId` (number): ID of the company to get purchase order summary for
- **Description:** Returns summary statistics about purchase orders
- **Returns:** Purchase order summary object with counts and totals

## Intercompany Transactions

### Create Intercompany Invoice
- **URL:** `/api/intercompany-invoices`
- **Method:** `POST`
- **Body Parameters:**
  - `sourceCompanyId` (number): Source company ID (seller)
  - `targetCompanyId` (number): Target company ID (buyer)
  - `amount` (number): Invoice amount
  - `description` (string): Description of the invoice
  - `items` (array, optional): Line items for the invoice
- **Description:** Creates an invoice from one company to another within the same tenant
- **Returns:** Created invoice object with corresponding journal entries

### Create Intercompany Transaction
- **URL:** `/api/intercompany-transactions`
- **Method:** `POST`
- **Body Parameters:**
  - `sourceCompanyId` (number): Source company ID
  - `targetCompanyId` (number): Target company ID
  - `amount` (number): Transaction amount
  - `description` (string): Description of the transaction
- **Description:** Creates a direct transaction between two companies
- **Returns:** Created transaction object with corresponding journal entries

### Create Intercompany Receipt
- **URL:** `/api/intercompany-receipts`
- **Method:** `POST`
- **Body Parameters:**
  - `invoiceId` (number): Invoice ID to create receipt for
  - `amount` (number): Receipt amount
  - `paymentMethod` (string): Payment method
  - `reference` (string, optional): Receipt reference
- **Description:** Creates a receipt for an intercompany invoice
- **Returns:** Created receipt object with corresponding journal entries

### Get Intercompany Transactions
- **URL:** `/api/intercompany-transactions`
- **Method:** `GET`
- **Query Parameters:**
  - `companyId` (number): ID of the company to get transactions for
- **Description:** Returns all intercompany transactions for a specific company
- **Returns:** Array of intercompany transaction objects

## Dashboard Data

### Get Dashboard Stats
- **URL:** `/api/dashboard/stats`
- **Method:** `GET`
- **Query Parameters:**
  - `companyId` (number): ID of the company to get dashboard stats for
- **Description:** Returns key financial statistics for the dashboard
- **Returns:** Dashboard stats object with revenue, expenses, receivables, and payables

### Get Cash Flow Data
- **URL:** `/api/dashboard/cash-flow`
- **Method:** `GET`
- **Query Parameters:**
  - `companyId` (number): ID of the company to get cash flow data for
- **Description:** Returns cash flow data for the dashboard chart
- **Returns:** Array of cash flow data points with dates and balances

### Get Monthly P&L Data
- **URL:** `/api/dashboard/pl-monthly`
- **Method:** `GET`
- **Query Parameters:**
  - `companyId` (number): ID of the company to get P&L data for
- **Description:** Returns monthly profit & loss data for the dashboard chart
- **Returns:** Array of monthly P&L data with revenue, expenses, and profit

### Get Recent Transactions
- **URL:** `/api/dashboard/recent-transactions`
- **Method:** `GET`
- **Query Parameters:**
  - `companyId` (number): ID of the company to get recent transactions for
- **Description:** Returns recent transactions for the dashboard
- **Returns:** Array of recent transaction objects from various sources (invoices, bills, journals)

### Get Pending Actions
- **URL:** `/api/dashboard/pending-actions`
- **Method:** `GET`
- **Description:** Returns pending actions that require attention
- **Returns:** Array of pending action objects

## Utilities

### Test Connection
- **URL:** `/api/test`
- **Method:** `GET`
- **Description:** Simple endpoint to test if API is responding
- **Returns:** Status message

### Get Accounts Direct (Testing)
- **URL:** `/api/test/accounts-direct`
- **Method:** `GET`
- **Query Parameters:**
  - `companyId` (number): Company ID
- **Description:** Direct database access endpoint for testing accounts
- **Returns:** Raw account data from database

### Get Bills Direct (Testing)
- **URL:** `/api/test/bills-direct`
- **Method:** `GET`
- **Query Parameters:**
  - `companyId` (number): Company ID
- **Description:** Direct database access endpoint for testing bills
- **Returns:** Raw bill data from database