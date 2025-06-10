import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useCompany } from "./use-company";
import { useToast } from "./use-toast";
import { useAuth } from "./use-auth";
import { createIntercompanyReceipt, createIntercompanyInvoice, createIntercompanyPayment } from "@/lib/intercompany-connector";

export type IntercompanyTransaction = {
  id: number;
  sourceCompanyId: number;
  targetCompanyId: number;
  description: string;
  amount: string;
  transactionDate: string;
  sourceJournalEntryId: number | null;
  targetJournalEntryId: number | null;
  status: string;
  sourceCompany: { name: string };
  targetCompany: { name: string };
  sourceOrderId?: number;
  targetOrderId?: number;
  sourceInvoiceId?: number;
  targetBillId?: number;
  sourceReceiptId?: number;
  targetPaymentId?: number;
  sourceDeliveryId?: number;
  targetGoodsReceiptId?: number;
  hasInvoice?: boolean;
  hasPayment?: boolean;
  hasDelivery?: boolean;
  hasGoodsReceipt?: boolean;
  isPartialInvoice?: boolean;
  invoices?: { id: number, status: string }[];
  bills?: { id: number, status: string }[];
};

type TransactionFormData = {
  sourceCompanyId: number;
  targetCompanyId: number;
  description: string;
  amount: string | number;
  transactionDate: Date;
};

