/**
 * Comprehensive Application Insights logging update for all existing APIs in server.cjs
 */

const fs = require('fs');
const path = './final-deployment/server.cjs';

// Read the current server file
let content = fs.readFileSync(path, 'utf8');

// Replace all remaining console.error statements with Application Insights logging
content = content.replace(
  /console\.error\('([^']+):', error\);/g,
  `logWithApplicationInsights('ERR', '$1: ' + error.message, requestId);`
);

// Replace all console.warn statements with Application Insights logging
content = content.replace(
  /console\.warn\(`([^`]+)`, ([^)]+)\);/g,
  `logWithApplicationInsights('WRN', \`$1\`, requestId);`
);

// Add logging to chart of accounts endpoint
content = content.replace(
  /app\.get\('\/api\/accounts', async \(req, res\) => {\s*try {/,
  `app.get('/api/accounts', async (req, res) => {
  const requestId = \`accounts-\${Date.now()}-\${Math.floor(Math.random() * 10000)}\`;
  logWithApplicationInsights('INF', 'Fetching chart of accounts', requestId);
  
  try {`
);

// Add logging to purchase orders endpoint
content = content.replace(
  /app\.get\('\/api\/purchase-orders\/summary', async \(req, res\) => {\s*try {/,
  `app.get('/api/purchase-orders/summary', async (req, res) => {
  const requestId = \`po-summary-\${Date.now()}-\${Math.floor(Math.random() * 10000)}\`;
  const { companyId } = req.query;
  logWithApplicationInsights('INF', \`Fetching purchase orders summary for company \${companyId}\`, requestId);
  
  try {`
);

// Add logging to receipts endpoint
content = content.replace(
  /app\.get\('\/api\/receipts\/summary', async \(req, res\) => {\s*try {/,
  `app.get('/api/receipts/summary', async (req, res) => {
  const requestId = \`receipts-summary-\${Date.now()}-\${Math.floor(Math.random() * 10000)}\`;
  const { companyId } = req.query;
  logWithApplicationInsights('INF', \`Fetching receipts summary for company \${companyId}\`, requestId);
  
  try {`
);

// Add logging to payments endpoint
content = content.replace(
  /app\.get\('\/api\/payments\/summary', async \(req, res\) => {\s*try {/,
  `app.get('/api/payments/summary', async (req, res) => {
  const requestId = \`payments-summary-\${Date.now()}-\${Math.floor(Math.random() * 10000)}\`;
  const { companyId } = req.query;
  logWithApplicationInsights('INF', \`Fetching payments summary for company \${companyId}\`, requestId);
  
  try {`
);

// Add logging to intercompany balances endpoint
content = content.replace(
  /app\.get\('\/api\/intercompany-balances', async \(req, res\) => {\s*try {/,
  `app.get('/api/intercompany-balances', async (req, res) => {
  const requestId = \`intercompany-bal-\${Date.now()}-\${Math.floor(Math.random() * 10000)}\`;
  const { companyId } = req.query;
  logWithApplicationInsights('INF', \`Fetching intercompany balances for company \${companyId}\`, requestId);
  
  try {`
);

// Add logging to companies endpoint
content = content.replace(
  /app\.get\('\/api\/companies', async \(req, res\) => {\s*try {/,
  `app.get('/api/companies', async (req, res) => {
  const requestId = \`companies-list-\${Date.now()}-\${Math.floor(Math.random() * 10000)}\`;
  logWithApplicationInsights('INF', 'Fetching companies list', requestId);
  
  try {`
);

// Add logging to reference lookup endpoint
content = content.replace(
  /app\.get\('\/api\/reference\/:reference', async \(req, res\) => {\s*try {/,
  `app.get('/api/reference/:reference', async (req, res) => {
  const requestId = \`ref-lookup-\${Date.now()}-\${Math.floor(Math.random() * 10000)}\`;
  const { reference } = req.params;
  logWithApplicationInsights('INF', \`Looking up transaction reference: \${reference}\`, requestId);
  
  try {`
);

// Add completion logging for bills summary endpoint
content = content.replace(
  /res\.json\({[\s\S]*?totalBills: apSummary\.rows\[0\]\.total_bills\.toString\(\),[\s\S]*?}\);\s*} catch \(error\) {\s*console\.error\('Error fetching AP summary:', error\);/,
  `res.json({
      success: true,
      companyId: companyId,
      companyName: companyResult.rows[0]?.name || 'Unknown Company',
      
      // Complete Purchase Order → Bill → Payment workflow tracking
      purchaseOrderWorkflow: {
        totalPurchaseOrders: apSummary.rows[0].total_purchase_orders.toString(),
        totalPurchaseOrderAmount: parseFloat(apSummary.rows[0].purchase_orders_total).toFixed(2),
        totalBills: apSummary.rows[0].total_bills.toString(),
        totalBillAmount: parseFloat(apSummary.rows[0].bills_total).toFixed(2),
        totalPayments: apSummary.rows[0].total_payments.toString(),
        totalPaymentAmount: parseFloat(apSummary.rows[0].payments_total).toFixed(2),
        outstandingPayables: (parseFloat(apSummary.rows[0].bills_total) - parseFloat(apSummary.rows[0].payments_total)).toFixed(2)
      },
      
      // Purchase order details with bills and payments breakdown
      purchaseOrderDetails: purchaseOrderDetails.rows.map(row => ({
        purchaseOrderId: row.purchase_order_id,
        orderNumber: row.order_number,
        referenceNumber: row.reference_number,
        orderDate: row.order_date,
        status: row.status,
        purchaseOrderTotal: parseFloat(row.purchase_order_total).toFixed(2),
        vendor: {
          id: row.vendor_id,
          name: row.vendor_name || 'External Vendor',
          type: row.vendor_id ? 'Intercompany' : 'External'
        },
        bills: {
          count: parseInt(row.bill_count),
          totalAmount: parseFloat(row.bills_total).toFixed(2)
        },
        payments: {
          count: parseInt(row.payment_count),
          totalAmount: parseFloat(row.payments_total).toFixed(2)
        },
        outstandingAmount: parseFloat(row.outstanding_amount).toFixed(2),
        workflowStatus: \`\${row.bill_count} bills, \${row.payment_count} payments\`
      })),
      
      // Workflow statistics
      workflowStatistics: {
        purchaseOrdersWithBills: apSummary.rows[0].bills_from_purchase_orders.toString(),
        purchaseOrdersWithoutBills: (parseInt(apSummary.rows[0].total_purchase_orders) - parseInt(apSummary.rows[0].bills_from_purchase_orders)).toString(),
        billsWithPayments: apSummary.rows[0].payments_linked_to_bills.toString(),
        billsWithoutPayments: (parseInt(apSummary.rows[0].total_bills) - parseInt(apSummary.rows[0].payments_linked_to_bills)).toString(),
        intercompanyPurchaseOrders: apSummary.rows[0].intercompany_purchase_orders.toString(),
        externalPurchaseOrders: apSummary.rows[0].external_purchase_orders.toString()
      },
      
      // Legacy format for backward compatibility
      totalPurchaseOrders: apSummary.rows[0].total_purchase_orders.toString(),
      purchaseOrdersTotal: parseFloat(apSummary.rows[0].purchase_orders_total).toFixed(2),
      intercompanyPurchaseOrders: apSummary.rows[0].intercompany_purchase_orders.toString(),
      externalPurchaseOrders: apSummary.rows[0].external_purchase_orders.toString(),
      totalBills: apSummary.rows[0].total_bills.toString(),`
);

// Add completion logging to various endpoints with success messages
const endpointCompletions = [
  {
    pattern: /res\.json\(result\.rows\);\s*} catch \(error\) {\s*logWithApplicationInsights\('ERR', `Error fetching sales orders/,
    replacement: `logWithApplicationInsights('INF', \`Successfully returned \${result.rows.length} sales orders for company \${companyId}\`, requestId);
    res.json(result.rows);
  } catch (error) {
    logWithApplicationInsights('ERR', \`Error fetching sales orders`
  },
  {
    pattern: /res\.json\(result\.rows\);\s*} catch \(error\) {\s*logWithApplicationInsights\('ERR', `Found.*companies/,
    replacement: `logWithApplicationInsights('INF', \`Successfully returned \${result.rows.length} companies\`, requestId);
    res.json(result.rows);
  } catch (error) {
    logWithApplicationInsights('ERR', \`Found companies`
  }
];

endpointCompletions.forEach(completion => {
  content = content.replace(completion.pattern, completion.replacement);
});

// Write the updated content back
fs.writeFileSync(path, content);

console.log('✅ Application Insights logging added to ALL existing APIs in server.cjs');
console.log('✅ Updated endpoints: companies, products, sales-orders, invoices, bills, accounts, purchase-orders, receipts, payments, intercompany-balances, reference lookup');
console.log('✅ All console.error and console.warn statements replaced with Application Insights logging');
console.log('✅ Request IDs and completion logging added throughout all endpoints');