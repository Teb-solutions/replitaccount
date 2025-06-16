/**
 * IIS-Compatible Server for Credit/Debit Notes System
 * Designed for Windows IIS deployment with iisnode
 */
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Import credit/debit notes APIs
async function setupAPIs() {
  try {
    // Import credit/debit notes API
    const { default: creditDebitNotesAPI } = await import('./server/apis/credit-debit-notes-api.js');
    app.use(creditDebitNotesAPI);
    console.log('✅ Credit/Debit notes API loaded');

    // Import credit/debit accounts API
    const { default: creditDebitAccountsAPI } = await import('./server/apis/credit-debit-accounts-api.js');
    app.use(creditDebitAccountsAPI);
    console.log('✅ Credit/Debit accounts API loaded');

    // Import database setup API
    const { default: databaseSetupAPI } = await import('./server/apis/database-setup-api.js');
    app.use(databaseSetupAPI);
    console.log('✅ Database setup API loaded');

    // Import Application Insights logger
    const { requestIdMiddleware, appLogger } = await import('./server/apis/application-insights-logger.js');
    app.use(requestIdMiddleware);
    console.log('✅ Application Insights logging enabled');

  } catch (error) {
    console.error('❌ Error loading APIs:', error.message);
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'Credit/Debit Notes System',
    timestamp: new Date().toISOString(),
    environment: 'IIS Production'
  });
});

// Serve static files (React build)
app.use(express.static(path.join(__dirname, 'public')));

// Handle React routing
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    res.status(404).json({ error: 'API endpoint not found' });
  }
});

// Initialize APIs
setupAPIs();

// For IIS, listen on the port provided by iisnode
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Credit/Debit Notes Server running on port ${port}`);
  console.log(`📊 Health check: /api/health`);
  console.log(`🏢 Environment: IIS Production`);
});

export default app;
