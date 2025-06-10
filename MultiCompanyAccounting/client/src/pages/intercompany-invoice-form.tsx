import React, { useState, useEffect, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/hooks/use-company";
import { useIntercompany, IntercompanyTransaction } from "@/hooks/use-intercompany";
import { useAuth } from "@/hooks/use-auth";
import { createIntercompanyInvoice } from "@/lib/intercompany-connector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CheckCircle, Receipt, FileText, CreditCard, PlusCircle, Plus, XCircle, Info, SplitSquareVertical } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import PartialInvoiceControls from "@/components/intercompany/partial-invoice-controls";

const formSchema = z.object({
  sourceCompanyId: z.number().min(1, "Source company is required"),
  targetCompanyId: z.number().min(1, "Target company is required"),
  salesOrderId: z.number().min(1, "Sales order is required"),
  purchaseOrderId: z.number().min(1, "Purchase order is required"),
  issueDate: z.string().min(1, "Issue date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  description: z.string().min(3, "Description is required"),
  invoiceType: z.enum(['full', 'partial']).optional(),
  items: z.array(z.object({
    productId: z.number().min(1, "Product is required"),
    quantity: z.number().min(1, "Quantity must be at least 1"),
    unitPrice: z.number().min(0.01, "Unit price must be greater than 0"),
    description: z.string().optional(),
    soItemId: z.number().optional(),
    poItemId: z.number().optional(),
    productName: z.string().optional(),
  }))
});

type FormValues = z.infer<typeof formSchema>;

export default function IntercompanyInvoiceForm() {
  const { activeCompany } = useCompany();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isLoading: isLoadingAuth } = useAuth();
  const [orderId, setOrderId] = useState<number | string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [invoiceType, setInvoiceType] = useState<'full' | 'partial'>('full');
  const [partialItems, setPartialItems] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<{[id: number]: boolean}>({0: true});
  const [activeTab, setActiveTab] = useState<'invoice' | 'receipt'>('invoice');
  const [previousTransactions, setPreviousTransactions] = useState<any[]>([]);
  
  // Create a custom setter that also updates the global state for timeouts to access
  const updateProcessingStatus = (status: 'idle' | 'processing' | 'success' | 'error') => {
    setProcessingStatus(status);
    (window as any)._processingStatus = status;
  };
  const timeoutRefs = useRef<NodeJS.Timeout[]>([]);
  
  // Effect to clean up any timeouts when component unmounts
  useEffect(() => {
    return () => {
      // Clear all timeouts when component unmounts
      timeoutRefs.current.forEach((id) => {
        clearTimeout(id);
      });
      
      // Also reset state if we leave the page while processing
      if (processingStatus !== 'idle' || isCreating) {
        console.log("Page unmounting while processing - cleaning up state");
        updateProcessingStatus('idle');
        setIsCreating(false);
      }
    };
  }, [processingStatus, isCreating]);
  
  // Use our intercompany hook to find related transactions
  const { 
    transactions: intercompanyTransactions, 
    isLoading: isLoadingTransactions,
    findTransactionBySalesOrderId,
    fetchTransactionByOrderId
  } = useIntercompany<IntercompanyTransaction[]>();
  
  // Get URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const soId = params.get("soId");
    
    console.log("URL Parameters:", {
      rawParams: window.location.search,
      parsedSoId: soId
    });
    
    if (soId) {
      // Try to parse as number but keep original string if NaN
      const parsedId = parseInt(soId, 10);
      const finalId = isNaN(parsedId) ? soId : parsedId;
      console.log("Setting order ID to:", finalId);
      setOrderId(finalId);
    } else {
      console.warn("No soId parameter found in URL");
    }
  }, []);
  
  // Query for the sales order first if we have an orderId
  const { data: salesOrderData, isLoading: isLoadingSalesOrderData } = useQuery({
    queryKey: ['/api/sales-orders', orderId],
    queryFn: async () => {
      if (!orderId) return null;
      
      try {
        // First try to find the order in the salesOrders list
        if (salesOrders && Array.isArray(salesOrders) && salesOrders.length > 0) {
          const foundOrder = salesOrders.find(order => order.id === Number(orderId));
          if (foundOrder) {
            console.log("Found matching order in salesOrders list, using cached data:", foundOrder);
            return foundOrder;
          }
        }
        
        // If not found in local cache, try the API
        const res = await apiRequest('GET', `/api/sales-orders/${orderId}`);
        
        if (!res.ok) {
          throw new Error(`Error fetching sales order: ${res.status}`);
        }
        
        // Get text first to check if it's valid JSON
        const text = await res.text();
        
        // Check if response is HTML
        if (text.trim().startsWith('<!DOCTYPE html>') || text.trim().startsWith('<html>')) {
          throw new Error('Response is HTML, not valid JSON');
        }
        
        try {
          return JSON.parse(text);
        } catch (parseError) {
          console.error('Failed to parse JSON response:', parseError);
          throw new Error('Invalid JSON response from server');
        }
      } catch (error) {
        console.error('Error in salesOrderData query:', error);
        // If we have the order in our list but API failed, still use the list data
        if (salesOrders && Array.isArray(salesOrders) && salesOrders.length > 0) {
          const foundOrder = salesOrders.find(order => order.id === Number(orderId));
          if (foundOrder) {
            console.log("API fetch failed but using cached order data:", foundOrder);
            return foundOrder;
          }
        }
        throw error;
      }
    },
    enabled: !!orderId
  });
  
  // Create intercompany transaction mutation
  const createTransactionMutation = useMutation({
    mutationFn: async (data: {
      sourceCompanyId: number;
      targetCompanyId: number;
      description: string;
      amount: string | number;
      transactionDate: Date;
      sourceOrderId: number;
      targetOrderId?: number;
    }) => {
      return apiRequest(
        'POST',
        '/api/intercompany-transactions',
        data
      );
    },
    onSuccess: () => {
      toast({
        title: "Transaction created",
        description: "Intercompany transaction was created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/intercompany-transactions'] });
    },
    onError: (error: any) => {
      // Check for authentication errors
      if (error.status === 401 || (error.message && error.message.includes('unauthorized'))) {
        toast({
          title: "Authentication Required",
          description: "Your session has expired. Please log in again.",
          variant: "destructive",
        });
        
        // Redirect to login page with current page as redirect target
        setTimeout(() => {
          setLocation(`/auth?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        }, 1500);
      } else {
        // Regular error handling
        toast({
          title: "Error",
          description: error.message || "Failed to create transaction",
          variant: "destructive",
        });
      }
    }
  });
  
  // Find the related transaction based on the sales order ID using local and server-side helpers
  const relatedTransaction = useMemo(() => {
    if (!orderId) return null;
    
    console.log("Searching for transaction with orderId:", orderId);
    
    // Special debugging for the problematic order ID
    if (String(orderId).includes('mantest2505')) {
      console.log("DEBUG: Special case detected - handling mantest2505 order ID format");
    }
    
    // First try the local in-memory helper function to find the transaction
    const transaction = findTransactionBySalesOrderId(orderId);
    
    if (transaction) {
      console.log("Found matching transaction in local cache:", transaction);
      return transaction;
    }
    
    // If no transaction found via direct ID match, try a more flexible approach
    if (intercompanyTransactions && Array.isArray(intercompanyTransactions) && intercompanyTransactions.length > 0) {
      // Log all transactions for debugging
      intercompanyTransactions.forEach((tx, index) => {
        console.log(`Transaction ${index}:`, {
          id: tx.id,
          sourceOrderId: tx.sourceOrderId,
          targetOrderId: tx.targetOrderId,
          sourceCompanyId: tx.sourceCompanyId,
          targetCompanyId: tx.targetCompanyId
        });
      });
      
      // Try to find a matching transaction with flexible matching
      const flexibleMatch = intercompanyTransactions.find((tx) => {
        const orderIdNum = Number(orderId);
        const sourceOrderIdNum = Number(tx.sourceOrderId);
        const targetOrderIdNum = Number(tx.targetOrderId);
        
        // Try multiple ways to match the transaction
        const isMatch = (
          // Match by exact order IDs - numeric comparison
          sourceOrderIdNum === orderIdNum || 
          targetOrderIdNum === orderIdNum ||
          // Match by string values - include partial matches for format compatibility
          (tx.sourceOrderId && (
            tx.sourceOrderId === String(orderId) || 
            String(tx.sourceOrderId).includes(String(orderId)) || 
            String(orderId).includes(String(tx.sourceOrderId))
          )) ||
          (tx.targetOrderId && (
            tx.targetOrderId === String(orderId) || 
            String(tx.targetOrderId).includes(String(orderId)) || 
            String(orderId).includes(String(tx.targetOrderId))
          ))
        );
        
        if (isMatch) {
          console.log("Found matching transaction via flexible search:", tx);
        }
        
        return isMatch;
      });
      
      if (flexibleMatch) return flexibleMatch;
    }
    
    // If still no match, try the server-side lookup (this will happen asynchronously)
    if (orderId) {
      // We can't use async/await directly in useMemo, so we'll trigger the server lookup
      // and handle the result in a separate useEffect
      console.log("No local match found, will try server-side lookup");
    }
    
    return null;
  }, [orderId, intercompanyTransactions, findTransactionBySalesOrderId]);
  
  // Effect to check server-side for transactions if not found locally
  const [isCheckingServer, setIsCheckingServer] = useState(false);
  const [serverTransaction, setServerTransaction] = useState<IntercompanyTransaction | null>(null);
  
  useEffect(() => {
    // Only check server if we have an order ID but no transaction found locally
    if (orderId && !relatedTransaction && !isCheckingServer && !serverTransaction) {
      const checkServerForTransaction = async () => {
        setIsCheckingServer(true);
        try {
          console.log("Checking server for transaction with order ID:", orderId);
          
          // First do a quick connectivity test to ensure the endpoint is working
          try {
            const testResponse = await apiRequest('GET', '/api/auth/me');
            console.log("Connectivity test result:", { 
              status: testResponse.status, 
              ok: testResponse.ok 
            });
          } catch (testError) {
            console.warn("Connectivity test failed:", testError);
          }
          
          // Now try both endpoints to ensure we're using the correct one
          let serverResult = null;
          
          try {
            console.log("Trying /api/intercompany-transactions/by-order-id endpoint");
            serverResult = await fetchTransactionByOrderId(orderId);
            
            // Check for auth error in the result
            if (serverResult && (serverResult as any).authError) {
              console.warn("Authentication error detected from fetchTransactionByOrderId");
              // The toast and redirect are already handled in the fetchTransactionByOrderId function
              setIsCheckingServer(false);
              return; // Exit early
            }
          } catch (endpointError) {
            console.error("Error with primary endpoint:", endpointError);
            
            // If that fails, try the fallback endpoint directly
            try {
              console.log("Trying fallback with direct API request to /api/intercompany-transactions");
              // This is a fallback method that will search through all transactions
              const allTransactionsResponse = await apiRequest('GET', `/api/intercompany-transactions`);
              
              // Check for auth errors
              if (allTransactionsResponse.status === 401) {
                console.warn("Authentication error detected in fallback request");
                toast({
                  title: "Authentication Required",
                  description: "Your session has expired. Please log in again.",
                  variant: "destructive",
                });
                
                // Redirect to login page with current page as redirect target
                setTimeout(() => {
                  setLocation(`/auth?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
                }, 1500);
                setIsCheckingServer(false);
                return; // Exit early
              }
              
              const allTransactions = await allTransactionsResponse.json();
              
              // Do the filtering manually
              if (allTransactionsResponse.ok && Array.isArray(allTransactions)) {
                console.log(`Got ${allTransactions.length} transactions, searching for orderId ${orderId}`);
                
                // Find any transaction that matches the order ID
                const orderIdStr = String(orderId);
                const orderIdNum = Number(orderId);
                
                const matchingTransaction = allTransactions.find(tx => {
                  if (!tx) return false;
                  
                  const sourceId = tx.sourceOrderId;
                  const targetId = tx.targetOrderId;
                  
                  const sourceIdNum = sourceId ? Number(sourceId) : NaN;
                  const targetIdNum = targetId ? Number(targetId) : NaN;
                  const sourceIdStr = sourceId ? String(sourceId) : '';
                  const targetIdStr = targetId ? String(targetId) : '';
                  
                  return sourceIdNum === orderIdNum || 
                         targetIdNum === orderIdNum ||
                         (sourceIdStr !== '' && (
                           sourceIdStr === orderIdStr || 
                           sourceIdStr.includes(orderIdStr) || 
                           orderIdStr.includes(sourceIdStr)
                         )) ||
                         (targetIdStr !== '' && (
                           targetIdStr === orderIdStr || 
                           targetIdStr.includes(orderIdStr) || 
                           orderIdStr.includes(targetIdStr)
                         ));
                });
                
                if (matchingTransaction) {
                  console.log("Found matching transaction via manual search:", matchingTransaction);
                  serverResult = matchingTransaction;
                }
              }
              
              // If still no match, try the original fallback endpoint
              if (!serverResult) {
                console.log("Trying original endpoint as last resort");
                const fallbackResponse = await apiRequest('GET', `/api/intercompany-transactions/by-order/${orderId}`);
                if (fallbackResponse.ok) {
                  const transactions = await fallbackResponse.json();
                  if (transactions && Array.isArray(transactions) && transactions.length > 0) {
                    serverResult = transactions[0];
                  }
                }
              }
            } catch (fallbackError) {
              console.error("Fallback endpoint also failed:", fallbackError);
            }
          }
          
          if (serverResult) {
            console.log("Server found matching transaction:", serverResult);
            setServerTransaction(serverResult);
            
            // Refresh local transactions to include this match
            queryClient.invalidateQueries({ queryKey: ['/api/intercompany-transactions'] });
          } else {
            console.log("Server found no matching transaction");
          }
        } catch (error) {
          console.error("Error checking server for transaction:", error);
        } finally {
          setIsCheckingServer(false);
        }
      };
      
      checkServerForTransaction();
    }
  }, [orderId, relatedTransaction, isCheckingServer, serverTransaction, fetchTransactionByOrderId]);
  
  // Combine local and server results
  const finalTransaction = relatedTransaction || serverTransaction;
  
  // State to track if we've already attempted to create a transaction
  const [hasAttemptedTransaction, setHasAttemptedTransaction] = useState(false);
  
  // State for custom transaction amount
  const [customTransactionAmount, setCustomTransactionAmount] = useState<string>("");
  const [creatingReceipt, setCreatingReceipt] = useState<boolean>(false);
  const [receiptAmount, setReceiptAmount] = useState<string>("");
  const [receiptPaymentMethod, setReceiptPaymentMethod] = useState<string>("Bank Transfer");
  
  // Function to create a transaction, but only when manually triggered
  const createIntercompanyTransaction = async () => {
    try {
      if (!salesOrderData || !activeCompany) {
        console.error("Cannot create transaction: missing sales order data or active company");
        return;
      }
      
      // Set the flag to prevent multiple attempts
      setHasAttemptedTransaction(true);
      
      // Get all companies in the same tenant
      const response = await apiRequest('GET', '/api/companies');
      const companies = await response.json();
      
      // Filter out the current company
      const availableTargets = companies.filter((c: any) => c.id !== activeCompany.id);
      
      if (availableTargets.length > 0) {
        // Get the first available company as target
        const targetCompany = availableTargets[0];
        console.log("Selected target company:", targetCompany.name);
        
        // Search for related purchase order (target company's order)
        let targetOrderId = null;
        
        try {
          // Check if purchase order already exists for this sales order
          const poResponse = await apiRequest('GET', `/api/purchase-orders/by-reference/${salesOrderData.orderNumber}`);
          const relatedPurchaseOrder = await poResponse.json();
          
          if (relatedPurchaseOrder && relatedPurchaseOrder.id) {
            console.log("Found related purchase order:", relatedPurchaseOrder);
            targetOrderId = relatedPurchaseOrder.id;
          }
        } catch (error) {
          console.log("No related purchase order found, will create a transaction without it");
        }
        
        // Calculate default total from order items if custom amount not provided
        const calculatedTotal = salesOrderData.items?.reduce((sum: number, item: any) => {
          return sum + (Number(item.quantity) * Number(item.unitPrice));
        }, 0) || 0;
        
        // Use custom amount if provided, otherwise use calculated total
        const finalAmount = customTransactionAmount && Number(customTransactionAmount) > 0 
          ? customTransactionAmount 
          : calculatedTotal.toString();
        
        // Create transaction with both order references if available
        const transactionData = {
          sourceCompanyId: activeCompany.id,
          targetCompanyId: targetCompany.id,
          description: `Transaction for Sales Order #${salesOrderData.orderNumber}`,
          amount: finalAmount,
          transactionDate: new Date(), // Use current date
          sourceOrderId: salesOrderData.id,
          // Only include targetOrderId if it exists
          ...(targetOrderId ? { targetOrderId: targetOrderId } : {}),
          type: "invoice" // Add the transaction type
        };
        
        console.log("Creating intercompany transaction with data:", transactionData);
        
        // Create transaction
        createTransactionMutation.mutate(transactionData);
      } else {
        console.error("No target companies available for intercompany transaction");
      }
    } catch (error) {
      console.error("Error creating intercompany transaction:", error);
    }
  };
  
  // Function to create a receipt for a transaction
  const createIntercompanyReceipt = async (transactionId: number) => {
    try {
      if (!receiptAmount || !transactionId) {
        toast({
          title: "Error",
          description: "Receipt amount is required",
          variant: "destructive"
        });
        return;
      }
      
      setCreatingReceipt(true);
      
      const receiptData = {
        transactionId,
        amount: receiptAmount,
        paymentMethod: receiptPaymentMethod,
        date: new Date().toISOString().split('T')[0],
        description: `Receipt for intercompany transaction #${transactionId}`
      };
      
      console.log("Creating intercompany receipt with data:", receiptData);
      
      // Make API request to create receipt
      const response = await apiRequest(
        'POST',
        '/api/intercompany-transactions/receipt',
        receiptData
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Error creating receipt: ${JSON.stringify(errorData)}`);
      }
      
      const result = await response.json();
      
      toast({
        title: "Receipt Created",
        description: "The intercompany receipt was created successfully",
      });
      
      // Refresh transaction data
      queryClient.invalidateQueries({ queryKey: ['/api/intercompany-transactions'] });
      
      // Reset receipt form
      setCreatingReceipt(false);
      setReceiptAmount("");
      
    } catch (error) {
      console.error("Error creating intercompany receipt:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create receipt",
        variant: "destructive"
      });
      setCreatingReceipt(false);
    }
  };
    
  // Debug logging - reduce excessive logging to improve performance
  console.log("Order ID from URL:", orderId);
  console.log("Found related transaction:", finalTransaction);
  console.log("Server-side transaction:", serverTransaction);
  
  // Determine source and target companies
  const isSourceCompany = finalTransaction?.sourceCompanyId === activeCompany?.id;
  const sourceCompanyId = finalTransaction?.sourceCompanyId;
  const targetCompanyId = finalTransaction?.targetCompanyId;
  const salesOrderId = finalTransaction?.sourceOrderId;
  const purchaseOrderId = finalTransaction?.targetOrderId;
  
  // Query for sales order details
  const { data: salesOrder, isLoading: isLoadingSalesOrderDetails } = useQuery({
    queryKey: ["/api/sales-orders", salesOrderId],
    queryFn: async () => {
      if (!salesOrderId) return null;
      const res = await apiRequest("GET", `/api/sales-orders/${salesOrderId}`);
      return await res.json();
    },
    enabled: !!salesOrderId
  });
  
  // Query for purchase order details
  const { data: purchaseOrder, isLoading: isLoadingPurchaseOrder } = useQuery({
    queryKey: ["/api/purchase-orders", purchaseOrderId],
    queryFn: async () => {
      if (!purchaseOrderId) return null;
      const res = await apiRequest("GET", `/api/purchase-orders/${purchaseOrderId}`);
      return await res.json();
    },
    enabled: !!purchaseOrderId
  });
  
  const items = salesOrder?.items || [];
  
  // Initialize the form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sourceCompanyId: sourceCompanyId || 0,
      targetCompanyId: targetCompanyId || 0,
      salesOrderId: salesOrderId || 0,
      purchaseOrderId: purchaseOrderId || 0,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      description: salesOrder?.description || '',
      items: []
    }
  });
  
  // Update form values when data is loaded
  useEffect(() => {
    if (salesOrder && purchaseOrder) {
      // Map the sales order items for the form
      const formItems = salesOrder?.items?.map((item: any, index: number) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        description: item.description || '',
        soItemId: item.id,
        poItemId: purchaseOrder?.items?.[index]?.id
      })) || [];
      
      form.reset({
        sourceCompanyId: sourceCompanyId || 0,
        targetCompanyId: targetCompanyId || 0,
        salesOrderId: salesOrderId || 0,
        purchaseOrderId: purchaseOrderId || 0,
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        description: salesOrder?.description || '',
        items: formItems
      });
      
      // Initialize the selectedItems state to have all items selected by default
      const initialItems: {[id: number]: boolean} = {};
      if (formItems && formItems.length) {
        formItems.forEach((_, idx) => {
          initialItems[idx] = true;
        });
        setSelectedItems(initialItems);
        console.log("Initial selectedItems state set to:", initialItems);
      }
    }
  }, [salesOrder, purchaseOrder, form, sourceCompanyId, targetCompanyId, salesOrderId, purchaseOrderId]);
  
  const onSubmit = async (data: FormValues) => {
    // Reset status messages
    setSuccessMessage(null);
    setErrorMessage(null);
    updateProcessingStatus('processing');
    
    // Track when the form submission began
    const formSubmissionStartTime = Date.now();
    // Also store it globally for the timeout handler to access
    (window as any)._formSubmissionTime = formSubmissionStartTime;
    
    // Prevent duplicate submissions
    if (isCreating) {
      console.log("Submission already in progress, ignoring duplicate request");
      setProcessingStatus('idle');
      return;
    }
    
    console.log("======= SUBMIT BUTTON CLICKED - ENHANCED DEBUGGING =======");
    console.log("Timestamp:", new Date().toISOString());
    console.log("Form valid:", form.formState.isValid);
    console.log("Form validation errors:", form.formState.errors);
    console.log("Form is submitting:", form.formState.isSubmitting);
    console.log("Form data:", data);
    console.log("Form values from useForm:", form.getValues());
    console.log("Selected items:", selectedItems);
    console.log("Invoice type:", invoiceType);
    console.log("Items being sent to server:", JSON.stringify(data.items, null, 2));
    console.log("ActiveTab:", activeTab);
    console.log("Form dirty:", form.formState.isDirty);
    console.log("Transaction data:", finalTransaction);
    console.log("Selected order ID:", orderId);
    console.log("Sales order data:", salesOrder);
    console.log("Existing transaction ID:", finalTransaction?.id);
    console.log("Existing invoice status:", finalTransaction?.invoiceStatus);
    console.log("======================================================");
    
    // Check that items array exists and has entries before proceeding
    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      console.error("No line items found in form data!");
      toast({
        title: "Error",
        description: "No line items were selected. Please select at least one item.",
        variant: "destructive",
      });
      return; // Exit early
    }
    
    // Check if user is still authenticated before proceeding
    try {
      console.log("Checking authentication status before form submission...");
      const authResponse = await fetch('/api/auth/me');
      
      if (!authResponse.ok) {
        console.error("Initial auth check failed, attempting session refresh...");
        
        // Try to automatically refresh the session by making a ping request
        try {
          console.log("Attempting to refresh session via ping at", new Date().toISOString());
          
          // Try both GET and POST methods to maximize chances of success
          const refreshOptions = {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              timestamp: Date.now(),
              url: window.location.pathname,
              formData: { transactionId: finalTransaction?.id, orderId }
            })
          };
          
          // Try POST first (our new implementation)
          let refreshResponse = await fetch('/api/auth/ping', {
            method: 'POST',
            ...refreshOptions
          });
          
          // If POST fails, fall back to GET for compatibility with older server versions
          if (!refreshResponse.ok) {
            console.log("POST ping failed, trying GET as fallback");
            refreshResponse = await fetch('/api/auth/ping');
          }
          
          if (refreshResponse.ok) {
            // Parse the response to check session details
            const pingData = await refreshResponse.json();
            console.log("Session refresh successful, continuing with form submission");
            console.log("Session expires:", new Date(pingData.sessionExpires).toISOString());
            console.log("Time until expiry:", 
              Math.floor((new Date(pingData.sessionExpires).getTime() - new Date().getTime()) / 1000), 
              "seconds");
            
            // Explicitly mark processing status for UI feedback
            setProcessingStatus('processing');
            
            // Session refreshed successfully, continue with form submission
          } else {
            // Session refresh failed, user needs to log in again
            console.error("Session refresh failed, status:", refreshResponse.status);
            
            // Try to read error details
            let errorDetails = "";
            try {
              const errorText = await refreshResponse.text();
              errorDetails = errorText.substring(0, 100); // Truncate if too long
              console.error("Error response:", errorDetails);
            } catch (e) {
              console.error("Could not read error response");
            }
            
            setProcessingStatus('error');
            setErrorMessage("Authentication failed. Please log in again.");
            
            toast({
              title: "Authentication Required",
              description: "Your session has expired. Please log in again.",
              variant: "destructive",
            });
            
            // Redirect to login page with current page as redirect target
            setTimeout(() => {
              setLocation(`/auth?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
            }, 1500);
            return; // Exit early
          }
        } catch (refreshError) {
          console.error("Error during session refresh attempt:", refreshError);
          
          setProcessingStatus('error');
          setErrorMessage("Connection error. Please check your network and try again.");
          
          toast({
            title: "Authentication Error",
            description: "Failed to refresh your session. Please check your connection and try again.",
            variant: "destructive",
          });
          
          setTimeout(() => {
            setLocation(`/auth?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
          }, 1500);
          return; // Exit early
        }
      } else {
        console.log("Authentication check passed, user is authenticated");
      }
    } catch (authError) {
      console.error("Error checking authentication:", authError);
    }
    
    setIsCreating(true);
    
    // Show processing toast to indicate operation in progress
    toast({
      title: "Processing",
      description: activeTab === 'invoice' 
        ? `Creating ${invoiceType === 'partial' ? 'partial' : 'full'} invoice...` 
        : "Creating payment receipt...",
    });
    
    try {
      if (activeTab === 'invoice') {
        // Create a deep copy of the items to avoid reference issues
        let processedItems = JSON.parse(JSON.stringify(data.items));
        
        if (invoiceType === 'partial') {
          console.log("Creating partial invoice with selection state:", selectedItems);
          console.log("Original items before filtering:", processedItems);
          
          // Ensure selectedItems is properly initialized
          if (!selectedItems || typeof selectedItems !== 'object' || Object.keys(selectedItems).length === 0) {
            console.log("No selection state found, initializing with all items selected");
            
            // Create a default selection with all items selected
            const tempSelectedItems: {[id: number]: boolean} = {};
            processedItems.forEach((_, idx: number) => {
              tempSelectedItems[idx] = true;
            });
            
            setSelectedItems(tempSelectedItems);
            console.log("Created default selection with all items:", tempSelectedItems);
            
            // When no selection exists, we'll use all items (full invoice behavior)
            // No need to filter items
          } else {
            // Detailed logging for debugging selection state
            console.log("Using existing selection state:", selectedItems);
            
            // Filter items based on selection - creating a new array to avoid mutation issues
            // Explicitly log the full selectedItems object
            console.log("All selected items objects:", JSON.stringify(selectedItems));
            
            // Add a defensive check to ensure we process at least one item
            const anySelected = Object.values(selectedItems).some(isSelected => isSelected === true);
            
            if (!anySelected) {
              console.log("No items selected, forcing selection of the first item");
              setSelectedItems({0: true}); // Force select first item
              // Keep all items since we're forcibly selecting the first one
              console.log("Keeping all items due to forced selection");
            } else {
              // Normal filter operation based on selection
              processedItems = processedItems.filter((item: any, index: number) => {
                const isSelected = selectedItems[index] === true;
                console.log(`Item ${index}: Selected=${isSelected}, Product=${item.productId}, Quantity=${item.quantity}`);
                return isSelected;
              });
            }
            
            console.log("Filtered items for partial invoice:", processedItems);
          }
          
          // Always check if we have at least one item to process
          if (!processedItems || processedItems.length === 0) {
            console.error("No items selected or processed:", {
              selectedItems,
              dataItems: data.items,
              processedItems
            });
            throw new Error("Please select at least one line item for the partial invoice");
          }
          
          // Make sure that all required fields are present in the processed items
          processedItems = processedItems.map((item, itemIndex) => {
            // Get the corresponding original item from the sales order
            const originalItem = selectedSalesOrder?.items?.find(
              (soItem: any) => soItem.id === item.soItemId
            );
            
            console.log("Original sales order item:", originalItem);
            
            // Get product details from the original item - with explicit error checking
            if (!originalItem && !item.productId) {
              console.error(`CRITICAL ERROR: Missing product ID for item ${itemIndex}`, {
                item,
                originalItem
              });
              throw new Error(`Missing product information for item ${itemIndex + 1}`);
            }
            
            const productId = originalItem?.productId || item.productId || 1;
            const productName = originalItem?.product?.name || 
                               (originalItem?.productName) || 
                               "Product item";
            const productDescription = originalItem?.description || 
                                      originalItem?.product?.description || 
                                      "Product item";
            
            // Log detailed debugging information
            console.log("Processing item for partial invoice:", {
              item,
              originalItem,
              productId,
              productName,
              productDescription
            });
            
            // Ensure soItemId is properly set - this is critical for updating the invoiced quantity
            const soItemId = item.soItemId || originalItem?.id;
            
            if (!soItemId) {
              console.error(`CRITICAL ERROR: Missing soItemId for item ${itemIndex}`, {
                item,
                originalItem
              });
              throw new Error(`Missing sales order item ID for product ${productName}`);
            }
            
            console.log(`Setting soItemId for item ${itemIndex} to ${soItemId}`, {
              fromItem: item.soItemId,
              fromOriginalItem: originalItem?.id,
              final: soItemId
            });
            
            // IMPROVED APPROACH: Get quantity directly from the form data
            // This is more reliable than trying to query DOM elements
            let quantityToUse: number;
            
            // Get quantity from form item directly instead of DOM
            const formQuantity = form.getValues(`items.${itemIndex}.quantity`);
            
            // Log what we found in the form
            console.log(`Getting quantity for item ${itemIndex} from form:`, {
              formQuantity,
              rawItemQuantity: item.quantity,
              formPath: `items.${itemIndex}.quantity`
            });
            
            if (formQuantity !== undefined && !isNaN(Number(formQuantity))) {
              quantityToUse = Number(formQuantity);
              console.log(`Using quantity from form: ${quantityToUse}`);
            } else {
              // Fallback to item quantity if form value isn't available
              const itemQuantity = typeof item.quantity === 'number' 
                ? item.quantity 
                : typeof item.quantity === 'string' 
                  ? parseFloat(item.quantity) 
                  : 0;
                  
              // Always ensure a minimum quantity of 1
              quantityToUse = itemQuantity > 0 ? itemQuantity : 1;
              console.log(`Using fallback quantity: ${quantityToUse}`);
            }
            
            // Final safety check - never allow zero or negative quantities
            if (isNaN(quantityToUse) || quantityToUse <= 0) {
              console.warn(`Invalid quantity value detected, using default quantity of 1`);
              quantityToUse = 1; // Default to 1 as safeguard
            }
            
            console.log(`Using quantity for item ${itemIndex}: ${quantityToUse}`, {
              fromForm: formQuantity,
              fromItem: item.quantity,
              final: quantityToUse
            });
            
            // Get unit price with better validation
            let unitPriceToUse: number;
            
            // Get the unit price from form directly instead of DOM
            const formUnitPrice = form.getValues(`items.${itemIndex}.unitPrice`);
            
            console.log(`Getting unit price for item ${itemIndex} from form:`, {
              formUnitPrice,
              rawItemUnitPrice: item.unitPrice,
              formPath: `items.${itemIndex}.unitPrice`
            });
            
            if (formUnitPrice !== undefined && !isNaN(Number(formUnitPrice))) {
              unitPriceToUse = Number(formUnitPrice);
              console.log(`Using unit price from form: ${unitPriceToUse}`);
            } else {
              // Fallback to item unit price if form value isn't available
              const itemUnitPrice = typeof item.unitPrice === 'number' 
                ? item.unitPrice 
                : typeof item.unitPrice === 'string' 
                  ? parseFloat(item.unitPrice) 
                  : parseFloat(originalItem?.unitPrice) || 200;
                  
              // Always ensure a minimum unit price
              unitPriceToUse = !isNaN(itemUnitPrice) && itemUnitPrice > 0 ? itemUnitPrice : 200;
              console.log(`Using fallback unit price: ${unitPriceToUse}`);
            }
            
            // Calculate with validated values and ensure result is a number
            const calculatedAmount = quantityToUse * unitPriceToUse;
            
            // Make sure the calculated amount is valid
            if (isNaN(calculatedAmount)) {
              console.error(`CALCULATION ERROR: Invalid amount calculated for item ${itemIndex}`, {
                quantityToUse,
                unitPriceToUse,
                calculatedAmount
              });
            }
            
            console.log(`ITEM ${itemIndex} FINAL DATA:`, {
              productId,
              quantity: quantityToUse,
              unitPrice: unitPriceToUse,
              calculatedAmount,
              soItemId
            });
            
            // Create the final item object with ALL required fields
            return {
              ...item,
              productId: productId,
              quantity: quantityToUse, // Use the quantity from "This Invoice" input
              unitPrice: unitPriceToUse, // Use the validated unit price
              description: productDescription,
              soItemId: soItemId || item.soItemId || originalItem?.id, // Ensure soItemId is set using all possible sources
              calculatedAmount: calculatedAmount, // Pre-calculate the amount
              // Add product name if available
              productName: productName
            };
          });
          
          console.log("Final processed items:", processedItems);
        }
        
        // Enhanced debugging for partial invoice creation
        console.log("INVOICE CREATION REQUEST - DETAILED:", {
          sourceCompanyId: Number(data.sourceCompanyId),
          targetCompanyId: Number(data.targetCompanyId),
          salesOrderId: Number(data.salesOrderId),
          purchaseOrderId: Number(data.purchaseOrderId),
          invoiceType,
          issueDate: data.issueDate,
          dueDate: data.dueDate,
          description: data.description,
          itemCount: processedItems.length,
          allItems: processedItems,
          selectedItemsState: selectedItems
        });
        
        console.log("Request as JSON string:", JSON.stringify({
          sourceCompanyId: Number(data.sourceCompanyId),
          targetCompanyId: Number(data.targetCompanyId),
          salesOrderId: Number(data.salesOrderId),
          purchaseOrderId: Number(data.purchaseOrderId),
          invoiceType,
          issueDate: data.issueDate,
          dueDate: data.dueDate,
          description: data.description,
          items: processedItems
        }));
        
        // Final validation before sending to API
        const apiData = {
          ...data,
          items: processedItems.map(item => {
            // Safely parse numeric values with validation to prevent NaN
            const safeParseNumber = (value: any, defaultValue: number): number => {
              // Handle string, number, null, or undefined inputs
              if (value === null || value === undefined || value === '') return defaultValue;
              
              // If already a number, ensure it's valid
              if (typeof value === 'number') {
                return isNaN(value) ? defaultValue : Number(value.toFixed(2));
              }
              
              // Try to parse string to number
              const parsed = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
              return isNaN(parsed) ? defaultValue : Number(parsed.toFixed(2));
            };
            
            // Apply safe number parsing to all numeric fields
            return {
              ...item,
              quantity: safeParseNumber(item.quantity, 1),
              unitPrice: safeParseNumber(item.unitPrice, 0),
              // Never allow null for calculatedAmount as it can cause database NaN errors
              calculatedAmount: item.calculatedAmount ? safeParseNumber(item.calculatedAmount, 0) : safeParseNumber(item.quantity, 1) * safeParseNumber(item.unitPrice, 0)
            };
          }),
          // Safely parse ID values to prevent NaN
          sourceCompanyId: parseInt(String(data.sourceCompanyId), 10) || 0,
          targetCompanyId: parseInt(String(data.targetCompanyId), 10) || 0,
          salesOrderId: parseInt(String(data.salesOrderId), 10) || 0,
          purchaseOrderId: parseInt(String(data.purchaseOrderId), 10) || 0,
          createPurchaseInvoice: true, // Always create both sales and purchase invoice
          invoiceType // Include the invoice type (full or partial)
        };
        
        console.log("FINAL API DATA WITH STRICT TYPE CONVERSION:", apiData);
        console.log("MAY-13-DEBUG: About to call createIntercompanyInvoice with data:", JSON.stringify(apiData, null, 2));
        
        // Second pass sanitization - fix any remaining NaN values to prevent database errors
        apiData.items = apiData.items.map(item => {
          // Ensure all numeric values are valid numbers
          const quantity = typeof item.quantity === 'string' 
            ? parseFloat(item.quantity) || 1 // Use 1 as default for quantity
            : (isNaN(Number(item.quantity)) ? 1 : Number(item.quantity));
            
          const unitPrice = typeof item.unitPrice === 'string'
            ? parseFloat(item.unitPrice) || 0
            : (isNaN(Number(item.unitPrice)) ? 0 : Number(item.unitPrice));
            
          // Always calculate a valid amount even if inputs are problematic
          const calculatedAmount = (quantity || 1) * (unitPrice || 0);
          
          return {
            ...item,
            quantity: isNaN(quantity) ? 0 : quantity,
            unitPrice: isNaN(unitPrice) ? 0 : unitPrice,
            calculatedAmount: isNaN(calculatedAmount) ? 0 : calculatedAmount
          };
        });
        
        // Create a timeout promise to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            console.error("FORM TIMEOUT: Invoice creation exceeded 60 second time limit");
            console.error("Form data at timeout:", {
              orderId,
              transactionId: finalTransaction?.id,
              invoiceType,
              selectedItemsCount: Object.keys(selectedItems).length,
              dueDate: data.dueDate
            });
            reject(new Error("Invoice creation timed out after 60 seconds. The operation might still be processing."));
          }, 60000); // 60 second timeout
        });
        
        let result;
        try {
          // Log that we're about to make the API call with detailed payload information
          console.log("======= INVOICE API CALL STARTING - DEBUG ENHANCED =======");
          console.log("API Data:", apiData);
          console.log("API Data stringified:", JSON.stringify(apiData));
          console.log("API Data size (bytes):", JSON.stringify(apiData).length);
          console.log("Invoice Type:", invoiceType);
          console.log("Timestamp:", new Date().toISOString());
          console.log("Time since form submission:", Date.now() - formSubmissionStartTime);
          console.log("Selected items count:", Object.keys(selectedItems).length);
          console.log("Selected items IDs:", Object.keys(selectedItems).join(", "));
          console.log("Items being sent:", apiData.items?.map(item => ({id: item.productId, qty: item.quantity})));
          console.log("Transaction ID for DB linking:", finalTransaction?.id);
          console.log("Server endpoint: /api/intercompany/invoice-bill (via connector)");
          console.log("API request starting timestamp:", Date.now());
          console.log("===========================================================");
          
          // First verify auth before making the invoice API call
          const authCheckResponse = await fetch('/api/auth/me');
          if (!authCheckResponse.ok) {
            console.error("AUTH CHECK FAILED: User session invalid before invoice API call");
            console.error("Auth response status:", authCheckResponse.status);
            console.error("Auth response text:", await authCheckResponse.text());
            
            toast({
              title: "Authentication Error",
              description: "Your session is invalid. Please log in again before creating an invoice.",
              variant: "destructive"
            });
            
            setIsCreating(false);
            setTimeout(() => {
              setLocation(`/auth?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
            }, 1500);
            return;
          }
          
          console.log("AUTH CHECK PASSED: User is authenticated, proceeding with invoice creation");
          
          // Use Promise.race to prevent hanging
          let apiResponseText = '';
          let apiResponseStatus = 0;
          
          try {
            // Make a direct fetch call with more detailed error logging
            const invoiceResponse = await Promise.race([
              fetch('/api/intercompany/invoice-bill', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(apiData)
              }),
              timeoutPromise
            ]);
            
            console.log("RAW API RESPONSE RECEIVED:", {
              status: invoiceResponse.status,
              statusText: invoiceResponse.statusText,
              ok: invoiceResponse.ok,
              headers: Object.fromEntries([...invoiceResponse.headers.entries()]),
              timestamp: Date.now()
            });
            
            apiResponseStatus = invoiceResponse.status;
            
            if (!invoiceResponse.ok) {
              // Attempt to read the response body for more information
              try {
                apiResponseText = await invoiceResponse.text();
                console.error("API ERROR RESPONSE BODY:", apiResponseText);
              } catch (bodyReadError) {
                console.error("FAILED TO READ ERROR RESPONSE BODY:", bodyReadError);
              }
              
              throw new Error(`API request failed with status ${invoiceResponse.status}: ${invoiceResponse.statusText}`);
            }
            
            // Try to parse the response as JSON
            try {
              result = await invoiceResponse.json();
            } catch (jsonError) {
              console.error("FAILED TO PARSE RESPONSE AS JSON:", jsonError);
              apiResponseText = await invoiceResponse.text();
              console.error("RAW RESPONSE TEXT:", apiResponseText);
              throw new Error("Failed to parse response as JSON. The server may have returned an error.");
            }
          } catch (fetchError) {
            console.error("FETCH OPERATION FAILED:", fetchError);
            throw new Error(`Fetch operation failed: ${fetchError.message || 'Unknown fetch error'}`);
          }
          
          // Log the detailed result information
          console.log("======= INVOICE API CALL COMPLETE =======");
          console.log("Timestamp:", new Date().toISOString());
          console.log("API response timestamp:", Date.now());
          console.log("Result received:", result);
          console.log("Result type:", typeof result);
          console.log("Result success:", result?.success);
          console.log("Source invoice ID:", result?.sourceInvoice?.id);
          console.log("Target bill ID:", result?.targetBill?.id);
          console.log("Remaining items:", result?.remainingItems?.length || 0);
          console.log("============================================");
          
          // If we got a response but it's empty or undefined, show an error
          if (!result) {
            console.error("CRITICAL ERROR: Empty result received from API");
            console.error("API Response Status:", apiResponseStatus);
            console.error("API Response Text:", apiResponseText);
            
            // Update UI status indicators
            setProcessingStatus('error');
            setErrorMessage(`No valid response received from the server. Status: ${apiResponseStatus}`);
            
            toast({
              title: "Error Creating Invoice",
              description: "No valid response received from the server. Status: " + apiResponseStatus,
              variant: "destructive"
            });
            setIsCreating(false);
            return;
          }
        } catch (apiError: any) {
          console.error("MAY-13-DEBUG: Exception thrown during API call:", apiError);
          console.error("Error object:", {
            name: apiError.name,
            message: apiError.message,
            stack: apiError.stack,
            cause: apiError.cause
          });
          
          // Update UI status indicators
          setProcessingStatus('error');
          setErrorMessage(apiError.message || "An error occurred during the API call");
          
          // Check if it's a timeout error
          if (apiError.message && apiError.message.includes("timed out")) {
            toast({
              title: "Timeout Error",
              description: "The server took too long to respond. The operation might still be processing. Please check the transactions page in a few minutes.",
              variant: "destructive"
            });
            
            // Log detailed timeout information
            console.error("Invoice creation timed out:", {
              invoiceType,
              isPartial: invoiceType === 'partial',
              selectedItems,
              itemsCount: data.items?.length || 0,
              timestamp: Date.now()
            });
            
            setIsCreating(false);
            return; // Exit early without throwing
          }
          
          // Check for network errors
          if (apiError.message && (
            apiError.message.includes("NetworkError") || 
            apiError.message.includes("Failed to fetch") ||
            apiError.message.includes("Network request failed")
          )) {
            toast({
              title: "Network Error",
              description: "Unable to connect to the server. Please check your internet connection and try again.",
              variant: "destructive"
            });
            setIsCreating(false);
            return;
          }
          
          // Check for authentication errors
          if (apiError.message && (
            apiError.message.includes("Authentication") ||
            apiError.message.includes("Unauthorized") ||
            apiError.message.includes("401")
          )) {
            toast({
              title: "Authentication Error",
              description: "Your session has expired. Please log in again.",
              variant: "destructive"
            });
            
            setTimeout(() => {
              setLocation(`/auth?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
            }, 1500);
            
            setIsCreating(false);
            return;
          }
          
          // Show the error message to the user
          toast({
            title: "Error Creating Invoice",
            description: apiError.message || "An unknown error occurred during the API call",
            variant: "destructive"
          });
          setIsCreating(false);
          return;
        }
        
        console.log("Intercompany invoice creation result:", result);
        
        if (!result.success) {
          console.error("MAY-13-DEBUG: Failed to create intercompany invoice:", result.error);
          
          // Check if the error is an authentication error
          if (result.authError) {
            toast({
              title: "Authentication Required",
              description: "Your session has expired. Please log in again.",
              variant: "destructive",
            });
            
            // Redirect to login page with current page as redirect target
            setTimeout(() => {
              setLocation(`/auth?redirect=${encodeURIComponent(window.location.pathname)}`);
            }, 1500);
            return;
          }
          
          // Create a more descriptive error message based on the invoice type
          const invoiceType = result.invoiceType || 'full';
          const isPartial = result.isPartial || false;
          
          // Build a more specific error message for the type of invoice
          let errorTitle = "Invoice Creation Failed";
          if (isPartial) {
            errorTitle = "Partial Invoice Creation Failed";
          }
          
          let errorDescription = result.error || "Unknown error occurred while creating the invoice";
          
          // For partial invoices, add more context to the error
          if (isPartial) {
            errorDescription = `Failed to create partial invoice: ${errorDescription}. Please check your item selection.`;
          }
          
          // Enhanced error with more visual information and actionable advice
          toast({
            title: errorTitle,
            description: (
              <>
                <div className="bg-red-50 dark:bg-red-900 p-3 rounded-md mb-3 flex items-center">
                  <XCircle className="h-6 w-6 text-red-600 dark:text-red-400 mr-2" />
                  <div>
                    <p className="text-red-700 dark:text-red-300 font-bold">Transaction Failed</p>
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {invoiceType === 'partial' ? 'Partial' : 'Full'} invoice creation was unsuccessful
                    </p>
                  </div>
                </div>
                
                <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800 border-l-4 border-red-500 rounded-md">
                  <p className="font-medium text-slate-900 dark:text-slate-200">Error Details:</p>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errorDescription}</p>
                </div>
                
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900 rounded-md">
                  <p className="font-medium text-blue-800 dark:text-blue-300">Recommended Actions:</p>
                  <ul className="list-disc list-inside text-sm text-blue-700 dark:text-blue-400 mt-1">
                    <li>Check that all required fields have valid values</li>
                    <li>Verify the selected items are available for invoicing</li>
                    <li>Ensure both companies are properly configured</li>
                    {isPartial && <li>Confirm partial quantities don't exceed available quantities</li>}
                  </ul>
                </div>
              </>
            ),
            variant: "destructive"
          });
          
          // Log detailed error information to console
          console.error(`${errorTitle}:`, {
            error: result.error,
            invoiceType,
            isPartial,
            selectedItems,
            timestamp: new Date().toISOString()
          });
          
          setIsCreating(false);
          return;
        }
        
        // Log the created invoice details
        console.log("Created invoice details:", {
          sourceInvoice: result.sourceInvoice,
          targetBill: result.targetBill,
          balances: result.balances,
          remainingItems: result.remainingItems,
          invoiceType: result.invoiceType,
          isPartial: result.isPartial
        });
        
        // If it's a partial invoice and there are remaining items, store them in state
        if (result.isPartial && result.remainingItems && result.remainingItems.length > 0) {
          console.log("Remaining items for future invoices:", result.remainingItems);
          // Set the remaining items in state for potential future partial invoices
          setRemainingItems(result.remainingItems);
        }
        
        // Invalidate queries to refresh the related data
        console.log("Invalidating queries to refresh data...");
        await queryClient.invalidateQueries({ queryKey: ["/api/intercompany-transactions"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/sales-orders"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/journal-entries"] });
        
        // Force a refetch of the transactions data
        try {
          await queryClient.refetchQueries({ queryKey: ["/api/intercompany-transactions"] });
          console.log("Successfully refetched transactions data");
          
          // Update UI state to show success
          setProcessingStatus('success');
          setSuccessMessage(`Invoice #${result.sourceInvoice.invoiceNumber} and Bill #${result.targetBill.billNumber} created successfully`);
          
          // Show success message
          toast({
            title: "Success!",
            description: `Intercompany invoice created successfully. Invoice #${result.sourceInvoice.invoiceNumber}, Bill #${result.targetBill.billNumber}`,
          });
          
          // Navigate to intercompany transactions page
          setTimeout(() => {
            setLocation("/intercompany-transactions");
          }, 1500);
        } catch (refetchError) {
          console.error("Error refetching transactions:", refetchError);
        }
        
        // Show a detailed success toast with information about what was created
        const invoiceNumber = result.sourceInvoice?.invoiceNumber || '';
        const billNumber = result.targetBill?.billNumber || '';
        const sourceBalanceInfo = result.balances?.sourceReceivable 
          ? ` (Receivable: ${result.balances.sourceReceivable})`
          : '';
        const targetBalanceInfo = result.balances?.targetPayable
          ? ` (Payable: ${result.balances.targetPayable})`
          : '';
          
        toast({
          title: "Success! 🎉",
          description: (
            <>
              <div className="bg-green-50 dark:bg-green-900 p-3 rounded-md mb-3 flex items-center">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 mr-2" />
                <div>
                  <p className="text-green-700 dark:text-green-300 font-bold">Transaction Complete</p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Intercompany {invoiceType === 'partial' ? 'partial' : 'full'} invoice and bill created successfully
                  </p>
                </div>
              </div>
              <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-md border-l-4 border-blue-500">
                <div className="flex justify-between items-center">
                  <p className="font-semibold text-blue-700 dark:text-blue-400">Invoice #{invoiceNumber}</p>
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                    {sourceBalanceInfo.replace(/[()]/g, '')}
                  </span>
                </div>
                <p className="text-sm mt-1">Item: <span className="font-medium">{result.sourceInvoice?.items?.[0]?.productName || 'Product'}</span></p>
                <p className="text-sm">Quantity: <span className="font-medium">{result.sourceInvoice?.items?.[0]?.quantity || '1'}</span></p>
                <p className="text-sm">Amount: <span className="font-medium">${result.sourceInvoice?.items?.[0]?.amount || result.sourceInvoice?.total || '0.00'}</span></p>
              </div>
              <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-md border-l-4 border-amber-500">
                <div className="flex justify-between items-center">
                  <p className="font-semibold text-amber-700 dark:text-amber-400">Bill #{billNumber}</p>
                  <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 text-xs rounded-full">
                    {targetBalanceInfo.replace(/[()]/g, '')}
                  </span>
                </div>
                <p className="text-sm mt-1">Item: <span className="font-medium">{result.targetBill?.items?.[0]?.productName || 'Product'}</span></p>
                <p className="text-sm">Quantity: <span className="font-medium">{result.targetBill?.items?.[0]?.quantity || '1'}</span></p>
                <p className="text-sm">Amount: <span className="font-medium">${result.targetBill?.items?.[0]?.amount || result.targetBill?.total || '0.00'}</span></p>
              </div>
              {result.isPartial && result.remainingItems && result.remainingItems.length > 0 && (
                <div className="mt-2 p-3 bg-green-50 dark:bg-green-900 rounded-md border-l-4 border-green-500">
                  <div className="flex items-center mb-1">
                    <PlusCircle className="h-4 w-4 text-green-600 dark:text-green-400 mr-2" />
                    <p className="font-semibold text-green-700 dark:text-green-300">Remaining Items</p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-sm">Items to be invoiced: <span className="font-medium">{result.remainingItems.length}</span></p>
                    <span className="px-2 py-1 bg-green-200 dark:bg-green-700 text-green-800 dark:text-green-200 text-xs rounded-full">
                      Partial Invoice
                    </span>
                  </div>
                  <p className="text-sm mt-1">Total remaining quantity: <span className="font-medium">{result.remainingItems.reduce((total, item) => total + Number(item.remainingQuantity), 0)}</span></p>
                </div>
              )}
              <div className="mt-4 flex justify-end">
                <button 
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                  onClick={() => {
                    queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
                    setLocation('/invoices');
                  }}
                >
                  View Invoices
                </button>
              </div>
            </>
          ),
          duration: 10000, // Show for 10 seconds to give time to see the details
        });
        
        // Set a state variable to indicate success
        setIsCreating(false);
        
        // Improve navigation reliability by adding a specific success state
        const successMessage = `Created invoice #${result.sourceInvoice?.invoiceNumber || ''} and bill #${result.targetBill?.billNumber || ''}`;
        console.log(successMessage);
        
        // Show progress indicator during data refresh
        toast({
          title: "Updating Data",
          description: "Refreshing financial information...",
        });
        
        // Delay navigation to allow query invalidation to complete
        console.log("Delaying navigation to ensure data refresh...");
        setTimeout(() => {
          // Force data refresh for all relevant queries
          queryClient.invalidateQueries({ queryKey: ["/api/intercompany-transactions"] });
          queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
          queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
          queryClient.invalidateQueries({ queryKey: ["/api/sales-orders"] });
          queryClient.invalidateQueries({ queryKey: ["/api/sales-orders", Number(data.salesOrderId)] });
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard/recent-transactions"] });
          
          console.log("Navigation to transactions list...");
          setLocation("/intercompany-transactions");
        }, 2000); // Increase wait time to 2 seconds before navigating for better reliability
        return;
      } else if (activeTab === 'receipt') {
        // Use finalTransaction which combines local and server-side transaction lookup
        if (!finalTransaction) {
          console.error("No transaction found for receipt creation. Data:", {
            orderId,
            salesOrderId: data.salesOrderId,
            sourceCompanyId: data.sourceCompanyId,
            targetCompanyId: data.targetCompanyId
          });
          throw new Error("No related intercompany transaction found. Please ensure an intercompany transaction exists.");
        }
        
        console.log("Using transaction for receipt:", finalTransaction);
        
        if (!finalTransaction.id) {
          console.error("Transaction missing ID:", finalTransaction);
          throw new Error("Invalid transaction ID. Please try again or create an invoice first.");
        }
        
        // If partial receipt is selected, only include selected items
        let processedItems = data.items;
        if (receiptType === 'partial') {
          console.log("Creating partial receipt with selection state:", selectedItems);
          console.log("Original items before filtering:", data.items);
          
          // Validate selectedItems and ensure it's properly initialized
          if (!selectedItems || typeof selectedItems !== 'object' || Object.keys(selectedItems).length === 0) {
            console.log("No selection state found, initializing with all items selected");
            
            // Create a default selection with all items selected
            const tempSelectedItems: {[id: number]: boolean} = {};
            data.items.forEach((_, idx) => {
              tempSelectedItems[idx] = true;
            });
            
            setSelectedItems(tempSelectedItems); // Update state for future reference
            console.log("Created default selection with all items:", tempSelectedItems);
            
            // Process all items as selected initially
            processedItems = [...data.items];
          } else {
            // Filter items based on selection
            processedItems = data.items.filter((item, index) => {
              const isSelected = selectedItems[index] === true;
              console.log(`Item ${index}: Selected=${isSelected}, Product=${item.productId}, Quantity=${item.quantity}`);
              return isSelected;
            });
            
            console.log("Filtered items for partial receipt:", processedItems);
          }
          
          // Always check if we have at least one item to process
          if (!processedItems || processedItems.length === 0) {
            console.error("No items selected or processed:", {
              selectedItems,
              dataItems: data.items,
              processedItems
            });
            throw new Error("Please select at least one line item for the partial receipt");
          }
        }
        
        // Calculate total from selected items or all items
        const totalAmount = processedItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        
        // Prepare receipt data
        const receiptData = {
          transactionId: finalTransaction.id,
          sourceCompanyId: Number(data.sourceCompanyId),
          targetCompanyId: Number(data.targetCompanyId),
          amount: totalAmount,
          paymentDate: data.issueDate,
          description: data.description || `Payment for invoice related to order #${data.salesOrderId}`,
          createPurchaseReceipt: true, // Create both sales receipt and purchase payment
          paymentMethod: "bank_transfer",
          reference: `Receipt for SO-${data.salesOrderId}`,
          items: processedItems, // Use the filtered items for partial receipts
          receiptType, // Include the receipt type (full or partial)
          invoiceId: finalTransaction.sourceInvoiceId // Add the source invoice ID
        };
        
        console.log("Creating intercompany receipt with data:", receiptData);
        
        try {
          // First check if we need to create an invoice before creating a receipt
          if (!finalTransaction.sourceInvoiceId) {
            console.error("Transaction has no source invoice. Cannot create receipt for transaction without an invoice.");
            throw new Error("Cannot create a receipt when no invoice exists. Please create an invoice first.");
          }
          
          // Log the invoice ID we're going to use
          console.log("Using existing invoice ID for receipt:", finalTransaction.sourceInvoiceId);
          
          // Now create the receipt
          const response = await apiRequest('POST', '/api/intercompany-receipts', receiptData);
          
          if (!response.ok) {
            // Check specifically for authentication errors
            if (response.status === 401) {
              console.warn("Authentication error detected during receipt creation");
              toast({
                title: "Authentication Required",
                description: "Your session has expired. Please log in again.",
                variant: "destructive",
              });
              
              // Redirect to login page with current page as redirect target
              setTimeout(() => {
                setLocation(`/auth?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
              }, 1500);
              
              throw new Error("Authentication failed. Please log in again.");
            }
            
            // Handle other errors
            const errorText = await response.text();
            throw new Error(`Failed to create receipt: ${errorText}`);
          }
          
          // Invalidate queries to refresh data
          console.log("Invalidating queries for receipt creation...");
          queryClient.invalidateQueries({ queryKey: ["/api/intercompany-transactions"] });
          queryClient.invalidateQueries({ queryKey: ["/api/receipts"] });
          queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
          queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
          queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
          
          // Get the result from the API response
          const result = await response.json();
          
          // Extract receipt and payment information
          const receiptNumber = result.sourceReceipt?.receiptNumber || '';
          const paymentNumber = result.targetPayment?.paymentNumber || '';
          const remainingAmount = result.remainingBalance 
            ? ` (Remaining: ${formatCurrency(result.remainingBalance, 'USD')})`
            : '';
            
          // Detailed balance information
          const sourceReceivable = result.balances?.sourceReceivable 
            ? ` (Receivable: ${result.balances.sourceReceivable})`
            : '';
          const targetPayable = result.balances?.targetPayable
            ? ` (Payable: ${result.balances.targetPayable})`
            : '';
          
          // Show detailed success toast
          toast({
            title: "Success",
            description: (
              <>
                <p>Intercompany {receiptType === 'partial' ? 'partial' : 'full'} receipt created successfully</p>
                <p className="mt-1">Receipt #{receiptNumber}{sourceReceivable}</p>
                <p>Payment #{paymentNumber}{targetPayable}</p>
                {result.isMultiPayment && result.items && result.items.length > 0 && (
                  <p className="mt-1 font-semibold">Multiple items processed: {result.items.length}{remainingAmount}</p>
                )}
                {!result.isMultiPayment && result.balances?.paymentStatus === 'partial' && (
                  <p className="mt-1 font-semibold">Partial payment made{remainingAmount}</p>
                )}
                {!result.isMultiPayment && result.balances?.paymentStatus === 'full' && (
                  <p className="mt-1 font-semibold">Full payment completed</p>
                )}
              </>
            ),
            duration: 8000, // Show for a longer time since it contains more information
          });
          
          // Delay navigation to allow query invalidation to complete
          console.log("Delaying navigation after receipt creation...");
          setTimeout(() => {
            // Force one more data refresh before navigation
            queryClient.invalidateQueries({ queryKey: ["/api/intercompany-transactions"] });
            console.log("Navigation to transactions list after receipt creation...");
            setLocation("/intercompany-transactions");
          }, 1500); // Wait 1.5 seconds before navigating
          
          // Return early to avoid the navigate call at the end of the try-catch
          return;
        } catch (receiptError: any) {
          console.error("Error creating receipt:", receiptError);
          throw new Error(`Receipt creation failed: ${receiptError.message}`);
        }
      }
      
      // Don't navigate here - navigation happens in the success case only
    } catch (error: any) {
      console.error("Error in form submission:", error);
      
      // Provide more detailed error message based on the context
      let errorMessage = error.message || "An error occurred";
      let errorTitle = "Error";
      
      // Reset the submission state
      setIsCreating(false);
      
      // Enhanced error categorization with more specific details
      if (error.message) {
        const msg = error.message.toLowerCase();
        
        // Authentication errors - redirect to login
        if (msg.includes("unauthorized") || msg.includes("auth") || error.authError) {
          errorTitle = "Authentication Required";
          errorMessage = "Your session has expired. Please log in again.";
          
          // Redirect to login page with current page as redirect target
          setTimeout(() => {
            setLocation(`/auth?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
          }, 1500);
          
          toast({
            title: errorTitle,
            description: errorMessage,
            variant: "destructive",
          });
          return;
        }
        
        // Special handling for timeout errors
        if (msg.includes("timeout") || msg.includes("timed out")) {
          errorTitle = "Operation Taking Longer Than Expected";
          errorMessage = "The invoice might still be processing. Please check the transactions page in a few minutes.";
          
          toast({
            title: errorTitle,
            description: errorMessage,
            variant: "destructive" // Use destructive variant for consistency with other errors
          });
          return;
        }
        
        // Item array validation errors
        if (msg.includes("line item") || msg.includes("invoice line items")) {
          errorTitle = "Item Data Error";
          errorMessage = "There was a problem with the invoice line items. Please check your selections and try again.";
        }
        
        // Item selection issues
        else if (msg.includes("item selection") || msg.includes("select at least one")) {
          errorTitle = "Selection Error";
          errorMessage = "Please select at least one item for the partial invoice";
        } 
        // Transaction ID issues
        else if (msg.includes("transaction id") || msg.includes("no related intercompany transaction")) {
          errorTitle = "Transaction Error";
          errorMessage = "Transaction ID issues. Try selecting the order again.";
        }
        // Specific account missing errors with detailed guidance
        else if (msg.includes("intercompany receivable") || msg.includes("account 1150")) {
          errorTitle = "Missing Account Error";
          errorMessage = "Intercompany Receivable account (1150) not found in the source company. Please set up this account first.";
        }
        else if (msg.includes("intercompany payable") || msg.includes("account 2150")) {
          errorTitle = "Missing Account Error";
          errorMessage = "Intercompany Payable account (2150) not found in the target company. Please set up this account first.";
        }
        else if (msg.includes("revenue") || msg.includes("account 4000")) {
          errorTitle = "Missing Account Error";
          errorMessage = "Revenue account (4000) not found in the source company. Please set up this account first.";
        }
        else if (msg.includes("expense") || msg.includes("account 5000")) {
          errorTitle = "Missing Account Error";
          errorMessage = "Expense account (5000) not found in the target company. Please set up this account first.";
        }
        // General account errors
        else if (msg.includes("missing required accounts") || 
                 (msg.includes("account") && (msg.includes("not found") || msg.includes("missing")))) {
          errorTitle = "Account Setup Error";
          errorMessage = "Required accounts are missing. Please ensure both companies have the necessary intercompany accounts (code 1150 for Receivable, 2150 for Payable, 4000 for Revenue, 5000 for Expense).";
        }
        // Invoice creation issues
        else if (msg.includes("invoice") && (msg.includes("failed") || msg.includes("error"))) {
          errorTitle = "Invoice Creation Failed";
          errorMessage = "Could not create the invoice. Please check the data and try again.";
        }
        // Receipt creation issues
        else if (msg.includes("receipt") && (msg.includes("failed") || msg.includes("error"))) {
          errorTitle = "Receipt Creation Failed";
          errorMessage = "Could not create the payment receipt. Please check the data and try again.";
        }
        // Data validation errors
        else if (msg.includes("validation") || msg.includes("required") || msg.includes("invalid")) {
          errorTitle = "Validation Error";
          errorMessage = "Please check your form data for any errors and try again.";
        }
        // Network errors
        else if (msg.includes("network") || msg.includes("fetch") || msg.includes("response")) {
          errorTitle = "Connection Error";
          errorMessage = "There was a problem connecting to the server. Please try again.";
        }
        // Balance and accounting entry errors
        else if (msg.includes("balance") || msg.includes("funds") || msg.includes("insufficient")) {
          errorTitle = "Account Balance Error";
          errorMessage = "There was an issue with account balances. This may be due to insufficient funds or a mismatch in accounting entries.";
        }
        // Journal entry or posting errors
        else if (msg.includes("journal") || msg.includes("posting") || msg.includes("ledger")) {
          errorTitle = "Accounting Entry Error";
          errorMessage = "Failed to create journal entries. Please check your Chart of Accounts and try again.";
        }
        // Database integrity errors
        else if (msg.includes("database") || msg.includes("duplicate") || msg.includes("constraint")) {
          errorTitle = "Database Error";
          errorMessage = "A database error occurred. This might be due to duplicate entries or constraint violations.";
        }
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
      
      // Don't navigate on error - this keeps the form state
      // so users can correct and retry without losing their work
      return;
    } finally {
      // Ensure all UI state is properly reset
      setIsCreating(false);
      updateProcessingStatus('idle');
      
      // Log state reset for debugging
      console.log("Form submission completed - all UI state reset");
      
      // Update the global form submission time to prevent timeout handler from firing
      (window as any)._formSubmissionTime = 0;
      
      // Clear any pending timeouts
      timeoutRefs.current.forEach(id => clearTimeout(id));
      timeoutRefs.current = [];
    }
  };
  
  // Log authentication information
  console.log("Auth user:", user);
  console.log("Is loading auth:", isLoadingAuth);

  // Get sales orders for order selection when authenticated and company is selected
  const { data: salesOrdersData, isLoading: isLoadingSalesOrders, error: salesOrdersError } = useQuery({
    queryKey: ["/api/sales-orders", activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) {
        console.warn("No active company selected, cannot fetch sales orders");
        return [];
      }
      
      console.log("Fetching sales orders for company ID:", activeCompany.id);
      const res = await apiRequest("GET", `/api/sales-orders?companyId=${activeCompany.id}`);
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to fetch sales orders: ${errorText}`);
      }
      
      const data = await res.json();
      console.log("Sales orders response:", data);
      return data;
    },
    enabled: !!user && !!activeCompany?.id, // Only run this query if the user is authenticated and company is selected
    retry: 1
  });
  // State for handling order selection
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);
  const [selectedSalesOrder, setSelectedSalesOrder] = useState<any>(null);
  // Only declaring receiptType here since invoiceType is declared above
  const [receiptType, setReceiptType] = useState<'full' | 'partial'>('full');
  
  // Function to add a new line item to the form from the sales order
  const onAddItem = () => {
    // Get current items and sales order items
    const currentItems = form.getValues("items") || [];
    
    if (!selectedSalesOrder || !selectedSalesOrder.items || !selectedSalesOrder.items.length) {
      toast({
        title: "No sales order items",
        description: "There are no sales order items to add",
        variant: "destructive"
      });
      return;
    }
    
    // Get available items from the sales order with remaining quantities
    const salesOrderItems = selectedSalesOrder.items;
    const remainingItemsMap = new Map<number, {
      item: any,
      originalQuantity: number,
      invoicedQuantity: number,
      remainingQuantity: number
    }>();
    
    // First, build a map of all sales order items with their original quantities
    salesOrderItems.forEach((soItem: any) => {
      const id = soItem.id || soItem.productId;
      if (!id) return;
      
      // Parse quantity from the item
      const originalQuantity = typeof soItem.quantity === 'number' 
        ? soItem.quantity 
        : parseFloat(String(soItem.quantity).replace(/,/g, ''));
      
      remainingItemsMap.set(id, {
        item: soItem,
        originalQuantity,
        invoicedQuantity: 0,
        remainingQuantity: originalQuantity
      });
    });
    
    // Now, subtract quantities that are already in the form
    currentItems.forEach((formItem: any) => {
      const soItemId = formItem.soItemId;
      const productId = formItem.productId;
      
      // Try to match by soItemId first, then by productId
      const id = soItemId || productId;
      if (!id) return;
      
      const remainingItem = remainingItemsMap.get(id);
      if (remainingItem) {
        // Subtract the quantity in the current form
        const itemQuantity = typeof formItem.quantity === 'number' 
          ? formItem.quantity 
          : parseFloat(String(formItem.quantity).replace(/,/g, ''));
        
        remainingItem.invoicedQuantity += itemQuantity;
        remainingItem.remainingQuantity = Math.max(0, remainingItem.originalQuantity - remainingItem.invoicedQuantity);
        
        // Update the map
        remainingItemsMap.set(id, remainingItem);
      }
    });
    
    // Convert the map to an array and filter for items with remaining quantity
    const itemsWithRemainingQuantity = Array.from(remainingItemsMap.values())
      .filter(entry => entry.remainingQuantity > 0);
    
    if (itemsWithRemainingQuantity.length === 0) {
      toast({
        title: "All quantities invoiced",
        description: "All items from this sales order have been fully invoiced",
        variant: "destructive"
      });
      return;
    }
    
    // Get the first item with remaining quantity
    const itemToAdd = itemsWithRemainingQuantity[0].item;
    const remainingQuantity = itemsWithRemainingQuantity[0].remainingQuantity;
    
    // Parse the item details
    const productId = itemToAdd.productId || 0;
    
    // For partial invoicing, use either full quantity or remaining quantity based on invoice type
    const quantity = invoiceType === 'full' ? 
      (typeof itemToAdd.quantity === 'number' ? itemToAdd.quantity : parseFloat(String(itemToAdd.quantity).replace(/,/g, ''))) : 
      remainingQuantity;
    
    // Get unit price
    let unitPrice = 0;
    if (itemToAdd.unitPrice) {
      unitPrice = typeof itemToAdd.unitPrice === 'number' 
        ? itemToAdd.unitPrice 
        : parseFloat(String(itemToAdd.unitPrice).replace(/,/g, ''));
    } else if (itemToAdd.amount && itemToAdd.quantity) {
      const amt = typeof itemToAdd.amount === 'number' ? itemToAdd.amount : parseFloat(String(itemToAdd.amount).replace(/,/g, ''));
      const qty = typeof itemToAdd.quantity === 'number' ? itemToAdd.quantity : parseFloat(String(itemToAdd.quantity).replace(/,/g, ''));
      unitPrice = amt / qty;
    }
    
    // Add the new item
    form.setValue("items", [
      ...currentItems,
      { 
        productId: productId, 
        quantity: quantity, 
        unitPrice: unitPrice, 
        description: itemToAdd.description || "",
        productName: itemToAdd.productName || "Product " + productId,
        soItemId: itemToAdd.id || null,
        originalQuantity: itemToAdd.quantity,
        remainingQuantity: remainingQuantity - quantity,
        isPartial: invoiceType === 'partial'
      },
    ]);
    
    // Update the selected items to include the new item
    const newItemIndex = currentItems.length;
    setSelectedItems(prev => ({
      ...prev,
      [newItemIndex]: true
    }));
    
    // Update remaining items tracking
    setRemainingItems(prev => [
      ...prev,
      {
        id: itemToAdd.id || 0,
        productId: productId,
        productName: itemToAdd.productName || "Product " + productId,
        totalQuantity: typeof itemToAdd.quantity === 'number' ? itemToAdd.quantity : parseFloat(String(itemToAdd.quantity).replace(/,/g, '')),
        invoicedQuantity: quantity,
        remainingQuantity: remainingQuantity - quantity,
        fullyInvoiced: (remainingQuantity - quantity) <= 0
      }
    ]);
    
    console.log("Added item from sales order:", {
      ...itemToAdd,
      invoiceQuantity: quantity,
      remainingQuantity: remainingQuantity - quantity,
      invoiceType
    });
  };
  
  const [remainingItems, setRemainingItems] = useState<Array<{
    id: number;
    productId: number;
    productName: string;
    totalQuantity: number;
    invoicedQuantity: number;
    remainingQuantity: number;
    fullyInvoiced: boolean;
  }>>([]);
  // No duplicate activeTab declaration needed here, it's declared above
  
  // Extract intercompany sales orders from the response
  const salesOrders = useMemo(() => {
    if (!salesOrdersData) return [];
    
    // Handle both array responses and { salesOrders: [] } format
    const allOrders = Array.isArray(salesOrdersData) ? salesOrdersData : 
                     (salesOrdersData.salesOrders || []);
    
    console.log("Processing all orders:", allOrders);
    
    // For Gas Manufacturing Company or Gas Distributor Company, show all orders
    // since they're primarily dealing with intercompany sales
    if (activeCompany && (activeCompany.id === 7 || activeCompany.id === 8)) {
      console.log("Gas company detected - showing all sales orders");
      return allOrders;
    }
    
    // For other companies, use the improved filtering logic for intercompany orders:
    // 1. Check for explicit isIntercompany flag
    // 2. Check for customer names containing company keywords
    // 3. Check for customer or customerName property depending on API response format
    return allOrders.filter((order: any) => {
      // Check for explicit flag
      if (order.isIntercompany === true) {
        return true;
      }
      
      // Get customer name from either format
      const customerName = order.customer?.name || order.customerName || '';
      
      // Check for intercompany relationships by keywords
      const intercompanyKeywords = ['Manufacturing', 'Distributor', 'Plant', 'Gas'];
      return intercompanyKeywords.some(keyword => 
        customerName.toLowerCase().includes(keyword.toLowerCase())
      );
    });
  }, [salesOrdersData, activeCompany]);
  
  const isLoading = isLoadingTransactions || isLoadingSalesOrderData || isLoadingSalesOrderDetails || isLoadingPurchaseOrder || isLoadingOrder;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading order details...</span>
      </div>
    );
  }
  
  const handleSelectOrder = async (selectedOrderId: number) => {
    console.log("Selected order ID for form:", selectedOrderId);
    
    // First check if selectedOrderId is valid
    if (!selectedOrderId || isNaN(selectedOrderId)) {
      toast({
        title: "Error",
        description: "Invalid order ID",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoadingOrder(true);
    
    try {
      // Instead of fetching the order, find it in the existing sales orders list
      // This prevents the 404 error when api/sales-orders/{id} is called
      const matchingOrder = salesOrders.find(so => so.id === selectedOrderId);
      
      if (!matchingOrder) {
        toast({
          title: "Error",
          description: "Could not find the selected order in available orders list",
          variant: "destructive"
        });
        setIsLoadingOrder(false);
        return;
      }
      
      console.log("Found matching order in salesOrders list:", matchingOrder);
      let orderData = matchingOrder;
      
      if (!orderData || !orderData.id) {
        toast({
          title: "Error",
          description: "Invalid order data received",
          variant: "destructive"
        });
        setIsLoadingOrder(false);
        return;
      }
      
      // Ensure the items field is populated
      if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
        if (selectedOrderId) {
          // Try to find the order in the original sales orders list
          const matchingOrder = salesOrders.find(so => so.id === selectedOrderId);
          if (matchingOrder && matchingOrder.items && Array.isArray(matchingOrder.items)) {
            console.log("Using items from matching order in salesOrders list:", matchingOrder.items);
            orderData.items = matchingOrder.items;
          }
        }
      }
      
      // Get companies for target selection
      const companiesResponse = await apiRequest('GET', '/api/companies');
      const companies = await companiesResponse.json();
      
      // Filter out the current company
      const availableTargets = Array.isArray(companies) ? 
        companies.filter((c: any) => c && activeCompany && c.id !== activeCompany.id) : [];
      
      if (!availableTargets.length) {
        toast({
          title: "Error",
          description: "No target companies available",
          variant: "destructive"
        });
        return;
      }
      
      // Get the first available company as target
      const targetCompany = availableTargets[0];
      if (!targetCompany || !targetCompany.id) {
        toast({
          title: "Error",
          description: "Invalid target company data",
          variant: "destructive"
        });
        setIsLoadingOrder(false);
        return;
      }
      
      console.log("Selected target company:", targetCompany.name);
      
      // Set the order ID to trigger the transaction check logic
      console.log("Setting order ID to:", selectedOrderId);
      setOrderId(selectedOrderId);
      console.log("Setting selected sales order:", orderData);
      setSelectedSalesOrder(orderData);
      
      try {
        // Initialize the form with defaults
        const today = new Date();
        const dueDate = new Date();
        dueDate.setDate(today.getDate() + 30); // Default due date is 30 days from today
        
        // Make sure orderData.items is an array before mapping
        const salesOrderItems = Array.isArray(orderData.items) ? orderData.items : [];
        
        // Initialize selectedItems object with all items set to true by default
        const itemSelectionState: {[id: number]: boolean} = {};
        salesOrderItems.forEach((_: any, index: number) => {
          itemSelectionState[index] = true;
        });
        console.log("Initializing selected items:", itemSelectionState);
        setSelectedItems(itemSelectionState);
        
        console.log("Processing sales order items for form:", salesOrderItems);
        
        // Map items with safety checks and extra product information
        const formattedItems = salesOrderItems.map((item: any) => {
          // Get product details from the item object
          const productId = item && typeof item.productId === 'number' ? item.productId : 1;
          
          // Get quantity and ensure proper parsing of string values (e.g. "10.00")
          let quantity = 1;
          if (item && item.quantity) {
            // Get the full quantity from the sales order for both full and partial invoice modes
            quantity = typeof item.quantity === 'number' 
              ? item.quantity 
              : parseFloat(String(item.quantity).replace(/,/g, ''));
              
            console.log(`Setting initial quantity for product ${productId} to ${quantity} from sales order`);
          }
          
          // Get unit price from the item, try different possible sources with fallback to 300
          let unitPrice = 300;
          if (item && typeof item.unitPrice === 'number') {
            unitPrice = item.unitPrice;
          } else if (item && typeof item.unitPrice === 'string') {
            unitPrice = parseFloat(item.unitPrice.replace(/,/g, ''));
          } else if (item && item.amount && item.quantity) {
            const amt = typeof item.amount === 'number' ? item.amount : parseFloat(String(item.amount).replace(/,/g, ''));
            const qty = typeof item.quantity === 'number' ? item.quantity : parseFloat(String(item.quantity).replace(/,/g, ''));
            unitPrice = amt / qty;
          }
          
          // Collect all available product information
          const productName = item.productName || 
                            (item.product && item.product.name) || 
                            `Product ${productId}`;
                            
          const description = item.description || 
                             (item.product && item.product.description) || 
                             "Product item";
          
          console.log(`Product info for item ${productId}:`, {
            productName,
            description,
            from: {
              directName: item.productName,
              productObject: item.product,
              hasProduct: !!item.product
            }
          });
          
          // Ensure the soItemId is properly captured from the sales order item
          const soItemId = item && typeof item.id === 'number' ? item.id : undefined;
          
          // Log for debugging
          console.log(`Setting initial soItemId for product ${productId} to ${soItemId} from item.id=${item?.id}`);
          
          return {
            productId,
            quantity,
            unitPrice,
            description,
            soItemId: soItemId,
            // Include additional product information for display
            productName
          };
        });
        
        // Reset the form with the new data
        form.reset({
          sourceCompanyId: activeCompany?.id || 0,
          targetCompanyId: targetCompany.id,
          salesOrderId: selectedOrderId,
          purchaseOrderId: 0, // We'll set this later if found
          issueDate: today.toISOString().split('T')[0],
          dueDate: dueDate.toISOString().split('T')[0],
          description: `Invoice for Sales Order #${orderData.orderNumber || selectedOrderId}`,
          items: formattedItems.length ? formattedItems : [{ 
            productId: 1, 
            quantity: 1, 
            unitPrice: 0, 
            description: "Default item"
          }]
        });
        
        // Force a new transaction check
        setServerTransaction(null);
        
        // Set up selectedItems state with all items initially selected
        const initialItems: {[id: number]: boolean} = {};
        formattedItems.forEach((_: any, index: number) => {
          initialItems[index] = true;
        });
        setSelectedItems(initialItems);
        
        // Log selected items debugging
        console.log("Using initialized selectedItems state:", initialItems);
        
        toast({
          title: "Order Selected",
          description: `Sales order #${orderData.orderNumber || selectedOrderId} selected`,
        });
      } catch (formError) {
        console.error("Error setting up form:", formError);
        toast({
          title: "Error",
          description: "Failed to set up the form data",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error selecting order:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to select order",
        variant: "destructive"
      });
    } finally {
      // Always reset loading state
      setIsLoadingOrder(false);
    }
  };

  // Show login prompt if not authenticated
  if (!user && !isLoadingAuth) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Authentication Required</CardTitle>
          <CardDescription>Please log in to create intercompany invoices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="mb-4">You need to be logged in to access this feature.</p>
            <Button onClick={() => setLocation("/auth")}>
              Go to Login
            </Button>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" onClick={() => setLocation("/")}>
            Back to Home
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // If we haven't selected an order or found a transaction yet, show the order selection view
  if (!finalTransaction && !selectedSalesOrder) {
    console.log("Showing order selection view - no finalTransaction or selectedSalesOrder");
    return (
      <Card>
        <CardHeader>
          <CardTitle>Intercompany Invoice Creation</CardTitle>
          <CardDescription>Select a sales order to create an intercompany invoice</CardDescription>
        </CardHeader>
        <CardContent>
          {isCheckingServer ? (
            <div className="flex items-center mt-4">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <p>Checking for transaction data...</p>
            </div>
          ) : isLoadingAuth ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2">Verifying authentication...</span>
            </div>
          ) : (
            <>
              <p className="mb-4">Select a sales order from the table below:</p>
              
              {isLoadingSalesOrders ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : salesOrders && salesOrders.length > 0 ? (
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-2 text-center">Select</th>
                        <th className="px-4 py-2 text-left">Order #</th>
                        <th className="px-4 py-2 text-left">Customer</th>
                        <th className="px-4 py-2 text-left">Date</th>
                        <th className="px-4 py-2 text-left">Amount</th>
                        <th className="px-4 py-2 text-left">Status</th>
                        <th className="px-4 py-2 text-center" colSpan={2}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesOrders.map((order: any) => {
                        // Check if order has an existing invoice
                        const hasInvoice = order.invoiceId || (Array.isArray(intercompanyTransactions) && 
                          intercompanyTransactions.some((tx: any) => 
                            (tx.sourceOrderId === order.id || tx.salesOrderId === order.id) && 
                            (tx.sourceInvoiceId || tx.salesInvoiceId)
                          )
                        );
                        
                        // Determine if the order is partially invoiced
                        const hasPartialInvoices = hasInvoice && order.status !== 'invoiced';
                        
                        return (
                          <tr key={order.id} className="border-t hover:bg-gray-50">
                            <td className="px-4 py-2 text-center">
                              <input 
                                type="checkbox" 
                                className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary" 
                                onChange={() => {
                                  // Select this order when checked
                                  try {
                                    console.log("Checkbox clicked for order ID:", order.id);
                                    handleSelectOrder(order.id);
                                  } catch (error) {
                                    console.error("Error in checkbox handler:", error);
                                    toast({
                                      title: "Error",
                                      description: "Failed to select order. Check console for details.",
                                      variant: "destructive"
                                    });
                                  }
                                }}
                              />
                            </td>
                            <td className="px-4 py-2">{order.order_number || order.orderNumber || `SO-${order.id}`}</td>
                            <td className="px-4 py-2">{order.customer_name || order.customerName || (order.customer && order.customer.name) || "Unknown Customer"}</td>
                            <td className="px-4 py-2">
                              {order.order_date || order.orderDate || order.date 
                                ? new Date(order.order_date || order.orderDate || order.date).toLocaleDateString() 
                                : "N/A"}
                            </td>
                            <td className="px-4 py-2">{formatCurrency(order.total || order.totalAmount || 0, 'USD')}</td>
                            <td className="px-4 py-2">
                              <div className="flex flex-col space-y-1">
                                <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                                  (order.status === 'completed' || order.status === 'confirmed') ? 'bg-green-100 text-green-800' :
                                  (order.status === 'pending') ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {order.status || "Unknown"}
                                </span>
                                
                                {hasInvoice && (
                                  <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                                    hasPartialInvoices ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                                  }`}>
                                    {hasPartialInvoices ? 'Partially Invoiced' : 'Invoiced'}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-2 py-2 text-center">
                              <Button 
                                variant="default" 
                                size="sm"
                                onClick={() => {
                                  console.log("Create Invoice button clicked, order ID:", order.id);
                                  // Set the form to invoice tab and select the order
                                  setActiveTab('invoice');
                                  // If order already has invoices, set to partial invoice type by default
                                  if (hasInvoice) {
                                    setInvoiceType('partial');
                                  } else {
                                    setInvoiceType('full');
                                  }
                                  handleSelectOrder(order.id);
                                }}
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                {hasInvoice ? 'Create Partial Invoice' : 'Create Invoice'}
                              </Button>
                            </td>
                            <td className="px-2 py-2 text-center">
                              <Button 
                                variant={hasInvoice ? "default" : "outline"} 
                                size="sm"
                                disabled={!hasInvoice}
                                onClick={() => {
                                  console.log("Create Receipt button clicked, order ID:", order.id);
                                  // Set the form to receipt tab if an invoice exists
                                  if (hasInvoice) {
                                    setActiveTab('receipt');
                                    handleSelectOrder(order.id);
                                  } else {
                                    // Check if there's a transaction with this sales order ID
                                    const transaction = intercompanyTransactions && Array.isArray(intercompanyTransactions) 
                                      ? intercompanyTransactions.find((tx: any) => 
                                          (tx.sourceOrderId === order.id || tx.salesOrderId === order.id) && 
                                          (tx.sourceInvoiceId || tx.salesInvoiceId)
                                        )
                                      : null;
                                    
                                    if (transaction) {
                                      setActiveTab('receipt');
                                      handleSelectOrder(order.id);
                                    } else {
                                      toast({
                                        title: "Cannot Create Receipt",
                                        description: "You must create an invoice for this order first.",
                                        variant: "destructive"
                                      });
                                    }
                                  }
                                }}
                              >
                                <CreditCard className="h-4 w-4 mr-2" />
                                Create Receipt
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center p-4 text-muted-foreground">No sales orders found</p>
              )}
            </>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => setLocation("/intercompany-transactions")}>
            Go Back
          </Button>
          <div className="flex gap-2">
            <Button 
              variant="default" 
              onClick={() => {
                // Refresh the sales orders list
                queryClient.invalidateQueries({ queryKey: ['/api/sales-orders'] });
                toast({
                  title: "Refreshed",
                  description: "Sales orders list has been refreshed",
                });
              }}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Refresh List
            </Button>
          </div>
        </CardFooter>
      </Card>
    );
  }
  
  // If we have selected an order but transaction creation is still in progress
  if (selectedSalesOrder && !finalTransaction) {
    console.log("Showing selected order handling view - selectedSalesOrder exists but no finalTransaction yet");
    
    // Create a custom form with the selected order
    return (
      <Card>
        <CardHeader>
          <CardTitle>Processing Selected Order</CardTitle>
          <CardDescription>Creating intercompany transaction for order #{selectedSalesOrder.orderNumber || selectedSalesOrder.id}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="rounded-lg bg-muted p-4">
              <h3 className="text-md font-medium mb-2">Order Details</h3>
              <div className="grid grid-cols-2 gap-3">
                <p><span className="font-medium">Order #:</span> {selectedSalesOrder.orderNumber || "N/A"}</p>
                <p><span className="font-medium">Customer:</span> {selectedSalesOrder.customer?.name || selectedSalesOrder.customerName || "N/A"}</p>
                <p><span className="font-medium">Date:</span> {formatDate(selectedSalesOrder.orderDate || selectedSalesOrder.date)}</p>
                <p><span className="font-medium">Amount:</span> {formatCurrency(selectedSalesOrder.total || selectedSalesOrder.totalAmount || (selectedSalesOrder.items && selectedSalesOrder.items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0)) || 1000, 'USD')}</p>
              </div>
            </div>
            
            {/* Transaction Settings Section */}
            <div className="rounded-lg border p-4">
              <h3 className="text-md font-medium mb-3">Transaction Settings</h3>
              
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button 
                    onClick={createIntercompanyTransaction}
                    disabled={isCreating || hasAttemptedTransaction}
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Transaction...
                      </>
                    ) : hasAttemptedTransaction ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Transaction Created
                      </>
                    ) : (
                      "Create Transaction"
                    )}
                  </Button>
                </div>
              </div>
            </div>
            
            {hasAttemptedTransaction && !finalTransaction && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <p>Setting up intercompany transaction...</p>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => {
            setSelectedSalesOrder(null);
            setOrderId(null);
            setServerTransaction(null);
            setHasAttemptedTransaction(false);
            setCustomTransactionAmount("");
          }}>
            Cancel Selection
          </Button>
          <Button variant="outline" onClick={() => setLocation("/intercompany-transactions")}>
            Go Back to Transactions
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Create Intercompany Transaction</h1>
        <Button variant="outline" onClick={() => setLocation("/intercompany-transactions")}>
          Cancel
        </Button>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Transaction Details</CardTitle>
          <CardDescription>
            {isSourceCompany 
              ? "You are creating a transaction as the supplier company" 
              : "You are creating a transaction on behalf of the supplier company"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Source (Supplier)</h3>
              <p>Company: {finalTransaction?.sourceCompany?.name}</p>
              <p>Order: {salesOrder?.orderNumber}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Target (Customer)</h3>
              <p>Company: {finalTransaction?.targetCompany?.name}</p>
              <p>Order: {purchaseOrder?.orderNumber}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Tabs 
        defaultValue="invoice" 
        value={activeTab} 
        onValueChange={(value) => setActiveTab(value as 'invoice' | 'receipt')}
        className="mb-6"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="invoice">Create Invoice</TabsTrigger>
          <TabsTrigger value="receipt">Create Receipt</TabsTrigger>
        </TabsList>
        
        <TabsContent value="invoice" className="mt-4">
          <div className="mb-4">
            <h3 className="text-lg font-medium mb-2">Invoice Type</h3>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <input 
                  type="radio" 
                  id="full-invoice" 
                  name="invoice-type" 
                  checked={invoiceType === 'full'} 
                  onChange={() => setInvoiceType('full')} 
                  className="h-4 w-4"
                />
                <Label htmlFor="full-invoice">Full Invoice</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input 
                  type="radio" 
                  id="partial-invoice" 
                  name="invoice-type" 
                  checked={invoiceType === 'partial'} 
                  onChange={() => {
                    console.log("Setting invoice type to partial");
                    setInvoiceType('partial');
                    
                    // Always reinitialize selectedItems when switching to partial invoice
                    const items = form.getValues('items');
                    console.log("Initializing selected items for partial invoice with items count:", items?.length);
                    const initialItems: {[id: number]: boolean} = {};
                    if (items && items.length) {
                      items.forEach((_, idx) => {
                        initialItems[idx] = true;
                      });
                      setSelectedItems(initialItems);
                      console.log("Initialized selectedItems state:", initialItems);
                    }
                    
                    // Partial invoice controls component is rendered in the UI below
                    if (selectedSalesOrder && selectedSalesOrder.items) {
                      console.log("Showing partial invoice controls for sales order:", selectedSalesOrder);
                    }
                  }} 
                  className="h-4 w-4"
                />
                <Label htmlFor="partial-invoice">Partial Invoice</Label>
              </div>
            </div>
            
            {/* Add the PartialInvoiceControls component when in partial invoice mode */}
            {invoiceType === 'partial' && selectedSalesOrder && (
              <div className="mt-4 mb-4 border rounded-md p-4 bg-gray-50">
                <PartialInvoiceControls 
                  salesOrderItems={selectedSalesOrder.items || []}
                  previousTransactions={previousTransactions || []}
                  onQuantitiesChanged={(items) => {
                    console.log("Partial invoice quantities changed:", items);
                    setPartialItems(items);
                    
                    // Update form items based on partial quantities
                    const formItems = form.getValues('items') || [];
                    const updatedItems = formItems.filter(item => 
                      !items.some(pi => pi.productId === item.productId || (item.soItemId && pi.soItemId === item.soItemId))
                    );
                    
                    // Add selected items with their quantities
                    items.forEach(partialItem => {
                      if (partialItem.selected && partialItem.invoiceQuantity > 0) {
                        updatedItems.push({
                          productId: partialItem.productId,
                          soItemId: partialItem.soItemId,
                          productName: partialItem.productName,
                          description: partialItem.description || '',
                          quantity: partialItem.invoiceQuantity,
                          unitPrice: partialItem.unitPrice
                        });
                      }
                    });
                    
                    form.setValue('items', updatedItems);
                    form.trigger('items');
                  }}
                />
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="receipt" className="mt-4">
          {!finalTransaction ? (
            <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 mb-4">
              <div className="flex items-center justify-center">
                <Info className="h-5 w-5 text-blue-500 mr-2" />
                <p className="text-sm text-gray-700">Please create an intercompany transaction first before creating a receipt.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 mb-6">
                <h3 className="text-lg font-medium mb-4">Transaction Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Transaction ID:</p>
                    <p className="font-mono">{finalTransaction.id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Amount:</p>
                    <p className="font-semibold">{formatCurrency(Number(finalTransaction.amount) || 0, 'USD')}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Date:</p>
                    <p>{new Date(finalTransaction.transactionDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Status:</p>
                    <div className="flex items-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        finalTransaction.status === 'completed' ? 'bg-green-100 text-green-800' :
                        finalTransaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {finalTransaction.status || 'unknown'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mb-4">
                <h3 className="text-lg font-medium mb-4">Create Receipt</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="receipt-amount">Receipt Amount</Label>
                    <Input
                      id="receipt-amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder={`Maximum: ${formatCurrency(Number(finalTransaction.amount) || 0, 'USD')}`}
                      value={receiptAmount}
                      onChange={(e) => setReceiptAmount(e.target.value)}
                      className="mt-1"
                    />
                    {Number(receiptAmount) > Number(finalTransaction.amount) && (
                      <p className="text-xs text-red-500 mt-1">
                        Receipt amount cannot exceed transaction amount
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="payment-method">Payment Method</Label>
                    <Select
                      value={receiptPaymentMethod}
                      onValueChange={(value) => setReceiptPaymentMethod(value)}
                    >
                      <SelectTrigger id="payment-method" className="mt-1">
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        <SelectItem value="Check">Check</SelectItem>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Credit Card">Credit Card</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button 
                    type="button"
                    onClick={() => createIntercompanyReceipt(finalTransaction.id)}
                    disabled={
                      creatingReceipt || 
                      !receiptAmount || 
                      Number(receiptAmount) <= 0 || 
                      Number(receiptAmount) > Number(finalTransaction.amount)
                    }
                    className="w-full mt-4"
                  >
                    {creatingReceipt ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing Receipt...
                      </>
                    ) : (
                      "Create Receipt"
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
                    
          <div className="mb-4">
            <h3 className="text-lg font-medium mb-2">Receipt Type</h3>
            <div className="flex items-center space-x-4 mb-4">
              <div className="flex items-center space-x-2">
                <input 
                  type="radio" 
                  id="full-receipt" 
                  name="receipt-type" 
                  checked={receiptType === 'full'} 
                  onChange={() => setReceiptType('full')} 
                  className="h-4 w-4"
                />
                <Label htmlFor="full-receipt">Full Receipt</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input 
                  type="radio" 
                  id="partial-receipt" 
                  name="receipt-type" 
                  checked={receiptType === 'partial'} 
                  onChange={() => {
                    console.log("Setting receipt type to partial");
                    setReceiptType('partial');
                    
                    // Always reinitialize selectedItems when switching to partial receipt
                    const items = form.getValues('items');
                    console.log("Initializing selected items for partial receipt with items count:", items?.length);
                    const initialItems: {[id: number]: boolean} = {};
                    if (items && items.length) {
                      items.forEach((_, idx) => {
                        initialItems[idx] = true;
                      });
                      setSelectedItems(initialItems);
                      console.log("Initialized selectedItems state:", initialItems);
                    }
                  }} 
                  className="h-4 w-4"
                />
                <Label htmlFor="partial-receipt">Partial Receipt</Label>
              </div>
            </div>
            
            <h3 className="text-lg font-medium mb-2">Payment Information</h3>
            <p className="text-sm text-muted-foreground">
              This will create a receipt for the customer company and a payment for the supplier company.
            </p>
          </div>
        </TabsContent>
      </Tabs>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{activeTab === 'invoice' ? 'Invoice Information' : 'Receipt Information'}</CardTitle>
              {activeTab === 'invoice' && (
                <div className="mt-2 text-xs text-muted-foreground border border-muted-foreground/20 rounded-md p-2 bg-muted/30">
                  <p className="font-medium mb-1">Required Accounts Setup:</p>
                  <ul className="list-disc pl-5">
                    <li>Source company must have <strong>Intercompany Receivable</strong> (code 1150) and <strong>Revenue</strong> (code 4000) accounts</li>
                    <li>Target company must have <strong>Intercompany Payable</strong> (code 2150) and <strong>Expense</strong> (code 5000) accounts</li>
                  </ul>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="issueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{activeTab === 'invoice' ? 'Issue Date' : 'Payment Date'}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {activeTab === 'invoice' && (
                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{activeTab === 'invoice' ? 'Invoice Description' : 'Payment Description'}</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder={activeTab === 'invoice' ? "Enter invoice description" : "Enter payment description"}
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          <Card className="mb-6">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Line Items</CardTitle>
                  <CardDescription>
                    {activeTab === 'invoice' 
                      ? (invoiceType === 'partial' 
                        ? 'Select items to include in this partial invoice' 
                        : 'These items are imported from the sales order')
                      : 'These items from the invoice will be included in the payment receipt'}
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onAddItem}
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {invoiceType === 'partial' && activeTab === 'invoice' && salesOrder && (
                <div className="mb-6">
                  <PartialInvoiceControls 
                    salesOrderItems={salesOrder.items || []}
                    previousTransactions={salesOrder.invoices || []}
                    onQuantitiesChanged={(items) => {
                      console.log("Partial invoice quantities changed:", items);
                      setPartialItems(items);
                      
                      // Update form items based on partial selections
                      const formItems = items
                        .filter(item => item.selected && item.invoiceQuantity > 0)
                        .map(item => ({
                          productId: item.productId,
                          quantity: item.invoiceQuantity,
                          unitPrice: item.unitPrice,
                          description: item.description || '',
                          soItemId: item.soItemId,
                          productName: item.productName,
                          isPartial: true
                        }));
                      
                      form.setValue("items", formItems);
                    }}
                  />
                </div>
              )}
              
              <div className="space-y-4">
                <div className="grid grid-cols-12 gap-4 font-semibold py-2 px-2 bg-gray-50 rounded-lg">
                  {(activeTab === 'invoice' && invoiceType === 'partial') ? (
                    <div className="col-span-1">Select</div>
                  ) : null}
                  <div className={(activeTab === 'invoice' && invoiceType === 'partial') ? "col-span-3" : "col-span-4"}>Product</div>
                  
                  {activeTab === 'invoice' && invoiceType === 'partial' ? (
                    <>
                      <div className="col-span-2 text-right">Order Qty</div>
                      <div className="col-span-2 text-right">Invoiced Qty</div>
                      <div className="col-span-2 text-right">This Invoice</div>
                    </>
                  ) : (
                    <div className="col-span-2 text-right">Quantity</div>
                  )}
                  
                  <div className="col-span-2 text-right">Unit Price</div>
                  <div className="col-span-2 text-right">Total</div>
                </div>
                
                {/* Display previously invoiced items first (non-editable) */}
                {activeTab === 'invoice' && invoiceType === 'partial' && salesOrder?.items && (
                  <>
                    {salesOrder.items.map((soItem, idx) => {
                      // Skip items with no quantities
                      if (!soItem.quantity) return null;
                      
                      const invoicedQty = typeof soItem.invoicedQuantity === 'number' 
                        ? soItem.invoicedQuantity
                        : typeof soItem.invoicedQuantity === 'string'
                          ? parseFloat(soItem.invoicedQuantity)
                          : 0;
                        
                      // Only show items that have been invoiced previously
                      if (!invoicedQty || invoicedQty <= 0) return null;

                      const unitPrice = typeof soItem.unitPrice === 'number' 
                        ? soItem.unitPrice
                        : typeof soItem.unitPrice === 'string'
                          ? parseFloat(soItem.unitPrice)
                          : 0;
                      
                      return (
                        <div key={`invoiced-${idx}`} className="grid grid-cols-12 gap-4 py-3 px-2 border-b bg-gray-50">
                          <div className="col-span-1 flex items-center justify-center">
                            {/* Placeholder for alignment */}
                          </div>
                          <div className="col-span-3">
                            <div className="font-medium">
                              {soItem.productName || soItem.product?.name || 'Product ' + soItem.productId}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              {soItem.description || 'No description available'}
                            </p>
                            <div className="text-xs text-blue-600 font-medium">Previously invoiced</div>
                          </div>
                          
                          <div className="col-span-2 text-right flex flex-col justify-center">
                            <div className="font-medium">
                              {typeof soItem.quantity === 'number' ? soItem.quantity : parseFloat(String(soItem.quantity || '0'))}
                            </div>
                          </div>
                          
                          <div className="col-span-2 text-right flex flex-col justify-center">
                            <div className="font-medium text-blue-600">
                              {invoicedQty}
                            </div>
                          </div>
                          
                          <div className="col-span-2 text-right flex flex-col justify-center">
                            <div className="font-medium text-gray-400">N/A</div>
                          </div>
                          
                          <div className="col-span-2 text-right flex flex-col justify-center">
                            <div className="font-medium">{unitPrice.toFixed(2)}</div>
                          </div>
                          
                          <div className="col-span-2 text-right flex flex-col justify-center">
                            <div className="font-medium">
                              {formatCurrency(invoicedQty * unitPrice, 'USD')}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
                
                {/* Display current editable items */}
                {form.watch('items').map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-4 py-3 px-2 border-b">
                    {((activeTab === 'invoice' && invoiceType === 'partial') || (activeTab === 'receipt' && receiptType === 'partial')) && (
                      <div className="col-span-1 flex items-center justify-center">
                        <input 
                          type="checkbox" 
                          checked={selectedItems[index] === true} 
                          onChange={() => {
                            // Always select at least one item
                            const updatedSelection = {
                              ...selectedItems,
                              [index]: !selectedItems[index]
                            };
                            
                            // Log the selection change
                            console.log(`Changed selection for item ${index}: ${selectedItems[index]} → ${!selectedItems[index]}`);
                            
                            // Force the checkbox to be checked if it's the only item
                            const hasAtLeastOneSelected = Object.values(updatedSelection).some(isSelected => isSelected === true);
                            if (!hasAtLeastOneSelected) {
                              console.log("Keeping at least one item selected");
                              updatedSelection[index] = true;
                            }
                            
                            setSelectedItems(updatedSelection);
                          }}
                          className="h-4 w-4"
                        />
                      </div>
                    )}
                    <div className={(activeTab === 'invoice' && invoiceType === 'partial') || (activeTab === 'receipt' && receiptType === 'partial') ? "col-span-3" : "col-span-6"}>
                      <div className="font-medium">
                        {/* Try multiple ways to get the product name from the sales order */}
                        {(salesOrder?.items?.[index]?.productName) || 
                         (salesOrder?.items?.[index]?.product?.name) ||
                         (salesOrder?.items?.[index]?.product_name) ||
                         (salesOrder?.items?.[index]?.name) ||
                         (selectedSalesOrder?.items?.[index]?.productName) ||
                         (selectedSalesOrder?.items?.[index]?.product?.name) ||
                         (selectedSalesOrder?.items?.[index]?.product_name) ||
                         (selectedSalesOrder?.items?.[index]?.name) ||
                         ((item as any).productName) ||
                         'Product ' + (item.productId || (index + 1))}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {item.description || 'No description available'}
                      </p>
                      {/* Hidden debug information for development - display product ID */}
                      <p className="text-xs text-gray-400 mt-1">ID: {item.productId || 'Unknown'} | SO Item: {item.soItemId || 'N/A'}</p>
                    </div>
                    
                    {activeTab === 'invoice' && invoiceType === 'partial' ? (
                      <>
                        {/* Original Order Quantity */}
                        <div className="col-span-2 text-right flex flex-col justify-center">
                          <div className="font-medium">
                            {(salesOrder?.items?.find(si => si.productId === item.productId)?.quantity) || 
                             (selectedSalesOrder?.items?.find(si => si.productId === item.productId)?.quantity) || 
                             '0'}
                          </div>
                        </div>
                        
                        {/* Already Invoiced Quantity */}
                        <div className="col-span-2 text-right flex flex-col justify-center">
                          <div id={`invoiced-qty-${index}`} className="font-medium text-blue-600">
                            {(() => {
                              // First try to get invoiced quantity directly from remainingItems
                              if (remainingItems && remainingItems.length > 0) {
                                const matchingItem = remainingItems.find(ri => ri.productId === item.productId);
                                if (matchingItem) {
                                  // If we have the invoiced quantity directly, use it
                                  if (typeof matchingItem.invoicedQuantity === 'number') {
                                    return matchingItem.invoicedQuantity;
                                  }
                                  
                                  // Otherwise calculate it from total - remaining
                                  const totalQty = Number(
                                    salesOrder?.items?.find(si => si.productId === item.productId)?.quantity || 
                                    selectedSalesOrder?.items?.find(si => si.productId === item.productId)?.quantity || 0
                                  );
                                  const remainingQty = Number(matchingItem.remainingQuantity || 0);
                                  return totalQty - remainingQty;
                                }
                              }
                              
                              // Try to get invoiced quantity from the sales order items directly
                              const soItem = salesOrder?.items?.find(si => si.productId === item.productId) || 
                                selectedSalesOrder?.items?.find(si => si.productId === item.productId);
                              
                              if (soItem) {
                                // Check for invoicedQuantity as a string or number
                                const invQty = soItem.invoicedQuantity;
                                if (invQty !== undefined) {
                                  return typeof invQty === 'number' ? invQty : parseFloat(String(invQty || '0'));
                                }
                              }
                              
                              // Final fallback is zero
                              return '0';
                            })()}
                          </div>
                        </div>
                        
                        {/* This Invoice Quantity Input */}
                        <div className="col-span-2 text-right">
                          <Input 
                            id={`invoice-qty-${index}`}
                            type="number" 
                            min="1"
                            data-index={index}
                            data-product-id={item.productId}
                            data-so-item-id={item.soItemId || ''}
                            max={(() => {
                              // First check for remaining items
                              if (remainingItems && remainingItems.length > 0) {
                                const matchingItem = remainingItems.find(ri => ri.productId === item.productId);
                                if (matchingItem && typeof matchingItem.remainingQuantity === 'number') {
                                  return matchingItem.remainingQuantity > 0 ? matchingItem.remainingQuantity : 0;
                                }
                              }
                              
                              // Try to calculate remaining from sales order
                              const soItem = salesOrder?.items?.find(si => si.productId === item.productId) || 
                                selectedSalesOrder?.items?.find(si => si.productId === item.productId);
                              
                              if (soItem) {
                                const totalQty = parseFloat(String(soItem.quantity || '0'));
                                const invoicedQty = parseFloat(String(soItem.invoicedQuantity || '0'));
                                const remaining = Math.max(0, totalQty - invoicedQty);
                                return remaining;
                              }
                              
                              // Fallback to the original quantity
                              return parseFloat(String(item.quantity || '0'));
                            })()}
                            value={item.quantity}
                            onChange={(e) => {
                              const updatedItems = [...form.getValues('items')];
                              const newValue = Number(e.target.value);
                              
                              // Update the form value and log detailed information
                              console.log(`Updating item ${index} quantity to ${newValue}`);
                              
                              updatedItems[index].quantity = newValue;
                              form.setValue('items', updatedItems);
                              
                              // Force update local state when input changes and store in dataset
                              console.log(`Input changed for item ${index}: ${e.target.value}`);
                              
                              // Store current value in the dataset for easier retrieval later
                              e.target.dataset.currentValue = e.target.value;
                              
                              // Simulate updating the invoiced quantity display for better UX feedback
                              const invoicedQtyElement = document.getElementById(`invoiced-qty-${index}`);
                              if (invoicedQtyElement) {
                                // This just updates the visual display to show what the new value would be
                                invoicedQtyElement.textContent = String(newValue);
                              }
                            }}
                            className="text-right invoice-qty-input"
                          />
                        </div>
                      </>
                    ) : activeTab === 'receipt' && receiptType === 'partial' ? (
                      <>
                        {/* Invoice Quantity */}
                        <div className="col-span-2 text-right flex flex-col justify-center">
                          <div className="font-medium">
                            {(finalTransaction?.invoices?.[0]?.items?.find(ii => ii.productId === item.productId)?.quantity) || 
                             item.quantity || '0'}
                          </div>
                        </div>
                        
                        {/* Already Paid Quantity */}
                        <div className="col-span-2 text-right flex flex-col justify-center">
                          <div className="font-medium text-green-600">
                            {(() => {
                              // If we have remaining items data, use it
                              if (remainingItems && remainingItems.length > 0) {
                                const matchingItem = remainingItems.find(ri => ri.productId === item.productId);
                                if (matchingItem) {
                                  // If we have paid quantity directly, use it
                                  if (typeof matchingItem.paidQuantity === 'number') {
                                    return matchingItem.paidQuantity;
                                  }
                                  
                                  // Otherwise calculate from invoice quantity - remaining
                                  const invoiceQty = Number(
                                    finalTransaction?.invoices?.[0]?.items?.find(ii => ii.productId === item.productId)?.quantity || 
                                    item.quantity || 0
                                  );
                                  const remainingQty = Number(matchingItem.remainingQuantity || 0);
                                  return invoiceQty - remainingQty;
                                }
                              }
                              
                              // Fallback to 0 if we can't calculate
                              return '0';
                            })()}
                          </div>
                        </div>
                        
                        {/* This Receipt Quantity Input */}
                        <div className="col-span-2 text-right">
                          <Input 
                            type="number" 
                            min="1"
                            max={
                              // Use the remaining quantity if available, otherwise use the full invoice quantity
                              remainingItems && remainingItems.find(ri => ri.productId === item.productId) 
                                ? remainingItems.find(ri => ri.productId === item.productId)?.remainingQuantity
                                : (finalTransaction?.invoices?.[0]?.items?.find(ii => ii.productId === item.productId)?.quantity || 
                                  item.quantity)
                            }
                            value={item.quantity}
                            onChange={(e) => {
                              const updatedItems = [...form.getValues('items')];
                              updatedItems[index].quantity = Number(e.target.value);
                              form.setValue('items', updatedItems);
                            }}
                            className="text-right"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="col-span-2 text-right">
                        <Input 
                          type="number" 
                          min="1"
                          value={item.quantity}
                          onChange={(e) => {
                            const updatedItems = [...form.getValues('items')];
                            updatedItems[index].quantity = Number(e.target.value);
                            form.setValue('items', updatedItems);
                          }}
                          className="text-right"
                        />
                        {/* Add a helpful note for full invoice mode to indicate the original order quantity */}
                        {invoiceType === 'full' && (
                          <div className="text-xs text-gray-500 mt-1">
                            Order Qty: {(() => {
                              const soItem = salesOrder?.items?.find(si => si.productId === item.productId);
                              if (soItem && soItem.quantity) {
                                return typeof soItem.quantity === 'number' 
                                  ? soItem.quantity 
                                  : parseFloat(String(soItem.quantity).replace(/,/g, ''));
                              }
                              return item.quantity;
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="col-span-2 text-right">
                      <Input 
                        type="number" 
                        min="0.01"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => {
                          const updatedItems = [...form.getValues('items')];
                          updatedItems[index].unitPrice = Number(e.target.value);
                          form.setValue('items', updatedItems);
                        }}
                        className="text-right"
                      />
                    </div>
                    <div className="col-span-2 text-right">
                      {formatCurrency(item.quantity * item.unitPrice, 'USD')}
                    </div>
                  </div>
                ))}
                
                <div className="grid grid-cols-12 gap-4 py-3 px-2 font-semibold">
                  <div className={invoiceType === 'partial' ? "col-span-9" : "col-span-10"} style={{ textAlign: 'right' }}>Total:</div>
                  <div className="col-span-2 text-right">
                    {invoiceType === 'partial' 
                      ? formatCurrency(
                          form.watch('items')
                            .filter((_, index) => selectedItems[index])
                            .reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0),
                            'USD'
                        )
                      : formatCurrency(
                          form.watch('items').reduce(
                            (sum, item) => sum + (item.quantity * item.unitPrice), 
                            0
                          ), 
                          'USD'
                        )
                    }
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Enhanced Status indicators - Always shown for better UX */}
          {/* Debug log for status - keeps important logs visible in console */}
          <>{console.log(`[INTERCOMPANY-INVOICE-FORM] Status: ${processingStatus}, Success: ${!!successMessage}, Error: ${!!errorMessage}`)}</>
          
          {/* Always show status indicator to inform users of the current state */}
          <div className={`my-4 p-4 rounded-lg border shadow-sm ${
            processingStatus === 'success' ? 'bg-green-50 border-green-200 border-l-4 border-l-green-500' : 
            processingStatus === 'error' ? 'bg-red-50 border-red-200 border-l-4 border-l-red-500' : 
            processingStatus === 'processing' ? 'bg-yellow-50 border-yellow-200 border-l-4 border-l-yellow-500' :
            'bg-blue-50 border-blue-200 border-l-4 border-l-blue-400'
          }`}>
            {processingStatus === 'processing' && (
              <div className="flex">
                <div className="flex-shrink-0">
                  <Loader2 className="h-5 w-5 text-yellow-500 animate-spin" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-yellow-800">Processing your request...</p>
                  <p className="text-xs text-yellow-700 mt-1">This may take up to 30 seconds. Please wait.</p>
                </div>
              </div>
            )}
            
            {processingStatus === 'success' && (
              <div className="flex">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">{successMessage || "Operation completed successfully"}</p>
                  <p className="text-xs text-green-700 mt-1">You can view the results in the transactions list.</p>
                </div>
              </div>
            )}
            
            {processingStatus === 'error' && (
              <div className="flex">
                <div className="flex-shrink-0">
                  <XCircle className="h-5 w-5 text-red-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">Error: {errorMessage || "An unexpected error occurred"}</p>
                  <p className="text-xs text-red-700 mt-1">Please try again or contact support if the issue persists.</p>
                </div>
              </div>
            )}
            
            {processingStatus === 'idle' && (
              <div className="flex">
                <div className="flex-shrink-0">
                  <Info className="h-5 w-5 text-blue-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-800">Ready to create {activeTab === 'invoice' ? 'invoice' : 'receipt'}</p>
                  <p className="text-xs text-blue-700 mt-1">Complete the form and click the button below to submit.</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setLocation("/intercompany-transactions")}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              disabled={isCreating || processingStatus !== 'idle'}
              className={(isCreating || processingStatus !== 'idle') ? "opacity-70" : ""}
              onClick={() => {
                // Only proceed if not already creating
                if (isCreating || processingStatus !== 'idle') {
                  return;
                }
                
                // Update UI state first
                setIsCreating(true);
                updateProcessingStatus('processing');
                setErrorMessage(null);
                setSuccessMessage(null);
                
                // Record submission time for timeout calculation
                (window as any)._formSubmissionTime = Date.now();
                
                // Set form values
                form.setValue('invoiceType', invoiceType);
                
                // Log for debugging
                console.log("Submitting form with invoiceType:", invoiceType);
                console.log("Form values:", form.getValues());
                
                // Handle timeout for long-running operations
                const timeoutId = setTimeout(() => {
                  console.log("Checking if operation is still running after 30 seconds");
                  // Get current status at the time the timeout fires
                  const currentStatus = (window as any)._processingStatus || 'idle';
                  
                  if (currentStatus === 'processing') {
                    console.log("Operation timeout - resetting UI state");
                    updateProcessingStatus('idle');
                    setIsCreating(false);
                    toast({
                      title: "Processing timeout",
                      description: "The operation is taking longer than expected. Please check the transactions page later.",
                      variant: "destructive"
                    });
                  }
                }, 30000);
                
                // Store timeout for cleanup
                timeoutRefs.current.push(timeoutId);
                
                // Submit the form - ensure this is a direct call to onSubmit
                const formData = form.getValues();
                onSubmit(formData);
              }}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : activeTab === 'invoice' 
                ? `Create ${invoiceType === 'partial' ? 'Partial' : 'Full'} Invoice & Bill` 
                : 'Create Receipt & Payment'}
              
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}