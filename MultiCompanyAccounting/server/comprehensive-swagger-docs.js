/**
 * Comprehensive Swagger Documentation for Multi-Company Accounting System
 * Production-Ready API Documentation with all endpoints
 */

export const comprehensiveSwaggerDocs = {
  openapi: '3.0.0',
  info: {
    title: 'Multi-Company Accounting System API',
    version: '1.0.0',
    description: 'Complete API documentation for multi-tenant accounting platform with intercompany transactions',
    contact: {
      name: 'API Support',
      email: 'support@accounting-system.com'
    }
  },
  servers: [
    {
      url: '/api',
      description: 'Production API Server'
    }
  ],
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health Check',
        description: 'Check system health and database connectivity',
        responses: {
          200: {
            description: 'System is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'healthy' },
                    message: { type: 'string', example: 'Multi-Company Accounting System is operational' },
                    timestamp: { type: 'string', format: 'date-time' },
                    database: { type: 'string', example: 'connected' },
                    version: { type: 'string', example: '1.0.0' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/companies': {
      get: {
        tags: ['Companies'],
        summary: 'Get All Companies',
        description: 'Retrieve list of all companies in the system',
        responses: {
          200: {
            description: 'Companies retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/Company'
                  }
                }
              }
            }
          }
        }
      }
    },
    '/companies/{id}': {
      get: {
        tags: ['Companies'],
        summary: 'Get Company by ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            description: 'Company ID'
          }
        ],
        responses: {
          200: {
            description: 'Company details',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Company'
                }
              }
            }
          }
        }
      }
    },
    '/accounts': {
      get: {
        tags: ['Chart of Accounts'],
        summary: 'Get Chart of Accounts',
        description: 'Retrieve chart of accounts for a specific company',
        parameters: [
          {
            name: 'companyId',
            in: 'query',
            required: true,
            schema: { type: 'integer' },
            description: 'Company ID'
          },
          {
            name: 'account_type_id',
            in: 'query',
            schema: { type: 'integer' },
            description: 'Filter by account type (1=Assets, 2=Liabilities, 3=Equity, 4=Revenue, 5=Expenses)'
          }
        ],
        responses: {
          200: {
            description: 'Chart of accounts retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/Account'
                  }
                }
              }
            }
          }
        }
      },
      post: {
        tags: ['Chart of Accounts'],
        summary: 'Create New Account',
        description: 'Create a new account in the chart of accounts',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateAccount'
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Account created successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Account'
                }
              }
            }
          }
        }
      }
    },
    '/account-types': {
      get: {
        tags: ['Chart of Accounts'],
        summary: 'Get Account Types',
        description: 'Retrieve all available account types',
        responses: {
          200: {
            description: 'Account types retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/AccountType'
                  }
                }
              }
            }
          }
        }
      }
    },
    '/sales-orders': {
      get: {
        tags: ['Sales Orders'],
        summary: 'Get Sales Orders',
        description: 'Retrieve comprehensive sales orders including intercompany transactions',
        parameters: [
          {
            name: 'companyId',
            in: 'query',
            required: true,
            schema: { type: 'integer' },
            description: 'Company ID'
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 50 },
            description: 'Number of records to return'
          },
          {
            name: 'offset',
            in: 'query',
            schema: { type: 'integer', default: 0 },
            description: 'Number of records to skip'
          }
        ],
        responses: {
          200: {
            description: 'Sales orders retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/SalesOrder'
                  }
                }
              }
            }
          }
        }
      }
    },
    '/sales-orders/summary': {
      get: {
        tags: ['Order Reports'],
        summary: 'Get Sales Order Summary',
        description: 'Retrieve comprehensive sales order summary with statistics and breakdown',
        parameters: [
          {
            name: 'companyId',
            in: 'query',
            required: true,
            schema: { type: 'integer' },
            description: 'Company ID'
          }
        ],
        responses: {
          200: {
            description: 'Sales order summary retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/SalesOrderSummary'
                }
              }
            }
          }
        }
      }
    },
    '/sales-orders/intercompany': {
      post: {
        tags: ['Sales Orders'],
        summary: 'Create Intercompany Sales Order',
        description: 'Create a sales order between two companies, automatically generating corresponding purchase order',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateIntercompanySalesOrder'
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Intercompany sales order created successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/IntercompanyOrderResponse'
                }
              }
            }
          },
          400: {
            description: 'Missing required fields',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error'
                }
              }
            }
          }
        }
      }
    },
    '/invoices': {
      get: {
        tags: ['Invoices'],
        summary: 'Get Invoices',
        description: 'Retrieve comprehensive invoices including intercompany invoices',
        parameters: [
          {
            name: 'companyId',
            in: 'query',
            required: true,
            schema: { type: 'integer' },
            description: 'Company ID'
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 50 },
            description: 'Number of records to return'
          },
          {
            name: 'offset',
            in: 'query',
            schema: { type: 'integer', default: 0 },
            description: 'Number of records to skip'
          }
        ],
        responses: {
          200: {
            description: 'Invoices retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/Invoice'
                  }
                }
              }
            }
          }
        }
      }
    },
    '/invoices/from-order/{orderId}': {
      post: {
        tags: ['Invoices'],
        summary: 'Create Invoice from Sales Order',
        description: 'Generate an invoice based on an existing sales order',
        parameters: [
          {
            name: 'orderId',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            description: 'Sales Order ID'
          }
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateInvoiceFromOrder'
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Invoice created successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Invoice'
                }
              }
            }
          },
          404: {
            description: 'Sales order not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error'
                }
              }
            }
          }
        }
      }
    },
    '/receipts': {
      get: {
        tags: ['Receipts'],
        summary: 'Get Receipts',
        description: 'Retrieve comprehensive receipts including payment details',
        parameters: [
          {
            name: 'companyId',
            in: 'query',
            required: true,
            schema: { type: 'integer' },
            description: 'Company ID'
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 50 },
            description: 'Number of records to return'
          },
          {
            name: 'offset',
            in: 'query',
            schema: { type: 'integer', default: 0 },
            description: 'Number of records to skip'
          }
        ],
        responses: {
          200: {
            description: 'Receipts retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/Receipt'
                  }
                }
              }
            }
          }
        }
      }
    },
    '/receipts/for-invoice/{invoiceId}': {
      post: {
        tags: ['Receipts'],
        summary: 'Create Receipt for Invoice',
        description: 'Record a payment receipt against an existing invoice',
        parameters: [
          {
            name: 'invoiceId',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            description: 'Invoice ID'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateReceipt'
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Receipt created successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Receipt'
                }
              }
            }
          },
          400: {
            description: 'Invalid amount or missing required fields',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error'
                }
              }
            }
          },
          404: {
            description: 'Invoice not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error'
                }
              }
            }
          }
        }
      }
    },
    '/purchase-orders': {
      get: {
        tags: ['Purchase Orders'],
        summary: 'Get Purchase Orders',
        description: 'Retrieve comprehensive purchase orders including intercompany transactions',
        parameters: [
          {
            name: 'companyId',
            in: 'query',
            required: true,
            schema: { type: 'integer' },
            description: 'Company ID'
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 50 },
            description: 'Number of records to return'
          },
          {
            name: 'offset',
            in: 'query',
            schema: { type: 'integer', default: 0 },
            description: 'Number of records to skip'
          }
        ],
        responses: {
          200: {
            description: 'Purchase orders retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/PurchaseOrder'
                  }
                }
              }
            }
          }
        }
      }
    },
    '/purchase-orders/summary': {
      get: {
        tags: ['Order Reports'],
        summary: 'Get Purchase Order Summary',
        description: 'Retrieve comprehensive purchase order summary with statistics and breakdown',
        parameters: [
          {
            name: 'companyId',
            in: 'query',
            required: true,
            schema: { type: 'integer' },
            description: 'Company ID'
          }
        ],
        responses: {
          200: {
            description: 'Purchase order summary retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/PurchaseOrderSummary'
                }
              }
            }
          }
        }
      }
    },
    '/bills': {
      get: {
        tags: ['Bills'],
        summary: 'Get Bills',
        description: 'Retrieve bills for a company',
        parameters: [
          {
            name: 'companyId',
            in: 'query',
            required: true,
            schema: { type: 'integer' },
            description: 'Company ID'
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 50 },
            description: 'Number of records to return'
          }
        ],
        responses: {
          200: {
            description: 'Bills retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/Bill'
                  }
                }
              }
            }
          }
        }
      }
    },
    '/reports/balance-sheet': {
      get: {
        tags: ['Financial Reports'],
        summary: 'Get Balance Sheet',
        description: 'Generate balance sheet report for a company',
        parameters: [
          {
            name: 'companyId',
            in: 'query',
            required: true,
            schema: { type: 'integer' },
            description: 'Company ID'
          }
        ],
        responses: {
          200: {
            description: 'Balance sheet generated successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/BalanceSheet'
                }
              }
            }
          }
        }
      }
    },
    '/intercompany/workflow': {
      get: {
        tags: ['Intercompany'],
        summary: 'Get Intercompany Workflow',
        description: 'Retrieve intercompany transactions and workflow status',
        parameters: [
          {
            name: 'companyId',
            in: 'query',
            required: true,
            schema: { type: 'integer' },
            description: 'Company ID'
          }
        ],
        responses: {
          200: {
            description: 'Intercompany workflow retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/IntercompanyWorkflow'
                }
              }
            }
          }
        }
      }
    },
    '/accounts-receivable/comprehensive': {
      get: {
        tags: ['Accounts Receivable'],
        summary: 'Get Comprehensive AR Report',
        description: 'Retrieve comprehensive accounts receivable report with aging analysis',
        parameters: [
          {
            name: 'companyId',
            in: 'query',
            required: true,
            schema: { type: 'integer' },
            description: 'Company ID for AR report'
          }
        ],
        responses: {
          200: {
            description: 'Comprehensive AR report retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    company_id: { type: 'integer', example: 1 },
                    company_name: { type: 'string', example: 'Acme Manufacturing Inc' },
                    total_receivables: { type: 'number', example: 125750.00 },
                    current: { type: 'number', example: 85000.00 },
                    overdue_30: { type: 'number', example: 25000.00 },
                    overdue_60: { type: 'number', example: 10750.00 },
                    overdue_90_plus: { type: 'number', example: 5000.00 },
                    invoices: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Invoice' }
                    },
                    aging_analysis: {
                      type: 'object',
                      properties: {
                        current_percentage: { type: 'number', example: 67.6 },
                        overdue_percentage: { type: 'number', example: 32.4 },
                        average_days_outstanding: { type: 'number', example: 28.5 }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/accounts-payable/comprehensive': {
      get: {
        tags: ['Accounts Payable'],
        summary: 'Get Comprehensive AP Report',
        description: 'Retrieve comprehensive accounts payable report with aging analysis',
        parameters: [
          {
            name: 'companyId',
            in: 'query',
            required: true,
            schema: { type: 'integer' },
            description: 'Company ID for AP report'
          }
        ],
        responses: {
          200: {
            description: 'Comprehensive AP report retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    company_id: { type: 'integer', example: 2 },
                    company_name: { type: 'string', example: 'Beta Distributors Ltd' },
                    total_payables: { type: 'number', example: 89500.00 },
                    current: { type: 'number', example: 65000.00 },
                    overdue_30: { type: 'number', example: 15000.00 },
                    overdue_60: { type: 'number', example: 7500.00 },
                    overdue_90_plus: { type: 'number', example: 2000.00 },
                    bills: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Bill' }
                    },
                    aging_analysis: {
                      type: 'object',
                      properties: {
                        current_percentage: { type: 'number', example: 72.6 },
                        overdue_percentage: { type: 'number', example: 27.4 },
                        average_days_outstanding: { type: 'number', example: 22.8 }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/reports/comprehensive/profit-loss': {
      get: {
        tags: ['Financial Reports'],
        summary: 'Get Comprehensive P&L Report',
        description: 'Retrieve detailed profit and loss statement with period comparisons',
        parameters: [
          {
            name: 'companyId',
            in: 'query',
            required: true,
            schema: { type: 'integer' },
            description: 'Company ID for P&L report'
          },
          {
            name: 'startDate',
            in: 'query',
            schema: { type: 'string', format: 'date' },
            description: 'Start date for report period'
          },
          {
            name: 'endDate',
            in: 'query',
            schema: { type: 'string', format: 'date' },
            description: 'End date for report period'
          }
        ],
        responses: {
          200: {
            description: 'Comprehensive P&L report retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    company_id: { type: 'integer', example: 1 },
                    company_name: { type: 'string', example: 'Acme Manufacturing Inc' },
                    period_start: { type: 'string', format: 'date' },
                    period_end: { type: 'string', format: 'date' },
                    revenue: { type: 'number', example: 450000.00 },
                    cost_of_goods_sold: { type: 'number', example: 280000.00 },
                    gross_profit: { type: 'number', example: 170000.00 },
                    operating_expenses: { type: 'number', example: 85000.00 },
                    net_income: { type: 'number', example: 85000.00 },
                    gross_margin_percentage: { type: 'number', example: 37.8 },
                    net_margin_percentage: { type: 'number', example: 18.9 }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/reports/comprehensive/cash-flow': {
      get: {
        tags: ['Financial Reports'],
        summary: 'Get Comprehensive Cash Flow Report',
        description: 'Retrieve detailed cash flow statement with operating, investing, and financing activities',
        parameters: [
          {
            name: 'companyId',
            in: 'query',
            required: true,
            schema: { type: 'integer' },
            description: 'Company ID for cash flow report'
          }
        ],
        responses: {
          200: {
            description: 'Comprehensive cash flow report retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    company_id: { type: 'integer', example: 1 },
                    operating_activities: { type: 'number', example: 125000.00 },
                    investing_activities: { type: 'number', example: -45000.00 },
                    financing_activities: { type: 'number', example: 15000.00 },
                    net_cash_flow: { type: 'number', example: 95000.00 },
                    beginning_cash: { type: 'number', example: 50000.00 },
                    ending_cash: { type: 'number', example: 145000.00 }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/accounts-receivable/comprehensive-fixed': {
      get: {
        tags: ['Accounts Receivable'],
        summary: 'Get Comprehensive AR Analysis (Fixed)',
        description: 'Returns detailed AR summary with aging analysis using corrected database schema',
        parameters: [
          {
            name: 'companyId',
            in: 'query',
            required: true,
            schema: { type: 'integer' },
            description: 'Company ID to get AR analysis for'
          }
        ],
        responses: {
          200: {
            description: 'Comprehensive AR analysis',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    company: { type: 'string' },
                    summary: {
                      type: 'object',
                      properties: {
                        total_invoices: { type: 'integer' },
                        total_amount: { type: 'number' },
                        paid_amount: { type: 'number' },
                        pending_amount: { type: 'number' }
                      }
                    },
                    invoices: { type: 'array', items: { type: 'object' } }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/accounts-payable/comprehensive-fixed': {
      get: {
        tags: ['Accounts Payable'],
        summary: 'Get Comprehensive AP Analysis (Fixed)',
        description: 'Returns detailed AP summary with aging analysis using corrected database schema',
        parameters: [
          {
            name: 'companyId',
            in: 'query',
            required: true,
            schema: { type: 'integer' },
            description: 'Company ID to get AP analysis for'
          }
        ],
        responses: {
          200: {
            description: 'Comprehensive AP analysis',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    company: { type: 'string' },
                    summary: { type: 'object' },
                    bills: { type: 'array', items: { type: 'object' } }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/transactions/reference-lookup-fixed': {
      get: {
        tags: ['Transaction Lookup'],
        summary: 'Search Transactions by Reference (Fixed)',
        description: 'Find invoices, bills, sales orders, and receipts by reference number using corrected database schema',
        parameters: [
          {
            name: 'reference',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'Reference number to search for (partial match supported)'
          }
        ],
        responses: {
          200: {
            description: 'Transaction search results',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    reference: { type: 'string' },
                    results: {
                      type: 'object',
                      properties: {
                        invoices: { type: 'array', items: { type: 'object' } },
                        bills: { type: 'array', items: { type: 'object' } },
                        sales_orders: { type: 'array', items: { type: 'object' } },
                        receipts: { type: 'array', items: { type: 'object' } }
                      }
                    },
                    total_found: { type: 'integer' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/accounts/chart': {
      get: {
        tags: ['Chart of Accounts'],
        summary: 'Get Chart of Accounts',
        description: 'Retrieve complete chart of accounts for a company',
        parameters: [
          {
            name: 'companyId',
            in: 'query',
            required: true,
            schema: { type: 'integer' },
            description: 'Company ID for chart of accounts'
          }
        ],
        responses: {
          200: {
            description: 'Chart of accounts retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Account' }
                }
              }
            }
          }
        }
      },
      post: {
        tags: ['Chart of Accounts'],
        summary: 'Create New Account',
        description: 'Create a new account in the chart of accounts',
        parameters: [
          {
            name: 'companyId',
            in: 'query',
            required: true,
            schema: { type: 'integer' },
            description: 'Company ID for new account'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['code', 'name', 'account_type_id'],
                properties: {
                  code: { type: 'string', example: '1100' },
                  name: { type: 'string', example: 'Petty Cash' },
                  description: { type: 'string', example: 'Small cash fund for expenses' },
                  account_type_id: { type: 'integer', example: 1 },
                  parent_id: { type: 'integer', nullable: true }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Account created successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Account' }
              }
            }
          }
        }
      }
    },
    '/intercompany/sales-order-invoice': {
      post: {
        tags: ['Intercompany'],
        summary: 'Create Invoice from Intercompany Sales Order',
        description: 'Generate invoice from completed intercompany sales order',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['sales_order_id'],
                properties: {
                  sales_order_id: { type: 'integer', example: 1001 },
                  invoice_date: { type: 'string', format: 'date', example: '2024-01-20' },
                  due_days: { type: 'integer', example: 30 }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Invoice created from sales order successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Invoice' }
              }
            }
          }
        }
      }
    },
    '/intercompany/payment-receipt': {
      post: {
        tags: ['Intercompany'],
        summary: 'Create Intercompany Payment Receipt',
        description: 'Process payment receipt for intercompany invoice',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['invoice_id', 'amount'],
                properties: {
                  invoice_id: { type: 'integer', example: 4001 },
                  amount: { type: 'number', example: 15750.00 },
                  payment_method: { type: 'string', example: 'intercompany_transfer' },
                  receipt_date: { type: 'string', format: 'date', example: '2024-01-25' },
                  reference_number: { type: 'string', example: 'IC-TXN-001' }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Intercompany payment receipt created successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Receipt' }
              }
            }
          }
        }
      }
    },
    '/ar-ap-summary': {
      get: {
        tags: ['Financial Reports'],
        summary: 'Get AR/AP Summary for All Companies',
        description: 'Retrieve consolidated accounts receivable and payable summary across all companies',
        responses: {
          200: {
            description: 'AR/AP summary retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    total_receivables: { type: 'number', example: 450750.00 },
                    total_payables: { type: 'number', example: 325600.00 },
                    net_position: { type: 'number', example: 125150.00 },
                    companies: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          company_id: { type: 'integer', example: 1 },
                          company_name: { type: 'string', example: 'Acme Manufacturing Inc' },
                          receivables: { type: 'number', example: 125750.00 },
                          payables: { type: 'number', example: 89500.00 },
                          net_position: { type: 'number', example: 36250.00 }
                        }
                      }
                    },
                    intercompany_balances: {
                      type: 'object',
                      properties: {
                        total_intercompany_receivables: { type: 'number', example: 85000.00 },
                        total_intercompany_payables: { type: 'number', example: 85000.00 },
                        net_intercompany_position: { type: 'number', example: 0.00 }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/transactions/reference': {
      get: {
        tags: ['Financial Reports'],
        summary: 'Get All Transactions by Reference',
        description: 'Retrieve all transactions across all companies matching a reference number',
        parameters: [
          {
            name: 'reference',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'Reference number to search for (e.g., "tryten295")',
            example: 'tryten295'
          }
        ],
        responses: {
          200: {
            description: 'Transactions with matching reference retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    reference_number: { type: 'string', example: 'tryten295' },
                    total_transactions: { type: 'integer', example: 5 },
                    transactions: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          transaction_type: { type: 'string', example: 'sales_order' },
                          id: { type: 'integer', example: 1001 },
                          transaction_number: { type: 'string', example: 'SO-001-2024' },
                          reference_number: { type: 'string', example: 'tryten295' },
                          transaction_date: { type: 'string', format: 'date' },
                          amount: { type: 'string', example: '15750.00' },
                          status: { type: 'string', example: 'pending' },
                          company_id: { type: 'integer', example: 1 },
                          company_name: { type: 'string', example: 'Acme Manufacturing Inc' },
                          related_company_id: { type: 'integer', nullable: true },
                          related_company_name: { type: 'string', nullable: true }
                        }
                      }
                    },
                    summary: {
                      type: 'object',
                      properties: {
                        sales_orders: { type: 'integer', example: 2 },
                        purchase_orders: { type: 'integer', example: 1 },
                        invoices: { type: 'integer', example: 1 },
                        receipts: { type: 'integer', example: 1 },
                        bills: { type: 'integer', example: 0 },
                        total_amount: { type: 'string', example: '47250.00' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      Company: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Acme Manufacturing Inc' },
          company_code: { type: 'string', example: 'MANUF001' },
          company_type: { type: 'string', example: 'manufacturer' },
          address: { type: 'string', example: '123 Industrial Ave' },
          phone: { type: 'string', example: '+1-555-0123' },
          email: { type: 'string', example: 'contact@acme.com' },
          status: { type: 'string', example: 'active' },
          created_at: { type: 'string', format: 'date-time' }
        }
      },
      Account: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 101 },
          company_id: { type: 'integer', example: 1 },
          account_type_id: { type: 'integer', example: 1 },
          code: { type: 'string', example: '1000' },
          name: { type: 'string', example: 'Cash and Cash Equivalents' },
          description: { type: 'string', example: 'Primary checking account' },
          parent_id: { type: 'integer', nullable: true },
          level: { type: 'integer', example: 1 },
          is_active: { type: 'boolean', example: true },
          balance: { type: 'string', example: '25000.00' },
          created_at: { type: 'string', format: 'date-time' }
        }
      },
      CreateAccount: {
        type: 'object',
        required: ['company_id', 'account_type_id', 'code', 'name'],
        properties: {
          company_id: { type: 'integer', example: 1 },
          account_type_id: { type: 'integer', example: 1 },
          code: { type: 'string', example: '1001' },
          name: { type: 'string', example: 'Petty Cash' },
          description: { type: 'string', example: 'Small cash fund for minor expenses' },
          parent_id: { type: 'integer', nullable: true },
          balance: { type: 'string', example: '500.00' }
        }
      },
      AccountType: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          code: { type: 'string', example: 'ASSET' },
          name: { type: 'string', example: 'Assets' },
          description: { type: 'string', example: 'Assets owned by the company' }
        }
      },
      SalesOrder: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1001 },
          order_number: { type: 'string', example: 'SO-001-2024' },
          order_date: { type: 'string', format: 'date', example: '2024-01-15' },
          total: { type: 'string', example: '15750.00' },
          status: { type: 'string', example: 'pending' },
          company_id: { type: 'integer', example: 1 },
          customer_company_id: { type: 'integer', nullable: true, example: 2 },
          company_name: { type: 'string', example: 'Acme Manufacturing Inc' },
          customer_name: { type: 'string', nullable: true, example: 'Beta Distributors Ltd' },
          order_type: { type: 'string', example: 'intercompany' }
        }
      },
      CreateIntercompanySalesOrder: {
        type: 'object',
        required: ['selling_company_id', 'buying_company_id', 'products'],
        properties: {
          selling_company_id: { type: 'integer', example: 1 },
          buying_company_id: { type: 'integer', example: 2 },
          order_date: { type: 'string', format: 'date', example: '2024-01-15' },
          notes: { type: 'string', example: 'Monthly intercompany product transfer' },
          products: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                product_id: { type: 'integer', example: 101 },
                quantity: { type: 'integer', example: 100 },
                unit_price: { type: 'number', example: 25.50 }
              }
            }
          }
        }
      },
      IntercompanyOrderResponse: {
        type: 'object',
        properties: {
          sales_order: { $ref: '#/components/schemas/SalesOrder' },
          purchase_order: { $ref: '#/components/schemas/PurchaseOrder' },
          products_count: { type: 'integer', example: 3 },
          total_amount: { type: 'string', example: '15750.00' }
        }
      },
      PurchaseOrder: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 2001 },
          order_number: { type: 'string', example: 'PO-002-2024' },
          order_date: { type: 'string', format: 'date' },
          total: { type: 'string', example: '15750.00' },
          status: { type: 'string', example: 'pending' },
          company_id: { type: 'integer', example: 2 },
          supplier_company_id: { type: 'integer', example: 1 },
          related_sales_order_id: { type: 'integer', example: 1001 },
          company_name: { type: 'string', example: 'Beta Distributors Ltd' },
          supplier_name: { type: 'string', example: 'Acme Manufacturing Inc' },
          sales_order_number: { type: 'string', example: 'SO-001-2024' },
          order_type: { type: 'string', example: 'intercompany' }
        }
      },
      SalesOrderSummary: {
        type: 'object',
        properties: {
          totalOrders: { type: 'integer', example: 45 },
          totalAmount: { type: 'number', example: 125750.00 },
          pendingOrders: { type: 'integer', example: 12 },
          completedOrders: { type: 'integer', example: 25 },
          invoicedOrders: { type: 'integer', example: 8 },
          intercompanyOrders: { type: 'integer', example: 18 },
          externalOrders: { type: 'integer', example: 27 },
          averageOrderValue: { type: 'number', example: 2794.44 },
          companyId: { type: 'integer', example: 1 }
        }
      },
      PurchaseOrderSummary: {
        type: 'object',
        properties: {
          totalOrders: { type: 'integer', example: 32 },
          totalAmount: { type: 'number', example: 89250.00 },
          pendingOrders: { type: 'integer', example: 8 },
          receivedOrders: { type: 'integer', example: 20 },
          billedOrders: { type: 'integer', example: 4 },
          intercompanyOrders: { type: 'integer', example: 15 },
          externalOrders: { type: 'integer', example: 17 },
          averageOrderValue: { type: 'number', example: 2789.06 },
          companyId: { type: 'integer', example: 2 }
        }
      },
      Invoice: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 3001 },
          invoice_number: { type: 'string', example: 'INV-001-2024' },
          invoice_date: { type: 'string', format: 'date' },
          due_date: { type: 'string', format: 'date' },
          total: { type: 'string', example: '15750.00' },
          status: { type: 'string', example: 'pending' },
          company_id: { type: 'integer', example: 1 },
          customer_company_id: { type: 'integer', nullable: true },
          sales_order_id: { type: 'integer', nullable: true },
          company_name: { type: 'string', example: 'Acme Manufacturing Inc' },
          customer_name: { type: 'string', nullable: true },
          order_number: { type: 'string', nullable: true }
        }
      },
      CreateInvoiceFromOrder: {
        type: 'object',
        properties: {
          invoice_date: { type: 'string', format: 'date', example: '2024-01-20' },
          due_days: { type: 'integer', example: 30 }
        }
      },
      Receipt: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 4001 },
          receipt_number: { type: 'string', example: 'RCP-001-2024' },
          receipt_date: { type: 'string', format: 'date' },
          amount: { type: 'string', example: '15750.00' },
          payment_method: { type: 'string', example: 'bank_transfer' },
          reference_number: { type: 'string', example: 'TXN123456' },
          company_id: { type: 'integer', example: 1 },
          customer_company_id: { type: 'integer', nullable: true },
          invoice_id: { type: 'integer', nullable: true },
          company_name: { type: 'string', example: 'Acme Manufacturing Inc' },
          customer_name: { type: 'string', nullable: true },
          invoice_number: { type: 'string', nullable: true }
        }
      },
      CreateReceipt: {
        type: 'object',
        required: ['amount'],
        properties: {
          amount: { type: 'number', example: 15750.00 },
          payment_method: { type: 'string', example: 'bank_transfer', enum: ['bank_transfer', 'cash', 'check', 'credit_card'] },
          receipt_date: { type: 'string', format: 'date', example: '2024-01-25' },
          reference_number: { type: 'string', example: 'TXN123456' }
        }
      },
      Bill: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 5001 },
          bill_number: { type: 'string', example: 'BILL-001-2024' },
          bill_date: { type: 'string', format: 'date' },
          due_date: { type: 'string', format: 'date' },
          total: { type: 'string', example: '8500.00' },
          status: { type: 'string', example: 'pending' },
          company_id: { type: 'integer', example: 2 },
          supplier_company_id: { type: 'integer', nullable: true },
          purchase_order_id: { type: 'integer', nullable: true }
        }
      },
      BalanceSheet: {
        type: 'object',
        properties: {
          assets: { type: 'number', example: 125000.00 },
          liabilities: { type: 'number', example: 45000.00 },
          equity: { type: 'number', example: 80000.00 },
          total_liabilities_and_equity: { type: 'number', example: 125000.00 },
          company_id: { type: 'integer', example: 1 },
          balanced: { type: 'boolean', example: true }
        }
      },
      IntercompanyWorkflow: {
        type: 'object',
        properties: {
          transactions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                transaction_type: { type: 'string', example: 'sales_order' },
                id: { type: 'integer', example: 1001 },
                reference_number: { type: 'string', example: 'SO-001-2024' },
                transaction_date: { type: 'string', format: 'date' },
                amount: { type: 'string', example: '15750.00' },
                status: { type: 'string', example: 'pending' },
                from_company: { type: 'string', example: 'Acme Manufacturing Inc' },
                to_company: { type: 'string', example: 'Beta Distributors Ltd' },
                from_company_id: { type: 'integer', example: 1 },
                to_company_id: { type: 'integer', example: 2 }
              }
            }
          },
          total: { type: 'integer', example: 5 },
          company_id: { type: 'integer', example: 1 }
        }
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Missing required fields' },
          details: { type: 'string', example: 'company_id and amount are required' }
        }
      }
    }
  },
  tags: [
    {
      name: 'System',
      description: 'System health and status endpoints'
    },
    {
      name: 'Companies',
      description: 'Company management operations'
    },
    {
      name: 'Chart of Accounts',
      description: 'Account management and chart of accounts operations'
    },
    {
      name: 'Sales Orders',
      description: 'Sales order management including intercompany orders'
    },
    {
      name: 'Purchase Orders',
      description: 'Purchase order management including intercompany orders'
    },
    {
      name: 'Order Reports',
      description: 'Comprehensive order reporting and summary APIs for sales and purchase orders'
    },
    {
      name: 'Invoices',
      description: 'Invoice management and billing operations'
    },
    {
      name: 'Receipts',
      description: 'Payment receipt management'
    },
    {
      name: 'Bills',
      description: 'Bill and accounts payable management'
    },
    {
      name: 'Financial Reports',
      description: 'Financial reporting and analytics'
    },
    {
      name: 'Accounts Receivable',
      description: 'Comprehensive accounts receivable management and aging reports'
    },
    {
      name: 'Accounts Payable',
      description: 'Comprehensive accounts payable management and aging reports'
    },
    {
      name: 'Intercompany',
      description: 'Intercompany transaction workflow and management'
    }
  ]
};

