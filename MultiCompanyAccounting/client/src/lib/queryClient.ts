import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Extract request ID if available
    const requestId = res.headers.get('X-Request-ID') || 
                      (res as any).diagnostics?.requestId || 
                      `err-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
                      
    // Get response text
    let text;
    try {
      text = (await res.text()) || res.statusText;
    } catch (textError) {
      text = `Could not read error response: ${res.statusText}`;
      console.error(`[${requestId}] Error reading response text:`, textError);
    }
    
    // Try to parse JSON error response if it looks like JSON
    let parsedError: any = null;
    if (text.startsWith('{') && text.endsWith('}')) {
      try {
        parsedError = JSON.parse(text);
      } catch (parseError) {
        console.warn(`[${requestId}] Error response looks like JSON but couldn't be parsed:`, parseError);
      }
    }
    
    // Create an enhanced error object with more diagnostic information
    const errorDetails = {
      status: res.status,
      statusText: res.statusText,
      url: res.url,
      requestId,
      timestamp: new Date().toISOString(),
      responseHeaders: Object.fromEntries(res.headers.entries()),
      rawResponse: text.substring(0, 500), // Limit size of error text
      parsedError: parsedError
    };
    
    // Create different error types based on status code
    let error;
    
    // Handle different error types
    switch (res.status) {
      case 401:
        error = new Error(`Authentication Error (401): ${text.substring(0, 100)}`);
        (error as any).authError = true;
        (error as any).loginRequired = true;
        break;
        
      case 403:
        error = new Error(`Permission Denied (403): ${text.substring(0, 100)}`);
        (error as any).permissionError = true;
        break;
        
      case 404:
        error = new Error(`Not Found (404): ${text.substring(0, 100)}`);
        (error as any).notFoundError = true;
        break;
        
      case 409:
        error = new Error(`Conflict Error (409): ${text.substring(0, 100)}`);
        (error as any).conflictError = true;
        break;
        
      case 422:
        error = new Error(`Validation Error (422): ${text.substring(0, 100)}`);
        (error as any).validationError = true;
        
        // Try to extract validation details
        if (parsedError && (parsedError.errors || parsedError.validationErrors)) {
          (error as any).validationDetails = parsedError.errors || parsedError.validationErrors;
        }
        break;
        
      case 500:
      case 502:
      case 503:
      case 504:
        error = new Error(`Server Error (${res.status}): ${text.substring(0, 100)}`);
        (error as any).serverError = true;
        break;
        
      default:
        error = new Error(`${res.status}: ${text.substring(0, 100)}`);
    }
    
    // Add common properties to all errors
    (error as any).status = res.status;
    (error as any).statusText = res.statusText;
    (error as any).requestId = requestId;
    (error as any).timestamp = new Date().toISOString();
    (error as any).details = errorDetails;
    
    // Special handling for payment/accounting errors in our application
    if (text.includes('account') || text.includes('balance') || text.includes('transaction')) {
      (error as any).accountingError = true;
      console.error(`[${requestId}] 📊 ACCOUNTING ERROR: Issue with financial data or calculations`);
    }
    
    // Special handling for special ID formats like mantest
    if (text.includes('mantest') || text.includes('invalid ID') || text.includes('ID not found')) {
      (error as any).idFormatError = true;
      console.error(`[${requestId}] 🆔 ID FORMAT ERROR: Issue with ID format or reference`);
    }
    
    // Add any additional diagnostics from the response
    if ((res as any).diagnostics) {
      (error as any).diagnostics = (res as any).diagnostics;
    }
    
    throw error;
  }
}

