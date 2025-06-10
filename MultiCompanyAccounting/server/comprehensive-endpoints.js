/**
 * Comprehensive AR-AP and Order Reporting Endpoints
 * 
 * This file contains all the comprehensive endpoints for detailed
 * AR-AP breakdown and order reporting with authentic data.
 */

export function registerComprehensiveEndpoints(app) {
  const { pool: externalPool } = require('./database-config');

  // Add detailed AR-AP breakdown endpoint with individual order details
  app.get('/api/ar-ap-detailed', async (req, res) => {
    try {
      const companyId = parseInt(req.query.companyId);
      console.log(`💰 Getting detailed AR-AP breakdown for company ${companyId}`);
      
      // Get sales orders with complete invoice and receipt details
      const detailedQuery = `
        SELECT 
          so.id as sales_order_id,
          so.order_number,
          so.order_date,
          so.order_total,
          so.status as order_status,
          so.customer_id,
          c.name as customer_name,
          
          i.id as invoice_id,
          i.invoice_number,
          i.invoice_date,
          i.total_amount as invoice_amount,
          i.status as invoice_status,
          i.due_date as invoice_due_date,
          
          r.id as receipt_id,
          r.receipt_number,
          r.receipt_date,
          r.amount as receipt_amount,
          
          soi.quantity,
          soi.unit_price,
          soi.total as item_total,
          p.name as product_name,
          p.sku as product_sku
          
        FROM sales_orders so
        LEFT JOIN companies c ON so.customer_id = c.id
        LEFT JOIN invoices i ON so.id = i.sales_order_id
        LEFT JOIN receipts r ON i.id = r.invoice_id
        LEFT JOIN sales_order_items soi ON so.id = soi.sales_order_id
        LEFT JOIN products p ON soi.product_id = p.id
        WHERE so.company_id = $1
        ORDER BY so.order_date DESC, so.id DESC
      `;
      
      const result = await externalPool.query(detailedQuery, [companyId]);
      
      // Process results exactly as requested
      const ordersMap = new Map();
      result.rows.forEach((row) => {
        const orderId = row.sales_order_id;
        if (!ordersMap.has(orderId)) {
          ordersMap.set(orderId, {
            salesOrderId: orderId,
            salesOrderNumber: row.order_number,
            date: row.order_date,
            customerId: row.customer_id,
            customerName: row.customer_name || 'Direct Customer',
            amount: parseFloat(row.order_total || 0),
            status: row.order_status,
            invoice: row.invoice_id ? {
              invoiceId: row.invoice_id,
              invoiceNumber: row.invoice_number,
              invoiceDate: row.invoice_date,
              dueDate: row.invoice_due_date,
              amount: parseFloat(row.invoice_amount || 0),
              status: row.invoice_status || 'pending'
            } : null,
            receipts: [],
            items: []
          });
        }
        
        const order = ordersMap.get(orderId);
        
        // Add receipt if exists and not already added
        if (row.receipt_id && !order.receipts.find((r) => r.receiptId === row.receipt_id)) {
          order.receipts.push({
            receiptId: row.receipt_id,
            receiptNumber: row.receipt_number,
            receiptDate: row.receipt_date,
            amount: parseFloat(row.receipt_amount || 0)
          });
        }
        
        // Add item if exists and not already added
        if (row.product_name && !order.items.find((i) => i.productName === row.product_name && i.unitPrice === parseFloat(row.unit_price || 0))) {
          order.items.push({
            productName: row.product_name,
            productSku: row.product_sku,
            quantity: parseFloat(row.quantity || 0),
            unitPrice: parseFloat(row.unit_price || 0),
            total: parseFloat(row.item_total || 0)
          });
        }
      });
      
      const salesOrderDetails = Array.from(ordersMap.values());
      
      // Calculate totals as requested
      const totalOrderValue = salesOrderDetails.reduce((sum, order) => sum + order.amount, 0);
      const totalInvoiced = salesOrderDetails
        .filter((order) => order.invoice)
        .reduce((sum, order) => sum + order.invoice.amount, 0);
      const totalReceived = salesOrderDetails
        .reduce((sum, order) => sum + order.receipts.reduce((rSum, receipt) => rSum + receipt.amount, 0), 0);
      const outstandingBalance = totalInvoiced - totalReceived;
      
      // Get company information
      const companyQuery = `SELECT name FROM companies WHERE id = $1`;
      const companyResult = await externalPool.query(companyQuery, [companyId]);
      const companyName = companyResult.rows[0]?.name || `Company ${companyId}`;
      
      const response = {
        companyId: companyId,
        companyName: companyName,
        reportDate: new Date().toISOString().split('T')[0],
        
        summary: {
          totalOrders: salesOrderDetails.length,
          totalOrderValue: totalOrderValue,
          totalInvoiced: totalInvoiced,
          totalReceived: totalReceived,
          outstandingBalance: outstandingBalance
        },
        
        // This is exactly what you requested - each order with invoice details and payment amounts
        salesOrderDetails: salesOrderDetails
      };
      
      console.log(`✅ Generated detailed AR-AP response: ${salesOrderDetails.length} orders, $${totalOrderValue.toLocaleString()} total`);
      res.json(response);
      
    } catch (error) {
      console.error('❌ Error getting detailed AR-AP summary:', error);
      res.status(500).json({ 
        error: 'Failed to get detailed AR-AP summary',
        details: error.message 
      });
    }
  });

  // Add comprehensive sales orders report endpoint
  app.get('/api/reports/sales-orders-comprehensive/:companyId', async (req, res) => {
    try {
      const companyId = parseInt(req.params.companyId);
      console.log(`📋 Getting comprehensive sales order report for company ${companyId}`);
      
      const salesOrdersQuery = `
        SELECT 
          so.id as sales_order_id,
          so.order_number,
          so.order_date,
          so.order_total,
          so.status,
          so.customer_id,
          c.name as customer_name,
          
          i.id as invoice_id,
          i.invoice_number,
          i.invoice_date,
          i.total_amount as invoice_amount,
          i.status as invoice_status,
          
          r.id as receipt_id,
          r.receipt_number,
          r.receipt_date,
          r.amount as receipt_amount,
          
          soi.quantity,
          soi.unit_price,
          soi.total as item_total,
          p.name as product_name,
          p.sku as product_sku
          
        FROM sales_orders so
        LEFT JOIN companies c ON so.customer_id = c.id
        LEFT JOIN invoices i ON so.id = i.sales_order_id
        LEFT JOIN receipts r ON i.id = r.invoice_id
        LEFT JOIN sales_order_items soi ON so.id = soi.sales_order_id
        LEFT JOIN products p ON soi.product_id = p.id
        WHERE so.company_id = $1
        ORDER BY so.order_date DESC, so.id DESC
      `;
      
      const result = await externalPool.query(salesOrdersQuery, [companyId]);
      
      // Process results into structured format
      const ordersMap = new Map();
      result.rows.forEach((row) => {
        const orderId = row.sales_order_id;
        if (!ordersMap.has(orderId)) {
          ordersMap.set(orderId, {
            salesOrderId: orderId,
            orderNumber: row.order_number,
            orderDate: row.order_date,
            orderTotal: parseFloat(row.order_total || 0),
            status: row.status,
            customerId: row.customer_id,
            customerName: row.customer_name || 'Direct Customer',
            invoices: [],
            receipts: [],
            items: []
          });
        }
        
        const order = ordersMap.get(orderId);
        
        // Add invoice if exists
        if (row.invoice_id && !order.invoices.find((i) => i.invoiceId === row.invoice_id)) {
          order.invoices.push({
            invoiceId: row.invoice_id,
            invoiceNumber: row.invoice_number,
            invoiceDate: row.invoice_date,
            amount: parseFloat(row.invoice_amount || 0),
            status: row.invoice_status
          });
        }
        
        // Add receipt if exists
        if (row.receipt_id && !order.receipts.find((r) => r.receiptId === row.receipt_id)) {
          order.receipts.push({
            receiptId: row.receipt_id,
            receiptNumber: row.receipt_number,
            receiptDate: row.receipt_date,
            amount: parseFloat(row.receipt_amount || 0)
          });
        }
        
        // Add items
        if (row.product_name && !order.items.find((i) => i.productName === row.product_name && i.unitPrice === parseFloat(row.unit_price || 0))) {
          order.items.push({
            productName: row.product_name,
            productSku: row.product_sku,
            quantity: parseFloat(row.quantity || 0),
            unitPrice: parseFloat(row.unit_price || 0),
            total: parseFloat(row.item_total || 0)
          });
        }
      });
      
      const salesOrdersData = Array.from(ordersMap.values());
      console.log(`✅ Generated comprehensive sales orders report: ${salesOrdersData.length} orders`);
      res.json(salesOrdersData);
      
    } catch (error) {
      console.error('❌ Error in comprehensive sales orders report:', error);
      res.status(500).json({ error: 'Failed to get comprehensive sales orders report' });
    }
  });

  // Add comprehensive purchase orders report endpoint
  app.get('/api/reports/purchase-orders-comprehensive/:companyId', async (req, res) => {
    try {
      const companyId = parseInt(req.params.companyId);
      console.log(`📋 Getting comprehensive purchase order report for company ${companyId}`);
      
      const purchaseOrdersQuery = `
        SELECT 
          po.id as purchase_order_id,
          po.order_number,
          po.order_date,
          po.order_total,
          po.status,
          po.vendor_id,
          v.name as vendor_name,
          
          b.id as bill_id,
          b.bill_number,
          b.bill_date,
          b.total_amount as bill_amount,
          b.status as bill_status,
          
          p.id as payment_id,
          p.payment_number,
          p.payment_date,
          p.amount as payment_amount,
          
          poi.quantity,
          poi.unit_price,
          poi.total as item_total,
          prod.name as product_name,
          prod.sku as product_sku
          
        FROM purchase_orders po
        LEFT JOIN companies v ON po.vendor_id = v.id
        LEFT JOIN bills b ON po.id = b.purchase_order_id
        LEFT JOIN payments p ON b.id = p.bill_id
        LEFT JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
        LEFT JOIN products prod ON poi.product_id = prod.id
        WHERE po.company_id = $1
        ORDER BY po.order_date DESC, po.id DESC
      `;
      
      const result = await externalPool.query(purchaseOrdersQuery, [companyId]);
      
      // Process results into structured format
      const ordersMap = new Map();
      result.rows.forEach((row) => {
        const orderId = row.purchase_order_id;
        if (!ordersMap.has(orderId)) {
          ordersMap.set(orderId, {
            purchaseOrderId: orderId,
            orderNumber: row.order_number,
            orderDate: row.order_date,
            orderTotal: parseFloat(row.order_total || 0),
            status: row.status,
            vendorId: row.vendor_id,
            vendorName: row.vendor_name || 'Direct Vendor',
            bills: [],
            payments: [],
            items: []
          });
        }
        
        const order = ordersMap.get(orderId);
        
        // Add bill if exists
        if (row.bill_id && !order.bills.find((b) => b.billId === row.bill_id)) {
          order.bills.push({
            billId: row.bill_id,
            billNumber: row.bill_number,
            billDate: row.bill_date,
            amount: parseFloat(row.bill_amount || 0),
            status: row.bill_status
          });
        }
        
        // Add payment if exists
        if (row.payment_id && !order.payments.find((p) => p.paymentId === row.payment_id)) {
          order.payments.push({
            paymentId: row.payment_id,
            paymentNumber: row.payment_number,
            paymentDate: row.payment_date,
            amount: parseFloat(row.payment_amount || 0)
          });
        }
        
        // Add items
        if (row.product_name && !order.items.find((i) => i.productName === row.product_name && i.unitPrice === parseFloat(row.unit_price || 0))) {
          order.items.push({
            productName: row.product_name,
            productSku: row.product_sku,
            quantity: parseFloat(row.quantity || 0),
            unitPrice: parseFloat(row.unit_price || 0),
            total: parseFloat(row.item_total || 0)
          });
        }
      });
      
      const purchaseOrdersData = Array.from(ordersMap.values());
      console.log(`✅ Generated comprehensive purchase orders report: ${purchaseOrdersData.length} orders`);
      res.json(purchaseOrdersData);
      
    } catch (error) {
      console.error('❌ Error in comprehensive purchase orders report:', error);
      res.status(500).json({ error: 'Failed to get comprehensive purchase orders report' });
    }
  });

  console.log('✅ Comprehensive AR-AP and Order endpoints registered successfully');
}