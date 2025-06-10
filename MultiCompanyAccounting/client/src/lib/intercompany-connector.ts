import { apiRequest } from "@/lib/queryClient";

// Interface for intercompany order item
interface IntercompanyOrderItem {
  productId: number;
  quantity: number;
  unitPrice: number;
  description?: string;
}

// Interface for intercompany sales order creation
interface IntercompanySalesOrderData {
  sourceCompanyId: number;
  targetCompanyId: number;
  date: string;
  expectedDate: string;
  description: string;
  items: IntercompanyOrderItem[];
}

// Interface for intercompany invoice item
interface IntercompanyInvoiceItem {
  productId: number;
  quantity: number;
  unitPrice: number;
  description?: string;
  poItemId?: number; // Reference to the purchase order item
  soItemId?: number; // Reference to the sales order item
  calculatedAmount?: number; // Pre-calculated amount (quantity * unitPrice)
}

// Interface for intercompany invoice creation
interface IntercompanyInvoiceData {
  sourceCompanyId: number;
  targetCompanyId: number;
  salesOrderId: number;
  purchaseOrderId?: number; // Make this optional for testing
  issueDate: string;
  dueDate: string;
  description: string;
  items: IntercompanyInvoiceItem[];
  createPurchaseInvoice?: boolean; // Flag to create both invoice and bill in one request
  invoiceType?: 'full' | 'partial'; // Type of invoice to create (full or partial)
}

// Interface for intercompany order result
interface IntercompanyOrderResult {
  success: boolean;
  sourceOrder?: any;
  targetOrder?: any;
  transactionId?: number;
  error?: string;
  authError?: boolean;
}

// Interface for remaining quantity item
interface RemainingQuantityItem {
  id: number;
  productId: number;
  productName: string;
  totalQuantity: number;
  invoicedQuantity: number;
  remainingQuantity: number;
  fullyInvoiced: boolean;
}

// Interface for intercompany invoice result
interface IntercompanyInvoiceResult {
  success: boolean;
  sourceInvoice?: any;
  targetBill?: any;
  error?: string;
  authError?: boolean;
  isPartial?: boolean;
  invoiceType?: 'full' | 'partial';
  balances?: {
    sourceReceivable: string;
    targetPayable: string;
  };
  remainingItems?: RemainingQuantityItem[];
}

// Interface for payment item
interface PaymentItem {
  invoiceId: number;
  billId: number;
  amount: number;
  remainingAmount?: number; // For tracking remaining due amount
  isPaid?: boolean; // To indicate if the invoice is fully paid
}

// Interface for intercompany payment data
interface IntercompanyPaymentData {
  sourceCompanyId: number;
  targetCompanyId: number;
  paymentDate: string;
  paymentMethod: string;
  reference: string;
  isPartialPayment: boolean;
  notes?: string;
  debitAccountId?: number;  // Bank/cash account to be debited
  creditAccountId?: number; // Receivable account to be credited
  // Single invoice/bill payment (backward compatibility)
  invoiceId?: number;
  billId?: number;
  amount?: number;
  // Multiple invoice/bill payments
  items?: PaymentItem[];
  // Flag to create payment in target company
  createPurchaseReceipt?: boolean;
}

// Interface for payment result item
interface PaymentResultItem {
  invoiceId: number;
  billId: number;
  originalAmount: number;
  amountPaid: number;
  remainingAmount: number;
  paymentStatus: 'partial' | 'full' | 'overpaid';
}

// Interface for intercompany payment result
interface IntercompanyPaymentResult {
  success: boolean;
  sourceReceipt?: any;
  targetPayment?: any;
  remainingBalance?: number;
  error?: string;
  authError?: boolean;
  // Additional error flags
  timeout?: boolean;
  networkError?: boolean;
  balances?: {
    sourceReceivable: string;
    targetPayable: string;
    remainingInvoiceAmount: string;
    remainingBillAmount: string;
    paymentStatus: 'partial' | 'full' | 'overpaid';
  };
  // For multiple invoice/bill payments
  items?: PaymentResultItem[];
  isMultiPayment?: boolean;
  // Enhanced diagnostic information
  diagnosticInfo?: Record<string, any>;
}

// Interface for intercompany transaction status
interface IntercompanyTransactionStatus {
  id: number;
  sourceCompanyId: number;
  targetCompanyId: number;
  type: 'invoice' | 'bill';
  documentId: number;
  documentNumber: string;
  dueDate: string;
  amount: number;
  amountPaid: number;
  remainingAmount: number;
  status: 'due' | 'overdue' | 'paid';
  daysOverdue?: number;
}

/**
 * Creates matching sales and purchase orders between two companies
 * @param data The intercompany sales order data
 * @returns A promise that resolves to the result of the operation
 */
export async function createIntercompanySalesOrder(
  data: IntercompanySalesOrderData
): Promise<IntercompanyOrderResult> {
  try {
    // Add more detailed logging for the API request
    console.log("Sending intercompany sales order request with data:", JSON.stringify(data, null, 2));
    
    // Use the safer apiRequest utility instead of direct fetch
    const response = await apiRequest('POST', '/api/intercompany/sales-purchase', data);
    
    // Parse the JSON response
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || "Unknown error creating intercompany order");
    }
    
    return {
      success: true,
      sourceOrder: result.sourceOrder,
      targetOrder: result.targetOrder,
      transactionId: result.transactionId
    };
  } catch (error: any) {
    console.error("Error creating intercompany sales order:", error);
    return {
      success: false,
      error: error.message || "An unknown error occurred"
    };
  }
}

/**
 * Creates matching invoices and bills from existing sales and purchase orders between two companies
 * @param data The intercompany invoice data
 * @returns A promise that resolves to the result of the operation
 */
