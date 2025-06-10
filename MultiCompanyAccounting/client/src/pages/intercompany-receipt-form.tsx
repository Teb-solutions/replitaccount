import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/hooks/use-company";
import { useIntercompany } from "@/hooks/use-intercompany";
import { createIntercompanyReceipt } from "@/lib/intercompany-connector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const formSchema = z.object({
  sourceCompanyId: z.number().min(1, "Source company is required"),
  targetCompanyId: z.number().min(1, "Target company is required"),
  invoiceId: z.number().min(1, "Invoice is required"),
  billId: z.number().min(1, "Bill is required"),
  paymentDate: z.string().min(1, "Payment date is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  paymentMethod: z.string().min(1, "Payment method is required"),
  reference: z.string().optional(),
  isPartialPayment: z.boolean().default(false),
  notes: z.string().optional(),
  // We'll still keep these for the internal receipt creation
  debitAccountId: z.number().min(1, "Debit account is required"),
  creditAccountId: z.number().min(1, "Credit account is required"),
  // Control whether to create the corresponding payment in the target company
  createPurchaseReceipt: z.boolean().default(true)
});

type FormValues = z.infer<typeof formSchema>;

interface InvoiceData {
  id: number;
  invoiceNumber: string;
  customerId: number;
  salesOrderId: number;
  invoiceDate: string;
  dueDate: string;
  total: number;
  amountPaid: number;
  balanceDue: number;
  status: string;
  // Add fields that might be referenced elsewhere in the component
  salesOrderNumber?: string;
  items?: any[];
}

