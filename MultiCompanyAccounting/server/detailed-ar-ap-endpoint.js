/**
 * Detailed AR-AP Summary Endpoint
 * Shows complete order breakdowns with invoice details and payment tracking
 */

const { Pool } = require('pg');

// External database connection
const pool = new Pool({
  host: '135.235.154.222',
  port: 5432,
  database: 'account_replit_staging',
  user: 'pguser',
  password: 'StrongP@ss123',
  ssl: false
});

/**
 * Get detailed AR-AP summary with complete order and invoice breakdowns
 */
async function getDetailedARAPSummary(req, res) {
  try {
    const companyId = parseInt(req.query.companyId);
    console.log(`💰 Getting detailed AR-AP breakdown for company ${companyId}`);
    
    // Get sales orders with complete invoice and receipt details
    const detailedQuery = `
      SELECT 
        so.id as sales_order_id,
        so.order_number as sales_order_number,
        so.order_date,
        so.order_total,
        so.status as order_status,
        so.customer_id,
        c.name as customer_name,
        
        -- Invoice details
        i.id as invoice_id,
        i.invoice_number,
        i.invoice_date,
        i.total_amount as invoice_amount,
        i.status as invoice_status,
        i.due_date as invoice_due_date,
        
        -- Receipt/Payment details
        r.id as receipt_id,
        r.receipt_number,
        r.receipt_date,
        r.amount as receipt_amount,
        r.payment_method,
        
        -- Line item details
        soi.id as item_id,
        soi.quantity,
        soi.unit_price,
        soi.total as item_total,
        p.name as product_name,
        p.sku as product_sku,
        p.category as product_category
        
      FROM sales_orders so
      LEFT JOIN companies c ON so.customer_id = c.id
      LEFT JOIN invoices i ON so.id = i.sales_order_id
      LEFT JOIN receipts r ON i.id = r.invoice_id
      LEFT JOIN sales_order_items soi ON so.id = soi.sales_order_id
      LEFT JOIN products p ON soi.product_id = p.id
      WHERE so.company_id = $1
      ORDER BY so.order_date DESC, so.id DESC, soi.id ASC
    `;
    
    const result = await pool.query(detailedQuery, [companyId]);
    
    // Get company information
    const companyQuery = `SELECT name FROM companies WHERE id = $1`;
    const companyResult = await pool.query(companyQuery, [companyId]);
    const companyName = companyResult.rows[0]?.name || `Company ${companyId}`;
    
    // Process the results into structured format
    const ordersMap = new Map();
    
    result.rows.forEach(row => {
      const orderId = row.sales_order_id;
      
      if (!ordersMap.has(orderId)) {
        ordersMap.set(orderId, {
          salesOrderId: orderId,
          salesOrderNumber: row.sales_order_number,
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
      if (row.receipt_id && !order.receipts.find(r => r.receiptId === row.receipt_id)) {
        order.receipts.push({
          receiptId: row.receipt_id,
          receiptNumber: row.receipt_number,
          receiptDate: row.receipt_date,
          amount: parseFloat(row.receipt_amount || 0),
          paymentMethod: row.payment_method
        });
      }
      
      // Add item if exists and not already added
      if (row.item_id && !order.items.find(i => i.itemId === row.item_id)) {
        order.items.push({
          itemId: row.item_id,
          productName: row.product_name,
          productSku: row.product_sku,
          productCategory: row.product_category,
          quantity: parseFloat(row.quantity || 0),
          unitPrice: parseFloat(row.unit_price || 0),
          total: parseFloat(row.item_total || 0)
        });
      }
    });
    
    const salesOrderDetails = Array.from(ordersMap.values());
    
    // Calculate summary totals
    const totalOrderValue = salesOrderDetails.reduce((sum, order) => sum + order.amount, 0);
    const totalInvoiced = salesOrderDetails
      .filter(order => order.invoice)
      .reduce((sum, order) => sum + order.invoice.amount, 0);
    const totalReceived = salesOrderDetails
      .reduce((sum, order) => sum + order.receipts.reduce((rSum, receipt) => rSum + receipt.amount, 0), 0);
    const outstandingBalance = totalInvoiced - totalReceived;
    
    // Count order statuses
    const invoicedOrders = salesOrderDetails.filter(order => order.invoice).length;
    const paidOrders = salesOrderDetails.filter(order => 
      order.receipts.length > 0 && 
      order.invoice && 
      order.receipts.reduce((sum, r) => sum + r.amount, 0) >= order.invoice.amount
    ).length;
    const partiallyPaidOrders = salesOrderDetails.filter(order => 
      order.receipts.length > 0 && 
      order.invoice && 
      order.receipts.reduce((sum, r) => sum + r.amount, 0) < order.invoice.amount
    ).length;
    
    const response = {
      companyId: companyId,
      companyName: companyName,
      reportDate: new Date().toISOString().split('T')[0],
      
      // Summary metrics
      summary: {
        totalOrders: salesOrderDetails.length,
        totalOrderValue: totalOrderValue,
        totalInvoiced: totalInvoiced,
        totalReceived: totalReceived,
        outstandingBalance: outstandingBalance,
        
        // Order status breakdown
        orderStats: {
          total: salesOrderDetails.length,
          invoiced: invoicedOrders,
          uninvoiced: salesOrderDetails.length - invoicedOrders,
          fullyPaid: paidOrders,
          partiallyPaid: partiallyPaidOrders,
          unpaid: invoicedOrders - paidOrders - partiallyPaidOrders
        }
      },
      
      // Detailed order breakdowns (exactly as requested)
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
}

module.exports = {
  getDetailedARAPSummary
};