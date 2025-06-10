import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCompany } from "@/hooks/use-company";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Loader2, Eye, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";

// Status badge variants for different statuses
const getStatusBadge = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'draft':
      return <Badge variant="outline">Draft</Badge>;
    case 'confirmed':
      return <Badge variant="default">Confirmed</Badge>;
    case 'open':
      return <Badge className="bg-blue-500 text-white">Open</Badge>;
    case 'paid':
      return <Badge className="bg-green-500 text-white">Paid</Badge>;
    case 'partially_paid':
      return <Badge className="bg-amber-500 text-white">Partially Paid</Badge>;
    case 'overdue':
      return <Badge variant="destructive">Overdue</Badge>;
    case 'cancelled':
      return <Badge variant="destructive">Cancelled</Badge>;
    default:
      return <Badge variant="outline">{status || 'Unknown'}</Badge>;
  }
};

export default function InvoiceReceiptSummary() {
  const [activeTab, setActiveTab] = useState("salesInvoices");
  const { activeCompany } = useCompany();
  
  // Query for sales invoices
  const { data: salesInvoices, isLoading: isLoadingSalesInvoices } = useQuery({
    queryKey: ["/api/invoices/summary", activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) return [];
      console.log("Fetching invoices for company ID:", activeCompany.id);
      
      const response = await apiRequest("GET", `/api/invoices/summary?companyId=${activeCompany.id}`);
      if (!response.ok) {
        console.error("Failed to fetch sales invoices:", response.status);
        return [];
      }
      
      const data = await response.json();
      console.log("Invoice data received:", data);
      if (data && data.recent) {
        console.log("Found " + data.recent.length + " invoices for company " + activeCompany.id);
      } else {
        console.warn("No invoice data received for company " + activeCompany.id);
      }
      
      return data;
    },
    retry: 1,
    enabled: !!activeCompany,
    refetchOnWindowFocus: true
  });
  
  // Query for purchase invoices
  const { data: purchaseInvoices, isLoading: isLoadingPurchaseInvoices } = useQuery({
    queryKey: ["/api/bills/summary", activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) return [];
      const response = await apiRequest("GET", `/api/bills/summary?companyId=${activeCompany.id}`);
      if (!response.ok) {
        console.log("Failed to fetch purchase invoices:", response.status);
        return [];
      }
      return await response.json();
    },
    retry: 1,
    enabled: !!activeCompany
  });
  
  // Query for receipt summary
  const { data: receipts, isLoading: isLoadingReceipts } = useQuery({
    queryKey: ["/api/receipts/summary", activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) return [];
      const response = await apiRequest("GET", `/api/receipts/summary?companyId=${activeCompany.id}`);
      if (!response.ok) {
        console.log("Failed to fetch receipts:", response.status);
        return [];
      }
      return await response.json();
    },
    retry: 1,
    enabled: !!activeCompany
  });
  
  // Query for payment summary
  const { data: payments, isLoading: isLoadingPayments } = useQuery({
    queryKey: ["/api/payments/summary", activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) return [];
      const response = await apiRequest("GET", `/api/payments/summary?companyId=${activeCompany.id}`);
      if (!response.ok) {
        console.log("Failed to fetch payments:", response.status);
        return [];
      }
      return await response.json();
    },
    retry: 1,
    enabled: !!activeCompany
  });
  
  // Get total outstanding amount directly from the API response
  const getSalesInvoicesTotal = () => {
    if (salesInvoices && typeof salesInvoices === 'object' && 'totalReceivable' in salesInvoices) {
      // Use the totalReceivable from the API directly
      return parseFloat(salesInvoices.totalReceivable || 0);
    }
    
    // Fallback to calculating from individual invoices if needed
    if (!salesInvoices?.recent || !salesInvoices.recent.length) return 0;
    
    return salesInvoices.recent.reduce((acc, doc) => {
      if (!doc || doc.status === 'paid') return acc;
      
      try {
        // Prefer balanceDue if available as it's most accurate
        if (doc.balanceDue !== undefined) {
          const balanceDue = parseFloat(doc.balanceDue);
          return acc + (isNaN(balanceDue) ? 0 : balanceDue);
        }
        
        // Otherwise calculate from total and paid amounts
        const amountPaid = doc.amount_paid !== undefined ? doc.amount_paid : (doc.amountPaid || '0');
        const total = parseFloat(doc.total?.toString() || '0');
        const paid = parseFloat(amountPaid?.toString() || '0');
        
        if (isNaN(total) || isNaN(paid)) {
          console.warn('Invalid numeric values in invoice', doc.id);
          return acc;
        }
        
        return acc + (total - paid);
      } catch (error) {
        console.error('Error calculating outstanding amount for invoice', doc.id, error);
        return acc;
      }
    }, 0);
  };
  
  const getPurchaseInvoicesTotal = () => {
    if (purchaseInvoices && typeof purchaseInvoices === 'object' && 'totalPayable' in purchaseInvoices) {
      // Use the totalPayable from the API directly
      return parseFloat(purchaseInvoices.totalPayable || 0);
    }
    
    // Fallback to calculating from individual bills if needed
    if (!purchaseInvoices || !Array.isArray(purchaseInvoices)) return 0;
    
    return purchaseInvoices.reduce((acc, doc) => {
      if (!doc || doc.status === 'paid') return acc;
      
      try {
        // Prefer balanceDue if available as it's most accurate
        if (doc.balanceDue !== undefined) {
          const balanceDue = parseFloat(doc.balanceDue);
          return acc + (isNaN(balanceDue) ? 0 : balanceDue);
        }
        
        // Otherwise calculate from total and paid amounts
        const amountPaid = doc.amount_paid !== undefined ? doc.amount_paid : (doc.amountPaid || '0');
        const total = parseFloat(doc.total?.toString() || '0');
        const paid = parseFloat(amountPaid?.toString() || '0');
        
        if (isNaN(total) || isNaN(paid)) {
          console.warn('Invalid numeric values in bill', doc.id);
          return acc;
        }
        
        return acc + (total - paid);
      } catch (error) {
        console.error('Error calculating outstanding amount for bill', doc.id, error);
        return acc;
      }
    }, 0);
  };
  
  const salesInvoicesOutstandingTotal = getSalesInvoicesTotal();
  const purchaseInvoicesOutstandingTotal = getPurchaseInvoicesTotal();
  
  const isLoading = isLoadingSalesInvoices || isLoadingPurchaseInvoices || isLoadingReceipts || isLoadingPayments;
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invoice & Receipt Summary</CardTitle>
          <CardDescription>Recent invoices and payment activity</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Invoice & Receipt Summary</CardTitle>
        <CardDescription>
          Track your invoices and payment activities
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="salesInvoices">Sales Invoices</TabsTrigger>
            <TabsTrigger value="purchaseInvoices">Purchase Invoices</TabsTrigger>
            <TabsTrigger value="receipts">Receipts</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
          </TabsList>
          
          {/* Sales Invoices Tab */}
          <TabsContent value="salesInvoices" className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Total Receivable</p>
                  <p className="text-2xl font-bold">{formatCurrency(salesInvoicesOutstandingTotal)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Invoices</p>
                  <p className="text-2xl font-bold">{
                    // Get invoice count from API total if available
                    salesInvoices?.total || 
                    // Otherwise count recent items
                    (salesInvoices?.recent ? salesInvoices.recent.length : 0)
                  }</p>
                </div>
              </div>
            </div>
            
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Debug info */}
                  <TableRow className="bg-amber-50">
                    <TableCell colSpan={5} className="text-xs">
                      <div className="text-gray-500">
                        <strong>Debug:</strong> Company ID: {activeCompany?.id || 'none'}, 
                        Data type: {salesInvoices ? (Array.isArray(salesInvoices) ? 'array' : 
                                   (salesInvoices.recent ? 'object with recent array' : 'object')) : 'null'}, 
                        Invoices: {salesInvoices?.recent ? salesInvoices.recent.length : 
                                 (Array.isArray(salesInvoices) ? salesInvoices.length : 0)}
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Use salesInvoices.recent if it exists, otherwise use salesInvoices directly if it's an array */}
                  {salesInvoices?.recent ? 
                    // Handle object with recent property (correct API response format)
                    salesInvoices.recent.slice(0, 5).map((invoice: any) => (
                      <TableRow key={invoice.id} data-company-id={activeCompany?.id}>
                        <TableCell className="font-medium">{invoice.invoice_number || invoice.invoiceNumber}</TableCell>
                        <TableCell>{formatDate(invoice.invoice_date || invoice.invoiceDate || invoice.date)}</TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(parseFloat(invoice.total))}</TableCell>
                        <TableCell>
                          <Link href={`/invoices/${invoice.id}`}>
                            <Button size="sm" variant="ghost">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    )) 
                    : (Array.isArray(salesInvoices) && salesInvoices.length > 0) ?
                    // Handle array response (old format)
                    salesInvoices.slice(0, 5).map((invoice: any) => (
                      <TableRow key={invoice.id} data-company-id={activeCompany?.id}>
                        <TableCell className="font-medium">{invoice.invoice_number || invoice.invoiceNumber}</TableCell>
                        <TableCell>{formatDate(invoice.invoice_date || invoice.invoiceDate || invoice.date)}</TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(parseFloat(invoice.total))}</TableCell>
                        <TableCell>
                          <Link href={`/invoices/${invoice.id}`}>
                            <Button size="sm" variant="ghost">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                    : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                          No sales invoices found
                        </TableCell>
                      </TableRow>
                    )
                  }
                </TableBody>
              </Table>
            </div>
            
            <div className="flex justify-end">
              <Link href="/invoices">
                <Button variant="outline" size="sm">
                  View All Invoices
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </TabsContent>
          
          {/* Purchase Invoices Tab */}
          <TabsContent value="purchaseInvoices" className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Total Payable</p>
                  <p className="text-2xl font-bold">{formatCurrency(purchaseInvoicesOutstandingTotal)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Invoices</p>
                  <p className="text-2xl font-bold">{
                    // Get bill count from API total if available
                    purchaseInvoices?.total || 
                    // Otherwise count bills directly
                    (purchaseInvoices?.recent ? purchaseInvoices.recent.length : 
                     (Array.isArray(purchaseInvoices) ? purchaseInvoices.length : 0))
                  }</p>
                </div>
              </div>
            </div>
            
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseInvoices && purchaseInvoices.length > 0 ? 
                    purchaseInvoices.slice(0, 5).map((invoice: any) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.bill_number || invoice.billNumber}</TableCell>
                        <TableCell>{formatDate(invoice.bill_date || invoice.billDate)}</TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(parseFloat(invoice.total))}</TableCell>
                        <TableCell>
                          <Link href={`/bills/${invoice.id}`}>
                            <Button size="sm" variant="ghost">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                          No purchase invoices found
                        </TableCell>
                      </TableRow>
                    )
                  }
                </TableBody>
              </Table>
            </div>
            
            <div className="flex justify-end">
              <Link href="/bills">
                <Button variant="outline" size="sm">
                  View All Bills
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </TabsContent>
          
          {/* Receipts Tab */}
          <TabsContent value="receipts" className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Total Receipts</p>
                  <p className="text-2xl font-bold">{formatCurrency(receipts?.totalAmount || 0)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Count</p>
                  <p className="text-2xl font-bold">{receipts?.total || 0}</p>
                </div>
              </div>
            </div>
            
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipts?.recent && receipts.recent.length > 0 ? 
                    receipts.recent.slice(0, 5).map((receipt: any) => (
                      <TableRow key={receipt.id}>
                        <TableCell className="font-medium">{receipt.receipt_number || receipt.receiptNumber}</TableCell>
                        <TableCell>{formatDate(receipt.receipt_date || receipt.receiptDate || receipt.date)}</TableCell>
                        <TableCell>{receipt.invoice_number || receipt.invoiceNumber || receipt.reference}</TableCell>
                        <TableCell className="text-right">{formatCurrency(parseFloat(receipt.amount))}</TableCell>
                        <TableCell>
                          <Link href={`/receipts/${receipt.id}`}>
                            <Button size="sm" variant="ghost">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                          No receipts found
                        </TableCell>
                      </TableRow>
                    )
                  }
                </TableBody>
              </Table>
            </div>
            
            <div className="flex justify-end">
              <Link href="/receipts">
                <Button variant="outline" size="sm">
                  View All Receipts
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </TabsContent>
          
          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Total Payments</p>
                  <p className="text-2xl font-bold">{formatCurrency(payments?.totalAmount || 0)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Count</p>
                  <p className="text-2xl font-bold">{payments?.total || 0}</p>
                </div>
              </div>
            </div>
            
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Bill #</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments?.recent && payments.recent.length > 0 ? 
                    payments.recent.slice(0, 5).map((payment: any) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{payment.payment_number || payment.paymentNumber}</TableCell>
                        <TableCell>{formatDate(payment.payment_date || payment.paymentDate || payment.date)}</TableCell>
                        <TableCell>{payment.bill_number || payment.billNumber || payment.reference}</TableCell>
                        <TableCell className="text-right">{formatCurrency(parseFloat(payment.amount))}</TableCell>
                        <TableCell>
                          <Link href={`/payments/${payment.id}`}>
                            <Button size="sm" variant="ghost">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                          No payments found
                        </TableCell>
                      </TableRow>
                    )
                  }
                </TableBody>
              </Table>
            </div>
            
            <div className="flex justify-end">
              <Link href="/payments">
                <Button variant="outline" size="sm">
                  View All Payments
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}