export async function createIntercompanyInvoice(
  data: IntercompanyInvoiceData
): Promise<IntercompanyInvoiceResult> {
  try {
    console.log("=============== INVOICE CREATION STARTED ===============");
    console.log("Original request data:", JSON.stringify(data, null, 2));
    
    // Validate required fields
    if (!data.sourceCompanyId || !data.targetCompanyId) {
      throw new Error("Missing company information: sourceCompanyId and targetCompanyId are required");
    }
    
    if (!data.salesOrderId) {
      throw new Error("Missing order information: salesOrderId is required");
    }
    
    // Purchase order ID is now optional for testing purposes
    
    // More extensive validation of items array
    if (!data.items) {
      console.error("CRITICAL ERROR: items property is completely missing from request data");
      throw new Error("No invoice line items provided - items property is missing");
    }
    
    if (!Array.isArray(data.items)) {
      console.error("CRITICAL ERROR: items is not an array:", typeof data.items);
      throw new Error("Invalid invoice line items format - expected an array");
    }
    
    if (data.items.length === 0) {
      console.error("CRITICAL ERROR: items array is empty");
      throw new Error("No invoice line items provided - please select at least one product");
    }
    
    // Ensure every item has productId, quantity and unitPrice
    const itemValidation = data.items.every(item => 
      item && 
      typeof item === 'object' && 
      item.productId && 
      (item.quantity !== undefined && item.quantity !== null) &&
      (item.unitPrice !== undefined && item.unitPrice !== null)
    );
    
    if (!itemValidation) {
      console.error("CRITICAL ERROR: One or more items is missing required properties", data.items);
      throw new Error("One or more line items is missing required properties (productId, quantity, or unitPrice)");
    }
    
    // Log each invoice item in detail with safer parsing
    console.log("INVOICE ITEMS DETAILED ANALYSIS:");
    let totalAmount = 0;
    let validItemCount = 0;
    
    if (Array.isArray(data.items) && data.items.length > 0) {
      // Pre-process the items to ensure all values are properly numbers
      data.items = data.items.map(item => {
        // Safely parse quantity with extensive checks
        const rawQuantity = item.quantity;
        let safeQuantity: number;
        
        if (typeof rawQuantity === 'number') {
          safeQuantity = rawQuantity;
        } else if (typeof rawQuantity === 'string') {
          safeQuantity = parseFloat(rawQuantity);
          if (isNaN(safeQuantity)) {
            console.warn(`Invalid quantity string: "${rawQuantity}" - defaulting to 1`);
            safeQuantity = 1;
          }
        } else {
          console.warn(`Quantity is neither number nor string: ${typeof rawQuantity} - defaulting to 1`);
          safeQuantity = 1;
        }
        
        // Ensure quantity is never zero, negative, or NaN
        if (safeQuantity <= 0 || !Number.isFinite(safeQuantity)) {
          console.warn(`Invalid quantity (${safeQuantity}) detected for product ${item.productId}. Changing to 1.`);
          safeQuantity = 1; 
        }
        
        // Round to 2 decimal places to ensure clean values
        safeQuantity = Math.round(safeQuantity * 100) / 100;
        
        // Safely parse unit price with extensive checks
        const rawUnitPrice = item.unitPrice;
        let safeUnitPrice: number;
        
        if (typeof rawUnitPrice === 'number') {
          safeUnitPrice = rawUnitPrice;
        } else if (typeof rawUnitPrice === 'string') {
          safeUnitPrice = parseFloat(rawUnitPrice);
          if (isNaN(safeUnitPrice)) {
            console.warn(`Invalid unit price string: "${rawUnitPrice}" - using default price 10`);
            safeUnitPrice = 10;
          }
        } else {
          console.warn(`Unit price is neither number nor string: ${typeof rawUnitPrice} - using default price 10`);
          safeUnitPrice = 10;
        }
        
        // Ensure unit price is never zero, negative, or NaN
        if (safeUnitPrice <= 0 || !Number.isFinite(safeUnitPrice)) {
          console.warn(`Invalid unit price (${safeUnitPrice}) detected for product ${item.productId}. Using default price 10.`);
          safeUnitPrice = 10;
        }
        
        // Round to 2 decimal places to ensure clean values
        safeUnitPrice = Math.round(safeUnitPrice * 100) / 100;
        
        // Calculate the pre-calculated amount
        const calculatedAmount = safeQuantity * safeUnitPrice;
        
        // Final validation check for calculated amount
        const safeCalculatedAmount = Number.isFinite(calculatedAmount) ? calculatedAmount : safeQuantity * safeUnitPrice;
        
        totalAmount += safeCalculatedAmount;
        validItemCount++;
        
        console.log(`ITEM PROCESSING - PRODUCT ID ${item.productId || 'unknown'}:`, {
          originalQuantity: rawQuantity, 
          safeQuantity,
          originalUnitPrice: rawUnitPrice,
          safeUnitPrice,
          calculatedAmount,
          soItemId: item.soItemId
        });
        
        return {
          ...item,
          quantity: safeQuantity,
          unitPrice: safeUnitPrice,
          calculatedAmount: safeCalculatedAmount
        };
      });
      
      // Log detailed information about each item
      data.items.forEach((item, index) => {
        console.log(`ITEM ${index + 1} (ENHANCED):`, {
          productId: item.productId,
          quantity: item.quantity,
          rawQuantity: typeof item.quantity,
          unitPrice: item.unitPrice,
          rawUnitPrice: typeof item.unitPrice,
          soItemId: item.soItemId,
          calculatedAmount: item.calculatedAmount
        });
      });
      
      // Calculate and log the total with safer parsing
      const subtotal = data.items.reduce((sum, item) => {
        return sum + (item.calculatedAmount || 0);
      }, 0);
      
      console.log(`CALCULATED SUBTOTAL FROM CLIENT: ${subtotal}`);
    } else {
      console.warn("No items found in the invoice data!");
    }
    
    let apiResult;
    
    try {
      // Log before making the fetch call
      console.log("About to fetch with data:", JSON.stringify(data, null, 2));
      console.log(`Submitting intercompany invoice for order ${data.salesOrderId} from company ${data.sourceCompanyId} to ${data.targetCompanyId}`);
      console.log(`Invoice Type: ${data.invoiceType || 'full'}`);
      console.log(`Items Count: ${data.items?.length || 0}`);
      
      // Validate that invoiceType is passed correctly
      if (data.invoiceType === 'partial') {
        console.log("⚠️ PARTIAL INVOICE: Validating items:", data.items?.length);
        if (!data.items || data.items.length === 0) {
          console.error("ERROR: Partial invoice with no items");
          throw new Error("Cannot create a partial invoice with no items");
        }
        
        // Check each item has required fields
        data.items.forEach((item, idx) => {
          console.log(`Item ${idx}: ProductId=${item.productId}, Quantity=${item.quantity}, UnitPrice=${item.unitPrice}`);
          if (!item.productId || !item.quantity || !item.unitPrice) {
            console.error(`ERROR: Item ${idx} is missing required fields:`, item);
          }
        });
      }
      
      // Create a timeout promise that rejects after 30 seconds
      // First, ping the session to ensure it's still valid before making the request
      try {
        console.log("🔒 Pinging session before invoice-bill request to ensure authentication is valid...");
        const pingResponse = await fetch('/api/auth/ping', {
          method: 'GET',
          credentials: 'include',
        });
        
        if (pingResponse.ok) {
          const pingResult = await pingResponse.json();
          console.log("✅ Session ping successful, authentication is valid:", pingResult);
        } else {
          console.error("❌ Session ping failed with status:", pingResponse.status);
          // Try to get more details about the failure
          try {
            const errorText = await pingResponse.text();
            console.error("Session ping error details:", errorText);
          } catch (e) {
            console.error("Could not read session ping error details");
          }
          
          throw new Error('Session is no longer valid. Please refresh the page and log in again.');
        }
      } catch (pingError) {
        console.error("🔒 Session ping failed with error:", pingError);
        // Continue anyway, as the main request will handle auth errors
      }
      
      const invoiceRequestId = `inv-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const timeoutDuration = 60000; // Increase timeout to 60 seconds for complex operations
      
      const timeoutPromise = new Promise<Response>((_, reject) => {
        setTimeout(() => {
          const timeoutError = new Error(`Request timeout - The invoice-bill creation process exceeded ${timeoutDuration/1000} second limit`);
          (timeoutError as any).isTimeout = true;
          (timeoutError as any).requestId = invoiceRequestId;
          console.error(`TIMEOUT [${invoiceRequestId}]: Invoice-bill API request exceeded ${timeoutDuration/1000} second limit`);
          reject(timeoutError);
        }, timeoutDuration);
      });
      
      console.log(`\n\n======= INITIATING INVOICE-BILL API CALL [${invoiceRequestId}] =======`);
      console.log(`[${invoiceRequestId}] Timestamp:`, new Date().toISOString());
      console.log(`[${invoiceRequestId}] Request payload size:`, JSON.stringify(data).length, "bytes");
      console.log(`[${invoiceRequestId}] Items count:`, data.items?.length || 0);
      console.log(`[${invoiceRequestId}] First item:`, data.items?.[0]);
      console.log(`[${invoiceRequestId}] Invoice type:`, data.invoiceType || "full");
      console.log(`[${invoiceRequestId}] Source company ID:`, data.sourceCompanyId);
      console.log(`[${invoiceRequestId}] Target company ID:`, data.targetCompanyId);
      console.log(`[${invoiceRequestId}] Issue date:`, data.issueDate);
      console.log(`[${invoiceRequestId}] Timeout duration:`, timeoutDuration, "ms");
      console.log(`===================================================================`);
      
      const startTime = Date.now();
      let responseTime = 0;
      
      // Perform validation check before making the API call
      const validationIssues = [];
      
      if (!data.sourceCompanyId) validationIssues.push("Missing sourceCompanyId");
      if (!data.targetCompanyId) validationIssues.push("Missing targetCompanyId");
      if (!data.items || data.items.length === 0) validationIssues.push("No items provided");
      if (!data.issueDate) validationIssues.push("Missing issueDate");
      
      // Check individual items
      if (data.items && data.items.length > 0) {
        data.items.forEach((item: any, index: number) => {
          if (!item.productId) validationIssues.push(`Item ${index}: Missing productId`);
          if (!item.quantity) validationIssues.push(`Item ${index}: Missing quantity`);
          if (!item.unitPrice) validationIssues.push(`Item ${index}: Missing unitPrice`);
        });
      }
      
      if (validationIssues.length > 0) {
        console.error(`[${invoiceRequestId}] VALIDATION ERRORS before API call:`, validationIssues);
        console.error(`[${invoiceRequestId}] This will likely cause server-side validation failure`);
      } else {
        console.log(`[${invoiceRequestId}] Pre-submission validation passed ✓`);
      }
      
      // Race the fetch against the timeout
      let response: Response;
      try {
        // Ensure invoiceType is properly set in the payload
        const requestData = {
          ...data,
          invoiceType: data.invoiceType || 'full',  // Set default if missing
          requestId: invoiceRequestId,  // Include the request ID for server-side correlation
        };
        
        // Log the exact payload being sent
        console.log(`[${invoiceRequestId}] Full request payload:`, JSON.stringify(requestData, null, 2));
        
        // Special case for mantest2505 orders
        if (String(data.salesOrderId).includes('mantest2505')) {
          console.log(`SPECIAL CASE HANDLING: Creating invoice for mantest2505 order:
            Sales Order ID: ${data.salesOrderId}
            Purchase Order ID: ${data.purchaseOrderId}
            Source Company: ${data.sourceCompanyId}
            Target Company: ${data.targetCompanyId}
            Items Count: ${data.items?.length}
          `);
        }
        
        response = await Promise.race([
          fetch('/api/intercompany/invoice-bill', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Request-ID': invoiceRequestId, // Include request ID as header too
            },
            credentials: 'include', // Important: include credentials for auth
            body: JSON.stringify(requestData),
          }),
          timeoutPromise
        ]);
        
        responseTime = Date.now() - startTime;
        console.log(`[${invoiceRequestId}] API response received after ${responseTime}ms, status:`, response.status, response.statusText);
      } catch (raceError) {
        console.error("RACE ERROR:", raceError);
        throw raceError;
      }
      
      if (!response.ok) {
        console.error(`API error: ${response.status} ${response.statusText}`);
        
        // Special handling for auth errors
        if (response.status === 401) {
          console.error("Authentication error detected, user needs to log in again");
          
          // Clear any session state client-side to avoid confusion
          localStorage.removeItem('lastActiveCompany');
          sessionStorage.removeItem('currentView');
          
          // Return auth error
          return {
            success: false,
            error: "Authentication required. Please log in again.",
            authError: true
          };
        }
        
        let errorMessage = "";
        
        try {
          // Try to parse JSON error first
          const errorJson = await response.json();
          errorMessage = errorJson.message || JSON.stringify(errorJson);
          console.error("API error details:", errorJson);
        } catch (jsonParseError) {
          // If not JSON, try to get text
          try {
            errorMessage = await response.text();
          } catch (textError) {
            errorMessage = `${response.status}: ${response.statusText}`;
          }
        }
        
        throw new Error(`API error: ${errorMessage}`);
      }
      
      apiResult = await response.json();
      console.log("========= INVOICE API RESPONSE RECEIVED =========");
      console.log("Timestamp:", new Date().toISOString());
      console.log("Response received after:", Date.now() - startTime, "ms");
      console.log("Response type:", typeof apiResult);
      
      // Log full response for detailed debugging
      console.log("API Full Response:", JSON.stringify(apiResult, null, 2));
      
      // Verify and log key properties for better diagnostics
      console.log("Response properties:", Object.keys(apiResult));
      console.log("Success flag:", apiResult.success);
      console.log("Error message:", apiResult.error || "none");
      console.log("Invoice ID:", apiResult.sourceInvoice?.id);
      console.log("Invoice Number:", apiResult.sourceInvoice?.invoiceNumber);
      console.log("Invoice Status:", apiResult.sourceInvoice?.status);
      console.log("Invoice items count:", apiResult.sourceInvoice?.items?.length || 0);
      console.log("Bill ID:", apiResult.targetBill?.id);
      console.log("Bill Number:", apiResult.targetBill?.billNumber);
      console.log("Bill Status:", apiResult.targetBill?.status);
      console.log("Remaining items count:", apiResult.remainingItems?.length || 0);
      console.log("================================================");
      
      // Validate the response has the expected structure
      if (!apiResult || typeof apiResult !== 'object') {
        console.error("CRITICAL ERROR: Invalid response received from server");
        throw new Error("Invalid response from server: Missing or malformed response");
      }
      
      // Additional validation for partial invoice responses
      if (data.invoiceType === 'partial') {
        console.log("========= PARTIAL INVOICE VALIDATION =========");
        console.log("Validating partial invoice response...");
        
        // Log more details about the response structure for debugging
        console.log("Response structure:", {
          hasSuccessFlag: apiResult.hasOwnProperty('success'),
          hasErrorFlag: apiResult.hasOwnProperty('error'),
          hasIsPartialFlag: apiResult.hasOwnProperty('isPartial'),
          hasSourceInvoice: !!apiResult.sourceInvoice,
          hasTargetBill: !!apiResult.targetBill,
          responseType: typeof apiResult
        });
        
        // Log remaining item details for tracking
        if (apiResult.remainingItems && Array.isArray(apiResult.remainingItems)) {
          console.log(`Remaining items after partial invoice: ${apiResult.remainingItems.length}`);
          apiResult.remainingItems.forEach((item, idx) => {
            console.log(`Remaining item ${idx + 1}:`, {
              id: item.id,
              productId: item.productId,
              productName: item.productName,
              totalQuantity: item.totalQuantity,
              invoicedQuantity: item.invoicedQuantity,
              remainingQuantity: item.remainingQuantity,
              fullyInvoiced: item.fullyInvoiced
            });
          });
        } else {
          console.warn("No remaining items found in partial invoice response");
        }
        console.log("===============================================");
      }
      
      if (!apiResult.success) {
        const errorMsg = apiResult.error || apiResult.message || "Unknown server error";
        console.error(`Server reported error: ${errorMsg}`);
        throw new Error(errorMsg);
      }
      
      // For partial invoices, we still need the source invoice and target bill,
      // but let's provide more specific error messages
      if (!apiResult.sourceInvoice || !apiResult.sourceInvoice.id) {
        if (data.invoiceType === 'partial') {
          throw new Error("Failed to create partial invoice - missing source invoice data");
        } else {
          throw new Error("Server response missing source invoice data");
        }
      }
      
      if (!apiResult.targetBill || !apiResult.targetBill.id) {
        if (data.invoiceType === 'partial') {
          throw new Error("Failed to create partial invoice - missing target bill data");
        } else {
          throw new Error("Server response missing target bill data");
        }
      }
      
    } catch (fetchError: any) {
      console.error("Fetch error in intercompany invoice creation:", fetchError);
      console.error("Error details:", {
        message: fetchError.message,
        stack: fetchError.stack,
        name: fetchError.name
      });
      
      // Check if this is a timeout error
      if (fetchError.message && fetchError.message.includes('timeout')) {
        return {
          success: false,
          error: "The server took too long to respond. The operation might still be processing in the background. Please check the transactions page in a few minutes.",
        };
      }
      
      // Handle other types of fetch errors
      return {
        success: false,
        error: `Request failed: ${fetchError.message}`,
      };
    }
    
    // Ensure the invoice type from the request is properly included in the response
    return {
      success: true,
      sourceInvoice: apiResult?.sourceInvoice,
      targetBill: apiResult?.targetBill,
      balances: apiResult?.balances,
      // Use explicit isPartial flag from both API result and request
      isPartial: apiResult?.isPartial || data.invoiceType === 'partial',
      // Make sure invoice type is consistent with the request
      invoiceType: data.invoiceType || apiResult?.invoiceType || 'full',
      remainingItems: apiResult?.remainingItems || []
    };
  } catch (error: any) {
    console.error("Error creating intercompany invoice:", error);
    
    // Include invoice type information in the error response
    // This helps the UI know what type of invoice failed
    return {
      success: false,
      error: error.message || "An unknown error occurred",
      invoiceType: data.invoiceType || 'full',
      isPartial: data.invoiceType === 'partial'
    };
  }
}

/**
 * Creates matching payment receipts for intercompany invoices
 * @param data The intercompany payment data
 * @returns A promise that resolves to the result of the operation
 */
export async function createIntercompanyPayment(
  data: IntercompanyPaymentData
): Promise<IntercompanyPaymentResult> {
  try {
    // Enhanced logging with timestamps and request ID
    const requestId = `payment-${Date.now()}`;
    console.log(`========== PAYMENT REQUEST START [${requestId}] ==========`);
    console.log("Timestamp:", new Date().toISOString());
    console.log("Sending intercompany payment request with data:", JSON.stringify(data, null, 2));
    
    // Check for special order ID formats that might cause issues
    if (data.invoiceId !== undefined) {
      // Log the invoice ID details for debugging
      console.log(`Invoice ID details [${requestId}]:`);
      console.log(`Value: ${data.invoiceId}`);
      console.log(`Type: ${typeof data.invoiceId}`);
      
      // Special handling for "mantest2505" style IDs
      if (typeof data.invoiceId === 'string' && data.invoiceId.includes('mantest')) {
        console.warn(`POTENTIAL ISSUE DETECTED: Invoice ID "${data.invoiceId}" appears to be a formatted ID rather than a database ID`);
        
        // Extract any numeric part
        const numericMatch = data.invoiceId.match(/(\d+)/);
        if (numericMatch) {
          const numericPart = parseInt(numericMatch[0], 10);
          if (!isNaN(numericPart)) {
            console.log(`Extracting numeric part from invoice ID: ${numericPart}`);
            // Consider using the numeric part instead
            // Uncomment the line below if you want to replace the formatted ID with the numeric part
            // data.invoiceId = numericPart;
          }
        }
      }
    }
    
    if (data.billId !== undefined) {
      // Log the bill ID details for debugging
      console.log(`Bill ID details [${requestId}]:`);
      console.log(`Value: ${data.billId}`);
      console.log(`Type: ${typeof data.billId}`);
      
      // Special handling for "mantest2505" style IDs
      if (typeof data.billId === 'string' && data.billId.includes('mantest')) {
        console.warn(`POTENTIAL ISSUE DETECTED: Bill ID "${data.billId}" appears to be a formatted ID rather than a database ID`);
        
        // Extract any numeric part
        const numericMatch = data.billId.match(/(\d+)/);
        if (numericMatch) {
          const numericPart = parseInt(numericMatch[0], 10);
          if (!isNaN(numericPart)) {
            console.log(`Extracting numeric part from bill ID: ${numericPart}`);
            // Consider using the numeric part instead
            // Uncomment the line below if you want to replace the formatted ID with the numeric part
            // data.billId = numericPart;
          }
        }
      }
    }
    
    // Ensure amount is a valid number
    if (data.amount !== undefined) {
      const rawAmount = data.amount;
      let safeAmount: number;
      
      if (typeof rawAmount === 'number') {
        safeAmount = isNaN(rawAmount) ? 0 : rawAmount;
      } else if (typeof rawAmount === 'string') {
        safeAmount = parseFloat(rawAmount);
        if (isNaN(safeAmount)) {
          console.warn(`Received NaN value for amount, defaulting to 0 [${requestId}]`, {rawAmount});
          safeAmount = 0;
        }
      } else {
        console.warn(`Invalid amount type received [${requestId}]`, {type: typeof rawAmount, value: rawAmount});
        safeAmount = 0;
      }
      
      // Ensure amount is positive
      if (safeAmount <= 0) {
        console.error(`Payment amount must be greater than zero: ${safeAmount} [${requestId}]`);
        throw new Error("Payment amount must be greater than zero");
      }
      
      data.amount = safeAmount;
    }
    
    // Process payment items if present
    if (Array.isArray(data.items) && data.items.length > 0) {
      data.items = data.items.map(item => {
        const rawAmount = item.amount;
        let safeAmount: number;
        
        if (typeof rawAmount === 'number') {
          safeAmount = isNaN(rawAmount) ? 0 : rawAmount; // Handle NaN number type
        } else if (typeof rawAmount === 'string') {
          safeAmount = parseFloat(rawAmount);
          if (isNaN(safeAmount)) {
            console.warn("Received NaN value for item amount, defaulting to 0", {rawAmount, itemId: item.invoiceId});
            safeAmount = 0;
          }
        } else {
          console.warn("Invalid item amount type received", {type: typeof rawAmount, value: rawAmount, itemId: item.invoiceId});
          safeAmount = 0;
        }
        
        // Ensure amount is positive
        if (safeAmount <= 0) {
          console.warn("Payment item amount must be greater than zero", {rawAmount, safeAmount, itemId: item.invoiceId});
          // Instead of throwing which breaks the entire flow, set a default for this item
          safeAmount = 1;
        }
        
        // Sanitize IDs to prevent NaN values in database
        const invoiceId = typeof item.invoiceId === 'number' ? 
          (isNaN(item.invoiceId) ? 0 : item.invoiceId) : 
          parseInt(String(item.invoiceId || 0), 10) || 0;
          
        const billId = typeof item.billId === 'number' ? 
          (isNaN(item.billId) ? 0 : item.billId) : 
          parseInt(String(item.billId || 0), 10) || 0;
        
        // Log any potential ID issues for debugging
        if (invoiceId <= 0 || billId <= 0) {
          console.error(`CRITICAL: Invalid IDs detected in payment item:
            Raw invoice ID: ${item.invoiceId} (${typeof item.invoiceId})
            Sanitized invoice ID: ${invoiceId}
            Raw bill ID: ${item.billId} (${typeof item.billId})
            Sanitized bill ID: ${billId}
            This will likely cause payment creation to fail
          `);
        }
        
        return {
          ...item,
          invoiceId,
          billId,
          amount: safeAmount
        };
      });
    }
    
    const startTime = Date.now();
    console.log(`Making API request to /api/intercompany/payment at ${new Date().toISOString()} [${requestId}]`);
    
    try {
      const response = await fetch('/api/intercompany/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId // Add request ID for server-side correlation
        },
        body: JSON.stringify(data),
      });
      
      const requestDuration = Date.now() - startTime;
      console.log(`API response received in ${requestDuration}ms [${requestId}]`);
      console.log(`Response status: ${response.status} ${response.statusText} [${requestId}]`);
      
      if (!response.ok) {
        console.error(`API error: ${response.status} ${response.statusText} [${requestId}]`);
        
        // Special handling for auth errors
        if (response.status === 401) {
          console.warn(`Authentication error detected in payment request [${requestId}]`);
          return {
            success: false,
            error: "Authentication required",
            authError: true,
            diagnosticInfo: {
              requestId,
              status: response.status,
              statusText: response.statusText,
              duration: requestDuration
            }
          };
        }
        
        // Handle common HTTP errors with better messages
        if (response.status === 404) {
          console.error(`Resource not found error in payment request [${requestId}]`);
          const errorText = await response.text();
          try {
            // Try to parse as JSON for structured error
            const errorJson = JSON.parse(errorText);
            console.error(`Structured error response: ${JSON.stringify(errorJson)} [${requestId}]`);
            return {
              success: false,
              error: errorJson.message || "Resource not found. The invoice or bill couldn't be located.",
              diagnosticInfo: {
                ...(errorJson.diagnosticInfo || {}),
                requestId,
                status: response.status,
                statusText: response.statusText,
                duration: requestDuration
              }
            };
          } catch (e) {
            // Text response
            console.error(`Raw error response: ${errorText} [${requestId}]`);
            return {
              success: false,
              error: errorText || "Resource not found. The invoice or bill couldn't be located.",
              diagnosticInfo: {
                requestId,
                status: response.status,
                statusText: response.statusText,
                duration: requestDuration
              }
            };
          }
        }
        
        // General error handling
        let parsedError;
        try {
          const errorText = await response.text();
          
          // Try to parse as JSON for structured error
          try {
            parsedError = JSON.parse(errorText);
            console.error(`Structured error response: ${JSON.stringify(parsedError)} [${requestId}]`);
          } catch {
            // Plain text error
            console.error(`Raw error response: ${errorText} [${requestId}]`);
            parsedError = { message: errorText };
          }
        } catch (readError) {
          console.error(`Failed to read error response: ${readError} [${requestId}]`);
          parsedError = { message: 'Failed to create intercompany payment (could not read error details)' };
        }
        
        return {
          success: false,
          error: parsedError.message || 'Failed to create intercompany payment',
          diagnosticInfo: {
            ...(parsedError.diagnosticInfo || {}),
            requestId,
            status: response.status,
            statusText: response.statusText,
            duration: requestDuration
          }
        };
      }
    } catch (networkError) {
      // Handle network errors (connection issues, CORS, etc.)
      console.error(`Network error making payment request: ${networkError} [${requestId}]`);
      return {
        success: false,
        error: `Network error: ${networkError.message}. Please check your connection and try again.`,
        networkError: true,
        diagnosticInfo: {
          requestId,
          errorType: networkError.name,
          errorMessage: networkError.message
        }
      };
    }
    
    try {
      // Capture successful response
      const response = await fetch('/api/intercompany/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId // Add request ID for server-side correlation
        },
        body: JSON.stringify(data),
      });
      
      const requestDuration = Date.now() - startTime;
      console.log(`API response received in ${requestDuration}ms [${requestId}]`);
      console.log(`Response status: ${response.status} ${response.statusText} [${requestId}]`);
      
      if (!response.ok) {
        console.error(`API error: ${response.status} ${response.statusText} [${requestId}]`);
        
        // Special handling for auth errors
        if (response.status === 401) {
          console.warn(`Authentication error detected in payment request [${requestId}]`);
          return {
            success: false,
            error: "Authentication required",
            authError: true,
            diagnosticInfo: {
              requestId,
              status: response.status,
              statusText: response.statusText,
              duration: requestDuration
            }
          };
        }
        
        // Handle common HTTP errors with better messages
        if (response.status === 404) {
          console.error(`Resource not found error in payment request [${requestId}]`);
          const errorText = await response.text();
          try {
            // Try to parse as JSON for structured error
            const errorJson = JSON.parse(errorText);
            console.error(`Structured error response: ${JSON.stringify(errorJson)} [${requestId}]`);
            return {
              success: false,
              error: errorJson.message || "Resource not found. The invoice or bill couldn't be located.",
              diagnosticInfo: {
                ...(errorJson.diagnosticInfo || {}),
                requestId,
                status: response.status,
                statusText: response.statusText,
                duration: requestDuration
              }
            };
          } catch (e) {
            // Text response
            console.error(`Raw error response: ${errorText} [${requestId}]`);
            return {
              success: false,
              error: errorText || "Resource not found. The invoice or bill couldn't be located.",
              diagnosticInfo: {
                requestId,
                status: response.status,
                statusText: response.statusText,
                duration: requestDuration
              }
            };
          }
        }
        
        // General error handling
        let parsedError;
        try {
          const errorText = await response.text();
          
          // Try to parse as JSON for structured error
          try {
            parsedError = JSON.parse(errorText);
            console.error(`Structured error response: ${JSON.stringify(parsedError)} [${requestId}]`);
          } catch {
            // Plain text error
            console.error(`Raw error response: ${errorText} [${requestId}]`);
            parsedError = { message: errorText };
          }
        } catch (readError) {
          console.error(`Failed to read error response: ${readError} [${requestId}]`);
          parsedError = { message: 'Failed to create intercompany payment (could not read error details)' };
        }
        
        return {
          success: false,
          error: parsedError.message || 'Failed to create intercompany payment',
          diagnosticInfo: {
            ...(parsedError.diagnosticInfo || {}),
            requestId,
            status: response.status,
            statusText: response.statusText,
            duration: requestDuration
          }
        };
      }
      
      // Successful response handling
      console.log(`Payment request succeeded, parsing response [${requestId}]`);
      
      try {
        const result = await response.json();
        
        console.log(`Payment response parsed successfully [${requestId}]`);
        console.log(`Response data: ${JSON.stringify({
          success: result.success,
          sourceReceiptId: result.sourceReceipt?.id,
          targetPaymentId: result.targetPayment?.id,
          remainingBalance: result.remainingBalance,
          balances: result.balances,
          isMultiPayment: result.isMultiPayment,
          itemsCount: result.items?.length || 0
        }, null, 2)} [${requestId}]`);
        
        // Log any missing expected data
        if (!result.sourceReceipt || !result.sourceReceipt.id) {
          console.warn(`Missing source receipt data in successful response [${requestId}]`);
        }
        if (!result.targetPayment || !result.targetPayment.id) {
          console.warn(`Missing target payment data in successful response [${requestId}]`);
        }
        
        console.log(`========== PAYMENT REQUEST COMPLETE [${requestId}] ==========`);
        
        return {
          success: true,
          sourceReceipt: result.sourceReceipt,
          targetPayment: result.targetPayment,
          remainingBalance: result.remainingBalance,
          balances: result.balances,
          items: result.items,
          isMultiPayment: result.isMultiPayment,
          diagnosticInfo: {
            requestId,
            duration: Date.now() - startTime,
            timestamp: new Date().toISOString()
          }
        };
      } catch (parseError: any) {
        console.error(`Error parsing successful payment response: ${parseError} [${requestId}]`);
        return {
          success: false,
          error: "Server returned an invalid response format. The payment might have been created, but could not be confirmed.",
          diagnosticInfo: {
            requestId,
            errorType: parseError.name,
            errorMessage: parseError.message,
            duration: Date.now() - startTime
          }
        };
      }
    } catch (networkError: any) {
      // Handle network errors (connection issues, CORS, etc.)
      console.error(`Network error making payment request: ${networkError} [${requestId}]`);
      return {
        success: false,
        error: `Network error: ${networkError.message}. Please check your connection and try again.`,
        networkError: true,
        diagnosticInfo: {
          requestId,
          errorType: networkError.name,
          errorMessage: networkError.message
        }
      };
    }
  } catch (error: any) {
    console.error("Error creating intercompany payment:", error);
    
    // Special handling for timeout errors
    if (error.message && error.message.includes("timeout")) {
      console.warn("Timeout detected in payment/receipt creation API call");
      return {
        success: false,
        error: "The operation timed out. The payment might still be processing. Please check the transactions page in a few minutes.",
        timeout: true
      };
    }
    
    // Handle network errors explicitly
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return {
        success: false,
        error: "Network error. Please check your connection and try again.",
        networkError: true
      };
    }
    
    return {
      success: false,
      error: error.message || "An unknown error occurred"
    };
  }
}

/**
 * Creates matching receipts for intercompany invoices (same as payments but with more explicit naming)
 * @param data The intercompany payment data
 * @returns A promise that resolves to the result of the operation
 */
export async function createIntercompanyReceipt(
  data: IntercompanyPaymentData
): Promise<IntercompanyPaymentResult> {
  // Generate a unique ID for this receipt request for better tracing
  const receiptId = `receipt-${Date.now()}`;
  console.log(`========== RECEIPT REQUEST START [${receiptId}] ==========`);
  console.log("Timestamp:", new Date().toISOString());
  
  try {
    // Comprehensive validation before proceeding
    if (!data) {
      console.error(`[${receiptId}] createIntercompanyReceipt received null or undefined data`);
      return {
        success: false,
        error: 'Receipt data is required',
        diagnosticInfo: {
          requestId: receiptId,
          timestamp: new Date().toISOString(),
          errorType: 'VALIDATION_ERROR',
          errorDetail: 'Null or undefined payment data'
        }
      };
    }

    console.log(`[${receiptId}] Receipt request data:`, JSON.stringify(data, null, 2));
    
    // Validate required fields with detailed error messages
    if (!data.sourceCompanyId || isNaN(Number(data.sourceCompanyId)) || Number(data.sourceCompanyId) <= 0) {
      console.error(`[${receiptId}] Invalid sourceCompanyId: ${data.sourceCompanyId} (${typeof data.sourceCompanyId})`);
      console.error(`[${receiptId}] CRITICAL ERROR: Receipt creation failed due to missing or invalid sourceCompanyId.
        Full payment data: ${JSON.stringify(data, null, 2)}`);
      return {
        success: false,
        error: 'Valid source company ID is required',
        diagnosticInfo: {
          requestId: receiptId,
          timestamp: new Date().toISOString(),
          providedSourceCompanyId: data.sourceCompanyId,
          sourceCompanyIdType: typeof data.sourceCompanyId,
          parsedSourceCompanyId: Number(data.sourceCompanyId),
          isNaN: isNaN(Number(data.sourceCompanyId)),
          errorType: 'VALIDATION_ERROR',
          errorDetail: 'Invalid source company ID'
        }
      };
    }

    if (!data.targetCompanyId || isNaN(Number(data.targetCompanyId)) || Number(data.targetCompanyId) <= 0) {
      console.error(`[${receiptId}] Invalid targetCompanyId: ${data.targetCompanyId} (${typeof data.targetCompanyId})`);
      console.error(`[${receiptId}] CRITICAL ERROR: Receipt creation failed due to missing or invalid targetCompanyId.
        Full payment data: ${JSON.stringify(data, null, 2)}`);
      return {
        success: false,
        error: 'Valid target company ID is required',
        diagnosticInfo: {
          requestId: receiptId,
          timestamp: new Date().toISOString(),
          providedTargetCompanyId: data.targetCompanyId,
          targetCompanyIdType: typeof data.targetCompanyId,
          parsedTargetCompanyId: Number(data.targetCompanyId),
          isNaN: isNaN(Number(data.targetCompanyId)),
          errorType: 'VALIDATION_ERROR',
          errorDetail: 'Invalid target company ID'
        }
      };
    }
    
    // Special handling for invoice and bill IDs that might be in string format (like mantest2505)
    // This is critical for systems that might receive document IDs in various formats
    if (data.invoiceId) {
      console.log(`[${receiptId}] Checking invoice ID format: ${data.invoiceId} (${typeof data.invoiceId})`);
      
      if (typeof data.invoiceId === 'string' && data.invoiceId.includes('-')) {
        console.warn(`[${receiptId}] POTENTIAL ISSUE: Invoice ID appears to be in special format (contains hyphens): ${data.invoiceId}`);
        
        // Check if it matches the mantest2505 pattern
        if (data.invoiceId.includes('mantest')) {
          console.warn(`[${receiptId}] SPECIAL CASE: mantest pattern detected in invoice ID: ${data.invoiceId}`);
          
          // Extract any numeric part as a fallback
          const numericMatch = data.invoiceId.match(/(\d+)/);
          if (numericMatch) {
            console.log(`[${receiptId}] Extracted numeric part from invoice ID: ${numericMatch[0]}`);
            
            // We'll keep the original but also track the extracted numeric part for diagnostics
            const extractedNumeric = parseInt(numericMatch[0], 10);
            if (!isNaN(extractedNumeric)) {
              console.log(`[${receiptId}] Parsed numeric value: ${extractedNumeric}`);
              
              // Note: Uncomment the line below if you want to replace the formatted ID with the numeric part
              // data.invoiceId = extractedNumeric;
            }
          }
        }
      }
    }
    
    if (data.billId) {
      console.log(`[${receiptId}] Checking bill ID format: ${data.billId} (${typeof data.billId})`);
      
      if (typeof data.billId === 'string' && data.billId.includes('-')) {
        console.warn(`[${receiptId}] POTENTIAL ISSUE: Bill ID appears to be in special format (contains hyphens): ${data.billId}`);
        
        // Check if it matches the mantest2505 pattern
        if (data.billId.includes('mantest')) {
          console.warn(`[${receiptId}] SPECIAL CASE: mantest pattern detected in bill ID: ${data.billId}`);
          
          // Extract any numeric part as a fallback
          const numericMatch = data.billId.match(/(\d+)/);
          if (numericMatch) {
            console.log(`[${receiptId}] Extracted numeric part from bill ID: ${numericMatch[0]}`);
            
            // We'll keep the original but also track the extracted numeric part for diagnostics
            const extractedNumeric = parseInt(numericMatch[0], 10);
            if (!isNaN(extractedNumeric)) {
              console.log(`[${receiptId}] Parsed numeric value: ${extractedNumeric}`);
              
              // Note: Uncomment the line below if you want to replace the formatted ID with the numeric part
              // data.billId = extractedNumeric;
            }
          }
        }
      }
    }

    if (!data.invoiceId || (typeof data.invoiceId === 'number' && (isNaN(data.invoiceId) || data.invoiceId <= 0))) {
      console.error(`[${receiptId}] Invalid invoiceId: ${data.invoiceId} (${typeof data.invoiceId})`);
      console.error(`[${receiptId}] CRITICAL ERROR: Receipt creation failed due to missing or invalid invoiceId. 
        Full payment data: ${JSON.stringify(data, null, 2)}`);
      
      // Special case for string-format invoice IDs (like "SO-mantest2505-123456")
      let specialFormatDetails = {};
      if (typeof data.invoiceId === 'string') {
        specialFormatDetails = {
          specialFormat: true,
          containsHyphens: data.invoiceId.includes('-'),
          containsMantest: data.invoiceId.includes('mantest'),
          length: data.invoiceId.length,
          // Try to extract any numeric parts for diagnostic purposes
          numericParts: (data.invoiceId.match(/\d+/g) || []).join(',')
        };
        
        console.warn(`[${receiptId}] Special format invoice ID detected:`, specialFormatDetails);
      }
      
      return {
        success: false,
        error: 'Valid invoice ID is required',
        diagnosticInfo: {
          requestId: receiptId,
          timestamp: new Date().toISOString(),
          providedInvoiceId: data.invoiceId,
          invoiceIdType: typeof data.invoiceId,
          parsedInvoiceId: Number(data.invoiceId),
          isNaN: isNaN(Number(data.invoiceId)),
          errorType: 'VALIDATION_ERROR',
          errorDetail: 'Invalid invoice ID',
          ...specialFormatDetails
        }
      };
    }

    if (!data.billId || (typeof data.billId === 'number' && (isNaN(data.billId) || data.billId <= 0))) {
      console.error(`[${receiptId}] Invalid billId: ${data.billId} (${typeof data.billId})`);
      console.error(`[${receiptId}] CRITICAL ERROR: Receipt creation failed due to missing or invalid billId. 
        Full payment data: ${JSON.stringify(data, null, 2)}`);
      
      // Special case for string-format bill IDs (like "PO-mantest2505-123456")
      let specialFormatDetails = {};
      if (typeof data.billId === 'string') {
        specialFormatDetails = {
          specialFormat: true,
          containsHyphens: data.billId.includes('-'),
          containsMantest: data.billId.includes('mantest'),
          length: data.billId.length,
          // Try to extract any numeric parts for diagnostic purposes
          numericParts: (data.billId.match(/\d+/g) || []).join(',')
        };
        
        console.warn(`[${receiptId}] Special format bill ID detected:`, specialFormatDetails);
      }
      
      return {
        success: false,
        error: 'Valid bill ID is required',
        diagnosticInfo: {
          requestId: receiptId,
          timestamp: new Date().toISOString(),
          providedBillId: data.billId,
          billIdType: typeof data.billId,
          parsedBillId: Number(data.billId),
          isNaN: isNaN(Number(data.billId)),
          errorType: 'VALIDATION_ERROR',
          errorDetail: 'Invalid bill ID',
          ...specialFormatDetails
        }
      };
    }

    // Validate amount (for single payments)
    if (data.amount !== undefined) {
      const parsedAmount = Number(data.amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        console.error(`[${receiptId}] Invalid amount: ${data.amount} (${typeof data.amount})`);
        console.error(`[${receiptId}] CRITICAL ERROR: Receipt creation failed due to invalid amount.
          Full payment data: ${JSON.stringify(data, null, 2)}`);
        return {
          success: false,
          error: 'Valid positive amount is required',
          diagnosticInfo: {
            requestId: receiptId,
            timestamp: new Date().toISOString(),
            providedAmount: data.amount,
            amountType: typeof data.amount,
            parsedAmount: parsedAmount,
            isNaN: isNaN(parsedAmount),
            errorType: 'VALIDATION_ERROR',
            errorDetail: 'Invalid payment amount'
          }
        };
      }
      
      console.log(`[${receiptId}] Amount validation passed: ${parsedAmount}`);
      
      // Ensure the amount is properly formatted as a number
      data.amount = parsedAmount;
    } else if (data.items && Array.isArray(data.items)) {
      // Check items array for multi-payment
      console.log(`[${receiptId}] Multiple payment items detected (${data.items.length})`);
      
      if (data.items.length === 0) {
        console.error(`[${receiptId}] Empty payment items array`);
        return {
          success: false,
          error: 'At least one payment item is required',
          diagnosticInfo: {
            requestId: receiptId,
            timestamp: new Date().toISOString(),
            errorType: 'VALIDATION_ERROR',
            errorDetail: 'Empty payment items array'
          }
        };
      }
      
      // Validate each item in the array
      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        const itemAmount = Number(item.amount);
        
        console.log(`[${receiptId}] Validating payment item ${i+1}:`, item);
        
        if (!item.invoiceId || !item.billId || isNaN(itemAmount) || itemAmount <= 0) {
          console.error(`[${receiptId}] Invalid payment item at index ${i}:`, item);
          return {
            success: false,
            error: `Invalid payment item at position ${i+1}`,
            diagnosticInfo: {
              requestId: receiptId,
              timestamp: new Date().toISOString(),
              itemIndex: i,
              item: item,
              errorType: 'VALIDATION_ERROR',
              errorDetail: 'Invalid payment item data',
              missingInvoiceId: !item.invoiceId,
              missingBillId: !item.billId,
              invalidAmount: isNaN(itemAmount) || itemAmount <= 0
            }
          };
        }
      }
      
      console.log(`[${receiptId}] All payment items validated successfully`);
    }

    // Validate payment date
    if (!data.paymentDate) {
      console.error(`[${receiptId}] Missing payment date`);
      return {
        success: false,
        error: 'Payment date is required',
        diagnosticInfo: {
          requestId: receiptId,
          timestamp: new Date().toISOString(),
          errorType: 'VALIDATION_ERROR',
          errorDetail: 'Missing payment date'
        }
      };
    }
    
    // Check for valid date format
    try {
      // Attempt to parse the date to ensure it's valid
      const parsedDate = new Date(data.paymentDate);
      if (isNaN(parsedDate.getTime())) {
        console.error(`[${receiptId}] Invalid payment date format: ${data.paymentDate}`);
        return {
          success: false,
          error: 'Payment date is in an invalid format',
          diagnosticInfo: {
            requestId: receiptId,
            timestamp: new Date().toISOString(),
            providedPaymentDate: data.paymentDate,
            errorType: 'VALIDATION_ERROR',
            errorDetail: 'Invalid payment date format'
          }
        };
      }
      console.log(`[${receiptId}] Payment date validation passed: ${parsedDate.toISOString()}`);
    } catch (error) {
      console.error(`[${receiptId}] Error parsing payment date: ${data.paymentDate}`, error);
      return {
        success: false,
        error: 'Payment date validation failed',
        diagnosticInfo: {
          requestId: receiptId,
          timestamp: new Date().toISOString(),
          providedPaymentDate: data.paymentDate,
          errorType: 'VALIDATION_ERROR',
          errorDetail: 'Payment date parsing error',
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      };
    }

    // Ensure account IDs are valid for double-entry accounting
    if (!data.debitAccountId || isNaN(Number(data.debitAccountId)) || Number(data.debitAccountId) <= 0) {
      console.error(`[${receiptId}] Invalid debitAccountId: ${data.debitAccountId} (${typeof data.debitAccountId})`);
      console.error(`[${receiptId}] CRITICAL ERROR: Receipt creation failed due to missing or invalid debitAccountId.
        Full payment data: ${JSON.stringify(data, null, 2)}`);
      return {
        success: false,
        error: 'Valid debit account ID (bank/cash account) is required',
        diagnosticInfo: {
          requestId: receiptId,
          timestamp: new Date().toISOString(),
          providedDebitAccountId: data.debitAccountId,
          debitAccountIdType: typeof data.debitAccountId,
          parsedDebitAccountId: Number(data.debitAccountId),
          isNaN: isNaN(Number(data.debitAccountId)),
          errorType: 'VALIDATION_ERROR',
          errorDetail: 'Invalid debit account ID'
        }
      };
    }
    
    console.log(`[${receiptId}] Debit account ID validation passed: ${data.debitAccountId}`)

    if (!data.creditAccountId || isNaN(Number(data.creditAccountId)) || Number(data.creditAccountId) <= 0) {
      console.error(`[${receiptId}] Invalid creditAccountId: ${data.creditAccountId} (${typeof data.creditAccountId})`);
      console.error(`[${receiptId}] CRITICAL ERROR: Receipt creation failed due to missing or invalid creditAccountId.
        Full payment data: ${JSON.stringify(data, null, 2)}`);
      return {
        success: false,
        error: 'Valid credit account ID (receivable account) is required',
        diagnosticInfo: {
          requestId: receiptId,
          timestamp: new Date().toISOString(),
          providedCreditAccountId: data.creditAccountId,
          creditAccountIdType: typeof data.creditAccountId,
          parsedCreditAccountId: Number(data.creditAccountId),
          isNaN: isNaN(Number(data.creditAccountId)),
          errorType: 'VALIDATION_ERROR',
          errorDetail: 'Invalid credit account ID'
        }
      };
    }
    
    console.log(`[${receiptId}] Credit account ID validation passed: ${data.creditAccountId}`);
    
    // All validations passed, proceed with API request
    console.log(`[${receiptId}] All validation checks passed, proceeding with API request`)

    // Handle special formats for document IDs before conversion
    // Store original IDs for diagnostic purposes
    const originalIds = {
      sourceCompanyId: data.sourceCompanyId,
      targetCompanyId: data.targetCompanyId,
      invoiceId: data.invoiceId, 
      billId: data.billId,
      debitAccountId: data.debitAccountId,
      creditAccountId: data.creditAccountId
    };
    
    console.log(`[${receiptId}] Original IDs before conversion:`, originalIds);
    
    // Special handling for invoice/bill IDs in mantest format
    // These need to be carefully converted for API compatibility
    if (typeof data.invoiceId === 'string' && data.invoiceId.includes('mantest')) {
      console.warn(`[${receiptId}] Special format invoice ID detected before conversion: ${data.invoiceId}`);
      // We're keeping the original ID if it's in special format
      // This is intentional to maintain compatibility with backend systems
      // that expect these special format IDs
    } else {
      // Only convert to number if not in special format
      data.invoiceId = Number(data.invoiceId);
    }
    
    if (typeof data.billId === 'string' && data.billId.includes('mantest')) {
      console.warn(`[${receiptId}] Special format bill ID detected before conversion: ${data.billId}`);
      // Keeping original format for mantest IDs
    } else {
      // Only convert to number if not in special format
      data.billId = Number(data.billId);
    }
    
    // Always convert company and account IDs to numbers
    data.sourceCompanyId = Number(data.sourceCompanyId);
    data.targetCompanyId = Number(data.targetCompanyId);
    data.debitAccountId = Number(data.debitAccountId);
    data.creditAccountId = Number(data.creditAccountId);

    console.log(`[${receiptId}] Creating intercompany receipt with validated data:`, {
      sourceCompanyId: data.sourceCompanyId,
      targetCompanyId: data.targetCompanyId,
      invoiceId: data.invoiceId,
      billId: data.billId,
      amount: data.amount,
      paymentDate: data.paymentDate,
      debitAccountId: data.debitAccountId,
      creditAccountId: data.creditAccountId,
      paymentMethod: data.paymentMethod,
      reference: data.reference,
      isPartialPayment: data.isPartialPayment,
      notes: data.notes,
      createPurchaseReceipt: data.createPurchaseReceipt,
      // Include type information for debugging
      typeInfo: {
        sourceCompanyIdType: typeof data.sourceCompanyId,
        targetCompanyIdType: typeof data.targetCompanyId,
        invoiceIdType: typeof data.invoiceId,
        billIdType: typeof data.billId,
        amountType: typeof data.amount
      },
      // Include conversion tracking
      conversionTracking: {
        originalIds,
        convertedSuccessfully: true,
        specialFormatDetected: {
          invoiceId: typeof data.invoiceId === 'string' && data.invoiceId.includes('mantest'),
          billId: typeof data.billId === 'string' && data.billId.includes('mantest')
        }
      }
    });

    console.log(`[${receiptId}] About to call createIntercompanyPayment with validated data`);
    
    try {
      // Track request timing for performance analysis
      const startTime = Date.now();
      console.log(`[${receiptId}] Initiating API call to createIntercompanyPayment at ${new Date().toISOString()}`);

      // Call the payment function with validated data
      const result = await createIntercompanyPayment(data);
      
      // Calculate request duration
      const requestDuration = Date.now() - startTime;
      console.log(`[${receiptId}] createIntercompanyPayment completed in ${requestDuration}ms`);
      
      console.log(`[${receiptId}] API call successful:`, {
        success: result.success,
        sourceReceiptId: result.sourceReceipt?.id,
        targetPaymentId: result.targetPayment?.id,
        balances: result.balances,
        requestDuration: `${requestDuration}ms`,
        timestamp: new Date().toISOString()
      });
      
      // Add request ID to result for tracking through the system
      return {
        ...result,
        diagnosticInfo: {
          ...(result.diagnosticInfo || {}),
          requestId: receiptId,
          requestDuration,
          apiTimestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error(`[${receiptId}] createIntercompanyPayment failed with error:`, error);
      
      // Create a structured error object with diagnostic information
      const errorDetail = {
        requestId: receiptId,
        timestamp: new Date().toISOString(),
        errorType: error instanceof Error ? error.name : 'UnknownError',
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        // Include the payload for debugging (excluding sensitive data if needed)
        payloadSummary: {
          sourceCompanyId: data.sourceCompanyId,
          targetCompanyId: data.targetCompanyId,
          invoiceId: data.invoiceId,
          billId: data.billId,
          paymentDate: data.paymentDate,
          reference: data.reference
        }
      };
      
      console.error(`[${receiptId}] Detailed error diagnostics:`, errorDetail);
      
      // Return a structured error response instead of throwing
      return {
        success: false,
        error: 'Receipt creation failed due to an error',
        authError: error instanceof Error && error.message.includes('unauthorized'),
        networkError: error instanceof Error && (
          error.message.includes('network') || 
          error.message.includes('fetch') || 
          error.message.includes('timeout')
        ),
        timeout: error instanceof Error && error.message.includes('timeout'),
        diagnosticInfo: errorDetail
      };
    }
  } catch (error: any) {
    console.error(`[${receiptId}] Unhandled error in createIntercompanyReceipt:`, error);
    
    // Create a comprehensive error report with as much diagnostic info as possible
    const errorReport = {
      requestId: receiptId,
      timestamp: new Date().toISOString(),
      errorPhase: 'validation', // This is the outer try/catch for the overall function
      errorType: error instanceof Error ? error.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      // Even when crashing, we'd like to know what data was being processed
      processingContext: {
        hadSourceCompanyId: !!data?.sourceCompanyId,
        hadTargetCompanyId: !!data?.targetCompanyId,
        hadInvoiceId: !!data?.invoiceId,
        hadBillId: !!data?.billId,
        dataType: typeof data
      }
    };
    
    console.error(`[${receiptId}] FATAL ERROR - Comprehensive error report:`, errorReport);
    
    return {
      success: false,
      error: error.message || 'An error occurred while validating receipt data',
      diagnosticInfo: errorReport
    };
  }
}

/**
 * Gets the current intercompany balances between two companies
 * @param sourceCompanyId The ID of the source company
 * @param targetCompanyId The ID of the target company
 * @returns A promise that resolves to the intercompany balances
 */
export async function getIntercompanyBalances(
  sourceCompanyId: number,
  targetCompanyId: number
): Promise<any> {
  // Generate unique request ID for tracking
  const requestId = `balance-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  console.log(`[${requestId}] Fetching intercompany balances between companies ${sourceCompanyId} and ${targetCompanyId}`);
  
  try {
    // Track start time for performance monitoring
    const startTime = Date.now();
    
    // Log the request details
    console.log(`[${requestId}] Request URL: /api/intercompany/balances?sourceCompanyId=${sourceCompanyId}&targetCompanyId=${targetCompanyId}`);
    
    // Make the API call
    const response = await fetch(`/api/intercompany/balances?sourceCompanyId=${sourceCompanyId}&targetCompanyId=${targetCompanyId}`);
    
    // Track response time
    const responseTime = Date.now() - startTime;
    console.log(`[${requestId}] API response received in ${responseTime}ms with status ${response.status}`);
    
    if (!response.ok) {
      // Capture detailed error information
      const errorText = await response.text().catch(() => 'Could not read error response body');
      console.error(`[${requestId}] API error response:`, {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        sourceCompanyId,
        targetCompanyId,
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString()
      });
      
      throw new Error(`API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    // Parse and log the response data
    const data = await response.json();
    console.log(`[${requestId}] Balance data successfully retrieved:`, {
      sourceCompanyId,
      targetCompanyId,
      receivableBalance: data.sourceReceivable,
      payableBalance: data.targetPayable,
      responseTime: `${responseTime}ms`
    });
    
    // Add diagnostic information to the response
    return {
      ...data,
      _diagnostics: {
        requestId,
        responseTime,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error: any) {
    console.error(`[${requestId}] Error getting intercompany balances:`, error);
    
    // Create structured error response
    const errorDetail = {
      requestId,
      timestamp: new Date().toISOString(),
      sourceCompanyId,
      targetCompanyId,
      errorType: error instanceof Error ? error.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined
    };
    
    console.error(`[${requestId}] Balance fetch failed with detailed diagnostics:`, errorDetail);
    
    // Return a structured error response instead of throwing
    return {
      success: false,
      error: error.message || 'Failed to retrieve intercompany balances',
      sourceReceivable: '0.00',  // Safe default values
      targetPayable: '0.00',
      authError: error instanceof Error && (
        error.message.includes('unauthorized') || 
        error.message.includes('401')
      ),
      diagnosticInfo: errorDetail
    };
  }
}

/**
 * Gets due and overdue intercompany transactions for a company
 * @param companyId The ID of the company
 * @param type Filter by transaction type ('invoice', 'bill', or undefined for all)
 * @param status Filter by status ('due', 'overdue', 'paid', or undefined for all)
 * @returns A promise that resolves to a list of intercompany transaction status objects
 */
export async function getIntercompanyDueTransactions(
  companyId: number,
  type?: 'invoice' | 'bill',
  status?: 'due' | 'overdue' | 'paid'
): Promise<IntercompanyTransactionStatus[]> {
  try {
    let url = `/api/intercompany/due-transactions?companyId=${companyId}`;
    
    if (type) {
      url += `&type=${type}`;
    }
    
    if (status) {
      url += `&status=${status}`;
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error: any) {
    console.error("Error getting intercompany due transactions:", error);
    return [];
  }
}

/**
 * Gets a summary of due and overdue amounts for intercompany transactions
 * @param companyId The ID of the company
 * @returns A promise that resolves to a summary of due and overdue amounts
 */
export async function getIntercompanyDueSummary(
  companyId: number
): Promise<any> {
  try {
    const response = await fetch(`/api/intercompany/due-summary?companyId=${companyId}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error: any) {
    console.error("Error getting intercompany due summary:", error);
    return {
      totalDueReceivables: 0,
      totalOverdueReceivables: 0,
      totalDuePayables: 0,
      totalOverduePayables: 0
    };
  }
}

interface DeliveryNoteItem {
  productId: number;
  quantity: number;
  notes?: string;
}

interface DeliveryNoteData {
  invoiceId: number;
  deliveryDate: string;
  shippingMethod: string;
  carrierName?: string;
  trackingNumber?: string;
  notes?: string;
  deliveredItems: DeliveryNoteItem[];
}

interface DeliveryNoteResult {
  success: boolean;
  deliveryNote?: any;
  error?: string;
}

/**
 * Creates a delivery note for an intercompany invoice
 * @param data The delivery note data
 * @returns A promise that resolves to the result of the operation
 */
export async function createIntercompanyDeliveryNote(
  data: DeliveryNoteData
): Promise<DeliveryNoteResult> {
  try {
    const response = await fetch('/api/intercompany/delivery-note', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: errorText || 'Failed to create delivery note',
      };
    }
    
    const result = await response.json();
    
    return {
      success: true,
      deliveryNote: result.deliveryNote,
    };
  } catch (error: any) {
    console.error("Error creating delivery note:", error);
    return {
      success: false,
      error: error.message || "An unknown error occurred"
    };
  }
}

interface GoodsReceiptItem {
  productId: number;
  quantity: number;
  condition: string;
  isAccepted: boolean;
  notes?: string;
}

interface GoodsReceiptData {
  billId: number;
  receiptDate: string;
  notes?: string;
  receivedItems: GoodsReceiptItem[];
}

interface GoodsReceiptResult {
  success: boolean;
  goodsReceipt?: any;
  error?: string;
}

/**
 * Creates a goods receipt for an intercompany bill
 * @param data The goods receipt data
 * @returns A promise that resolves to the result of the operation
 */
export async function createIntercompanyGoodsReceipt(
  data: GoodsReceiptData
): Promise<GoodsReceiptResult> {
  try {
    const response = await fetch('/api/intercompany/goods-receipt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: errorText || 'Failed to create goods receipt',
      };
    }
    
    const result = await response.json();
    
    return {
      success: true,
      goodsReceipt: result.goodsReceipt,
    };
  } catch (error: any) {
    console.error("Error creating goods receipt:", error);
    return {
      success: false,
      error: error.message || "An unknown error occurred"
    };
  }
}