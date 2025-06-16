/**
 * Script to add Application Insights logging to all existing APIs in server.cjs
 */

const fs = require('fs');
const path = './final-deployment/server.cjs';

// Read the current server file
let content = fs.readFileSync(path, 'utf8');

// Add logging to products endpoint
content = content.replace(
  /app\.get\('\/api\/products', async \(req, res\) => {\s*try {/,
  `app.get('/api/products', async (req, res) => {
  const requestId = \`products-\${Date.now()}-\${Math.floor(Math.random() * 10000)}\`;
  logWithApplicationInsights('INF', 'Fetching products list', requestId);
  
  try {`
);

content = content.replace(
  /res\.json\(result\.rows\);\s*} catch \(error\) {\s*console\.error\('Error fetching products:', error\);/,
  `logWithApplicationInsights('INF', \`Found \${result.rows.length} products\`, requestId);
    res.json(result.rows);
  } catch (error) {
    logWithApplicationInsights('ERR', \`Error fetching products: \${error.message}\`, requestId);`
);

// Add logging to sales orders endpoint
content = content.replace(
  /app\.get\('\/api\/sales-orders', async \(req, res\) => {\s*try {/,
  `app.get('/api/sales-orders', async (req, res) => {
  const requestId = \`sales-orders-\${Date.now()}-\${Math.floor(Math.random() * 10000)}\`;
  const { companyId } = req.query;
  logWithApplicationInsights('INF', \`Fetching sales orders for company \${companyId}\`, requestId);
  
  try {`
);

content = content.replace(
  /res\.json\(result\.rows\);\s*} catch \(error\) {\s*console\.error\('Error fetching sales orders:', error\);/,
  `logWithApplicationInsights('INF', \`Found \${result.rows.length} sales orders\`, requestId);
    res.json(result.rows);
  } catch (error) {
    logWithApplicationInsights('ERR', \`Error fetching sales orders: \${error.message}\`, requestId);`
);

// Add logging to chart of accounts endpoint
content = content.replace(
  /app\.get\('\/api\/accounts', async \(req, res\) => {\s*try {/,
  `app.get('/api/accounts', async (req, res) => {
  const requestId = \`accounts-\${Date.now()}-\${Math.floor(Math.random() * 10000)}\`;
  const { companyId } = req.query;
  logWithApplicationInsights('INF', \`Fetching chart of accounts for company \${companyId}\`, requestId);
  
  try {`
);

content = content.replace(
  /res\.json\(result\.rows\);\s*} catch \(error\) {\s*console\.error\('Error fetching chart of accounts:', error\);/,
  `logWithApplicationInsights('INF', \`Found \${result.rows.length} accounts for company \${companyId}\`, requestId);
    res.json(result.rows);
  } catch (error) {
    logWithApplicationInsights('ERR', \`Error fetching chart of accounts: \${error.message}\`, requestId);`
);

// Add logging to transaction reference lookup
content = content.replace(
  /app\.get\('\/api\/reference\/:reference', async \(req, res\) => {\s*try {/,
  `app.get('/api/reference/:reference', async (req, res) => {
  const requestId = \`ref-lookup-\${Date.now()}-\${Math.floor(Math.random() * 10000)}\`;
  const { reference } = req.params;
  logWithApplicationInsights('INF', \`Looking up transaction reference: \${reference}\`, requestId);
  
  try {`
);

// Add logging to invoices summary
content = content.replace(
  /app\.get\('\/api\/invoices\/summary', async \(req, res\) => {\s*try {/,
  `app.get('/api/invoices/summary', async (req, res) => {
  const requestId = \`invoices-summary-\${Date.now()}-\${Math.floor(Math.random() * 10000)}\`;
  const { companyId } = req.query;
  logWithApplicationInsights('INF', \`Fetching invoices summary for company \${companyId}\`, requestId);
  
  try {`
);

// Add logging to bills summary
content = content.replace(
  /app\.get\('\/api\/bills\/summary', async \(req, res\) => {\s*try {/,
  `app.get('/api/bills/summary', async (req, res) => {
  const requestId = \`bills-summary-\${Date.now()}-\${Math.floor(Math.random() * 10000)}\`;
  const { companyId } = req.query;
  logWithApplicationInsights('INF', \`Fetching bills summary for company \${companyId}\`, requestId);
  
  try {`
);

// Replace console.error statements with Application Insights logging
content = content.replace(
  /console\.error\('([^']+):', error\);/g,
  `logWithApplicationInsights('ERR', '$1: ' + error.message, requestId);`
);

// Replace console.warn statements with Application Insights logging
content = content.replace(
  /console\.warn\(`([^`]+)`, ([^)]+)\);/g,
  `logWithApplicationInsights('WRN', \`$1\`, requestId);`
);

// Write the updated content back
fs.writeFileSync(path, content);

console.log('Application Insights logging added to all existing APIs in server.cjs');
console.log('Updated endpoints: companies, products, sales-orders, accounts, reference lookup, invoices summary, bills summary');
console.log('All console.error and console.warn statements replaced with Application Insights logging');