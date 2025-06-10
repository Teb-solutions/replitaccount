import React from 'react';
import { Helmet } from 'react-helmet-async';
import TestPartialInvoiceFlow from '@/components/intercompany/test-partial-invoice-flow';

const TestIntercompanyWorkflowPage: React.FC = () => {
  return (
    <div className="container mx-auto py-6">
      <Helmet>
        <title>Test Intercompany Workflow | Accounting System</title>
        <meta 
          name="description" 
          content="Test the intercompany partial invoice and receipt workflow with real-time accounting entries" 
        />
      </Helmet>
      
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Intercompany Workflow Test</h1>
        <p className="text-muted-foreground">
          This page demonstrates the complete intercompany invoice workflow with partial invoicing and receipt generation.
        </p>
      </div>
      
      <div className="grid gap-6">
        <TestPartialInvoiceFlow />
      </div>
    </div>
  );
};

export default TestIntercompanyWorkflowPage;