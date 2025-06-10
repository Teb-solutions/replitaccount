import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useCompany } from "@/hooks/use-company";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/utils";

type ReceiptEligibleTransaction = {
  id: number;
  transaction_id?: number;
  source_invoice_id?: number;
  target_bill_id?: number;
  reference_number?: string;
  source_invoice_number?: string;
  transaction_date: string;
  company_id?: number;
  customer_id?: number;
  customer_name?: string;
  source_company_id?: number;
  target_company_id?: number;
  source_company_name?: string;
  target_company_name?: string;
  amount: string;
  status?: string;
  paid_amount?: string;
  remaining_amount?: string;
  sales_order_id?: number;
  sales_order_number?: string;
  is_intercompany?: boolean;
  intercompany_transaction_id?: number;
};

export default function IntercompanyReceiptEligibleTransactions() {
  const [, navigate] = useLocation();
  const { activeCompany } = useCompany();
  const { toast } = useToast();
  const [companyType, setCompanyType] = useState<string>('all');

  // Query for eligible transactions - use the endpoint that's actually working
  const { data: eligibleTransactions, isLoading } = useQuery<ReceiptEligibleTransaction[]>({
    queryKey: ['/api/intercompany-receipt-eligible-transactions', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) {
        throw new Error("No active company");
      }
      
      let apiAttempts = 0;
      const MAX_API_ATTEMPTS = 3;
      
      // Try our most reliable direct API endpoint first
      try {
        apiAttempts++;
        console.log(`Using direct intercompany receipt API for company ID: ${activeCompany.id} (Attempt: ${apiAttempts}/${MAX_API_ATTEMPTS})`);
        const directRes = await apiRequest(
          'GET',
          `/api/direct-intercompany-receipt-eligible-transactions?companyId=${activeCompany.id}`
        );
        
        if (directRes.ok) {
          try {
            // Get as text first to safely check for HTML content
            const responseText = await directRes.text();
            
            // Check if response is HTML
            if (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html>')) {
              console.log('Direct API returned HTML instead of JSON, trying alternate approach');
            } else {
              // Parse JSON response if it's not HTML
              try {
                const directData = JSON.parse(responseText);
                console.log(`Got ${directData.length} transactions from direct API`);
                
                if (directData && Array.isArray(directData) && directData.length > 0) {
                  return directData;
                }
              } catch (parseError) {
                console.error("Error parsing direct API JSON response:", parseError);
              }
            }
          } catch (textError) {
            console.error("Error processing direct API response:", textError);
          }
        }
      } catch (directError) {
        console.error("Error fetching from receipt-eligible-transactions-direct API:", directError);
        // Continue with alternative API if direct API fails
      }
      
      // This part was using an API that doesn't exist anymore
      // We've already tried the direct intercompany receipt API above
      try {
        apiAttempts++;
        console.log(`Using another API attempt for company ID: ${activeCompany.id} (Attempt: ${apiAttempts}/${MAX_API_ATTEMPTS})`);
        const directRes = await apiRequest(
          'GET',
          `/api/direct-intercompany-receipt-eligible-transactions?companyId=${activeCompany.id}`
        );
        
        if (directRes.ok) {
          try {
            // Get as text first to safely check for HTML content
            const responseText = await directRes.text();
            
            // Check if response is HTML
            if (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html>')) {
              console.log('Direct API returned HTML instead of JSON, trying next approach');
            } else {
              // Parse JSON response if it's not HTML
              try {
                const directData = JSON.parse(responseText);
                console.log(`Got ${directData.length} transactions from direct company transactions API`);
                
                if (directData && Array.isArray(directData) && directData.length > 0) {
                  return directData;
                }
              } catch (parseError) {
                console.error("Error parsing direct company transactions API JSON response:", parseError);
              }
            }
          } catch (textError) {
            console.error("Error processing direct company transactions API response:", textError);
          }
        }
      } catch (directError) {
        console.error("Error fetching from direct company transactions API:", directError);
        // Continue with regular API if direct API fails
      }
      
      console.log(`Fetching eligible transactions for company ID: ${activeCompany.id}`);
      
      try {
        const res = await apiRequest(
          'GET', 
          `/api/intercompany-receipt-eligible-transactions?companyId=${activeCompany.id}`
        );
        
        if (!res.ok) {
          const errorData = await res.text();
          console.error("Error fetching eligible transactions:", errorData);
          throw new Error(`Failed to fetch eligible transactions: ${res.statusText}`);
        }
        
        try {
          let data;
          const text = await res.text();
          
          try {
            // Better check for HTML content first
            if (text.includes('<!DOCTYPE html>') || text.includes('<html>')) {
              console.log('Response appears to be HTML, not JSON. Switching to direct API');
              try {
                const directRes2 = await apiRequest(
                  'GET',
                  `/api/direct-company-transactions?companyId=${activeCompany.id}`
                );
                
                if (directRes2.ok) {
                  // Ensure this response is also not HTML
                  const directText = await directRes2.text();
                  
                  if (directText.includes('<!DOCTYPE html>') || directText.includes('<html>')) {
                    console.log('Direct API also returned HTML');
                    return [];
                  }
                  
                  try {
                    const directData2 = JSON.parse(directText);
                    console.log(`Got ${directData2.length} transactions from direct API (HTML fallback)`);
                    
                    if (directData2 && Array.isArray(directData2) && directData2.length > 0) {
                      return directData2;
                    }
                  } catch (parseErr) {
                    console.error("Error parsing direct API response:", parseErr);
                  }
                }
              } catch (err) {
                console.error("Error in direct API attempt (HTML fallback):", err);
              }
              return [];
            }
            
            // If not HTML, try to parse as JSON
            data = JSON.parse(text);
            console.log("Successfully parsed intercompany transactions:", data);
          } catch (parseError) {
            console.error("JSON parse error:", parseError);
            
            // Try the direct API again as a last resort
            console.log('JSON parse error, trying direct API again');
            try {
              const directRes2 = await apiRequest(
                'GET',
                `/api/direct-company-transactions?companyId=${activeCompany.id}`
              );
              
              if (directRes2.ok) {
                // Get as text first to safely check content type
                const directText = await directRes2.text();
                let directData2;
                
                try {
                  directData2 = JSON.parse(directText);
                  console.log(`Got ${directData2.length} transactions from direct API (second attempt)`);
                  
                  if (directData2 && Array.isArray(directData2) && directData2.length > 0) {
                    return directData2;
                  }
                } catch (parseErr) {
                  console.error("Error parsing direct API response:", parseErr);
                }
              }
            } catch (err) {
              console.error("Error in second direct API attempt:", err);
            }
            
            // Return empty array for other companies if we can't parse the JSON
            return [];
          }
          
          // Check if this is the empty transactions data or not
          if (data && Array.isArray(data)) {
            console.log(`Found ${data.length} intercompany receipt-eligible transactions`);
            if (data.length === 0) {
              console.log('No transactions found via regular API');
              // Try direct API as a last resort for empty results
              try {
                const directRes2 = await apiRequest(
                  'GET',
                  `/api/direct-company-transactions?companyId=${activeCompany.id}`
                );
                
                if (directRes2.ok) {
                  const directData2 = await directRes2.json();
                  console.log(`Got ${directData2.length} transactions from direct API (empty results fallback)`);
                  
                  if (directData2 && Array.isArray(directData2) && directData2.length > 0) {
                    return directData2;
                  }
                }
              } catch (err) {
                console.error("Error in direct API attempt (empty results fallback):", err);
              }
            }
          } else {
            console.log("Unexpected data format for intercompany transactions:", typeof data, data);
            
            // Try direct API again for unexpected formats
            console.log('Unexpected format, trying direct API as fallback');
            try {
              const directRes3 = await apiRequest(
                'GET',
                `/api/direct-company-transactions?companyId=${activeCompany.id}`
              );
              
              if (directRes3.ok) {
                const directData3 = await directRes3.json();
                console.log(`Got ${directData3.length} transactions from direct API (unexpected format fallback)`);
                
                if (directData3 && Array.isArray(directData3) && directData3.length > 0) {
                  return directData3;
                }
              }
            } catch (err) {
              console.error("Error in direct API attempt (unexpected format fallback):", err);
            }
            
            // Return empty array for other companies
            return [];
          }
          
          return data;
        } catch (error) {
          console.error("Error handling intercompany transaction response:", error);
          
          // Try direct API again for errors
          console.log('Error encountered, trying direct API as error fallback');
          try {
            const directRes4 = await apiRequest(
              'GET',
              `/api/direct-company-transactions?companyId=${activeCompany.id}`
            );
            
            if (directRes4.ok) {
              const directData4 = await directRes4.json();
              console.log(`Got ${directData4.length} transactions from direct API (error fallback)`);
              
              if (directData4 && Array.isArray(directData4) && directData4.length > 0) {
                return directData4;
              }
            }
          } catch (err) {
            console.error("Error in direct API attempt (error fallback):", err);
          }
          
          return [];
        }
      } catch (fetchError) {
        console.error("Fetch error:", fetchError);
        
        // Try direct API as a last resort for fetch errors
        console.log('Fetch error occurred, trying direct API as final fallback');
        try {
          const directRes5 = await apiRequest(
            'GET',
            `/api/direct-company-transactions?companyId=${activeCompany.id}`
          );
          
          if (directRes5.ok) {
            const directData5 = await directRes5.json();
            console.log(`Got ${directData5.length} transactions from direct API (fetch error fallback)`);
            
            if (directData5 && Array.isArray(directData5) && directData5.length > 0) {
              return directData5;
            }
          }
        } catch (err) {
          console.error("Error in direct API attempt (fetch error fallback):", err);
        }
        
        return [];
      }
    },
    enabled: !!activeCompany?.id,
    retry: 1,
    staleTime: 5000,
    refetchOnWindowFocus: true,
  });

  // Normal receipts for non-intercompany transactions
  const { data: normalEligibleTransactions, isLoading: isLoadingNormalTransactions } = useQuery<ReceiptEligibleTransaction[]>({
    queryKey: ['/api/receipt-eligible-transactions', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) {
        throw new Error("No active company");
      }
      
      console.log(`Fetching normal eligible transactions for company ID: ${activeCompany.id}`);
      const res = await apiRequest(
        'GET', 
        `/api/receipt-eligible-transactions?companyId=${activeCompany.id}`
      );
      
      if (!res.ok) {
        const errorData = await res.text();
        console.error("Error fetching normal eligible transactions:", errorData);
        throw new Error(`Failed to fetch normal eligible transactions: ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log("Received normal eligible transactions:", data);
      return data;
    },
    enabled: !!activeCompany?.id,
    retry: 1,
    staleTime: 5000,
    refetchOnWindowFocus: true,
  });

  // Function to handle creating a receipt for a transaction
  const handleCreateReceipt = (transaction: ReceiptEligibleTransaction) => {
    console.log("Creating receipt for transaction:", transaction);
    
    if (transaction.is_intercompany || transaction.intercompany_transaction_id) {
      // For intercompany transactions
      navigate(`/intercompany-receipt-form?transactionId=${transaction.transaction_id || transaction.intercompany_transaction_id}&invoiceId=${transaction.source_invoice_id}`);
    } else {
      // For normal invoices
      navigate(`/receipt-form?invoiceId=${transaction.id}`);
    }
  };

  // Filtered transactions based on the selected company type
  const filteredTransactions = () => {
    // Combine both transaction types
    const allTransactions = [
      ...(eligibleTransactions || []),
      ...(normalEligibleTransactions || [])
    ];
    
    // Filter based on company type
    if (companyType === 'source') {
      return allTransactions.filter(t => t.source_company_id === activeCompany?.id);
    } else if (companyType === 'target') {
      return allTransactions.filter(t => t.target_company_id === activeCompany?.id);
    } else {
      return allTransactions;
    }
  };

  return (
    <Layout>
      <div className="p-4 md:p-6">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Receipt Eligible Transactions</CardTitle>
            <CardDescription>
              Transactions that can have receipts created for them
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-4">
                <Select
                  value={companyType}
                  onValueChange={(value) => setCompanyType(value)}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by company role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Transactions</SelectItem>
                    <SelectItem value="source">As Source Company</SelectItem>
                    <SelectItem value="target">As Target Company</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => navigate('/intercompany-transactions')}>
                Back to Transactions
              </Button>
            </div>

            {isLoading || isLoadingNormalTransactions ? (
              <div className="text-center py-8">Loading transactions...</div>
            ) : filteredTransactions().length === 0 ? (
              <div className="text-center py-8">
                No eligible transactions found for receipt creation.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Invoice/Bill</TableHead>
                      <TableHead>Payment Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions().map((transaction) => (
                      <TableRow key={`${transaction.id || transaction.transaction_id}-${transaction.reference_number || transaction.source_invoice_number}`}>
                        <TableCell>
                          {formatDate(transaction.transaction_date)}
                        </TableCell>
                        <TableCell>
                          {transaction.reference_number || transaction.source_invoice_number || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {transaction.source_company_name || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {transaction.target_company_name || transaction.customer_name || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(parseFloat(transaction.amount || '0'))}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {transaction.source_invoice_id ? (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                Invoice #{transaction.source_invoice_id}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-yellow-50">No Invoice</Badge>
                            )}
                            {transaction.target_bill_id && (
                              <Badge variant="outline" className="bg-purple-50 text-purple-700">
                                Bill #{transaction.target_bill_id}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {parseFloat(transaction.paid_amount || '0') > 0 ? (
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                {formatCurrency(parseFloat(transaction.paid_amount || '0'))} Paid
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-red-50 text-red-700">Unpaid</Badge>
                            )}
                            {parseFloat(transaction.remaining_amount || '0') > 0 && (
                              <span className="text-xs text-gray-500">
                                Remaining: {formatCurrency(parseFloat(transaction.remaining_amount || '0'))}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => handleCreateReceipt(transaction)}
                            disabled={!transaction.source_invoice_id || parseFloat(transaction.remaining_amount || transaction.amount || '0') <= 0}
                          >
                            Create Receipt
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}