export default function IntercompanyReceiptForm() {
  const { activeCompany } = useCompany();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [invoiceId, setInvoiceId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // Get URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invId = params.get("invoiceId");
    
    if (invId) {
      setInvoiceId(parseInt(invId, 10));
    }
  }, []);
  
  // Query for invoice details with enhanced error handling and data validation
  const { data: invoice, isLoading: isLoadingInvoice } = useQuery<InvoiceData>({
    queryKey: ["/api/intercompany-transactions", invoiceId],
    queryFn: async () => {
      if (!invoiceId) {
        console.error("No invoiceId provided to fetch invoice details");
        return null;
      }
      
      console.log(`Fetching transaction with invoice ID: ${invoiceId}`);
      try {
        // First try to get the transaction from the intercompany-receipt-eligible-transactions endpoint
        const gasCompanyId = activeCompany?.id;
        if (!gasCompanyId) {
          throw new Error("No active company selected");
        }
        
        // Try multiple endpoints to find the transaction
        let transaction = null;
        let eligibleTransactions = [];
        
        // Try the complete transaction data endpoint first (most reliable)
        try {
          console.log(`Fetching comprehensive transaction data with invoice ID: ${invoiceId}`);
          const fullTxRes = await apiRequest("GET", `/api/intercompany-transaction-full?invoiceId=${invoiceId}`);
          
          if (fullTxRes.ok) {
            transaction = await fullTxRes.json();
            console.log("Found transaction via comprehensive endpoint:", transaction);
          } else {
            console.log(`No transaction found via comprehensive endpoint for invoice ${invoiceId}`);
          }
        } catch (err) {
          console.log("Error fetching from comprehensive transaction API:", err);
        }
        
        // Then try the direct-transaction endpoint
        if (!transaction) {
          try {
            console.log(`Trying direct-transaction endpoint with invoice ID: ${invoiceId}`);
            const directTxRes = await apiRequest("GET", `/api/direct-transaction?invoiceId=${invoiceId}`);
            
            if (directTxRes.ok) {
              transaction = await directTxRes.json();
              console.log("Found transaction via direct-transaction endpoint:", transaction);
            } else {
              console.log(`No transaction found via direct-transaction endpoint for invoice ${invoiceId}`);
            }
          } catch (err) {
            console.log("Error fetching from direct transaction API:", err);
          }
        }
        
        // If not found, try eligible-transactions endpoint
        if (!transaction) {
          try {
            console.log(`Trying eligible-transactions endpoint for company ${gasCompanyId}`);
            const eligibleTxRes = await apiRequest("GET", `/api/intercompany-receipt-eligible-transactions?companyId=${gasCompanyId}`);
            eligibleTransactions = await eligibleTxRes.json();
            
            // Find the transaction that has this invoice ID
            transaction = eligibleTransactions.find((tx: any) => 
              tx.source_invoice_id == invoiceId || tx.invoice_id == invoiceId
            );
            
            if (transaction) {
              console.log("Found transaction via eligible-transactions endpoint:", transaction);
            }
          } catch (err) {
            console.log("Error fetching from eligible transactions API:", err);
          }
        }
        
        // If still not found, try all-transactions endpoint
        if (!transaction) {
          try {
            console.log(`Trying all-transactions endpoint for company ${gasCompanyId}`);
            const allTxRes = await apiRequest("GET", `/api/intercompany-transactions?companyId=${gasCompanyId}`);
            const allTransactions = await allTxRes.json();
            
            transaction = allTransactions.find((tx: any) => 
              tx.source_invoice_id == invoiceId || tx.invoice_id == invoiceId
            );
            
            if (transaction) {
              console.log("Found transaction via all-transactions endpoint:", transaction);
            }
          } catch (err) {
            console.log("Error fetching from intercompany transactions API:", err);
          }
        }
        
        // Last resort - Try direct company transactions endpoint
        if (!transaction) {
          try {
            console.log(`Trying direct-company-transactions endpoint for company ${gasCompanyId}`);
            const directCompanyTxRes = await apiRequest("GET", `/api/direct-company-transactions?companyId=${gasCompanyId}`);
            const directCompanyTransactions = await directCompanyTxRes.json();
            
            transaction = directCompanyTransactions.find((tx: any) => 
              tx.source_invoice_id == invoiceId || tx.invoice_id == invoiceId
            );
            
            if (transaction) {
              console.log("Found transaction via direct-company-transactions endpoint:", transaction);
            }
          } catch (err) {
            console.log("Error fetching from direct company transactions API:", err);
          }
        }
        
        if (!transaction) {
          throw new Error(`No transaction found with invoice ID ${invoiceId}`);
        }
        
        // Convert the transaction data to invoice format
        const invoiceData: InvoiceData = {
          id: transaction.source_invoice_id || transaction.invoice_id,
          invoiceNumber: `INV-${transaction.transaction_id}`,
          customerId: transaction.target_company_id,
          salesOrderId: transaction.transaction_id,
          invoiceDate: transaction.transaction_date,
          dueDate: transaction.transaction_date, // Use same date as transaction
          total: parseFloat(transaction.amount),
          amountPaid: parseFloat(transaction.paid_amount || "0"),
          balanceDue: parseFloat(transaction.remaining_amount || transaction.amount),
          status: transaction.status,
          salesOrderNumber: `TX-${transaction.transaction_id}`,
          items: []
        };
        
        console.log("Created invoice data from transaction:", invoiceData);
        return invoiceData;
      } catch (error) {
        console.error(`Error fetching transaction with invoice ${invoiceId}:`, error);
        toast({
          title: "Error Loading Invoice",
          description: "Could not load invoice details. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    enabled: !!invoiceId && !!activeCompany
  });
  
  // Query for accounts
  const { data: accounts, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ["/api/accounts", activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return [];
      const res = await apiRequest("GET", `/api/accounts?companyId=${activeCompany.id}`);
      return await res.json();
    },
    enabled: !!activeCompany?.id
  });
  
  // Get bank/cash accounts for selection
  const bankAccounts = accounts ? accounts.filter((account: any) => 
    account.type === "bank" || account.type === "cash"
  ) : [];
  
  // Get receivable accounts for selection
  const receivableAccounts = accounts ? accounts.filter((account: any) => 
    account.type === "accounts_receivable"
  ) : [];
  
  // Query for the related intercompany transaction
  const { data: transactionData, isLoading: isLoadingTransaction } = useQuery({
    queryKey: ["/api/intercompany-receipt-eligible-transactions", activeCompany?.id, invoiceId],
    queryFn: async () => {
      if (!invoiceId || !activeCompany?.id) return null;
      
      try {
        const res = await apiRequest("GET", `/api/intercompany-receipt-eligible-transactions?companyId=${activeCompany.id}`);
        const transactions = await res.json();
        
        // Find the specific transaction that matches our invoice ID
        const matchingTransaction = transactions.find((tx: any) => 
          tx.source_invoice_id == invoiceId || tx.invoice_id == invoiceId
        );
        
        if (!matchingTransaction) {
          console.warn(`No transaction found with invoice ID ${invoiceId}`);
          return null;
        }
        
        return {
          id: matchingTransaction.transaction_id,
          sourceCompanyId: matchingTransaction.source_company_id,
          targetCompanyId: matchingTransaction.target_company_id,
          sourceInvoiceId: matchingTransaction.source_invoice_id || matchingTransaction.invoice_id,
          targetBillId: matchingTransaction.target_bill_id || matchingTransaction.bill_id,
          amount: matchingTransaction.amount,
          description: matchingTransaction.description
        };
      } catch (error) {
        console.error("Error fetching intercompany transaction:", error);
        return null;
      }
    },
    enabled: !!invoiceId && !!activeCompany?.id
  });

  // Use transaction data for bill information
  const { data: billData, isLoading: isLoadingBill } = useQuery({
    queryKey: ["/api/intercompany-receipt-eligible-transactions", "bill", transactionData?.targetBillId],
    queryFn: async () => {
      if (!transactionData?.targetBillId) return null;
      
      // For simplicity and due to API limitations, we'll construct a bill object from transaction data
      return {
        id: transactionData.targetBillId,
        billNumber: `BILL-${transactionData.targetBillId}`,
        vendorId: transactionData.sourceCompanyId,
        total: parseFloat(transactionData.amount?.toString() || "0"),
        balanceDue: parseFloat(transactionData.amount?.toString() || "0"),
        billDate: new Date().toISOString().split('T')[0],
        dueDate: new Date().toISOString().split('T')[0],
        status: "Processing"
      };
    },
    enabled: !!transactionData?.targetBillId
  });
  
  // Initialize the form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sourceCompanyId: activeCompany?.id || 0,
      targetCompanyId: 0,
      invoiceId: invoiceId || 0,
      billId: 0,
      paymentDate: new Date().toISOString().split('T')[0],
      amount: 0,
      paymentMethod: "bank_transfer",
      reference: "",
      isPartialPayment: false,
      notes: "",
      debitAccountId: 0,
      creditAccountId: 0
    }
  });
  
  // Update form values when data is loaded
  useEffect(() => {
    if (invoice && transactionData && billData && bankAccounts.length > 0 && receivableAccounts.length > 0) {
      const defaultDebitAccount = bankAccounts[0]?.id || 0;
      const defaultCreditAccount = receivableAccounts[0]?.id || 0;
      
      form.reset({
        sourceCompanyId: transactionData.sourceCompanyId || activeCompany?.id || 0,
        targetCompanyId: transactionData.targetCompanyId || 0,
        invoiceId: invoiceId || 0,
        billId: billData?.id || 0,
        paymentDate: new Date().toISOString().split('T')[0],
        amount: parseFloat(invoice.balanceDue.toString()) || 0,
        paymentMethod: "bank_transfer",
        reference: "",
        isPartialPayment: parseFloat(invoice.balanceDue.toString()) < parseFloat(invoice.total.toString()),
        notes: "",
        debitAccountId: defaultDebitAccount,
        creditAccountId: defaultCreditAccount
      });
    }
  }, [invoice, transactionData, billData, bankAccounts, receivableAccounts, form, invoiceId, activeCompany]);
  
  // Import the intercompany connector
  const { createIntercompanyReceipt } = useIntercompany();
  
  const onSubmit = async (data: FormValues) => {
    // Define result variable at the top level of function for proper scope in finally block
    let result: any = null;
    
    // Enhanced logging for form submission debugging
    console.log("RECEIPT FORM SUBMISSION - RAW FORM DATA:", data);
    console.log("RECEIPT CREATION - Normalized values:", {
      sourceCompanyId: data.sourceCompanyId,
      targetCompanyId: data.targetCompanyId,
      invoiceId: data.invoiceId,
      billId: data.billId,
      paymentMethod: data.paymentMethod,
      reference: data.reference || `Receipt-${new Date().getTime()}`,
      amount: parseFloat(data.amount.toString()),
      paymentDate: new Date(data.paymentDate).toISOString().split('T')[0], // format as YYYY-MM-DD
      isPartialPayment: !!data.isPartialPayment,
      notes: data.notes || 'Intercompany payment',
      debitAccountId: data.debitAccountId,
      creditAccountId: data.creditAccountId,
      createPurchaseReceipt: true // Always create in both companies
    });
    // Prevent multiple submissions
    if (isCreating) {
      console.log("Submission already in progress, ignoring duplicate request");
      return;
    }
    
    // Check if user is still authenticated before proceeding
    try {
      const authResponse = await fetch('/api/auth/me');
      if (!authResponse.ok) {
        console.error("User is not authenticated!");
        toast({
          title: "Authentication Required",
          description: "Your session has expired. Please log in again.",
          variant: "destructive",
        });
        
        // Redirect to login page with current page as redirect target
        setTimeout(() => {
          navigate(`/auth?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        }, 1500);
        return; // Exit early
      }
    } catch (authError) {
      console.error("Error checking authentication:", authError);
    }
    
    setIsCreating(true);
    
    try {
      console.log("Submitting intercompany receipt form with data:", JSON.stringify(data, null, 2));
      
      // Perform validation checks before submission
      if (!data.invoiceId) {
        throw new Error("Missing invoice ID");
      }
      
      if (!data.sourceCompanyId) {
        throw new Error("Missing source company ID");
      }
      
      if (!data.targetCompanyId) {
        throw new Error("Missing target company ID");
      }
      
      if (!data.amount || data.amount <= 0) {
        throw new Error("Amount must be greater than zero");
      }
      
      // Ensure we have the required account IDs for journal entries
      if (!data.debitAccountId) {
        throw new Error("Missing debit account ID (bank/cash account)");
      }
      
      if (!data.creditAccountId) {
        throw new Error("Missing credit account ID (receivable account)");
      }
      
      // Helper function to safely convert numeric values
      // Enhanced safeParseInt function with better error handling
      const safeParseInt = (value: any): number => {
        if (value === null || value === undefined || value === '') {
          console.warn('safeParseInt received empty value', { value });
          return 0;
        }
        
        if (typeof value === 'number') {
          if (isNaN(value)) {
            console.warn('safeParseInt received NaN number', { value });
            return 0;
          }
          return Math.floor(value);
        }
        
        try {
          // Clean input to ensure only valid characters for parsing
          const cleanedValue = String(value).replace(/[^0-9.-]/g, '');
          if (!cleanedValue) {
            console.warn('safeParseInt cleaned value is empty', { originalValue: value, cleanedValue });
            return 0;
          }
          
          const parsed = parseInt(cleanedValue, 10);
          if (isNaN(parsed)) {
            console.warn('safeParseInt parsed to NaN', { originalValue: value, cleanedValue });
            return 0;
          }
          
          return parsed;
        } catch (error) {
          console.error('safeParseInt unexpected error', { value, error });
          return 0;
        }
      };
      
      // Enhanced safeParseFloat function with better error handling
      const safeParseFloat = (value: any): number => {
        if (value === null || value === undefined || value === '') {
          console.warn('safeParseFloat received empty value', { value });
          return 0;
        }
        
        if (typeof value === 'number') {
          if (isNaN(value)) {
            console.warn('safeParseFloat received NaN number', { value });
            return 0;
          }
          // Ensure decimal precision without risk of floating point errors
          return Number(value.toFixed(2));
        }
        
        try {
          // Clean input to ensure only valid characters for parsing
          const cleanedValue = String(value).replace(/[^0-9.-]/g, '');
          if (!cleanedValue) {
            console.warn('safeParseFloat cleaned value is empty', { originalValue: value, cleanedValue });
            return 0;
          }
          
          const parsed = parseFloat(cleanedValue);
          if (isNaN(parsed)) {
            console.warn('safeParseFloat parsed to NaN', { originalValue: value, cleanedValue });
            return 0;
          }
          
          // Ensure decimal precision without risk of floating point errors
          return Number(parsed.toFixed(2));
        } catch (error) {
          console.error('safeParseFloat unexpected error', { value, error });
          return 0;
        }
      };
      
      // Use the intercompany connector instead of direct API call
      // This will handle creating the receipt in the source company 
      // and the payment in the target company with proper journal entries
      console.log("Preparing sanitized data for intercompany receipt...");
      
      // Create a sanitized version of the data with safe numeric conversions
      const sanitizedData = {
        sourceCompanyId: safeParseInt(data.sourceCompanyId),
        targetCompanyId: safeParseInt(data.targetCompanyId),
        invoiceId: safeParseInt(data.invoiceId),
        billId: safeParseInt(data.billId),
        amount: safeParseFloat(data.amount),
        paymentDate: data.paymentDate,
        paymentMethod: data.paymentMethod,
        reference: data.reference || '',
        isPartialPayment: Boolean(data.isPartialPayment),
        notes: data.notes || '',
        debitAccountId: safeParseInt(data.debitAccountId),
        creditAccountId: safeParseInt(data.creditAccountId),
        createPurchaseReceipt: Boolean(data.createPurchaseReceipt)
      };
      
      console.log("Calling createIntercompanyReceipt with sanitized data:", sanitizedData);
      
      // Final validation before submission
      if (!sanitizedData.sourceCompanyId || sanitizedData.sourceCompanyId <= 0) {
        throw new Error("Missing or invalid source company ID");
      }
      
      if (!sanitizedData.targetCompanyId || sanitizedData.targetCompanyId <= 0) {
        throw new Error("Missing or invalid target company ID");
      }
      
      if (!sanitizedData.invoiceId || sanitizedData.invoiceId <= 0) {
        throw new Error("Missing or invalid invoice ID");
      }
      
      if (!sanitizedData.billId || sanitizedData.billId <= 0) {
        throw new Error("Missing or invalid bill ID");
      }
      
      if (!sanitizedData.amount || sanitizedData.amount <= 0) {
        throw new Error("Amount must be greater than zero");
      }
      
      if (!sanitizedData.paymentDate) {
        throw new Error("Payment date is required");
      }
      
      if (!sanitizedData.paymentMethod) {
        throw new Error("Payment method is required");
      }
      
      // Add timeout handling to prevent hanging requests
      const timeoutDuration = 30000; // 30 seconds timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("The receipt creation request timed out. Please check the transactions page to see if it was created.")), timeoutDuration);
      });
      
      // Race between the actual request and the timeout
      result = await Promise.race([
        createIntercompanyReceipt(sanitizedData),
        timeoutPromise
      ]) as any;
      
      console.log("Receipt creation result:", result);
      
      // Check if there was an authentication error
      if (!result.success && result.authError) {
        console.error("Authentication error detected:", result.error);
        
        toast({
          title: "Authentication Required",
          description: "Your session has expired. Please log in again.",
          variant: "destructive",
        });
        
        // Redirect to login page with current page as redirect target
        setTimeout(() => {
          navigate(`/auth?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        }, 1500);
        return;
      }

      // Check for timeout errors from the connector
      if (!result.success && result.timeout) {
        console.warn("Timeout error detected in receipt creation");
        toast({
          title: "Operation Taking Longer Than Expected",
          description: "The receipt creation request is taking longer than expected. The receipt might still be processing. Please check the transactions page in a few minutes.",
          variant: "default", // We'd use warning if available
          duration: 8000, // Show for longer
        });
        
        // Navigate to transactions page after a delay
        setTimeout(() => {
          navigate('/intercompany-transactions');
        }, 3000);
        return;
      }
      
      // Check for network errors
      if (!result.success && result.networkError) {
        console.error("Network error detected in receipt creation");
        toast({
          title: "Network Error",
          description: "A connection error occurred while creating the receipt. Please check your internet connection and try again.",
          variant: "destructive",
        });
        return;
      }
      
      // Handle other errors
      if (!result.success) {
        console.error("Receipt creation failed:", result.error);
        throw new Error(result.error || "Failed to create intercompany receipt");
      }
      
      // Show explicit success message
      toast({
        title: "Success!",
        description: "Intercompany receipt created successfully.",
        variant: "default",
      });
      
      // Validate the response
      if (!result.sourceReceipt) {
        console.warn("Receipt created but missing sourceReceipt in response:", result);
      }
      
      // Invalidate queries to refresh the related data
      await queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/receipts"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/journal-entries"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/intercompany-transactions"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/sales-orders"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/dashboard/recent-transactions"] });
      
      // Invalidate specific resource queries for each affected item
      if (data.invoiceId) {
        queryClient.invalidateQueries({ queryKey: ["/api/invoices", data.invoiceId] });
      }
      if (data.billId) {
        queryClient.invalidateQueries({ queryKey: ["/api/bills", data.billId] });
      }
      
      // Display a detailed success message to the user
      const receiptNumber = result.sourceReceipt?.receiptNumber || 'Receipt';
      const paymentNumber = result.targetPayment?.paymentNumber || 'Payment';
      
      toast({
        title: "Receipt Created Successfully",
        description: `Receipt #${receiptNumber} and corresponding payment #${paymentNumber} have been created.`,
        duration: 6000, // Show for 6 seconds
      });
      
      // Navigate to transactions page after a delay
      // Keep isCreating true during navigation to prevent multiple submissions
      setTimeout(() => {
        navigate('/intercompany-transactions');
      }, 2000);
      
      // Different success message based on whether a target payment was created (for logging)
      const successMessage = data.createPurchaseReceipt && result.targetPayment
        ? `Intercompany receipt and corresponding payment created successfully`
        : `Intercompany receipt created successfully`;
        
      // Success is already shown above, and navigation is handled with setTimeout
      console.log(successMessage);
    } catch (error: any) {
      // Log the error
      console.error("Receipt creation error:", error);
      
      // Always reset the submission state first
      setIsCreating(false);
      
      // Provide more detailed error message based on the context
      let errorMessage = error.message || "An error occurred while processing the receipt";
      let errorTitle = "Error Creating Receipt";
      
      // Enhanced error categorization with more specific details
      if (error.message) {
        const msg = error.message.toLowerCase();
        
        // Authentication errors
        if (msg.includes("unauthorized") || msg.includes("auth") || error.authError) {
          errorTitle = "Authentication Required";
          errorMessage = "Your session has expired. Please log in again.";
          
          // Redirect to login page with current page as redirect target
          setTimeout(() => {
            navigate(`/auth?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
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
          errorMessage = "The receipt might still be processing. Please check the transactions page in a few minutes.";
          
          toast({
            title: errorTitle,
            description: errorMessage,
            variant: "default", // We'd prefer to use warning but it's not defined in the variant type
          });
          return;
        }
        
        // Handle validation errors more explicitly
        if (msg.includes("missing") || msg.includes("invalid")) {
          errorTitle = "Validation Error";
          // Keep original error message for validation errors
        }
        
        // Handle connection errors
        if (msg.includes("network") || msg.includes("connection") || msg.includes("fetch")) {
          errorTitle = "Connection Error";
          errorMessage = "Unable to connect to the server. Please check your internet connection and try again.";
        }
      }
      
      // Show the error toast with the determined title and message
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
        duration: 5000, // Show for 5 seconds
      });
    } finally {
      // In case of success, isCreating will stay true during navigation
      // In case of error, we've already set it to false above
      // This is just a safety fallback
      if (!result?.success) {
        setIsCreating(false);
      }
    }
  };
  
  const isLoading = isLoadingInvoice || isLoadingAccounts;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading receipt details...</span>
      </div>
    );
  }
  
  if (!invoice) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Create Intercompany Receipt</CardTitle>
          <CardDescription>No invoice found</CardDescription>
        </CardHeader>
        <CardContent>
          <p>The specified invoice could not be found.</p>
        </CardContent>
        <CardFooter>
          <Button variant="outline" onClick={() => navigate("/intercompany-transactions")}>
            Go Back
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Create Intercompany Receipt</h1>
        <Button variant="outline" onClick={() => navigate("/intercompany-transactions")}>
          Cancel
        </Button>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
          <CardDescription>
            Creating receipt for intercompany invoice
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Invoice Information</h3>
              <p>Invoice Number: {invoice.invoiceNumber}</p>
              <p>Invoice Date: {new Date(invoice.invoiceDate).toLocaleDateString()}</p>
              <p>Due Date: {new Date(invoice.dueDate).toLocaleDateString()}</p>
              <p>Total Amount: {formatCurrency(invoice.total)}</p>
              <p>Amount Paid: {formatCurrency(invoice.amountPaid || 0)}</p>
              <p>Balance Due: {formatCurrency(invoice.balanceDue || invoice.total)}</p>
              <p>Status: {invoice.status}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Sales Order Information</h3>
              <p>Order Reference: {invoice.salesOrderNumber || '---'}</p>
              {invoice.items && invoice.items.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-sm mb-2">Invoice Items</h4>
                  <div className="text-xs grid grid-cols-5 gap-2 font-medium bg-muted p-2 rounded">
                    <div>Product</div>
                    <div className="text-right">Order Qty</div>
                    <div className="text-right">Invoiced Qty</div>
                    <div className="text-right">Paid Qty</div>
                    <div className="text-right">Status</div>
                  </div>
                  {invoice.items.map((item: any, idx: number) => {
                    const orderQty = parseFloat(item.orderQuantity || item.quantity);
                    const invoiceQty = parseFloat(item.quantity);
                    const paidQty = parseFloat(item.paidQuantity || '0');
                    const remainingQty = invoiceQty - paidQty;
                    const fullyPaid = item.fullyPaid || (remainingQty === 0);
                    
                    return (
                      <div key={idx} 
                           className={`text-xs grid grid-cols-5 gap-2 py-2 border-b border-gray-100 ${fullyPaid ? 'bg-gray-50' : ''}`}
                      >
                        <div>{item.productName || `Product #${item.productId}`}</div>
                        <div className="text-right">{orderQty}</div>
                        <div className="text-right">{invoiceQty}</div>
                        <div className="text-right">{paidQty}</div>
                        <div className="text-right font-medium">
                          {remainingQty > 0 ? (
                            <span className="text-amber-600">{remainingQty} remaining</span>
                          ) : (
                            <span className="text-green-600">Fully paid</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Receipt Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="paymentDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                          <SelectItem value="check">Check</SelectItem>
                          <SelectItem value="credit_card">Credit Card</SelectItem>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference Number</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter reference number (e.g., check #, transaction ID)"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Receipt Amount</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          min="0.01"
                          max={parseFloat(invoice.balanceDue.toString()) || parseFloat(invoice.total.toString())}
                          {...field}
                          onChange={(e) => {
                            const newValue = parseFloat(e.target.value);
                            field.onChange(newValue);
                            
                            // Auto-set partial payment flag based on amount
                            const balanceDue = parseFloat(invoice.balanceDue.toString());
                            if (newValue < balanceDue) {
                              // If amount is less than balance due, it's partial
                              form.setValue("isPartialPayment", true);
                            } else {
                              // If amount equals balance due, it's full
                              form.setValue("isPartialPayment", false);
                            }
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        {form.watch("isPartialPayment") 
                          ? "Partial payment - some items will remain unpaid" 
                          : "Full payment - all items will be marked as paid"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Hidden fields for hardcoded accounts */}
                <input 
                  type="hidden" 
                  {...form.register("debitAccountId", { 
                    value: accounts?.find((acc: any) => acc.code === "1000")?.id || 1 
                  })}
                />
                <input 
                  type="hidden" 
                  {...form.register("creditAccountId", { 
                    value: accounts?.find((acc: any) => acc.code === "1100")?.id || 2
                  })}
                />
                
                <div className="p-4 mb-4 bg-muted/30 rounded-md border">
                  <h3 className="text-md font-medium mb-2">Default Accounts (Automatically Selected)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Debit Account:</p>
                      <p className="text-sm">1000 - Cash</p>
                      <p className="text-xs text-muted-foreground mt-1">This account will increase when payment is received</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Credit Account:</p>
                      <p className="text-sm">1100 - Accounts Receivable</p>
                      <p className="text-xs text-muted-foreground mt-1">This account will decrease when receivable is paid off</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <FormField
                control={form.control}
                name="isPartialPayment"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 mb-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Partial Payment</FormLabel>
                      <FormDescription>
                        Mark this as a partial payment if you're not paying the full amount
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="createPurchaseReceipt"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 mb-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Create Target Payment</FormLabel>
                      <FormDescription>
                        Automatically create corresponding payment in target company
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
                
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Add notes about this receipt"
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
          
          <div className="flex justify-end gap-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate("/intercompany-transactions")}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Receipt...
                </>
              ) : (
                'Create Receipt'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}