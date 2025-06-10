import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import express from 'express';

// Swagger definition
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Multi-Tenant Accounting API',
      version: '1.0.0',
      description: 'API documentation for the multi-tenant accounting system',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: '/',
        description: 'API Server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  // Path to the API docs - include all server files with swagger annotations
  apis: [
    './server/*.js',
    './server/index.js',
    './server/routes.js',
    './server/company-management-api.js',
    './server/intercompany-workflow-api.js',
    './server/sales-orders-api.js',
    './server/purchase-orders-api.js',
    './server/invoices-api.js',
    './server/bills-api.js',
    './server/receipts-api.js',
    './server/payments-api.js',
    './server/comprehensive-reports-api.js',
    './server/accounts-api.js',
    './server/accounts-api-fixed.js',
    './server/receipts-direct-api.js',
    './server/bill-payments-api.js',
    './server/fixed-comprehensive-ar-ap-api.js',
    './server/intercompany-sales-purchase-api.js',
    './server/intercompany-order-status-api.js',
    './server/intercompany-auto-invoicing-api.js',
    './server/ar-ap-summary-api.js',
    './server/account-balances-api.js',
    './server/chart-of-accounts-api.js',
    './server/product-api-fix.js',
    './server/gas-products-api.js',
    './server/tenant-companies-api.js',
    './server/product-summary-api.js',
    './server/essential-financial-reports-api.js',
    './server/intercompany-relationships-api.js',
    './server/intercompany-purchase-orders-api.js',
    './server/gas-invoices-api.js',
    './server/intercompany-sales-orders-api.js',
    './server/gas-sales-orders-api.js',
    './server/product-price-fix-api.js',
    './server/intercompany-products-api.js',
    './server/bills-api.js'
  ]
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

const router = express.Router();

// Serve swagger docs with dynamic URL handling
router.use('/api-docs', swaggerUi.serve, (req, res, next) => {
  // Enhanced host detection for external access
  const host = req.get('host') || req.get('x-forwarded-host') || `${req.hostname}:${req.get('x-forwarded-port') || process.env.PORT || 3002}`;
  const protocol = req.get('x-forwarded-proto') || req.protocol || 'http';
  
  // Create a copy of swaggerSpec with the correct server URL
  const dynamicSpec = {
    ...swaggerSpec,
    servers: [{
      url: `${protocol}://${host}`,
      description: 'API Server'
    }]
  };
  
  swaggerUi.setup(dynamicSpec, {
    swaggerOptions: {
      url: `${protocol}://${host}/api/swagger.json`
    }
  })(req, res, next);
});

// Serve swagger.json with CORS headers
router.get('/api/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'false');
  
  // Enhanced host detection for external IP access
  const host = req.get('host') || req.get('x-forwarded-host') || `${req.hostname}:${req.get('x-forwarded-port') || process.env.PORT || 3002}`;
  const protocol = req.get('x-forwarded-proto') || req.protocol || 'http';
  
  // Create dynamic spec with correct server URL
  const dynamicSpec = {
    ...swaggerSpec,
    servers: [{
      url: `${protocol}://${host}`,
      description: 'API Server'
    }]
  };
  
  res.send(dynamicSpec);
});

export default router;