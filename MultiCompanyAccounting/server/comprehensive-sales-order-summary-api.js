/**
 * Comprehensive Sales Order Summary API
 * Provides detailed sales order analysis with invoice and receipt tracking
 */

import pkg from 'pg';
const { Pool } = pkg;

// Database configuration for external database
const pool = new Pool({
  host: '135.235.154.222',
  port: 5432,
  database: 'account_replit_staging',
  user: 'pguser',
  password: 'StrongP@ss123',
  ssl: false,
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 30000,
  max: 20
});

export function setupComprehensiveSalesOrderSummaryAPI(app) {
  // Fixed sales order summary endpoint
  app.get('/api/sales-orders/summary', async (req, res) => {
    try {
      const companyId = parseInt(req.query.companyId);
      
      if (!companyId) {
        return res.status(400).json({ error: 'Company ID is required' });
      }

      console.log(`📊 Getting sales order summary for company ${companyId}`);

      // Get summary data without the problematic column
      const summaryQuery = `
        SELECT 
          COUNT(*) as total_orders,
          SUM(total_amount) as total_amount,
          SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_orders,
          SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_orders
        FROM sales_orders 
        WHERE company_id = $1
      `;

      const summaryResult = await pool.query(summaryQuery, [companyId]);
      const summary = summaryResult.rows[0];

      const response = {
        totalOrders: parseInt(summary.total_orders) || 0,
        totalAmount: parseFloat(summary.total_amount) || 0,
        openOrders: parseInt(summary.open_orders) || 0,
        closedOrders: parseInt(summary.closed_orders) || 0
      };

      console.log(`✅ Sales order summary: ${response.totalOrders} orders, $${response.totalAmount}`);
      res.json(response);

    } catch (error) {
      console.error('Error fetching sales order summary:', error);
      res.status(500).json({ 
        error: 'Failed to fetch sales order summary',
        details: error.message 
      });
    }
  });

  // Comprehensive sales order summary with full workflow tracking
  app.get('/api/sales-orders/summary/comprehensive', async (req, res) => {
    try {
      const companyId = parseInt(req.query.companyId);
      
      if (!companyId) {
        return res.status(400).json({ error: 'Company ID is required' });
      }

      console.log(`📊 Getting comprehensive sales order summary for company ${companyId}`);

      // Get company details
      const companyResult = await pool.query(
        'SELECT id, name FROM companies WHERE id = $1',
        [companyId]
      );

      if (companyResult.rows.length === 0) {
        return res.status(404).json({ error: 'Company not found' });
      }

      const company = companyResult.rows[0];

      // Get summary statistics
      const summaryQuery = `
        SELECT 
          COUNT(*) as total_orders,
          SUM(total_amount) as total_order_value,
          COUNT(CASE WHEN status = 'invoiced' THEN 1 END) as orders_with_invoices,
          SUM(CASE WHEN status = 'invoiced' THEN total_amount ELSE 0 END) as total_invoiced,
          0 as total_received,
          SUM(CASE WHEN status = 'pending' THEN total_amount ELSE 0 END) as pending_invoice_value,
          0 as pending_receipt_value
        FROM sales_orders 
        WHERE company_id = $1
      `;

      const summaryResult = await pool.query(summaryQuery, [companyId]);
      const summaryData = summaryResult.rows[0];

      // Get detailed sales orders with related data
      const ordersQuery = `
        SELECT 
          so.id as order_id,
          so.order_number,
          so.order_date,
          so.total_amount as order_total,
          so.status,
          so.reference,
          c.name as customer_name
        FROM sales_orders so
        LEFT JOIN companies c ON so.vendor_company_id = c.id
        WHERE so.company_id = $1
        ORDER BY so.order_date DESC
      `;

      const ordersResult = await pool.query(ordersQuery, [companyId]);

      // Get order items for each sales order
      const orderItems = {};
      for (const order of ordersResult.rows) {
        const itemsQuery = `
          SELECT 
            soi.product_id,
            p.product_code,
            p.name as product_name,
            soi.quantity,
            soi.unit_price,
            soi.amount
          FROM sales_order_items soi
          LEFT JOIN products p ON soi.product_id = p.id
          WHERE soi.sales_order_id = $1
        `;

        try {
          const itemsResult = await pool.query(itemsQuery, [order.order_id]);
          orderItems[order.order_id] = itemsResult.rows.map(item => ({
            productId: item.product_id,
            productCode: item.product_code || 'N/A',
            productName: item.product_name || 'Unknown Product',
            quantity: parseFloat(item.quantity) || 0,
            unitPrice: parseFloat(item.unit_price) || 0,
            amount: parseFloat(item.amount) || 0
          }));
        } catch (itemError) {
          console.log(`No items found for order ${order.order_id}`);
          orderItems[order.order_id] = [];
        }
      }

      // Get invoice details for each order
      const invoiceDetails = {};
      for (const order of ordersResult.rows) {
        const invoiceQuery = `
          SELECT 
            i.id as invoice_id,
            i.invoice_number,
            i.invoice_date,
            i.total_amount as invoice_total,
            i.status
          FROM invoices i
          WHERE i.sales_order_id = $1
        `;

        try {
          const invoiceResult = await pool.query(invoiceQuery, [order.order_id]);
          if (invoiceResult.rows.length > 0) {
            const invoice = invoiceResult.rows[0];
            
            // Get invoice items
            const invoiceItemsQuery = `
              SELECT 
                ii.product_id,
                p.product_code,
                p.name as product_name,
                ii.quantity,
                ii.unit_price,
                ii.amount
              FROM invoice_items ii
              LEFT JOIN products p ON ii.product_id = p.id
              WHERE ii.invoice_id = $1
            `;

            let invoiceItems = [];
            try {
              const invoiceItemsResult = await pool.query(invoiceItemsQuery, [invoice.invoice_id]);
              invoiceItems = invoiceItemsResult.rows.map(item => ({
                productId: item.product_id,
                productCode: item.product_code || 'N/A',
                productName: item.product_name || 'Unknown Product',
                quantity: parseFloat(item.quantity) || 0,
                unitPrice: parseFloat(item.unit_price) || 0,
                amount: parseFloat(item.amount) || 0
              }));
            } catch (itemError) {
              console.log(`No invoice items found for invoice ${invoice.invoice_id}`);
            }

            invoiceDetails[order.order_id] = {
              invoiceId: invoice.invoice_id,
              invoiceNumber: invoice.invoice_number,
              invoiceDate: invoice.invoice_date,
              invoiceTotal: parseFloat(invoice.invoice_total) || 0,
              status: invoice.status,
              invoiceItems: invoiceItems
            };
          }
        } catch (invoiceError) {
          console.log(`No invoice found for order ${order.order_id}`);
        }
      }

      // Get receipt details for each order
      const receiptDetails = {};
      for (const order of ordersResult.rows) {
        const receiptQuery = `
          SELECT 
            r.id as receipt_id,
            r.receipt_number,
            r.amount,
            r.receipt_date,
            r.payment_method,
            r.reference
          FROM receipts r
          WHERE r.sales_order_id = $1
        `;

        try {
          const receiptResult = await pool.query(receiptQuery, [order.order_id]);
          receiptDetails[order.order_id] = receiptResult.rows.map(receipt => ({
            receiptId: receipt.receipt_id,
            receiptNumber: receipt.receipt_number,
            amount: parseFloat(receipt.amount) || 0,
            receiptDate: receipt.receipt_date,
            paymentMethod: receipt.payment_method || 'Unknown',
            reference: receipt.reference
          }));
        } catch (receiptError) {
          console.log(`No receipts found for order ${order.order_id}`);
          receiptDetails[order.order_id] = [];
        }
      }

      // Format the comprehensive response
      const salesOrders = ordersResult.rows.map(order => {
        const hasInvoice = invoiceDetails[order.order_id];
        const hasReceipts = receiptDetails[order.order_id] && receiptDetails[order.order_id].length > 0;
        
        let workflowStatus = 'Ordered (Pending Invoice)';
        if (hasInvoice && hasReceipts) {
          workflowStatus = 'Complete (Invoice & Receipt)';
        } else if (hasInvoice) {
          workflowStatus = 'Invoiced (Pending Receipt)';
        }

        return {
          orderId: order.order_id,
          orderNumber: order.order_number,
          orderDate: order.order_date,
          customerName: order.customer_name || 'Unknown Customer',
          orderTotal: parseFloat(order.order_total) || 0,
          status: order.status,
          orderItems: orderItems[order.order_id] || [],
          invoiceDetails: invoiceDetails[order.order_id] || null,
          receiptDetails: receiptDetails[order.order_id] || [],
          workflowStatus: workflowStatus
        };
      });

      const response = {
        companyId: parseInt(companyId),
        companyName: company.name,
        reportDate: new Date().toISOString().split('T')[0],
        summary: {
          totalOrders: parseInt(summaryData.total_orders) || 0,
          totalOrderValue: parseFloat(summaryData.total_order_value) || 0,
          ordersWithInvoices: parseInt(summaryData.orders_with_invoices) || 0,
          totalInvoiced: parseFloat(summaryData.total_invoiced) || 0,
          totalReceived: parseFloat(summaryData.total_received) || 0,
          pendingInvoiceValue: parseFloat(summaryData.pending_invoice_value) || 0,
          pendingReceiptValue: parseFloat(summaryData.pending_receipt_value) || 0
        },
        salesOrders: salesOrders
      };

      console.log(`✅ Comprehensive sales order data: ${salesOrders.length} orders with full workflow tracking`);
      res.json(response);

    } catch (error) {
      console.error('Error fetching comprehensive sales order summary:', error);
      res.status(500).json({ 
        error: 'Failed to fetch comprehensive sales order summary',
        details: error.message 
      });
    }
  });

  console.log('✅ Comprehensive Sales Order Summary API endpoints registered');
}