export function setupComprehensiveSwagger(app) {
  console.log('📚 Setting up comprehensive Swagger documentation...');
  
  // Swagger UI endpoint
  app.get('/api-docs', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Multi-Company Accounting System API</title>
          <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@3.25.0/swagger-ui.css" />
          <style>
            html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
            *, *:before, *:after { box-sizing: inherit; }
            body { margin:0; background: #fafafa; }
          </style>
        </head>
        <body>
          <div id="swagger-ui"></div>
          <script src="https://unpkg.com/swagger-ui-dist@3.25.0/swagger-ui-bundle.js"></script>
          <script src="https://unpkg.com/swagger-ui-dist@3.25.0/swagger-ui-standalone-preset.js"></script>
          <script>
            window.onload = function() {
              const ui = SwaggerUIBundle({
                url: '/api/swagger.json',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                  SwaggerUIBundle.presets.apis,
                  SwaggerUIStandalonePreset
                ],
                plugins: [
                  SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout"
              });
            };
          </script>
        </body>
      </html>
    `);
  });

  // Swagger JSON endpoint
  app.get('/api/swagger.json', (req, res) => {
    res.json(comprehensiveSwaggerDocs);
  });

  console.log('✅ Comprehensive Swagger documentation setup complete');
  console.log('📖 API Documentation available at: /api-docs');
  console.log('📋 Swagger JSON available at: /api/swagger.json');
}