// Get the base URL dynamically based on current location
const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
};

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: {
    timeout?: number;
    debug?: boolean;
    requestId?: string;
    retries?: number;
    specialIdHandling?: boolean;
  }
): Promise<Response> {
  const requestId = options?.requestId || `API-req-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const timeout = options?.timeout || 60000; // Default timeout 60 seconds
  const debugMode = options?.debug !== undefined ? options.debug : true; // Enable debugging by default
  const retries = options?.retries || 0; // Default to no retries
  const enableSpecialIdHandling = options?.specialIdHandling !== undefined ? options.specialIdHandling : true;
  
  if (debugMode) {
    console.log(`[${requestId}] 🚀 STARTING ${method} request to ${url}`);
    console.log(`[${requestId}] Timestamp: ${new Date().toISOString()}`);
    if (data) {
      // Special handling for IDs that might be in mantest format
      if (enableSpecialIdHandling && data && typeof data === 'object') {
        // Check if data contains any properties that might need special ID handling
        const dataObj = data as any;
        const idFields = ['id', 'invoiceId', 'billId', 'orderId', 'salesOrderId', 'purchaseOrderId', 'sourceCompanyId', 'targetCompanyId'];
        
        const specialIds = idFields.filter(field => {
          if (field in dataObj && typeof dataObj[field] === 'string' && dataObj[field].includes('mantest')) {
            console.warn(`[${requestId}] ⚠️ Special ID format detected in ${field}: ${dataObj[field]}`);
            return true;
          }
          return false;
        });
        
        if (specialIds.length > 0) {
          console.warn(`[${requestId}] Special ID formats detected in ${specialIds.join(', ')}. Preserving original formats.`);
        }
      }
      
      // Log payload but filter out any sensitive data
      const sensitiveFields = ['password', 'token', 'secret', 'apiKey'];
      const safePayload = { ...((data as any) || {}) };
      
      // Check if payload is an object before filtering
      if (safePayload && typeof safePayload === 'object') {
        // Filter out sensitive fields
        sensitiveFields.forEach(field => {
          if (field in safePayload) {
            safePayload[field] = '********';
          }
        });
      }
      
      console.log(`[${requestId}] Request payload:`, safePayload);
    }
  }
  
  // Create a timeout promise
  const timeoutPromise = new Promise<Response>((_, reject) => {
    setTimeout(() => {
      const timeoutError = new Error(`Request timeout after ${timeout}ms`);
      (timeoutError as any).isTimeout = true;
      (timeoutError as any).requestId = requestId;
      (timeoutError as any).diagnosticInfo = {
        url,
        method,
        timeout,
        timestamp: new Date().toISOString()
      };
      reject(timeoutError);
    }, timeout);
  });
  
  // Start performance tracking
  const startTime = performance.now();
  
  try {
    // Pre-process data - special handling for ID formats
    let processedData = data;
    if (enableSpecialIdHandling && data && typeof data === 'object') {
      processedData = { ...((data as any) || {}) };
      // Preserve special ID formats in problematic fields
      if (debugMode && processedData) {
        Object.entries(processedData as any).forEach(([key, value]) => {
          if (
            (key.includes('Id') || key === 'id') && 
            typeof value === 'string' && 
            value.includes('mantest')
          ) {
            console.warn(`[${requestId}] Preserving special ID format for ${key}: ${value}`);
            // No transformation needed here, we're preserving the string format
          }
        });
      }
    }
    
    // Ensure URL is absolute by prepending base URL if needed
    const fullUrl = url.startsWith('http') ? url : `${getBaseUrl()}${url}`;
    
    // Race the fetch against the timeout
    const res = await Promise.race([
      fetch(fullUrl, {
        method,
        headers: processedData ? { 
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-Request-ID": requestId, // Add request ID to headers for server-side tracing
          "X-Client-Timestamp": new Date().toISOString()
        } : {
          "Accept": "application/json",
          "X-Request-ID": requestId,
          "X-Client-Timestamp": new Date().toISOString()
        },
        body: processedData ? JSON.stringify(processedData) : undefined,
        credentials: "include",
      }),
      timeoutPromise
    ]);
    
    // Calculate response time
    const responseTime = performance.now() - startTime;
    
    if (debugMode) {
      console.log(`[${requestId}] ✅ Response received in ${responseTime.toFixed(2)}ms`);
      console.log(`[${requestId}] Status: ${res.status} ${res.statusText}`);
    }
    
    // Track errors
    if (!res.ok) {
      const errorText = await res.text();
      if (debugMode) {
        console.error(`[${requestId}] ❌ Error response (${res.status}):`, errorText);
      }
      
      // Enhanced error diagnostic information
      const errorDiagnostics = {
        requestId,
        url,
        method,
        statusCode: res.status,
        statusText: res.statusText,
        responseTime: `${responseTime.toFixed(2)}ms`,
        timestamp: new Date().toISOString(),
        headers: Object.fromEntries(res.headers.entries()),
        errorResponse: errorText.substring(0, 500) // Limit size of error response
      };
      
      // Reset the response body since we already consumed it
      const errorResponse = new Response(errorText, {
        status: res.status,
        statusText: res.statusText,
        headers: res.headers,
      });
      
      // Attach diagnostics to the response object for error handlers
      (errorResponse as any).diagnostics = errorDiagnostics;
      
      await throwIfResNotOk(errorResponse);
      return errorResponse;
    }
    
    // Success response
    if (debugMode && responseTime > 1000) {
      console.warn(`[${requestId}] ⚠️ Slow API call (${responseTime.toFixed(2)}ms) to ${url}`);
    }
    
    // Attach performance metrics to successful response
    (res as any).metrics = {
      requestId,
      responseTime: responseTime.toFixed(2),
      timestamp: new Date().toISOString()
    };
    
    await throwIfResNotOk(res);
    return res;
  } catch (error: any) {
    // Calculate time when error occurred
    const errorTime = performance.now() - startTime;
    
    // Create comprehensive error diagnostic info
    const errorDiagnostics = {
      requestId,
      url,
      method,
      errorTime: `${errorTime.toFixed(2)}ms`,
      timestamp: new Date().toISOString(),
      errorType: error.name || 'Unknown',
      errorMessage: error.message || 'Unknown error',
      isTimeout: !!error.isTimeout,
      isNetworkError: error instanceof TypeError && error.message.includes('fetch')
    };
    
    if (debugMode) {
      console.error(`[${requestId}] 💥 Request failed after ${errorTime.toFixed(2)}ms:`);
      console.error(`[${requestId}] Error:`, error.message);
      if (error.stack) {
        console.error(`[${requestId}] Stack:`, error.stack);
      }
      
      if (error.isTimeout) {
        console.error(`[${requestId}] 🕒 TIMEOUT ERROR: Request exceeded ${timeout}ms limit`);
      }
      
      // Log the full diagnostic info
      console.error(`[${requestId}] Diagnostic information:`, errorDiagnostics);
    }
    
    // Enhance error object with diagnostic information
    error.requestId = requestId;
    error.diagnosticInfo = errorDiagnostics;
    
    // Flag different error types
    if (error.isTimeout) {
      error.timeout = true;
    }
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      (error as any).networkError = true;
      if (debugMode) {
        console.error(`[${requestId}] 📡 NETWORK ERROR: Could not reach the server`);
      }
    }
    
    // Ensure authentication errors are properly flagged
    if (error.message && (error.message.includes('401') || error.message.toLowerCase().includes('unauthorized'))) {
      error.authError = true;
      if (debugMode) {
        console.error(`[${requestId}] 🔒 AUTHENTICATION ERROR: User needs to log in again`);
      }
    }
    
    // Implement retry logic if specified
    if (retries > 0 && !error.authError) { // Don't retry auth errors
      console.warn(`[${requestId}] Retrying failed request. Attempts remaining: ${retries}`);
      return apiRequest(method, url, data, {
        ...options,
        retries: retries - 1,
        requestId: `${requestId}-retry-${retries}`
      });
    }
    
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";

export interface QueryFnOptions {
  on401: UnauthorizedBehavior;
  debug?: boolean;
  timeout?: number;
  retries?: number;
  enableSpecialIdHandling?: boolean;
}

export const getQueryFn: <T>(options: QueryFnOptions) => QueryFunction<T> =
  ({ 
    on401: unauthorizedBehavior, 
    debug = true, 
    timeout = 60000, 
    retries = 0,
    enableSpecialIdHandling = true 
  }) =>
  async ({ queryKey }) => {
    const requestId = `Query-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const startTime = performance.now();
    
    if (debug) {
      console.log(`[${requestId}] 🔍 Starting query for: ${queryKey[0]}`);
      if (queryKey.length > 1) {
        console.log(`[${requestId}] Query parameters:`, queryKey.slice(1));
      }
    }
    
    try {
      // Create a timeout promise for the fetch operation
      const timeoutPromise = new Promise<Response>((_, reject) => {
        setTimeout(() => {
          const timeoutError = new Error(`Query timeout after ${timeout}ms`);
          (timeoutError as any).isTimeout = true;
          (timeoutError as any).requestId = requestId;
          (timeoutError as any).queryKey = queryKey;
          reject(timeoutError);
        }, timeout);
      });
      
      // Ensure URL is absolute by prepending base URL if needed
      const queryUrl = (queryKey[0] as string).startsWith('http') ? 
        queryKey[0] as string : 
        `${getBaseUrl()}${queryKey[0] as string}`;
      
      // Race the fetch against the timeout
      const res = await Promise.race([
        fetch(queryUrl, {
          credentials: "include",
          headers: {
            "Accept": "application/json",
            "X-Request-ID": requestId,
            "X-Client-Timestamp": new Date().toISOString(),
          }
        }),
        timeoutPromise
      ]);
      
      const responseTime = performance.now() - startTime;
      
      if (debug) {
        console.log(`[${requestId}] ✅ Query response received in ${responseTime.toFixed(2)}ms`);
        console.log(`[${requestId}] Status: ${res.status} ${res.statusText}`);
      }
      
      if (debug && responseTime > 1000) {
        console.warn(`[${requestId}] ⚠️ Slow query (${responseTime.toFixed(2)}ms) for: ${queryKey[0]}`);
      }
      
      // Special handling for 401 depending on the specified behavior
      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        if (debug) {
          console.warn(`[${requestId}] 🔒 Authentication required, returning null as requested`);
        }
        return null;
      }
      
      // Check for error responses
      if (!res.ok) {
        const errorText = await res.text();
        if (debug) {
          console.error(`[${requestId}] ❌ Error response (${res.status}):`, errorText.substring(0, 200));
        }
        
        // Create enhanced error diagnostics
        const errorDiagnostics = {
          requestId,
          queryKey,
          statusCode: res.status,
          statusText: res.statusText,
          responseTime: `${responseTime.toFixed(2)}ms`,
          timestamp: new Date().toISOString(),
        };
        
        // Reset the response body since we already consumed it
        const errorResponse = new Response(errorText, {
          status: res.status,
          statusText: res.statusText,
          headers: res.headers,
        });
        
        // Attach diagnostics to the response object for error handlers
        (errorResponse as any).diagnostics = errorDiagnostics;
        
        // Throw using our enhanced error handler
        await throwIfResNotOk(errorResponse);
      }
      
      // Parse the JSON response with error handling
      let data;
      try {
        // Get the response text first to check if it's HTML
        const responseText = await res.clone().text();
        
        // Check if it looks like HTML
        if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
          if (debug) {
            console.error(`[${requestId}] 📄 Received HTML instead of JSON:`, responseText.substring(0, 100));
          }
          
          // Create diagnostic error info
          const htmlError = new Error(`Received HTML instead of JSON: ${responseText.substring(0, 100)}`);
          (htmlError as any).requestId = requestId;
          (htmlError as any).queryKey = queryKey;
          (htmlError as any).responseStatus = res.status;
          (htmlError as any).isHtmlResponse = true;
          (htmlError as any).diagnostics = {
            errorTime: `${(performance.now() - startTime).toFixed(2)}ms`,
            timestamp: new Date().toISOString(),
            errorType: 'HTML Response',
            queryKey
          };
          
          // If we're expecting JSON but got HTML, this might be a session issue
          // For API queries, return null to allow the user to be redirected to login
          if (unauthorizedBehavior === "returnNull") {
            console.warn(`[${requestId}] 🔒 HTML response detected, returning null to trigger auth flow`);
            return null;
          }
          
          throw htmlError;
        }
        
        // If it's not HTML, parse the original response as JSON
        data = await res.json();
      } catch (parseError: any) {
        if (debug) {
          console.error(`[${requestId}] 📄 JSON parsing error:`, parseError.message);
          console.error(`[${requestId}] Diagnostic information:`, {
            requestId,
            queryKey,
            errorTime: `${(performance.now() - startTime).toFixed(2)}ms`,
            timestamp: new Date().toISOString(),
            errorType: parseError.constructor.name,
            errorMessage: parseError.message
          });
        }
        
        // Enhance the parse error with query information
        (parseError as any).requestId = requestId;
        (parseError as any).queryKey = queryKey;
        (parseError as any).responseStatus = res.status;
        (parseError as any).parsingError = true;
        
        throw parseError;
      }
      
      // Special ID handling for our application - detect and warn about problematic ID formats
      if (enableSpecialIdHandling && data) {
        const processData = (obj: any, path = '') => {
          if (!obj || typeof obj !== 'object') return;
          
          Object.entries(obj).forEach(([key, value]) => {
            const currentPath = path ? `${path}.${key}` : key;
            
            // Check for special ID formats
            if (
              (key.includes('Id') || key === 'id') && 
              typeof value === 'string' && 
              value.includes('mantest')
            ) {
              if (debug) {
                console.warn(`[${requestId}] ⚠️ Found special ID format in response at ${currentPath}: ${value}`);
              }
            }
            
            // Recursively process nested objects and arrays
            if (value && typeof value === 'object') {
              processData(value, currentPath);
            }
          });
        };
        
        processData(data);
      }
      
      if (debug) {
        console.log(`[${requestId}] ✅ Query completed successfully`);
      }
      
      return data;
    } catch (error: any) {
      const errorTime = performance.now() - startTime;
      
      // Create comprehensive error diagnostic info
      const errorDiagnostics = {
        requestId,
        queryKey,
        errorTime: `${errorTime.toFixed(2)}ms`,
        timestamp: new Date().toISOString(),
        errorType: error.name || 'Unknown',
        errorMessage: error.message || 'Unknown error',
      };
      
      if (debug) {
        console.error(`[${requestId}] 💥 Query failed after ${errorTime.toFixed(2)}ms:`, error.message);
        console.error(`[${requestId}] Diagnostic information:`, errorDiagnostics);
      }
      
      // Enhance error object with diagnostic information
      (error as any).requestId = requestId;
      (error as any).queryKey = queryKey;
      (error as any).diagnosticInfo = errorDiagnostics;
      
      // Special flag for timeouts
      if ((error as any).isTimeout) {
        if (debug) {
          console.error(`[${requestId}] 🕒 TIMEOUT ERROR: Query exceeded ${timeout}ms limit`);
        }
      }
      
      // Special handling for authorization errors
      if (error.message && (error.message.includes('401') || error.message.toLowerCase().includes('unauthorized'))) {
        (error as any).authError = true;
        
        if (debug) {
          console.error(`[${requestId}] 🔒 AUTHENTICATION ERROR: User needs to log in again`);
        }
      }
      
      // Retry logic for queries
      if (retries > 0 && !(error as any).authError) {
        if (debug) {
          console.warn(`[${requestId}] 🔄 Retrying failed query. Attempts remaining: ${retries}`);
        }
        
        // Wait a bit before retrying (incremental backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * (1 + (3 - retries))));
        
        // Simple retry by calling fetch again instead of using recursive getQueryFn
        try {
          const retryRes = await fetch(queryKey[0] as string, {
            credentials: "include",
            headers: {
              "X-Request-ID": `${requestId}-retry-${retries}`,
              "X-Client-Timestamp": new Date().toISOString(),
              "X-Retry-Count": String(retries)
            }
          });
          
          if (!retryRes.ok) {
            if (unauthorizedBehavior === "returnNull" && retryRes.status === 401) {
              if (debug) {
                console.warn(`[${requestId}-retry] Authentication required on retry, returning null as requested`);
              }
              return null;
            }
            throw new Error(`Retry failed with status ${retryRes.status}`);
          }
          
          if (debug) {
            console.log(`[${requestId}-retry] ✅ Retry successful`);
          }
          
          return await retryRes.json();
        } catch (retryError) {
          if (debug) {
            console.error(`[${requestId}-retry] ❌ Retry also failed:`, retryError);
          }
          // Continue with the original error
        }
      }
      
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ 
        on401: "throw",
        debug: true,
        timeout: 60000,
        retries: 1,
        enableSpecialIdHandling: true
      }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
