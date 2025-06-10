/**
 * Comprehensive Reports API
 * 
 * This API provides comprehensive sales and purchase order reports
 * with authentic data for your $183,000 sales orders from Gas Manufacturing Company
 */

import express from 'express';
import { externalPool } from './database-config.js';

const router = express.Router();

// GET /api/reports/sales-orders-comprehensive/:companyId
// Returns comprehensive sales orders data with invoices, receipts, and line items
router.get('/api/reports/sales-orders-comprehensive/:companyId', async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId);
    console.log(`📋 COMPREHENSIVE: Sales orders report for company ${companyId}`);

    const query = `
      SELECT 
        so.id as sales_order_id,
        so.order_number,
        so.order_date,
        so.total as order_total,
        so.status,
        so.customer_id,
        c.name as customer_name,

        i.id as invoice_id,
        i.invoice_number,
        i.invoice_date,
        i.total as invoice_amount,
        i.status as invoice_status,

        r.id as receipt_id,
        r.receipt_number,
        r.receipt_date,
        r.amount as receipt_amount,

        soi.quantity,
        soi.unit_price,
        soi.amount as item_total,
        p.name as product_name,
        p.code as product_sku

      FROM sales_orders so
      LEFT JOIN companies c ON so.customer_id = c.id
      LEFT JOIN invoices i ON so.id = i.sales_order_id
      LEFT JOIN receipts r ON i.id = r.invoice_id
      LEFT JOIN sales_order_items soi ON so.id = soi.sales_order_id
      LEFT JOIN products p ON soi.product_id = p.id
      WHERE so.company_id = $1
      ORDER BY so.order_date DESC, so.id DESC
    `;

    const result = await externalPool.query(query, [companyId]);

    // Group data by sales order
    const ordersMap = new Map();
    result.rows.forEach(row => {
      if (!ordersMap.has(row.sales_order_id)) {
        ordersMap.set(row.sales_order_id, {
          salesOrderId: row.sales_order_id,
          orderNumber: row.order_number,
          orderDate: row.order_date,
          orderTotal: parseFloat(row.order_total || 0),
          status: row.status,
          customerName: row.customer_name || 'Direct Customer',
          invoices: [],
          receipts: [],
          items: []
        });
      }

      const order = ordersMap.get(row.sales_order_id);

      // Add invoice if exists and not already added
      if (row.invoice_id && !order.invoices.find(i => i.invoiceId === row.invoice_id)) {
        order.invoices.push({
          invoiceId: row.invoice_id,
          invoiceNumber: row.invoice_number,
          invoiceDate: row.invoice_date,
          amount: parseFloat(row.invoice_amount || 0),
          status: row.invoice_status
        });
      }

      // Add receipt if exists and not already added
      if (row.receipt_id && !order.receipts.find(r => r.receiptId === row.receipt_id)) {
        order.receipts.push({
          receiptId: row.receipt_id,
          receiptNumber: row.receipt_number,
          receiptDate: row.receipt_date,
          amount: parseFloat(row.receipt_amount || 0)
        });
      }

      // Add item if exists and not already added
      if (row.product_name && !order.items.find(i => i.productName === row.product_name)) {
        order.items.push({
          productName: row.product_name,
          productSku: row.product_sku,
          quantity: parseFloat(row.quantity || 0),
          unitPrice: parseFloat(row.unit_price || 0),
          total: parseFloat(row.item_total || 0)
        });
      }
    });

    const reportData = Array.from(ordersMap.values());
    const totalValue = reportData.reduce((sum, order) => sum + order.orderTotal, 0);

    console.log(`✅ SUCCESS: ${reportData.length} sales orders totaling $${totalValue.toLocaleString()}`);
    res.json(reportData);

  } catch (error) {
    console.error('❌ Sales comprehensive report error:', error);
    res.status(500).json({ error: 'Failed to generate comprehensive sales report' });
  }
});

// GET /api/reports/purchase-orders-comprehensive/:companyId
// Returns comprehensive purchase orders data with bills, payments, and line items
router.get('/api/reports/purchase-orders-comprehensive/:companyId', async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId);
    console.log(`📋 COMPREHENSIVE: Purchase orders report for company ${companyId}`);

    const query = `
      SELECT 
        po.id as purchase_order_id,
        po.order_number,
        po.order_date,
        po.total as order_total,
        po.status,
        po.vendor_id,
        v.name as vendor_name,

        b.id as bill_id,
        b.bill_number,
        b.bill_date,
        b.total as bill_amount,
        b.status as bill_status,

        r.id as payment_id,
        r.receipt_number as payment_number,
        r.receipt_date as payment_date,
        r.amount as payment_amount,

        poi.quantity,
        poi.unit_price,
        poi.amount as item_total,
        pr.name as product_name,
        pr.code as product_sku

      FROM purchase_orders po
      LEFT JOIN companies v ON po.vendor_id = v.id
      LEFT JOIN bills b ON po.id = b.purchase_order_id
      LEFT JOIN receipts r ON b.id = r.invoice_id
      LEFT JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
      LEFT JOIN products pr ON poi.product_id = pr.id
      WHERE po.company_id = $1
      ORDER BY po.order_date DESC, po.id DESC
    `;

    const result = await externalPool.query(query, [companyId]);

    // Group data by purchase order
    const ordersMap = new Map();
    result.rows.forEach(row => {
      if (!ordersMap.has(row.purchase_order_id)) {
        ordersMap.set(row.purchase_order_id, {
          purchaseOrderId: row.purchase_order_id,
          orderNumber: row.order_number,
          orderDate: row.order_date,
          orderTotal: parseFloat(row.order_total || 0),
          status: row.status,
          vendorName: row.vendor_name || 'Direct Vendor',
          bills: [],
          payments: [],
          items: []
        });
      }

      const order = ordersMap.get(row.purchase_order_id);

      // Add bill if exists and not already added
      if (row.bill_id && !order.bills.find(b => b.billId === row.bill_id)) {
        order.bills.push({
          billId: row.bill_id,
          billNumber: row.bill_number,
          billDate: row.bill_date,
          amount: parseFloat(row.bill_amount || 0),
          status: row.bill_status
        });
      }

      // Add payment if exists and not already added
      if (row.payment_id && !order.payments.find(p => p.paymentId === row.payment_id)) {
        order.payments.push({
          paymentId: row.payment_id,
          paymentNumber: row.payment_number,
          paymentDate: row.payment_date,
          amount: parseFloat(row.payment_amount || 0)
        });
      }

      // Add item if exists and not already added
      if (row.product_name && !order.items.find(i => i.productName === row.product_name)) {
        order.items.push({
          productName: row.product_name,
          productSku: row.product_sku,
          quantity: parseFloat(row.quantity || 0),
          unitPrice: parseFloat(row.unit_price || 0),
          total: parseFloat(row.item_total || 0)
        });
      }
    });

    const reportData = Array.from(ordersMap.values());
    const totalValue = reportData.reduce((sum, order) => sum + order.orderTotal, 0);

    console.log(`✅ SUCCESS: ${reportData.length} purchase orders totaling $${totalValue.toLocaleString()}`);
    res.json(reportData);

  } catch (error) {
    console.error('❌ Purchase comprehensive report error:', error);
    res.status(500).json({ error: 'Failed to generate comprehensive purchase report' });
  }
});

export default router;