import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, AlertCircle, ArrowRight, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface AccountBalance {
  id: number;
  code: string;
  name: string;
  balance: number;
}

interface TestResult {
  success: boolean;
  message: string;
  stage: string;
  data?: any;
}

const TestPartialInvoiceFlow = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [manufacturerBalances, setManufacturerBalances] = useState<AccountBalance[]>([]);
  const [distributorBalances, setDistributorBalances] = useState<AccountBalance[]>([]);
  
  // Constants for the test
  const MANUFACTURER_ID = 7;
  const DISTRIBUTOR_ID = 8;
  const PRODUCT_CODE = 'FILL-CYL12';
  const TOTAL_QUANTITY = 10;
  const PARTIAL_QUANTITY = 5;
  
  const addResult = (result: TestResult) => {
    setResults(prev => [...prev, result]);
  };
  
  const fetchAccountBalances = async (companyId: number) => {
    try {
      const response = await apiRequest('GET', `/api/accounts?companyId=${companyId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch accounts for company ${companyId}`);
      }
      
      const accounts = await response.json();
      
      // Filter for relevant accounts (Cash, AR/AP, Revenue/Inventory)
      const relevantAccounts = accounts.filter((account: any) => 
        ['1000', '1100', '1300', '2000', '4000'].includes(account.code)
      );
      
      return relevantAccounts;
    } catch (error) {
      console.error('Error fetching account balances:', error);
      return [];
    }
  };
  
  const refreshBalances = async () => {
    const manufacturerAccounts = await fetchAccountBalances(MANUFACTURER_ID);
    const distributorAccounts = await fetchAccountBalances(DISTRIBUTOR_ID);
    
    setManufacturerBalances(manufacturerAccounts);
    setDistributorBalances(distributorAccounts);
  };
  
  const runFullTest = async () => {
    setLoading(true);
    setResults([]);
    
    try {
      // Step 1: Create a sales order
      addResult({
        success: true,
        message: "Starting test workflow...",
        stage: "init"
      });
      
      // Fetch product for the sales order
      const productsResponse = await apiRequest('GET', `/api/products?companyId=${MANUFACTURER_ID}`);
      
      if (!productsResponse.ok) {
        throw new Error('Failed to fetch products');
      }
      
      const products = await productsResponse.json();
      const product = products.find((p: any) => p.code === PRODUCT_CODE);
      
      if (!product) {
        throw new Error(`Product with code ${PRODUCT_CODE} not found`);
      }
      
      addResult({
        success: true,
        message: `Found product: ${product.name} with price ${formatCurrency(product.sales_price)}`,
        stage: "find_product",
        data: product
      });
      
      // Create the sales order
      const orderNumber = `IC-ORDER-UI-${Date.now()}`;
      const orderDate = new Date().toISOString().split('T')[0];
      
      const salesOrderData = {
        companyId: MANUFACTURER_ID,
        customerId: DISTRIBUTOR_ID,
        orderNumber,
        orderDate,
        status: 'Open',
        items: [{
          productId: product.id,
          quantity: TOTAL_QUANTITY,
          unitPrice: product.sales_price,
          description: product.name
        }]
      };
      
      const salesOrderResponse = await apiRequest('POST', '/api/intercompany/sales-orders', salesOrderData);
      
      if (!salesOrderResponse.ok) {
        throw new Error('Failed to create sales order');
      }
      
      const salesOrder = await salesOrderResponse.json();
      
      addResult({
        success: true,
        message: `Created sales order #${orderNumber} with ID ${salesOrder.id}`,
        stage: "create_order",
        data: salesOrder
      });
      
      // Step 2: Create a partial invoice
      const invoiceNumber = `INV-${orderNumber}-PART`;
      const invoiceDate = new Date().toISOString().split('T')[0];
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const invoiceData = {
        companyId: MANUFACTURER_ID,
        customerId: DISTRIBUTOR_ID,
        salesOrderId: salesOrder.id,
        invoiceNumber,
        invoiceDate,
        dueDate,
        status: 'Pending',
        items: [{
          productId: product.id,
          quantity: PARTIAL_QUANTITY,
          unitPrice: product.sales_price,
          description: product.name
        }]
      };
      
      const invoiceResponse = await apiRequest('POST', '/api/intercompany/invoices', invoiceData);
      
      if (!invoiceResponse.ok) {
        throw new Error('Failed to create partial invoice');
      }
      
      const invoice = await invoiceResponse.json();
      const invoiceAmount = product.sales_price * PARTIAL_QUANTITY;
      
      addResult({
        success: true,
        message: `Created partial invoice #${invoiceNumber} for ${PARTIAL_QUANTITY} out of ${TOTAL_QUANTITY} units`,
        stage: "create_invoice",
        data: {
          ...invoice,
          amount: invoiceAmount
        }
      });
      
      // Step 3: Create a receipt for the invoice
      const receiptNumber = `RCPT-${invoiceNumber}`;
      const receiptDate = new Date().toISOString().split('T')[0];
      
      const receiptData = {
        companyId: MANUFACTURER_ID,
        customerId: DISTRIBUTOR_ID,
        invoiceId: invoice.id,
        amount: invoiceAmount,
        receiptDate,
        receiptNumber,
        paymentMethod: 'Bank Transfer'
      };
      
      const receiptResponse = await apiRequest('POST', '/api/intercompany/receipts', receiptData);
      
      if (!receiptResponse.ok) {
        throw new Error('Failed to create receipt');
      }
      
      const receipt = await receiptResponse.json();
      
      addResult({
        success: true,
        message: `Created receipt #${receiptNumber} for the full invoice amount ${formatCurrency(invoiceAmount)}`,
        stage: "create_receipt",
        data: receipt
      });
      
      // Step 4: Verify account balances
      await refreshBalances();
      
      addResult({
        success: true,
        message: "Test workflow completed successfully!",
        stage: "complete"
      });
      
      toast({
        title: "Test Completed",
        description: "The intercompany partial invoice workflow completed successfully",
      });
      
    } catch (error) {
      console.error('Test failed:', error);
      addResult({
        success: false,
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        stage: "error"
      });
      
      toast({
        title: "Test Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Intercompany Partial Invoice Test</CardTitle>
        <CardDescription>
          Tests the workflow of creating a sales order for 10 items, invoicing 5, and receiving payment
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="flex justify-between mb-4">
          <Button 
            onClick={runFullTest} 
            disabled={loading}
            className="mr-2"
          >
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Running Test...
              </>
            ) : "Run Test Workflow"}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={refreshBalances}
            disabled={loading}
          >
            Refresh Account Balances
          </Button>
        </div>
        
        {results.length > 0 && (
          <div className="mt-4 border rounded-md p-4">
            <h3 className="text-lg font-semibold mb-2">Test Results</h3>
            <div className="space-y-2">
              {results.map((result, index) => (
                <div key={index} className="flex items-start">
                  {result.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
                  )}
                  <div>
                    <p>{result.message}</p>
                    {result.data && (
                      <pre className="text-xs mt-1 bg-slate-100 p-2 rounded">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <Separator className="my-4" />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Gas Manufacturing (ID: 7)</h3>
            {manufacturerBalances.length > 0 ? (
              <div className="space-y-1">
                {manufacturerBalances.map((account) => (
                  <div key={account.id} className="flex justify-between text-sm">
                    <span>{account.code} - {account.name}</span>
                    <span className={account.balance > 0 ? 'text-green-600' : account.balance < 0 ? 'text-red-600' : ''}>
                      {formatCurrency(account.balance)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No account data available</p>
            )}
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-2">Gas Distributor (ID: 8)</h3>
            {distributorBalances.length > 0 ? (
              <div className="space-y-1">
                {distributorBalances.map((account) => (
                  <div key={account.id} className="flex justify-between text-sm">
                    <span>{account.code} - {account.name}</span>
                    <span className={account.balance > 0 ? 'text-green-600' : account.balance < 0 ? 'text-red-600' : ''}>
                      {formatCurrency(account.balance)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No account data available</p>
            )}
          </div>
        </div>
        
        {(results.find(r => !r.success)) && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Test Failed</AlertTitle>
            <AlertDescription>
              {results.find(r => !r.success)?.message}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <p className="text-sm text-muted-foreground">
          This test uses the same endpoints as the intercompany-partial-invoice.js test script
        </p>
      </CardFooter>
    </Card>
  );
};

export default TestPartialInvoiceFlow;