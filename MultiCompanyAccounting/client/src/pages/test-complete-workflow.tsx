import { useState, useEffect } from "react";
import { useCompany } from "@/hooks/use-company";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle, DollarSign, BarChart3, Package, ShoppingCart } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProductSelection, { ProductItem } from "@/components/product-selection";

type AccountBalance = {
  id: number;
  code: string;
  name: string;
  balance: string;
  companyId: number;
}

type WorkflowResult = {
  success: boolean;
  message: string;
  transactionId: number;
  salesOrderId: number;
  purchaseOrderId: number;
  invoiceId: number;
  billId: number;
  receiptId: number;
  logs: string[];
  completedSteps: number;
  orderAmount: number;
  orderItems: Array<{
    productId: number;
    productName: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
  beforeBalances: {
    source: AccountBalance[];
    target: AccountBalance[];
  };
  afterBalances: {
    source: AccountBalance[];
    target: AccountBalance[];
  };
}

export default function TestCompleteWorkflow() {
  const { activeCompany } = useCompany();
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [workflowResult, setWorkflowResult] = useState<WorkflowResult | null>(null);
  const [amount, setAmount] = useState<number>(10000);
  const [selectedProducts, setSelectedProducts] = useState<ProductItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>("amount");
  
  // Calculate total from selected products
  const totalFromProducts = selectedProducts.reduce(
    (sum, product) => sum + (product.price * product.quantity), 
    0
  );

  // Define the workflow steps
  const steps = [
    { label: "Creating Sales Order", complete: false },
    { label: "Creating Purchase Order", complete: false },
    { label: "Creating Intercompany Transaction", complete: false },
    { label: "Creating Invoice and Bill", complete: false },
    { label: "Creating Journal Entries", complete: false },
    { label: "Creating Receipt and Payment", complete: false },
    { label: "Updating Account Balances", complete: false },
  ];

  const [currentSteps, setCurrentSteps] = useState(steps);
  
  // Fetch initial account balances for Gas Manufacturing (ID: 7)
  const { data: sourceCompanyBalances } = useQuery({
    queryKey: ['/api/gas-accounts', 7],
    queryFn: async () => {
      const response = await fetch('/api/gas-accounts?companyId=7');
      if (!response.ok) throw new Error('Failed to fetch source company accounts');
      return await response.json();
    }
  });
  
  // Fetch initial account balances for Gas Distributor (ID: 8)
  const { data: targetCompanyBalances } = useQuery({
    queryKey: ['/api/gas-accounts', 8],
    queryFn: async () => {
      const response = await fetch('/api/gas-accounts?companyId=8');
      if (!response.ok) throw new Error('Failed to fetch target company accounts');
      return await response.json();
    }
  });

  // Filtered relevant accounts - include both regular and intercompany AR/AP accounts
  const getFilteredAccounts = (accounts: any[] = [], codes = ['1000', '1100', '1150', '2000', '2150', '4000', '5000']) => {
    return accounts
      .filter(acc => codes.includes(acc.code))
      .sort((a, b) => a.code.localeCompare(b.code));
  };

  // The workflow mutation
  const workflowMutation = useMutation({
    mutationFn: async () => {
      setLogs(["Starting complete intercompany workflow..."]);
      setError(null);
      setSuccess(false);
      setWorkflowResult(null);
      setCurrentSteps(steps.map(step => ({ ...step, complete: false })));

      // First, collect the before balances
      const beforeSourceAccounts = getFilteredAccounts(sourceCompanyBalances);
      const beforeTargetAccounts = getFilteredAccounts(targetCompanyBalances);

      // Determine the amount to use based on the active tab
      const orderAmount = activeTab === "products" && selectedProducts.length > 0 
        ? totalFromProducts 
        : amount;
      
      // Create order items if products are selected
      const orderItems = activeTab === "products" && selectedProducts.length > 0
        ? selectedProducts.map(product => ({
            productId: product.id,
            productName: product.name,
            quantity: product.quantity,
            unitPrice: product.price,
            amount: product.price * product.quantity
          }))
        : [];
        
      setLogs(prev => [...prev, `Using ${activeTab === "products" ? "product selection" : "fixed amount"} with total: $${orderAmount.toFixed(2)}`]);
      
      if (orderItems.length > 0) {
        setLogs(prev => [...prev, `Selected ${orderItems.length} products for order`]);
      }

      const response = await apiRequest("POST", "/api/test-complete-workflow", {
        sourceCompanyId: 7, // Gas Manufacturing
        targetCompanyId: 8, // Gas Distributor
        amount: orderAmount,
        orderItems: orderItems.length > 0 ? orderItems : undefined
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to execute workflow");
      }

      // Fetch the updated balances after workflow execution
      const sourceResponse = await fetch('/api/gas-accounts?companyId=7');
      const targetResponse = await fetch('/api/gas-accounts?companyId=8');
      
      if (!sourceResponse.ok || !targetResponse.ok) {
        throw new Error("Failed to fetch updated account balances");
      }
      
      const updatedSourceAccounts = await sourceResponse.json();
      const updatedTargetAccounts = await targetResponse.json();
      
      const workflowData = await response.json();
      
      // Create the full result object with before/after balances
      return {
        ...workflowData,
        beforeBalances: {
          source: beforeSourceAccounts,
          target: beforeTargetAccounts
        },
        afterBalances: {
          source: getFilteredAccounts(updatedSourceAccounts),
          target: getFilteredAccounts(updatedTargetAccounts)
        }
      };
    },
    onSuccess: (data) => {
      setLogs(prev => [...prev, ...data.logs]);
      setWorkflowResult(data);
      setSuccess(true);
      
      // Update steps based on the response
      setCurrentSteps(currentSteps.map((step, index) => ({
        ...step,
        complete: index < data.completedSteps
      })));
    },
    onError: (error: Error) => {
      setError(error.message);
      setLogs(prev => [...prev, `Error: ${error.message}`]);
    }
  });

  // Format currency values
  const formatCurrency = (value: string | number | undefined) => {
    if (value === undefined || value === null) return '$0.00';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return numValue.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    });
  };
  
  // Get the account name by code
  const getAccountName = (code: string) => {
    switch(code) {
      case '1000': return 'Cash';
      case '1100': return 'Accounts Receivable';
      case '1150': return 'Intercompany Receivable';
      case '2000': return 'Accounts Payable';
      case '2150': return 'Intercompany Payable';
      case '4000': return 'Revenue';
      case '5000': return 'Cost of Goods Sold';
      default: return `Account ${code}`;
    }
  };
  
  // Helper to highlight key account changes for AR/AP relationships
  const isIntercompanyAccount = (code: string) => {
    return code === '1150' || code === '2150';
  };
  
  // Calculate the difference between before and after balances
  const calculateDifference = (before: string | undefined, after: string | undefined, accountCode?: string) => {
    if (before === undefined || after === undefined) {
      return <span className="text-gray-600">$0.00</span>;
    }
    
    const beforeNum = parseFloat(before || '0');
    const afterNum = parseFloat(after || '0');
    const diff = afterNum - beforeNum;
    
    let color = diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-600';
    const prefix = diff > 0 ? '+' : '';
    
    // Highlight intercompany accounts with a special class to draw attention
    if (accountCode && isIntercompanyAccount(accountCode) && diff !== 0) {
      color += ' font-bold';
    }
    
    return (
      <span className={color}>
        {prefix}{formatCurrency(diff)}
      </span>
    );
  };
  
  // Execute the workflow
  const executeWorkflow = () => {
    workflowMutation.mutate();
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Test Complete Intercompany Workflow</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Control</CardTitle>
              <CardDescription>
                Execute a complete intercompany workflow between Gas Manufacturing (ID: 7) and Gas Distributor (ID: 8)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6 mb-6">
                <h3 className="text-lg font-semibold">Transaction Amount</h3>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Enter Amount or Select Products Below
                  </label>
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                    <input 
                      type="number" 
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-1 flex-1 rounded-full bg-primary/20"></div>
                  <span className="text-xs text-muted-foreground">OR</span>
                  <div className="h-1 flex-1 rounded-full bg-primary/20"></div>
                </div>
                
                <div className="flex items-center space-x-2 mb-4">
                  <input 
                    type="radio" 
                    id="use-amount" 
                    name="transaction-method"
                    checked={activeTab === "amount"}
                    onChange={() => setActiveTab("amount")}
                    className="h-4 w-4"
                  />
                  <label htmlFor="use-amount" className="text-sm">Use fixed amount</label>
                  
                  <input 
                    type="radio" 
                    id="use-products" 
                    name="transaction-method"
                    checked={activeTab === "products"}
                    onChange={() => setActiveTab("products")}
                    className="h-4 w-4 ml-4"
                  />
                  <label htmlFor="use-products" className="text-sm">Use product selection</label>
                </div>
              </div>
              
              {activeTab === "products" && (
                <ProductSelection 
                  companyId={7} // Gas Manufacturing
                  onProductsChange={setSelectedProducts}
                />
              )}
              
              <div className="mt-6">
                <p className="text-sm text-muted-foreground">
                  This test will create all the necessary records for a complete intercompany transaction:
                </p>
                <ol className="list-decimal pl-5 space-y-1 text-sm mt-2">
                  <li>Create sales order from Gas Manufacturing to Gas Distributor</li>
                  <li>Create purchase order from Gas Distributor to Gas Manufacturing</li>
                  <li>Create intercompany transaction linking both orders</li>
                  <li>Create invoice and bill for the transaction</li>
                  <li>Create journal entries in both companies</li>
                  <li>Create receipt and payment for the transaction</li>
                  <li>Update all account balances appropriately</li>
                </ol>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button 
                className="w-full" 
                onClick={() => executeWorkflow()} 
                disabled={workflowMutation.isPending}
              >
                {workflowMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Executing Workflow...
                  </>
                ) : (
                  "Execute Complete Workflow"
                )}
              </Button>
              
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {success && (
                <Alert variant="success" className="bg-green-50 dark:bg-green-950">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Success</AlertTitle>
                  <AlertDescription>
                    Workflow completed successfully!
                  </AlertDescription>
                </Alert>
              )}
            </CardFooter>
          </Card>
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Workflow Steps</CardTitle>
              <CardDescription>Current progress through the workflow</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {currentSteps.map((step, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    {step.complete ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border border-gray-300"></div>
                    )}
                    <span className={step.complete ? "text-green-700 font-medium dark:text-green-400" : "text-gray-600"}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {workflowResult && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Transaction Summary
                </CardTitle>
                <CardDescription>Details of the executed transaction</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Transaction Details</h3>
                    <div className="bg-muted rounded-md p-3 text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Amount:</span>
                        <span className="font-medium">{formatCurrency(workflowResult?.orderAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sales Order:</span>
                        <span className="font-medium">#{workflowResult?.salesOrderId || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Purchase Order:</span>
                        <span className="font-medium">#{workflowResult?.purchaseOrderId || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Invoice:</span>
                        <span className="font-medium">#{workflowResult?.invoiceId || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Bill:</span>
                        <span className="font-medium">#{workflowResult?.billId || '-'}</span>
                      </div>
                    </div>
                  </div>
                  
                  {workflowResult.orderItems && workflowResult.orderItems.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-2">Order Items</h3>
                      <div className="bg-muted rounded-md p-3 overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Product</TableHead>
                              <TableHead className="text-right">Quantity</TableHead>
                              <TableHead className="text-right">Unit Price</TableHead>
                              <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {workflowResult.orderItems.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell>{item.productName}</TableCell>
                                <TableCell className="text-right">{item.quantity}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        <div className="md:col-span-2">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Execution Logs</CardTitle>
                <CardDescription>Real-time logs from the workflow execution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-black rounded-md p-4 h-[400px] overflow-y-auto">
                  <pre className="text-green-400 text-sm font-mono">
                    {logs.length === 0 ? (
                      <span className="text-gray-500">No logs yet. Execute the workflow to see logs here.</span>
                    ) : (
                      logs.map((log, index) => (
                        <div key={index} className="pb-1">
                          $ {log}
                        </div>
                      ))
                    )}
                  </pre>
                </div>
              </CardContent>
            </Card>
            
            {workflowResult && (
              <>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle>Account Balances - Gas Manufacturing Co.</CardTitle>
                    <CardDescription>Before and after the transaction</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Account</TableHead>
                          <TableHead className="text-right">Before</TableHead>
                          <TableHead className="text-right">After</TableHead>
                          <TableHead className="text-right">Change</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {workflowResult?.beforeBalances?.source?.map((account) => {
                          const afterAccount = workflowResult?.afterBalances?.source?.find(a => a.code === account.code);
                          if (!afterAccount) return null;
                          
                          const isIC = isIntercompanyAccount(account.code);
                          
                          return (
                            <TableRow 
                              key={account.code}
                              className={isIC ? "bg-amber-50 dark:bg-amber-950" : ""}
                            >
                              <TableCell className={`font-medium ${isIC ? "font-semibold" : ""}`}>
                                {account.name} ({account.code})
                              </TableCell>
                              <TableCell className="text-right">{formatCurrency(account.balance)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(afterAccount.balance)}</TableCell>
                              <TableCell className="text-right">
                                {calculateDifference(account.balance, afterAccount.balance, account.code)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle>Account Balances - Gas Distributor Co.</CardTitle>
                    <CardDescription>Before and after the transaction</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Account</TableHead>
                          <TableHead className="text-right">Before</TableHead>
                          <TableHead className="text-right">After</TableHead>
                          <TableHead className="text-right">Change</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {workflowResult?.beforeBalances?.target?.map((account) => {
                          const afterAccount = workflowResult?.afterBalances?.target?.find(a => a.code === account.code);
                          if (!afterAccount) return null;
                          
                          const isIC = isIntercompanyAccount(account.code);
                          
                          return (
                            <TableRow 
                              key={account.code}
                              className={isIC ? "bg-amber-50 dark:bg-amber-950" : ""}
                            >
                              <TableCell className={`font-medium ${isIC ? "font-semibold" : ""}`}>
                                {account.name} ({account.code})
                              </TableCell>
                              <TableCell className="text-right">{formatCurrency(account.balance)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(afterAccount.balance)}</TableCell>
                              <TableCell className="text-right">
                                {calculateDifference(account.balance, afterAccount.balance, account.code)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}