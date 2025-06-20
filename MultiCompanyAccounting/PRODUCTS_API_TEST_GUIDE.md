# Products API Test Guide
Complete testing guide for the Products CRUD API endpoints

## Quick Test Commands

### 1. Get All Products
```bash
curl "http://localhost:3002/api/products"
```

### 2. Get Products for Company 7
```bash
curl "http://localhost:3002/api/products?companyId=7"
```

### 3. Create New Product
```bash
curl -X POST "http://localhost:3002/api/products" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Industrial Gas Cylinder",
    "description": "High-pressure industrial gas cylinder",
    "sku": "IGC-001",
    "sales_price": 150.00,
    "purchase_price": 100.00,
    "category": "Industrial Equipment",
    "company_id": 7,
    "unit_of_measure": "ea",
    "stock_quantity": 50,
    "reorder_level": 10
  }'
```

### 4. Update Product (Replace ID with actual product ID)
```bash
curl -X PUT "http://localhost:3002/api/products/1" \
  -H "Content-Type: application/json" \
  -d '{
    "sales_price": 160.00,
    "stock_quantity": 45
  }'
```

### 5. Get Single Product
```bash
curl "http://localhost:3002/api/products/1"
```

### 6. Search Products
```bash
curl "http://localhost:3002/api/products/search/gas?companyId=7"
```

### 7. Get Products by Category
```bash
curl "http://localhost:3002/api/products/category/Industrial%20Equipment?companyId=7"
```

### 8. Get Low Stock Products
```bash
curl "http://localhost:3002/api/products/low-stock?companyId=7"
```

### 9. Soft Delete Product
```bash
curl -X DELETE "http://localhost:3002/api/products/1"
```

### 10. Permanent Delete Product (only if not used)
```bash
curl -X DELETE "http://localhost:3002/api/products/1?permanent=true"
```

## Test Sequence

Run these commands in order to test the complete workflow:

```bash
# 1. Create a test product
PRODUCT_ID=$(curl -s -X POST "http://localhost:3002/api/products" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Gas Valve",
    "description": "Test product for API validation",
    "sku": "TEST-001",
    "sales_price": 75.00,
    "purchase_price": 45.00,
    "category": "Test Equipment",
    "company_id": 7,
    "unit_of_measure": "ea",
    "stock_quantity": 25,
    "reorder_level": 5
  }' | jq -r '.id')

echo "Created product with ID: $PRODUCT_ID"

# 2. Get the product
curl "http://localhost:3002/api/products/$PRODUCT_ID"

# 3. Update the product
curl -X PUT "http://localhost:3002/api/products/$PRODUCT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "sales_price": 80.00,
    "stock_quantity": 20
  }'

# 4. Search for the product
curl "http://localhost:3002/api/products/search/test?companyId=7"

# 5. Soft delete the product
curl -X DELETE "http://localhost:3002/api/products/$PRODUCT_ID"
```

## Validation Points

### Product Creation
- ✅ Validates required fields (name, company_id)
- ✅ Checks company existence
- ✅ Prevents duplicate SKU within company
- ✅ Sets default values for optional fields

### Product Updates
- ✅ Validates product existence
- ✅ Prevents duplicate SKU conflicts
- ✅ Uses COALESCE for partial updates
- ✅ Updates timestamp automatically

### Product Deletion
- ✅ Soft delete by default (sets status to inactive)
- ✅ Prevents permanent delete if used in transactions
- ✅ Checks usage in sales orders, purchase orders, credit notes, debit notes

### Search & Filtering
- ✅ Company-based isolation
- ✅ Category filtering
- ✅ Name/SKU/description search with ILIKE
- ✅ Low stock alerts based on reorder level

## Expected HTTP Status Codes

- 200 OK - Successful GET, PUT requests
- 201 Created - Successful POST requests
- 400 Bad Request - Missing required fields, duplicate SKU, invalid data
- 404 Not Found - Product not found
- 500 Internal Server Error - Database or server errors

## Error Testing

### Test Duplicate SKU
```bash
# Create first product
curl -X POST "http://localhost:3002/api/products" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Product 1",
    "sku": "DUPLICATE-001",
    "company_id": 7
  }'

# Try to create duplicate SKU (should fail)
curl -X POST "http://localhost:3002/api/products" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Product 2",
    "sku": "DUPLICATE-001",
    "company_id": 7
  }'
```

### Test Missing Required Fields
```bash
# Missing name (should fail)
curl -X POST "http://localhost:3002/api/products" \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": 7
  }'

# Missing company_id (should fail)
curl -X POST "http://localhost:3002/api/products" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Product"
  }'
```

### Test Invalid Company
```bash
# Non-existent company (should fail)
curl -X POST "http://localhost:3002/api/products" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Product",
    "company_id": 99999
  }'
```

## Integration with Existing System

The Products API integrates seamlessly with:
- Sales Orders (product_id references in sales_order_line_items)
- Purchase Orders (product_id references in purchase_order_line_items)
- Credit Notes (product_id references in credit_note_line_items)
- Debit Notes (product_id references in debit_note_line_items)
- Intercompany Adjustments (uses product details for line items)

## Database Schema Compatibility

Products table structure:
```sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sku VARCHAR(100),
  sales_price DECIMAL(10,2) DEFAULT 0,
  purchase_price DECIMAL(10,2) DEFAULT 0,
  category VARCHAR(100),
  company_id INTEGER REFERENCES companies(id),
  unit_of_measure VARCHAR(20) DEFAULT 'ea',
  stock_quantity INTEGER DEFAULT 0,
  reorder_level INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);
```

All endpoints maintain compatibility with this schema and the existing multi-company accounting system.