// Use a generic type parameter with default to IntercompanyTransaction[]
export function useIntercompany<T = IntercompanyTransaction[]>() {
  const { toast } = useToast();
  const { activeCompany } = useCompany();
  const { user } = useAuth();
  
  // Functions from intercompany-connector are imported at the top of the file

  // Query for intercompany transactions
  const { data: transactions, isLoading, error, refetch } = useQuery<IntercompanyTransaction[]>({
    queryKey: ['/api/intercompany-transactions', activeCompany?.id],
    queryFn: async () => {
      // Include company ID in query parameters to ensure it doesn't depend on session state
      if (!activeCompany?.id) throw new Error("No active company");
      const res = await apiRequest(
        'GET', 
        `/api/intercompany-transactions?companyId=${activeCompany.id}`
      );
      return await res.json();
    },
    enabled: !!activeCompany && !!user,
    retry: 1,
    staleTime: 5000, // Consider data stale after 5 seconds to force refresh
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: true, // Refetch when component mounts
    onError: (err: any) => {
      // If we get an unauthorized error, don't show a toast since the auth system will handle it
      if (err.status !== 401) {
        toast({
          title: "Error loading transactions",
          description: "There was a problem loading intercompany transactions",
          variant: "destructive"
        });
      }
    }
  });

  // Create intercompany transaction mutation
  const createMutation = useMutation({
    mutationFn: async (data: TransactionFormData) => {
      return apiRequest(
        'POST',
        '/api/intercompany-transactions',
        data
      );
    },
    onSuccess: () => {
      toast({
        title: "Transaction created",
        description: "The intercompany transaction was created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/intercompany-transactions'] });
      return refetch();
    },
    onError: (error: any) => {
      // Check if it's a validation error with details
      if (error.details?.errors?.details) {
        const errorDetails = error.details.errors.details;
        const errorMessages = errorDetails.map((err: any) => 
          `${err.path.join('.')}: ${err.message}`
        ).join('\n');
        
        toast({
          title: "Validation Error",
          description: errorMessages,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to create transaction",
          variant: "destructive",
        });
      }
    },
  });

  // Update transaction status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      // Include company ID in the request body to avoid relying on session
      return apiRequest(
        'PATCH',
        `/api/intercompany-transactions/${id}/status?companyId=${activeCompany?.id}`,
        { 
          status,
          companyId: activeCompany?.id 
        }
      );
    },
    onSuccess: () => {
      toast({
        title: "Transaction updated",
        description: "The transaction status was updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/intercompany-transactions'] });
      return refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update transaction",
        variant: "destructive",
      });
    },
  });

  // Function to fetch transaction by order ID directly from the server
  // This is more reliable as it includes all transactions the server knows about
  const fetchTransactionByOrderId = async (orderId: number | string): Promise<IntercompanyTransaction | null> => {
    if (!orderId) {
      console.warn('Cannot fetch transaction: No order ID provided');
      return null;
    }
    
    // Ensure we have an active company and user
    if (!activeCompany) {
      console.warn('Cannot fetch transaction: No active company selected');
      return null;
    }
    
    try {
      console.log(`Fetching transaction by order ID ${orderId} from server for company ID ${activeCompany.id}...`);
      
      // Try to ensure we are authenticated before making the request
      if (!user) {
        // Try to refresh auth status
        console.log('User not authenticated, attempting to refresh auth status...');
        try {
          const authResponse = await apiRequest('GET', '/api/auth/me');
          if (!authResponse.ok) {
            console.warn('Authentication failed. User needs to log in.');
            return null;
          }
        } catch (authError) {
          console.error('Authentication error:', authError);
          return null;
        }
      }
      
      // Make the API request with verbose logging
      // Include the company ID in the query parameters to ensure it doesn't depend on session state
      console.log(`Making API request to /api/intercompany-transactions/by-order/${orderId}?companyId=${activeCompany.id}`);
      
      // Special logging for the problematic mantest2505 case
      if (String(orderId).includes('mantest2505')) {
        console.log("SPECIAL CASE LOOKUP: Looking for mantest2505 order ID in server API call");
      }
      const response = await apiRequest(
        'GET', 
        `/api/intercompany-transactions/by-order/${orderId}?companyId=${activeCompany.id}`
      );
      
      // Check if response is OK
      if (!response.ok) {
        if (response.status === 401) {
          console.warn('Authentication error while fetching transaction. User needs to log in again.');
          
          // Access the useLocation hook from the React component that's calling this method
          toast({
            title: "Authentication Required",
            description: "Your session has expired. Please log in again.",
            variant: "destructive",
          });
          
          // Return a special error object that the component can check for
          return { authError: true } as any;
        }
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const transactions = await response.json();
      console.log(`Server response for order ID ${orderId}:`, transactions);
      
      // Additional debug for the mantest2505 case - log the actual response data
      if (String(orderId).includes('mantest2505')) {
        console.log("SPECIAL CASE RESPONSE DATA:", JSON.stringify(transactions, null, 2));
      }
      
      if (transactions && Array.isArray(transactions) && transactions.length > 0) {
        console.log(`Server found ${transactions.length} transaction(s) for order ID ${orderId}:`, 
          transactions.map(t => ({id: t.id, sourceOrderId: t.sourceOrderId, targetOrderId: t.targetOrderId}))
        );
        return transactions[0]; // Return the first matching transaction
      } else {
        console.log(`Server found no transactions for order ID ${orderId}`);
        // Try creating a transaction if none exists and we have the sales order data
        return null;
      }
    } catch (error) {
      console.error(`Error fetching transaction by order ID ${orderId}:`, error);
      // Don't show toast for 401 errors as they'll be handled by the auth system
      if (error instanceof Error && !error.message.includes('401')) {
        toast({
          title: "Error checking for transactions",
          description: "Failed to check for matching transactions on the server",
          variant: "destructive"
        });
      }
      return null;
    }
  };

  // Helper function to find transaction by sales order ID
  const findTransactionBySalesOrderId = (salesOrderId: number | string | null): IntercompanyTransaction | undefined => {
    if (!transactions || !salesOrderId) return undefined;
    
    console.log("Searching for transaction with order ID:", salesOrderId);
    
    // Special debugging for mantest2505 order IDs
    if (String(salesOrderId).includes('mantest2505')) {
      console.log("SEARCH DEBUG: Looking for mantest2505 order ID in client-side cache");
    }
    
    console.log("Available transactions:", transactions.map(tx => ({
      id: tx.id,
      sourceOrderId: tx.sourceOrderId,
      targetOrderId: tx.targetOrderId
    })));
    
    // Try multiple matching strategies
    const orderIdStr = String(salesOrderId);
    const orderIdNum = Number(salesOrderId);
    
    for (const tx of transactions) {
      // Convert transaction order IDs to both number and string for comparison
      const sourceOrderIdNum = tx.sourceOrderId ? Number(tx.sourceOrderId) : NaN;
      const targetOrderIdNum = tx.targetOrderId ? Number(tx.targetOrderId) : NaN;
      const sourceOrderIdStr = tx.sourceOrderId !== undefined ? String(tx.sourceOrderId) : '';
      const targetOrderIdStr = tx.targetOrderId !== undefined ? String(tx.targetOrderId) : '';
      
      // Try numeric match if both are valid numbers
      if (!isNaN(orderIdNum)) {
        if (sourceOrderIdNum === orderIdNum) {
          console.log("Found numeric match on sourceOrderId:", tx.id);
          return tx;
        }
        if (targetOrderIdNum === orderIdNum) {
          console.log("Found numeric match on targetOrderId:", tx.id);
          return tx;
        }
      }
      
      // Try string match - include partial matches for order ID format
      if (sourceOrderIdStr !== '' && (
          sourceOrderIdStr === orderIdStr || 
          sourceOrderIdStr.includes(orderIdStr) || 
          orderIdStr.includes(sourceOrderIdStr)
        )) {
        console.log("Found string match on sourceOrderId:", tx.id);
        
        // Special logging for mantest2505 case
        if (orderIdStr.includes('mantest2505')) {
          console.log(`DETAILED MATCH for mantest2505 in sourceOrderId:
            Transaction ID: ${tx.id}
            Order ID string: ${orderIdStr}
            Source Order ID: ${sourceOrderIdStr}
            Match type: ${sourceOrderIdStr === orderIdStr ? 'exact' : 
                         sourceOrderIdStr.includes(orderIdStr) ? 'source includes order' : 'order includes source'}
          `);
        }
        
        return tx;
      }
      if (targetOrderIdStr !== '' && (
          targetOrderIdStr === orderIdStr || 
          targetOrderIdStr.includes(orderIdStr) || 
          orderIdStr.includes(targetOrderIdStr)
        )) {
        console.log("Found string match on targetOrderId:", tx.id);
        
        // Special logging for mantest2505 case
        if (orderIdStr.includes('mantest2505')) {
          console.log(`DETAILED MATCH for mantest2505 in targetOrderId:
            Transaction ID: ${tx.id}
            Order ID string: ${orderIdStr}
            Target Order ID: ${targetOrderIdStr}
            Match type: ${targetOrderIdStr === orderIdStr ? 'exact' : 
                         targetOrderIdStr.includes(orderIdStr) ? 'target includes order' : 'order includes target'}
          `);
        }
        
        return tx;
      }
    }
    
    console.log("No match found for order ID:", salesOrderId);
    return undefined;
  };

  // Helper function to find transaction by purchase order ID
  const findTransactionByPurchaseOrderId = (purchaseOrderId: number | string | null): IntercompanyTransaction | undefined => {
    if (!transactions || !purchaseOrderId) return undefined;
    
    console.log("Searching for transaction with purchase order ID:", purchaseOrderId);
    
    // Try multiple matching strategies
    const orderIdStr = String(purchaseOrderId);
    const orderIdNum = Number(purchaseOrderId);
    
    for (const tx of transactions) {
      // Convert transaction order IDs to both number and string for comparison
      const sourceOrderIdNum = tx.sourceOrderId ? Number(tx.sourceOrderId) : NaN;
      const targetOrderIdNum = tx.targetOrderId ? Number(tx.targetOrderId) : NaN;
      const sourceOrderIdStr = tx.sourceOrderId !== undefined ? String(tx.sourceOrderId) : '';
      const targetOrderIdStr = tx.targetOrderId !== undefined ? String(tx.targetOrderId) : '';
      
      // Try numeric match if both are valid numbers
      if (!isNaN(orderIdNum)) {
        // For purchase orders, we primarily look at targetOrderId but check sourceOrderId as fallback
        if (targetOrderIdNum === orderIdNum) {
          console.log("Found numeric match on targetOrderId:", tx.id);
          return tx;
        }
        if (sourceOrderIdNum === orderIdNum) {
          console.log("Found numeric match on sourceOrderId (fallback):", tx.id);
          return tx;
        }
      }
      
      // Try string match
      if (targetOrderIdStr !== '' && (
          targetOrderIdStr === orderIdStr || 
          targetOrderIdStr.includes(orderIdStr) || 
          orderIdStr.includes(targetOrderIdStr)
        )) {
        console.log("Found string match on targetOrderId:", tx.id);
        return tx;
      }
      if (sourceOrderIdStr !== '' && (
          sourceOrderIdStr === orderIdStr || 
          sourceOrderIdStr.includes(orderIdStr) || 
          orderIdStr.includes(sourceOrderIdStr)
        )) {
        console.log("Found string match on sourceOrderId (fallback):", tx.id);
        return tx;
      }
    }
    
    console.log("No match found for purchase order ID:", purchaseOrderId);
    return undefined;
  };

  // Helper function to find transaction by invoice ID - both local and server search
  const findTransactionByInvoiceId = async (invoiceId: number | string | null): Promise<IntercompanyTransaction | null> => {
    if (!invoiceId) return null;
    
    console.log(`Finding transaction for invoice ID: ${invoiceId}`);
    
    try {
      // First try to find the transaction in the local cache
      if (transactions) {
        console.log(`Searching local cache for transaction with invoice ID:`, invoiceId);
        
        // Try multiple matching strategies
        const idStr = String(invoiceId);
        const idNum = Number(invoiceId);
        
        // Log all available transactions to help debugging
        console.log(`Available transactions:`, 
          transactions.map(tx => ({id: tx.id, sourceInvoiceId: tx.sourceInvoiceId, targetBillId: tx.targetBillId}))
        );
        
        for (const tx of transactions) {
          // Convert invoice IDs to both number and string for comparison
          const sourceInvoiceIdNum = tx.sourceInvoiceId ? Number(tx.sourceInvoiceId) : NaN;
          const sourceInvoiceIdStr = tx.sourceInvoiceId !== undefined ? String(tx.sourceInvoiceId) : '';
          
          // Try numeric match if both are valid numbers
          if (!isNaN(idNum) && !isNaN(sourceInvoiceIdNum) && sourceInvoiceIdNum === idNum) {
            console.log("Found numeric match on sourceInvoiceId:", tx.id);
            return tx;
          }
          
          // Try string match
          if (sourceInvoiceIdStr === idStr) {
            console.log("Found string match on sourceInvoiceId:", tx.id);
            return tx;
          }
          
          // Check invoices array if it exists
          if (tx.invoices && Array.isArray(tx.invoices)) {
            const invoiceMatch = tx.invoices.some(inv => {
              if (!inv) return false;
              const invIdNum = Number(inv.id);
              return (!isNaN(idNum) && !isNaN(invIdNum) && invIdNum === idNum) || 
                    String(inv.id) === idStr;
            });
            
            if (invoiceMatch) {
              console.log("Found match in invoices array:", tx.id);
              return tx;
            }
          }
        }
        
        console.log("No match found in local cache for invoice ID:", invoiceId);
      }
      
      // If not found in cache, make API request
      console.log(`Making API request to /api/intercompany-transactions/by-invoice/${invoiceId}`);
      const response = await apiRequest('GET', `/api/intercompany-transactions/by-invoice/${invoiceId}`);
      
      // Check if response is OK
      if (!response.ok) {
        if (response.status === 401) {
          console.warn('Authentication error while fetching transaction. User needs to log in again.');
          
          toast({
            title: "Authentication Required",
            description: "Your session has expired. Please log in again.",
            variant: "destructive",
          });
          
          return { authError: true } as any;
        }
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const transaction = await response.json();
      console.log(`Server response for invoice ID ${invoiceId}:`, transaction);
      
      if (transaction && transaction.id) {
        return transaction;
      } else {
        console.log(`Server found no transaction for invoice ID ${invoiceId}`);
        return null;
      }
    } catch (error) {
      console.error(`Error fetching transaction by invoice ID ${invoiceId}:`, error);
      
      // Don't show toast for 401 errors as they'll be handled by the auth system
      if (error instanceof Error && !error.message.includes('401')) {
        toast({
          title: "Error checking for transaction",
          description: "Failed to check for matching transaction on the server",
          variant: "destructive"
        });
      }
      return null;
    }
  };

  // Helper function to find transaction by bill ID
  const findTransactionByBillId = (billId: number | string | null): IntercompanyTransaction | undefined => {
    if (!transactions || !billId) return undefined;
    
    console.log("Searching for transaction with bill ID:", billId);
    
    // Try multiple matching strategies
    const idStr = String(billId);
    const idNum = Number(billId);
    
    for (const tx of transactions) {
      // Convert bill IDs to both number and string for comparison
      const targetBillIdNum = tx.targetBillId ? Number(tx.targetBillId) : NaN;
      const targetBillIdStr = tx.targetBillId !== undefined ? String(tx.targetBillId) : '';
      
      // Try numeric match if both are valid numbers
      if (!isNaN(idNum) && !isNaN(targetBillIdNum) && targetBillIdNum === idNum) {
        console.log("Found numeric match on targetBillId:", tx.id);
        return tx;
      }
      
      // Try string match
      if (targetBillIdStr === idStr) {
        console.log("Found string match on targetBillId:", tx.id);
        return tx;
      }
      
      // Check bills array if it exists
      if (tx.bills && Array.isArray(tx.bills)) {
        const billMatch = tx.bills.some(bill => {
          if (!bill) return false;
          const billIdNum = Number(bill.id);
          return (!isNaN(idNum) && !isNaN(billIdNum) && billIdNum === idNum) || 
                 String(bill.id) === idStr;
        });
        
        if (billMatch) {
          console.log("Found match in bills array:", tx.id);
          return tx;
        }
      }
    }
    
    console.log("No match found for bill ID:", billId);
    return undefined;
  };

  const createTransaction = (data: TransactionFormData) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to create transactions",
        variant: "destructive"
      });
      return;
    }
    
    // Ensure active company ID is included in the request
    // This makes the transaction creation more resilient to session issues
    const dataWithCompanyId = {
      ...data,
      companyId: activeCompany?.id
    };
    
    return createMutation.mutate(dataWithCompanyId);
  };

  const updateTransactionStatus = (id: number, status: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to update transaction status",
        variant: "destructive"
      });
      return;
    }
    return updateStatusMutation.mutate({ id, status });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Function that needs to be implemented for receipt creation
  const createIntercompanyReceipt = async (data: any) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to create receipts",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const response = await apiRequest('POST', '/api/intercompany-receipts', data);
      if (!response.ok) {
        throw new Error(`Failed to create receipt: ${response.statusText}`);
      }
      
      toast({
        title: "Receipt created",
        description: "Intercompany receipt created successfully"
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/intercompany-transactions'] });
      return await response.json();
    } catch (error) {
      console.error("Error creating intercompany receipt:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create receipt",
        variant: "destructive"
      });
      throw error;
    }
  };



  return {
    transactions,
    isLoading,
    createTransaction,
    updateTransactionStatus,
    createMutation,
    updateStatusMutation,
    getStatusColor,
    findTransactionBySalesOrderId,
    findTransactionByPurchaseOrderId,
    findTransactionByInvoiceId,
    findTransactionByBillId,
    fetchTransactionByOrderId,
    createIntercompanyReceipt
  };
}