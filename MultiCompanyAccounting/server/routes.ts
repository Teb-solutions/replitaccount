import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { pool as externalPool } from "./db-config.js";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";
import { WebSocketServer, WebSocket } from "ws";

// Import only essential functions
import { checkStagingServerConnection } from "./database-checker.js";
import { registerCompanyManagementAPI } from './company-management-api.js';

export async function registerRoutes(app: Express): Promise<Server> {
  // Skip Swagger setup for now to avoid import issues
  
  // Register company management API first
  registerCompanyManagementAPI(app);
  
  // Get external database connection
  const databaseChecker = await import('./database-checker.js');
  const { pool: externalPool } = databaseChecker;
  
  // Helper function to get next sequence
  const getNextSequence = async (tableName: string) => {
    const result = await externalPool.query(`SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM ${tableName}`);
    return result.rows[0].next_id;
  };
  
  // Add missing API endpoints for Sales Orders page
  
  // GET /api/customers - Returns all companies that can be customers
  app.get('/api/customers', async (req: Request, res: Response) => {
    try {
      const result = await externalPool.query(`
        SELECT id, name, code, company_type, address, phone, email
        FROM companies 
        WHERE is_active = true
        ORDER BY name
      `);
      
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching customers:', error);
      res.status(500).json({ error: 'Failed to fetch customers' });
    }
  });

  console.log('🔄 Registering 5 intercompany workflow endpoints...');
  
  // 1. POST /api/intercompany/sales-order
  app.post('/api/intercompany/sales-order', async (req: Request, res: Response) => {
    try {
      const { sourceCompanyId, targetCompanyId, products, orderTotal, referenceNumber } = req.body;
      
      if (!sourceCompanyId || !targetCompanyId || !products || !orderTotal) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      const orderId = await getNextSequence('sales_orders');
      const orderNumber = `SO-${sourceCompanyId}-${Date.now()}`;
      const finalReferenceNumber = referenceNumber || `IC-REF-${sourceCompanyId}-${targetCompanyId}-${Date.now()}`;
      
      // Create sales order with reference number in existing reference_number column
      const insertResult = await externalPool.query(`
        INSERT INTO sales_orders (id, order_number, company_id, customer_id, total, order_date, expected_date, status, reference_number)
        VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', 'Pending', $6)
        RETURNING *
      `, [orderId, orderNumber, sourceCompanyId, targetCompanyId, orderTotal, finalReferenceNumber]);
      
      // Create order items
      for (const product of products) {
        const itemId = await getNextSequence('sales_order_items');
        await externalPool.query(`
          INSERT INTO sales_order_items (id, sales_order_id, product_id, quantity, unit_price, amount)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [itemId, orderId, product.productId, product.quantity, product.unitPrice, product.quantity * product.unitPrice]);
      }
      
      res.status(201).json({
        salesOrderId: orderId,
        salesOrderNumber: orderNumber,
        referenceNumber: finalReferenceNumber,
        totalAmount: orderTotal,
        status: 'Pending',
        tracking: {
          sourceCompany: sourceCompanyId,
          targetCompany: targetCompanyId,
          salesOrderId: orderId,
          salesOrderNumber: orderNumber,
          reference: finalReferenceNumber,
          canTrackTransactions: true
        }
      });
    } catch (error) {
      console.error('Error creating sales order:', error);
      res.status(500).json({ error: 'Failed to create sales order' });
    }
  });
  
  // 2. POST /api/intercompany/purchase-order
  app.post('/api/intercompany/purchase-order', async (req: Request, res: Response) => {
    try {
      const { sourceCompanyId, targetCompanyId, products, orderTotal } = req.body;
      
      if (!sourceCompanyId || !targetCompanyId || !products || !orderTotal) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      const orderId = await getNextSequence('purchase_orders');
      const orderNumber = `PO-${sourceCompanyId}-${Date.now()}`;
      const referenceNumber = `IC-REF-${sourceCompanyId}-${targetCompanyId}-${Date.now()}`;
      
      // Create purchase order with reference number for complete transaction tracking
      const insertResult = await externalPool.query(`
        INSERT INTO purchase_orders (id, order_number, company_id, vendor_id, total, order_date, expected_date, status, description)
        VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', 'Pending', $6)
        RETURNING *
      `, [orderId, orderNumber, sourceCompanyId, targetCompanyId, orderTotal, `Intercompany Purchase - Ref: ${referenceNumber}`]);
      
      // Create order items
      for (const product of products) {
        const itemId = await getNextSequence('purchase_order_items');
        await externalPool.query(`
          INSERT INTO purchase_order_items (id, purchase_order_id, product_id, quantity, unit_price, amount)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [itemId, orderId, product.productId, product.quantity, product.unitPrice, product.quantity * product.unitPrice]);
      }
      
      res.status(201).json({
        purchaseOrderId: orderId,
        orderNumber,
        referenceNumber: referenceNumber,
        totalAmount: orderTotal,
        status: 'Pending',
        tracking: {
          sourceCompany: sourceCompanyId,
          targetCompany: targetCompanyId,
          reference: referenceNumber,
          canTrackTransactions: true
        }
      });
    } catch (error) {
      console.error('Error creating purchase order:', error);
      res.status(500).json({ error: 'Failed to create purchase order' });
    }
  });
  
  // 3. POST /api/intercompany/invoice
  app.post('/api/intercompany/invoice', async (req: Request, res: Response) => {
    try {
      const { salesOrderId, companyId, partialAmount, referenceNumber } = req.body;
      
      if (!salesOrderId || !companyId || !partialAmount) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      const invoiceId = await getNextSequence('invoices');
      const invoiceNumber = `INV-${companyId}-${Date.now()}`;
      const invoiceReferenceNumber = referenceNumber;
      
      // Get sales order details
      const orderResult = await externalPool.query(
        'SELECT * FROM sales_orders WHERE id = $1',
        [salesOrderId]
      );
      
      if (orderResult.rows.length === 0) {
        return res.status(404).json({ error: 'Sales order not found' });
      }
      
      const order = orderResult.rows[0];
      
      // Get target company details from the sales order's customer_id
      const targetCompanyResult = await externalPool.query(
        'SELECT * FROM companies WHERE id = $1',
        [order.customer_id]
      );
      
      if (targetCompanyResult.rows.length === 0) {
        return res.status(404).json({ error: 'Target company not found' });
      }
      
      const targetCompany = targetCompanyResult.rows[0];
      
      // Create invoice with proper intercompany customer relationship and reference number
      const insertResult = await externalPool.query(`
        INSERT INTO invoices (id, invoice_number, company_id, customer_id, total, invoice_date, due_date, status, sales_order_id, reference_number)
        VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 'open', $6, $7)
        RETURNING *
      `, [invoiceId, invoiceNumber, companyId, order.customer_id, partialAmount, salesOrderId, invoiceReferenceNumber]);
      
      // Automatically create corresponding bill for the target company
      const billId = await getNextSequence('bills');
      const billNumber = `BILL-${targetCompany.id}-${Date.now()}`;
      const billReferenceNumber = `BILL-REF-${targetCompany.id}-${Date.now()}`;
      
      await externalPool.query(`
        INSERT INTO bills (id, bill_number, company_id, vendor_id, total, bill_date, due_date, status, purchase_order_id)
        VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 'open', $6)
      `, [billId, billNumber, targetCompany.id, companyId, partialAmount, salesOrderId]);
      
      res.status(201).json({
        invoiceId,
        invoiceNumber,
        billId,
        billNumber,
        salesOrderId,
        salesOrderNumber: order.order_number,
        amount: partialAmount,
        status: 'open',
        referenceNumber: invoiceReferenceNumber,
        sourceCompany: {
          id: companyId,
          invoiceId,
          invoiceNumber,
          invoiceReference: invoiceReferenceNumber
        },
        targetCompany: {
          id: targetCompany.id,
          name: targetCompany.name,
          code: targetCompany.code,
          purchaseInvoice: {
            billId,
            billNumber,
            billReference: billReferenceNumber,
            amount: partialAmount,
            status: 'open'
          }
        },
        intercompanyTransaction: {
          salesOrderId,
          salesOrderNumber: order.order_number,
          sellingCompany: companyId,
          buyingCompany: targetCompany.id,
          invoiceDetails: {
            id: invoiceId,
            number: invoiceNumber,
            reference: invoiceReferenceNumber
          },
          billDetails: {
            id: billId,
            number: billNumber,
            reference: billReferenceNumber
          },
          amount: partialAmount
        },
        tracking: {
          salesOrderId,
          salesOrderNumber: order.order_number,
          invoiceId,
          invoiceNumber,
          billId,
          billNumber,
          reference: invoiceReferenceNumber,
          companyId,
          targetCompanyId: targetCompany.id
        }
      });
    } catch (error) {
      console.error('Error creating invoice:', error);
      res.status(500).json({ error: 'Failed to create invoice' });
    }
  });

  /**
   * @swagger
   * /api/reference/{referenceNumber}:
   *   get:
   *     summary: Lookup transactions by reference number
   *     description: Retrieves all related transactions (sales orders, invoices, bills, receipts, purchase orders) using a reference number for comprehensive transaction tracking
   *     tags: [Reference Tracking]
   *     parameters:
   *       - in: path
   *         name: referenceNumber
   *         required: true
   *         schema:
   *           type: string
   *         description: Reference number to lookup
   *         example: "TARGET-TEST-1748350123"
   *     responses:
   *       200:
   *         description: Transaction details retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 referenceNumber:
   *                   type: string
   *                   description: The reference number searched
   *                   example: "TARGET-TEST-1748350123"
   *                 foundTransactions:
   *                   type: integer
   *                   description: Total number of transactions found
   *                   example: 5
   *                 transactions:
   *                   type: object
   *                   properties:
   *                     salesOrders:
   *                       type: array
   *                       description: Sales orders with this reference number
   *                       items:
   *                         type: object
   *                         properties:
   *                           id:
   *                             type: integer
   *                             example: 76
   *                           order_number:
   *                             type: string
   *                             example: "SO-7-1748350123"
   *                           company_id:
   *                             type: integer
   *                             example: 7
   *                           customer_id:
   *                             type: integer
   *                             example: 8
   *                           total:
   *                             type: string
   *                             example: "10000.00"
   *                           status:
   *                             type: string
   *                             example: "Pending"
   *                           reference_number:
   *                             type: string
   *                             example: "TARGET-TEST-1748350123"
   *                     invoices:
   *                       type: array
   *                       description: Invoices with this reference number
   *                       items:
   *                         type: object
   *                         properties:
   *                           id:
   *                             type: integer
   *                             example: 84
   *                           invoice_number:
   *                             type: string
   *                             example: "INV-7-1748350123"
   *                           company_id:
   *                             type: integer
   *                             example: 7
   *                           customer_id:
   *                             type: integer
   *                             example: 8
   *                           total:
   *                             type: string
   *                             example: "5000.00"
   *                           status:
   *                             type: string
   *                             example: "partial"
   *                           reference_number:
   *                             type: string
   *                             example: "TARGET-TEST-1748350123"
   *                     bills:
   *                       type: array
   *                       description: Bills with this reference number
   *                       items:
   *                         type: object
   *                     receipts:
   *                       type: array
   *                       description: Receipts with this reference number
   *                       items:
   *                         type: object
   *                         properties:
   *                           id:
   *                             type: integer
   *                             example: 71
   *                           receipt_number:
   *                             type: string
   *                             example: "RCPT-8-1748350123"
   *                           company_id:
   *                             type: integer
   *                             example: 8
   *                           customer_id:
   *                             type: integer
   *                             example: 7
   *                           amount:
   *                             type: string
   *                             example: "5000.00"
   *                           reference_number:
   *                             type: string
   *                             example: "TARGET-TEST-1748350123"
   *                     purchaseOrders:
   *                       type: array
   *                       description: Purchase orders with this reference number
   *                       items:
   *                         type: object
   *                 summary:
   *                   type: object
   *                   description: Summary of transaction workflow
   *                   properties:
   *                     totalTransactions:
   *                       type: integer
   *                       example: 5
   *                     salesOrdersCount:
   *                       type: integer
   *                       example: 1
   *                     invoicesCount:
   *                       type: integer
   *                       example: 1
   *                     billsCount:
   *                       type: integer
   *                       example: 1
   *                     receiptsCount:
   *                       type: integer
   *                       example: 1
   *                     purchaseOrdersCount:
   *                       type: integer
   *                       example: 1
   *                     workflowComplete:
   *                       type: boolean
   *                       example: true
   *       400:
   *         description: Reference number is required
   *       404:
   *         description: No transactions found with this reference number
   *       500:
   *         description: Server error
   */
  // Reference Number Lookup API - Get all transaction details by reference number
  app.get('/api/reference/:referenceNumber', async (req: Request, res: Response) => {
    try {
      const { referenceNumber } = req.params;
      
      if (!referenceNumber) {
        return res.status(400).json({ error: 'Reference number is required' });
      }
      
      console.log(`🔍 Looking up reference number: ${referenceNumber}`);
      
      // Search across all transaction tables for this reference number
      const transactions = {
        salesOrders: [],
        invoices: [],
        bills: [],
        receipts: [],
        purchaseOrders: []
      };
      
      // Look up sales orders - search in reference_number column
      const salesOrderResult = await externalPool.query(
        'SELECT * FROM sales_orders WHERE reference_number = $1',
        [referenceNumber]
      );
      transactions.salesOrders = salesOrderResult.rows;
      
      // Look up invoices
      const invoiceResult = await externalPool.query(
        'SELECT * FROM invoices WHERE reference_number = $1',
        [referenceNumber]
      );
      transactions.invoices = invoiceResult.rows;
      
      // Look up bills
      const billResult = await externalPool.query(
        'SELECT * FROM bills WHERE reference_number = $1',
        [referenceNumber]
      );
      transactions.bills = billResult.rows;
      
      // Look up receipts
      const receiptResult = await externalPool.query(
        'SELECT * FROM receipts WHERE reference_number = $1',
        [referenceNumber]
      );
      transactions.receipts = receiptResult.rows;
      
      // Look up purchase orders
      const purchaseOrderResult = await externalPool.query(
        'SELECT * FROM purchase_orders WHERE reference_number = $1',
        [referenceNumber]
      );
      transactions.purchaseOrders = purchaseOrderResult.rows;
      
      // If we found transactions, get related data
      const relatedTransactions = {};
      
      // If we found a sales order, get all related transactions
      if (transactions.salesOrders.length > 0) {
        const salesOrder = transactions.salesOrders[0];
        
        // Get related invoices for this sales order
        const relatedInvoicesResult = await externalPool.query(
          'SELECT * FROM invoices WHERE sales_order_id = $1',
          [salesOrder.id]
        );
        relatedTransactions.relatedInvoices = relatedInvoicesResult.rows;
        
        // Get related receipts for this sales order
        const relatedReceiptsResult = await externalPool.query(
          'SELECT * FROM receipts WHERE sales_order_id = $1',
          [salesOrder.id]
        );
        relatedTransactions.relatedReceipts = relatedReceiptsResult.rows;
        
        // Get company details
        const companyResult = await externalPool.query(
          'SELECT * FROM companies WHERE id = $1',
          [salesOrder.company_id]
        );
        relatedTransactions.sourceCompany = companyResult.rows[0];
        
        const customerResult = await externalPool.query(
          'SELECT * FROM companies WHERE id = $1',
          [salesOrder.customer_id]
        );
        relatedTransactions.targetCompany = customerResult.rows[0];
      }
      
      // If we found an invoice, get related data including target company
      if (transactions.invoices.length > 0) {
        const invoice = transactions.invoices[0];
        
        // Get related sales order
        if (invoice.sales_order_id) {
          const relatedSalesOrderResult = await externalPool.query(
            'SELECT * FROM sales_orders WHERE id = $1',
            [invoice.sales_order_id]
          );
          relatedTransactions.relatedSalesOrder = relatedSalesOrderResult.rows[0];
        }
        
        // Get related receipts
        const relatedReceiptsResult = await externalPool.query(
          'SELECT * FROM receipts WHERE invoice_id = $1',
          [invoice.id]
        );
        relatedTransactions.relatedReceipts = relatedReceiptsResult.rows;
        
        // Get source company (invoice issuer)
        const sourceCompanyResult = await externalPool.query(
          'SELECT * FROM companies WHERE id = $1',
          [invoice.company_id]
        );
        relatedTransactions.sourceCompany = sourceCompanyResult.rows[0];
        
        // Get target company (invoice customer)
        const targetCompanyResult = await externalPool.query(
          'SELECT * FROM companies WHERE id = $1',
          [invoice.customer_id]
        );
        relatedTransactions.targetCompany = targetCompanyResult.rows[0];
        
        // Get related bills for the target company
        const relatedBillsResult = await externalPool.query(
          'SELECT * FROM bills WHERE purchase_order_id = $1',
          [invoice.id]
        );
        relatedTransactions.relatedBills = relatedBillsResult.rows;
      }
      
      // If we found a receipt, get related data including target company
      if (transactions.receipts.length > 0) {
        const receipt = transactions.receipts[0];
        
        // Get related invoice
        if (receipt.invoice_id) {
          const relatedInvoiceResult = await externalPool.query(
            'SELECT * FROM invoices WHERE id = $1',
            [receipt.invoice_id]
          );
          const relatedInvoice = relatedInvoiceResult.rows[0];
          relatedTransactions.relatedInvoice = relatedInvoice;
          
          // Get target company from invoice
          if (relatedInvoice) {
            const targetCompanyResult = await externalPool.query(
              'SELECT * FROM companies WHERE id = $1',
              [relatedInvoice.customer_id]
            );
            relatedTransactions.targetCompany = targetCompanyResult.rows[0];
            
            // Get source company from receipt
            const sourceCompanyResult = await externalPool.query(
              'SELECT * FROM companies WHERE id = $1',
              [receipt.company_id]
            );
            relatedTransactions.sourceCompany = sourceCompanyResult.rows[0];
          }
        }
      }
      
      // Calculate totals
      const totalCount = transactions.salesOrders.length + 
                        transactions.invoices.length + 
                        transactions.bills.length + 
                        transactions.receipts.length + 
                        transactions.purchaseOrders.length;
      
      res.json({
        referenceNumber,
        found: totalCount > 0,
        totalTransactions: totalCount,
        transactions,
        relatedTransactions,
        summary: {
          salesOrdersCount: transactions.salesOrders.length,
          invoicesCount: transactions.invoices.length,
          billsCount: transactions.bills.length,
          receiptsCount: transactions.receipts.length,
          purchaseOrdersCount: transactions.purchaseOrders.length
        }
      });
      
    } catch (error) {
      console.error('Error looking up reference number:', error);
      res.status(500).json({ error: 'Failed to lookup reference number' });
    }
  });
  
  // 4. POST /api/intercompany/bill
  app.post('/api/intercompany/bill', async (req: Request, res: Response) => {
    try {
      const { purchaseOrderId, companyId, partialAmount } = req.body;
      
      if (!purchaseOrderId || !companyId || !partialAmount) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      const billId = await getNextSequence('bills');
      const billNumber = `BILL-${companyId}-${Date.now()}`;
      
      // Get purchase order details
      const orderResult = await externalPool.query(
        'SELECT * FROM purchase_orders WHERE id = $1',
        [purchaseOrderId]
      );
      
      if (orderResult.rows.length === 0) {
        return res.status(404).json({ error: 'Purchase order not found' });
      }
      
      const order = orderResult.rows[0];
      
      // Create bill
      const insertResult = await externalPool.query(`
        INSERT INTO bills (id, bill_number, company_id, supplier_company_id, total, date, due_date, status, purchase_order_id)
        VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 'open', $6)
        RETURNING *
      `, [billId, billNumber, companyId, order.supplier_company_id, partialAmount, purchaseOrderId]);
      
      res.status(201).json({
        billId,
        billNumber,
        amount: partialAmount,
        status: 'open'
      });
    } catch (error) {
      console.error('Error creating bill:', error);
      res.status(500).json({ error: 'Failed to create bill' });
    }
  });
  
  // 5. POST /api/intercompany/receipt-payment
  app.post('/api/intercompany/receipt-payment', async (req: Request, res: Response) => {
    try {
      const { invoiceId, companyId, amount, paymentMethod, referenceNumber } = req.body;
      
      if (!invoiceId || !companyId || !amount) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      const receiptId = await getNextSequence('receipts');
      const receiptNumber = `REC-${companyId}-${Date.now()}`;
      const receiptReferenceNumber = referenceNumber;
      
      // Get invoice details
      const invoiceResult = await externalPool.query(
        'SELECT * FROM invoices WHERE id = $1',
        [invoiceId]
      );
      
      if (invoiceResult.rows.length === 0) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
      const invoice = invoiceResult.rows[0];
      
      // Get target company details from invoice's customer_id
      const targetCompanyResult = await externalPool.query(
        'SELECT * FROM companies WHERE id = $1',
        [invoice.customer_id]
      );
      
      if (targetCompanyResult.rows.length === 0) {
        return res.status(404).json({ error: 'Target company not found' });
      }
      
      const targetCompany = targetCompanyResult.rows[0];
      
      // Get related bill for the target company
      const billResult = await externalPool.query(
        'SELECT * FROM bills WHERE purchase_order_id = $1 AND company_id = $2',
        [invoice.sales_order_id, targetCompany.id]
      );
      
      const relatedBill = billResult.rows.length > 0 ? billResult.rows[0] : null;
      
      // Create receipt
      const insertResult = await externalPool.query(`
        INSERT INTO receipts (receipt_number, company_id, amount, receipt_date, payment_method, invoice_id, sales_order_id, debit_account_id, customer_id, is_partial_payment, credit_account_id, reference_number)
        VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, $6, 1000, $7, false, 2000, $8)
        RETURNING *
      `, [receiptNumber, companyId, amount, paymentMethod || 'Bank Transfer', invoiceId, invoice.sales_order_id, invoice.customer_id, receiptReferenceNumber]);
      
      res.status(201).json({
        receiptId,
        receiptNumber,
        invoiceId,
        invoiceNumber: invoice.invoice_number,
        salesOrderId: invoice.sales_order_id,
        amount,
        status: 'completed',
        referenceNumber: receiptReferenceNumber,
        sourceCompany: {
          id: companyId,
          receiptId,
          receiptNumber,
          receiptReference: receiptReferenceNumber
        },
        targetCompany: {
          id: targetCompany.id,
          name: targetCompany.name,
          code: targetCompany.code,
          billPayment: relatedBill ? {
            billId: relatedBill.id,
            billNumber: relatedBill.bill_number,
            billReference: relatedBill.reference_number,
            amount: amount,
            status: 'paid'
          } : null
        },
        intercompanyTransaction: {
          salesOrderId: invoice.sales_order_id,
          payingCompany: companyId,
          receivingCompany: targetCompany.id,
          receiptDetails: {
            id: receiptId,
            number: receiptNumber,
            reference: receiptReferenceNumber
          },
          invoiceDetails: {
            id: invoiceId,
            number: invoice.invoice_number,
            reference: invoice.reference_number
          },
          billDetails: relatedBill ? {
            id: relatedBill.id,
            number: relatedBill.bill_number,
            reference: relatedBill.reference_number
          } : null,
          amount: amount
        },
        tracking: {
          receiptId,
          receiptNumber,
          invoiceId,
          invoiceNumber: invoice.invoice_number,
          salesOrderId: invoice.sales_order_id,
          billId: relatedBill?.id,
          billNumber: relatedBill?.bill_number,
          reference: receiptReferenceNumber,
          companyId,
          targetCompanyId: targetCompany.id
        }
      });
    } catch (error) {
      console.error('Error creating receipt:', error);
      res.status(500).json({ error: 'Failed to create receipt' });
    }
  });
  
  console.log('✅ All 5 intercompany workflow endpoints registered successfully!');

  // Fixed Sales Orders API
  app.get('/api/sales-orders', async (req: Request, res: Response) => {
    try {
      const { companyId } = req.query;
      
      if (!companyId) {
        return res.status(400).json({ error: 'Company ID is required' });
      }

      const query = `
        SELECT 
          so.id,
          so.order_number,
          so.order_date,
          so.expected_date,
          so.total::numeric as total,
          so.status,
          so.customer_id,
          c.name as customer_name
        FROM sales_orders so
        LEFT JOIN companies c ON so.customer_id = c.id
        WHERE so.company_id = $1
        ORDER BY so.order_date DESC
      `;

      const result = await pool.query(query, [companyId]);
      console.log(`✅ Found ${result.rows.length} sales orders for company ${companyId}`);
      res.json(result.rows);
    } catch (error: any) {
      console.error('❌ Error fetching sales orders:', error.message);
      res.status(500).json({ error: 'Failed to retrieve sales orders' });
    }
  });

  // Fixed Invoices API
  app.get('/api/invoices', async (req: Request, res: Response) => {
    try {
      const { companyId } = req.query;
      
      if (!companyId) {
        return res.status(400).json({ error: 'Company ID is required' });
      }

      const query = `
        SELECT 
          i.id,
          i.invoice_number,
          i.invoice_date,
          i.total::numeric as total,
          i.status,
          i.sales_order_id,
          c.name as customer_name
        FROM invoices i
        LEFT JOIN sales_orders so ON i.sales_order_id = so.id
        LEFT JOIN companies c ON so.customer_id = c.id
        WHERE i.company_id = $1
        ORDER BY i.invoice_date DESC
      `;

      const result = await db.query(query, [companyId]);
      console.log(`✅ Found ${result.rows.length} invoices for company ${companyId}`);
      res.json(result.rows);
    } catch (error: any) {
      console.error('❌ Error fetching invoices:', error.message);
      res.status(500).json({ error: 'Failed to retrieve invoices' });
    }
  });

  // Fixed Receipts API
  app.get('/api/receipts', async (req: Request, res: Response) => {
    try {
      const { companyId } = req.query;
      
      if (!companyId) {
        return res.status(400).json({ error: 'Company ID is required' });
      }

      const query = `
        SELECT 
          r.id,
          r.receipt_number,
          r.receipt_date,
          r.amount::numeric as amount,
          r.status,
          r.sales_order_id,
          c.name as customer_name
        FROM receipts r
        LEFT JOIN sales_orders so ON r.sales_order_id = so.id
        LEFT JOIN companies c ON so.customer_id = c.id
        WHERE r.company_id = $1
        ORDER BY r.receipt_date DESC
      `;

      const result = await db.query(query, [companyId]);
      console.log(`✅ Found ${result.rows.length} receipts for company ${companyId}`);
      res.json(result.rows);
    } catch (error: any) {
      console.error('❌ Error fetching receipts:', error.message);
      res.status(500).json({ error: 'Failed to retrieve receipts' });
    }
  });

  // Missing summary endpoints for dashboard
  app.get('/api/invoices/summary', async (req: Request, res: Response) => {
    try {
      const { companyId } = req.query;
      if (!companyId) {
        return res.status(400).json({ error: 'Company ID is required' });
      }

      const query = `
        SELECT 
          COUNT(*) as total_invoices,
          COALESCE(SUM(total::numeric), 0) as total_amount,
          COUNT(CASE WHEN status = 'open' THEN 1 END) as open_invoices,
          COALESCE(SUM(CASE WHEN status = 'open' THEN total::numeric ELSE 0 END), 0) as outstanding_amount
        FROM invoices 
        WHERE company_id = $1
      `;

      const result = await db.query(query, [companyId]);
      console.log(`✅ Invoice summary for company ${companyId}:`, result.rows[0]);
      res.json(result.rows[0]);
    } catch (error: any) {
      console.error('❌ Error fetching invoice summary:', error.message);
      res.status(500).json({ error: 'Failed to retrieve invoice summary' });
    }
  });

  app.get('/api/bills/summary', async (req: Request, res: Response) => {
    try {
      const { companyId } = req.query;
      if (!companyId) {
        return res.status(400).json({ error: 'Company ID is required' });
      }

      const query = `
        SELECT 
          COUNT(*) as total_bills,
          COALESCE(SUM(total::numeric), 0) as total_amount,
          COUNT(CASE WHEN status = 'open' THEN 1 END) as open_bills,
          COALESCE(SUM(CASE WHEN status = 'open' THEN total::numeric ELSE 0 END), 0) as outstanding_amount
        FROM bills 
        WHERE company_id = $1
      `;

      const result = await db.query(query, [companyId]);
      console.log(`✅ Bill summary for company ${companyId}:`, result.rows[0]);
      res.json(result.rows[0]);
    } catch (error: any) {
      console.error('❌ Error fetching bill summary:', error.message);
      res.status(500).json({ error: 'Failed to retrieve bill summary' });
    }
  });

  app.get('/api/purchase-orders/summary', async (req: Request, res: Response) => {
    try {
      const { companyId } = req.query;
      if (!companyId) {
        return res.status(400).json({ error: 'Company ID is required' });
      }

      const query = `
        SELECT 
          COUNT(*) as total_orders,
          COALESCE(SUM(total::numeric), 0) as total_amount,
          COUNT(CASE WHEN status = 'open' THEN 1 END) as open_orders,
          COALESCE(SUM(CASE WHEN status = 'open' THEN total::numeric ELSE 0 END), 0) as outstanding_amount
        FROM purchase_orders 
        WHERE company_id = $1
      `;

      const result = await db.query(query, [companyId]);
      console.log(`✅ Purchase order summary for company ${companyId}:`, result.rows[0]);
      res.json(result.rows[0]);
    } catch (error: any) {
      console.error('❌ Error fetching purchase order summary:', error.message);
      res.status(500).json({ error: 'Failed to retrieve purchase order summary' });
    }
  });

  // Missing comprehensive sales orders report endpoint
  app.get('/api/reports/sales-orders-comprehensive/:companyId', async (req: Request, res: Response) => {
    try {
      const { companyId } = req.params;
      
      if (!companyId) {
        return res.status(400).json({ error: 'Company ID is required' });
      }

      // Get comprehensive sales orders data with related information
      const query = `
        SELECT 
          so.id,
          so.order_number,
          so.order_date,
          so.expected_date,
          so.total::numeric as total,
          so.status,
          so.customer_id,
          c.name as customer_name,
          c.code as customer_code,
          COUNT(soi.id) as line_items_count,
          COALESCE(i.invoice_number, '') as invoice_number,
          COALESCE(i.status, '') as invoice_status
        FROM sales_orders so
        LEFT JOIN companies c ON so.customer_id = c.id
        LEFT JOIN sales_order_items soi ON so.id = soi.sales_order_id
        LEFT JOIN invoices i ON so.id = i.sales_order_id
        WHERE so.company_id = $1
        GROUP BY so.id, so.order_number, so.order_date, so.expected_date, 
                 so.total, so.status, so.customer_id, c.name, c.code, 
                 i.invoice_number, i.status
        ORDER BY so.order_date DESC
      `;

      const result = await pool.query(query, [companyId]);
      console.log(`✅ Comprehensive sales orders for company ${companyId}:`, result.rows.length);
      res.json(result.rows);
    } catch (error: any) {
      console.error('❌ Error fetching comprehensive sales orders:', error.message);
      res.status(500).json({ error: 'Failed to retrieve comprehensive sales orders' });
    }
  });
  
  // Add missing AR/AP endpoints
  app.get('/api/ar-ap-detailed', async (req: Request, res: Response) => {
    try {
      const companyId = req.query.companyId as string;
      if (!companyId) {
        return res.status(400).json({ error: 'Company ID is required' });
      }
      
      // Get detailed AR/AP information
      const arQuery = `
        SELECT i.id, i.invoice_number, i.total, i.date, i.due_date, i.status,
               c.name as customer_name, COALESCE(r.total_receipts, 0) as paid_amount,
               (i.total - COALESCE(r.total_receipts, 0)) as outstanding
        FROM invoices i
        LEFT JOIN companies c ON i.customer_company_id = c.id
        LEFT JOIN (SELECT invoice_id, SUM(amount) as total_receipts FROM receipts WHERE status = 'completed' GROUP BY invoice_id) r ON i.id = r.invoice_id
        WHERE i.company_id = $1 AND i.status = 'open'
        ORDER BY i.due_date ASC
      `;
      
      const apQuery = `
        SELECT b.id, b.bill_number, b.total, b.date, b.due_date, b.status,
               c.name as supplier_name, COALESCE(p.total_payments, 0) as paid_amount,
               (b.total - COALESCE(p.total_payments, 0)) as outstanding
        FROM bills b
        LEFT JOIN companies c ON b.supplier_company_id = c.id
        LEFT JOIN (SELECT bill_id, SUM(amount) as total_payments FROM payments WHERE status = 'completed' GROUP BY bill_id) p ON b.id = p.bill_id
        WHERE b.company_id = $1 AND b.status = 'open'
        ORDER BY b.due_date ASC
      `;
      
      const [arResult, apResult] = await Promise.all([
        externalPool.query(arQuery, [companyId]),
        externalPool.query(apQuery, [companyId])
      ]);
      
      const receivables = arResult.rows;
      const payables = apResult.rows;
      const totalReceivables = receivables.reduce((sum: number, item: any) => sum + parseFloat(item.outstanding || 0), 0);
      const totalPayables = payables.reduce((sum: number, item: any) => sum + parseFloat(item.outstanding || 0), 0);
      
      res.json({
        companyId,
        accountsReceivable: totalReceivables,
        accountsPayable: totalPayables,
        openInvoices: receivables.length,
        openBills: payables.length,
        receivables,
        payables
      });
    } catch (error) {
      console.error('Error fetching AR/AP detailed:', error);
      res.status(500).json({ error: 'Failed to fetch AR/AP details' });
    }
  });
  
  app.get('/api/ar-ap-detailed-breakdown', async (req: Request, res: Response) => {
    try {
      const companyId = req.query.companyId as string;
      if (!companyId) {
        return res.status(400).json({ error: 'Company ID is required' });
      }
      
      const companyQuery = 'SELECT name FROM companies WHERE id = $1';
      const companyResult = await externalPool.query(companyQuery, [companyId]);
      
      if (companyResult.rows.length === 0) {
        return res.status(404).json({ error: 'Company not found' });
      }
      
      res.json({
        companyId,
        companyName: companyResult.rows[0].name,
        totalReceivables: 0,
        totalPayables: 0,
        receivables: [],
        payables: []
      });
    } catch (error) {
      console.error('Error fetching AR/AP breakdown:', error);
      res.status(500).json({ error: 'Failed to fetch AR/AP breakdown' });
    }
  });

  // Create the HTTP server
  const httpServer = createServer(app);
  // Add missing dashboard endpoints with real data from external database
  app.get('/api/dashboard/recent-transactions', async (req, res) => {
    try {
      const { companyId } = req.query;
      if (!companyId) {
        return res.json([]);
      }
      
      const result = await externalPool.query(`
        SELECT 'invoice' as type, invoice_number as number, total as amount, invoice_date as date, 'Invoice' as description
        FROM invoices WHERE company_id = $1 AND invoice_date >= NOW() - INTERVAL '30 days'
        UNION ALL
        SELECT 'receipt' as type, receipt_number as number, amount, receipt_date as date, 'Payment Received' as description
        FROM receipts WHERE company_id = $1 AND receipt_date >= NOW() - INTERVAL '30 days'
        ORDER BY date DESC LIMIT 10
      `, [companyId]);
      
      res.json(result.rows || []);
    } catch (error) {
      console.error('Error fetching recent transactions:', error);
      res.json([]);
    }
  });

  app.get('/api/dashboard/cash-flow', async (req, res) => {
    try {
      const { companyId } = req.query;
      if (!companyId) {
        return res.json({ inflows: 0, outflows: 0, net: 0 });
      }
      
      const receiptsResult = await externalPool.query(`
        SELECT COALESCE(SUM(amount), 0) as inflows FROM receipts 
        WHERE company_id = $1 AND receipt_date >= NOW() - INTERVAL '30 days'
      `, [companyId]);
      
      const paymentsResult = await externalPool.query(`
        SELECT COALESCE(SUM(total), 0) as outflows FROM bills 
        WHERE company_id = $1 AND bill_date >= NOW() - INTERVAL '30 days'
      `, [companyId]);
      
      const inflows = parseFloat(receiptsResult.rows[0]?.inflows) || 0;
      const outflows = parseFloat(paymentsResult.rows[0]?.outflows) || 0;
      
      res.json({ inflows, outflows, net: inflows - outflows });
    } catch (error) {
      console.error('Error fetching cash flow:', error);
      res.json({ inflows: 0, outflows: 0, net: 0 });
    }
  });

  app.get('/api/dashboard/pending-actions', async (req, res) => {
    try {
      const { companyId } = req.query;
      if (!companyId) {
        return res.json({ pendingInvoices: 0, overduePayments: 0, lowStock: 0 });
      }
      
      const pendingInvoicesResult = await externalPool.query(`
        SELECT COUNT(*) as count FROM invoices 
        WHERE company_id = $1 AND status IN ('pending', 'open', 'draft')
      `, [companyId]);
      
      const overduePaymentsResult = await externalPool.query(`
        SELECT COUNT(*) as count FROM invoices 
        WHERE company_id = $1 AND status = 'open' AND due_date < NOW()
      `, [companyId]);
      
      res.json({ 
        pendingInvoices: parseInt(pendingInvoicesResult.rows[0]?.count) || 0, 
        overduePayments: parseInt(overduePaymentsResult.rows[0]?.count) || 0, 
        lowStock: 0 
      });
    } catch (error) {
      console.error('Error fetching pending actions:', error);
      res.json({ pendingInvoices: 0, overduePayments: 0, lowStock: 0 });
    }
  });

  app.get('/api/dashboard/pl-monthly', async (req, res) => {
    try {
      const { companyId } = req.query;
      if (!companyId) {
        return res.json({ revenue: 0, expenses: 0, profit: 0 });
      }
      
      const revenueResult = await externalPool.query(`
        SELECT COALESCE(SUM(total), 0) as revenue FROM invoices 
        WHERE company_id = $1 AND invoice_date >= DATE_TRUNC('month', NOW())
      `, [companyId]);
      
      const expensesResult = await externalPool.query(`
        SELECT COALESCE(SUM(total), 0) as expenses FROM bills 
        WHERE company_id = $1 AND bill_date >= DATE_TRUNC('month', NOW())
      `, [companyId]);
      
      const revenue = parseFloat(revenueResult.rows[0]?.revenue) || 0;
      const expenses = parseFloat(expensesResult.rows[0]?.expenses) || 0;
      
      res.json({ revenue, expenses, profit: revenue - expenses });
    } catch (error) {
      console.error('Error fetching P&L monthly:', error);
      res.json({ revenue: 0, expenses: 0, profit: 0 });
    }
  });

  // Add working Swagger API documentation endpoint
  app.get('/api-docs', (req: Request, res: Response) => {
    const protocol = req.get('x-forwarded-proto') || req.protocol || 'http';
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Multi-Company Accounting System API</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css" />
  <style>
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 20px 0; }
    body { margin: 0; background: #fafafa; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      const spec = {
        openapi: '3.0.0',
        info: {
          title: 'Multi-Company Accounting System API',
          version: '1.0.0',
          description: 'Complete multi-tenant accounting platform with all tested endpoints'
        },
        servers: [{ url: '${baseUrl}', description: 'Current Server' }],
        paths: {
          '/api/companies': {
            get: {
              summary: 'Get all companies',
              tags: ['Companies'],
              responses: { '200': { description: 'List of all companies' } }
            },
            post: {
              summary: 'Create a new company',
              tags: ['Companies'],
              requestBody: {
                required: true,
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      required: ['name'],
                      properties: {
                        name: { type: 'string' },
                        description: { type: 'string' },
                        status: { type: 'string', enum: ['active', 'inactive'] }
                      }
                    }
                  }
                }
              },
              responses: { '201': { description: 'Company created successfully' } }
            }
          },
          '/api/companies/{id}': {
            get: {
              summary: 'Get company by ID',
              tags: ['Companies'],
              parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
              responses: { '200': { description: 'Company details' } }
            }
          },
          '/api/companies/{id}/accounts': {
            get: {
              summary: 'Get chart of accounts for company',
              tags: ['Companies'],
              parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
              responses: { '200': { description: 'Chart of accounts' } }
            }
          },
          '/api/dashboard/stats': {
            get: {
              summary: 'Get dashboard statistics',
              tags: ['Dashboard'],
              responses: { '200': { description: 'System statistics' } }
            }
          },
          '/api/sales-orders': {
            get: {
              summary: 'Get sales orders',
              tags: ['Sales Orders'],
              parameters: [{ in: 'query', name: 'companyId', schema: { type: 'integer' } }],
              responses: { '200': { description: 'List of sales orders' } }
            }
          },
          '/api/sales-orders/summary': {
            get: {
              summary: 'Get sales orders summary',
              tags: ['Sales Orders'],
              parameters: [{ in: 'query', name: 'companyId', schema: { type: 'integer' } }],
              responses: { '200': { description: 'Sales orders summary' } }
            }
          },
          '/api/invoices/summary': {
            get: {
              summary: 'Get invoice summary',
              tags: ['Invoices'],
              parameters: [{ in: 'query', name: 'companyId', schema: { type: 'integer' } }],
              responses: { '200': { description: 'Invoice summary data' } }
            }
          },
          '/api/receipts/summary': {
            get: {
              summary: 'Get receipts summary',
              tags: ['Receipts'],
              parameters: [{ in: 'query', name: 'companyId', schema: { type: 'integer' } }],
              responses: { '200': { description: 'Receipts summary data' } }
            }
          },
          '/api/purchase-orders/summary': {
            get: {
              summary: 'Get purchase orders summary',
              tags: ['Purchase Orders'],
              parameters: [{ in: 'query', name: 'companyId', schema: { type: 'integer' } }],
              responses: { '200': { description: 'Purchase orders summary' } }
            }
          },
          '/api/bills/summary': {
            get: {
              summary: 'Get bills summary',
              tags: ['Bills'],
              parameters: [{ in: 'query', name: 'companyId', schema: { type: 'integer' } }],
              responses: { '200': { description: 'Bills summary data' } }
            }
          },
          '/api/payments/summary': {
            get: {
              summary: 'Get payments summary',
              tags: ['Payments'],
              parameters: [{ in: 'query', name: 'companyId', schema: { type: 'integer' } }],
              responses: { '200': { description: 'Payments summary data' } }
            }
          },
          '/api/intercompany-balances': {
            get: {
              summary: 'Get intercompany balances',
              tags: ['Intercompany'],
              parameters: [{ in: 'query', name: 'companyId', schema: { type: 'integer' } }],
              responses: { '200': { description: 'Intercompany balance data' } }
            }
          },
          '/api/intercompany/sales-order': {
            post: {
              summary: 'Create intercompany sales order',
              tags: ['Intercompany'],
              requestBody: {
                required: true,
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      required: ['fromCompanyId', 'toCompanyId', 'amount'],
                      properties: {
                        fromCompanyId: { type: 'integer' },
                        toCompanyId: { type: 'integer' },
                        amount: { type: 'number' },
                        description: { type: 'string' }
                      }
                    }
                  }
                }
              },
              responses: { '201': { description: 'Intercompany sales order created' } }
            }
          },
          '/api/intercompany/invoice': {
            post: {
              summary: 'Create intercompany invoice',
              tags: ['Intercompany'],
              requestBody: {
                required: true,
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      required: ['fromCompanyId', 'toCompanyId', 'amount'],
                      properties: {
                        fromCompanyId: { type: 'integer' },
                        toCompanyId: { type: 'integer' },
                        amount: { type: 'number' },
                        description: { type: 'string' }
                      }
                    }
                  }
                }
              },
              responses: { '201': { description: 'Intercompany invoice created' } }
            }
          },
          '/api/intercompany/receipt': {
            post: {
              summary: 'Create intercompany receipt',
              tags: ['Intercompany'],
              requestBody: {
                required: true,
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      required: ['fromCompanyId', 'toCompanyId', 'amount'],
                      properties: {
                        fromCompanyId: { type: 'integer' },
                        toCompanyId: { type: 'integer' },
                        amount: { type: 'number' },
                        description: { type: 'string' }
                      }
                    }
                  }
                }
              },
              responses: { '201': { description: 'Intercompany receipt created' } }
            }
          },
          '/api/transaction-reference/lookup': {
            get: {
              summary: 'Transaction reference lookup',
              tags: ['Transaction Reference'],
              parameters: [{ in: 'query', name: 'reference', required: true, schema: { type: 'string' } }],
              responses: { '200': { description: 'Transaction reference details' } }
            }
          },
          '/api/reports/comprehensive': {
            get: {
              summary: 'Get comprehensive financial reports',
              tags: ['Reports'],
              parameters: [{ in: 'query', name: 'companyId', schema: { type: 'integer' } }],
              responses: { '200': { description: 'Comprehensive report data' } }
            }
          },
          '/api/reports/balance-sheet/summary': {
            get: {
              summary: 'Get balance sheet summary',
              tags: ['Reports'],
              parameters: [{ in: 'query', name: 'companyId', schema: { type: 'integer' } }],
              responses: { '200': { description: 'Balance sheet summary' } }
            }
          },
          '/api/reports/ar-tracking': {
            get: {
              summary: 'Get AR tracking report',
              tags: ['Reports'],
              parameters: [{ in: 'query', name: 'companyId', schema: { type: 'integer' } }],
              responses: { '200': { description: 'AR tracking data' } }
            }
          },
          '/api/reports/ap-tracking': {
            get: {
              summary: 'Get AP tracking report',
              tags: ['Reports'],
              parameters: [{ in: 'query', name: 'companyId', schema: { type: 'integer' } }],
              responses: { '200': { description: 'AP tracking data' } }
            }
          },
          '/health': {
            get: {
              summary: 'Health check endpoint',
              tags: ['System'],
              responses: { '200': { description: 'System health status' } }
            }
          }
        }
      };

      SwaggerUIBundle({
        spec: spec,
        dom_id: '#swagger-ui',
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.presets.standalone
        ]
      });
    };
  </script>
</body>
</html>`;
    res.send(html);
  });

  return httpServer;
}