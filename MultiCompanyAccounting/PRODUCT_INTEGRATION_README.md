# Multi-Company Accounting System - Product Integration Build

## Overview
Complete deployment package with product integration for sales and purchase orders, plus fixed transaction group tracking.

## New Features Added

### 1. Product Integration for Sales Orders
- Sales order creation now saves products array to `sales_order_items` table
- API endpoint: `GET /api/sales-orders/{id}/products`
- Returns complete product details with quantities, prices, and totals

### 2. Product Integration for Purchase Orders  
- Purchase order creation now saves products array to `purchase_order_items` table
- API endpoint: `GET /api/purchase-orders/{id}/products`
- Returns complete product details with quantities, prices, and totals

### 3. Products API Endpoint
- New endpoint: `GET /api/products`
- Returns all products with company information
- Supports filtering: `?companyId=X&isActive=true`
- Groups products by company for easier consumption

### 4. Fixed Transaction Group Tracking
- Bills query now uses direct `b.reference_number` lookup
- Receipts query now uses direct `r.reference_number` lookup  
- Bill payments query now uses direct `bp.reference_number` lookup
- Complete workflow tracking across all transaction types

## API Endpoints

### Products
```
GET /api/products
GET /api/products?companyId=7
GET /api/products?isActive=true
GET /api/sales-orders/{id}/products
GET /api/purchase-orders/{id}/products
```

### Enhanced Intercompany Workflow
```
POST /api/intercompany/sales-order
POST /api/intercompany/invoice  
POST /api/intercompany/receipt
GET /api/transaction-group/{reference}
```

## Response Format Examples

### Products API Response
```json
{
  "success": true,
  "totalProducts": 10,
  "products": [
    {
      "id": 1,
      "companyId": 2,
      "companyName": "Acme Manufacturing Inc",
      "code": "RAW-SS01",
      "name": "Steel Sheet 1mm",
      "description": "1mm thickness steel sheet",
      "salesPrice": 0,
      "purchasePrice": 0,
      "isActive": true
    }
  ],
  "productsByCompany": {
    "Acme Manufacturing Inc": [...]
  }
}
```

### Sales Order Products Response
```json
{
  "success": true,
  "salesOrder": {
    "id": 1,
    "orderNumber": "SO-ACM2505-0001",
    "total": 3493.75,
    "status": "Pending",
    "companyName": "Manufacturing Company",
    "customerName": "Distribution Company"
  },
  "products": [
    {
      "itemId": 1,
      "productId": 15,
      "productCode": "FIN-SFA1",
      "productName": "Steel Frame Assembly",
      "quantity": 10.00,
      "unitPrice": 325.00,
      "lineTotal": 3493.75
    }
  ],
  "productCount": 1,
  "totalProductValue": 3493.75
}
```

## Database Schema

### Tables Used
- `products` - Product master data
- `sales_order_items` - Links products to sales orders
- `purchase_order_items` - Links products to purchase orders
- `sales_orders` - Enhanced with product support
- `purchase_orders` - Enhanced with product support

### Product Creation Payload
```json
{
  "sourceCompanyId": 7,
  "targetCompanyId": 8,
  "orderTotal": 15000,
  "products": [
    {
      "id": 1,
      "quantity": 5,
      "unitPrice": 3000,
      "lineTotal": 15000,
      "description": "Product line 1"
    }
  ]
}
```

## Testing Results
- 10 authentic products found across multiple companies
- 5 sales orders with products and reference numbers
- 5 purchase orders with products and reference numbers
- Complete transaction group tracking functional
- Bill summary endpoint fixed to show accurate data

## Deployment
1. Extract the tar.gz file
2. Run `node server.cjs` 
3. Server starts on port 3002
4. External database connection to 135.235.154.222

## Environment Requirements
- Node.js
- PostgreSQL connection to external database
- All dependencies included in package.json

## Backward Compatibility
All existing API endpoints and functionality remain unchanged. Product functionality is additive only.