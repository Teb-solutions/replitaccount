import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCompany } from "@/hooks/use-company";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Invoice {
  id: number;
  invoiceNumber: string;
  customerId?: number;
  customer: {
    id: number;
    name: string;
  };
  salesOrderId?: number;
  invoiceDate?: string;
  dueDate?: string;
  date?: string; // Alternative date field 
  total: string | number;
  amountPaid?: string | number;
  balanceDue?: string | number; // Added balance due field
  status: "draft" | "open" | "paid" | "partial" | "overdue" | "cancelled" | "voided";
}

interface InvoicesResponse {
  invoices: Invoice[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

export default function Invoices() {
  const [activeTab, setActiveTab] = useState("all");
  const [openInvoiceDialog, setOpenInvoiceDialog] = useState(false);
  const { activeCompany } = useCompany();
  const { toast } = useToast();
  
  // Fetch invoices from the API - use specific Gas Manufacturing API for company ID 7
  const { data: invoicesData, isLoading } = useQuery<Invoice[] | InvoicesResponse>({
    queryKey: ["/api/invoices", activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) return { invoices: [], pagination: { page: 1, pageSize: 10, totalCount: 0, totalPages: 0 } };
      
      console.log("Fetching invoices for company ID:", activeCompany.id);
      
      // Check if this is Gas Manufacturing Company (ID: 7) - not Gas Distributor (8)
      if (activeCompany.id === 7) {
        console.log('Using Gas Manufacturing-specific invoices API');
        try {
          const response = await apiRequest("GET", `/api/gas-company-invoices?companyId=${activeCompany.id}`);
          if (!response.ok) {
            console.error("Failed to fetch gas company invoices:", response.status);
            // Fall back to regular API if the special one fails
            const fallbackResponse = await apiRequest("GET", `/api/invoices?companyId=${activeCompany.id}`);
            const fallbackData = await fallbackResponse.json();
            return Array.isArray(fallbackData) 
              ? { invoices: fallbackData, pagination: { page: 1, pageSize: fallbackData.length, totalCount: fallbackData.length, totalPages: 1 } }
              : fallbackData;
          }
          
          const data = await response.json();
          console.log("Gas company invoice data received:", data);
          
          // If there's actual data in the response, use it
          if (data && data.length > 0) {
            return { 
              invoices: data, 
              pagination: { 
                page: 1, 
                pageSize: data.length, 
                totalCount: data.length, 
                totalPages: 1 
              } 
            };
          } else {
            // No data from the specialized API, fall back to regular API
            console.log("No data from specialized Gas Manufacturing API, falling back");
            const fallbackResponse = await apiRequest("GET", `/api/invoices?companyId=${activeCompany.id}`);
            const fallbackData = await fallbackResponse.json();
            return Array.isArray(fallbackData)
              ? { invoices: fallbackData, pagination: { page: 1, pageSize: fallbackData.length, totalCount: fallbackData.length, totalPages: 1 } }
              : fallbackData;
          }
        } catch (error) {
          console.error('Error fetching Gas Manufacturing invoices:', error);
          // Fall back to regular API if the special one fails
          const fallbackResponse = await apiRequest("GET", `/api/invoices?companyId=${activeCompany.id}`);
          const fallbackData = await fallbackResponse.json();
          return Array.isArray(fallbackData) 
            ? { invoices: fallbackData, pagination: { page: 1, pageSize: fallbackData.length, totalCount: fallbackData.length, totalPages: 1 } }
            : fallbackData;
        }
      }
      
      // Regular API for other companies
      const response = await apiRequest("GET", `/api/invoices?companyId=${activeCompany.id}`);
      if (!response.ok) {
        console.error("Failed to fetch invoices:", response.status);
        return { invoices: [], pagination: { page: 1, pageSize: 10, totalCount: 0, totalPages: 0 } };
      }
      
      const data = await response.json();
      console.log("Invoice data received:", data);
      
      // Check if the response is an array (direct invoices) or an object with invoices property
      if (Array.isArray(data)) {
        return { invoices: data, pagination: { page: 1, pageSize: data.length, totalCount: data.length, totalPages: 1 } };
      }
      
      return data;
    },
    enabled: !!activeCompany
  });
  
  // Handle both array and object with invoices property responses
  const invoices = Array.isArray(invoicesData) ? invoicesData : (invoicesData?.invoices || []);
  
  const filteredInvoices = invoices.filter(invoice => {
    if (activeTab === "all") return true;
    return invoice.status === activeTab;
  });
  
  // State for the new invoice form
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [selectedSalesOrder, setSelectedSalesOrder] = useState<string>("none");
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Fetch customers for the dropdown
  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ["/api/customers", activeCompany?.id],
    enabled: !!activeCompany && openInvoiceDialog
  });

  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/invoices", data);
    },
    onSuccess: () => {
      toast({
        title: "Invoice Created",
        description: "New invoice has been created as a draft.",
        variant: "default",
      });
      setOpenInvoiceDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", activeCompany?.id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create invoice: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  const handleCreateInvoice = async () => {
    if (!selectedCustomer) {
      toast({
        title: "Error",
        description: "Please select a customer",
        variant: "destructive",
      });
      return;
    }
    
    if (!invoiceDate) {
      toast({
        title: "Error",
        description: "Please select an invoice date",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await createInvoiceMutation.mutateAsync({
        customerId: parseInt(selectedCustomer),
        salesOrderId: selectedSalesOrder && selectedSalesOrder !== "none" ? parseInt(selectedSalesOrder) : null,
        invoiceDate: new Date(invoiceDate),
        dueDate: dueDate ? new Date(dueDate) : null,
        status: "draft",
        subtotal: "0",
        taxAmount: "0",
        total: "0",
        notes: ""
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // State for payment dialog
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Send invoice mutation
  const sendInvoiceMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("PATCH", `/api/invoices/${id}`, { status: "open" });
    },
    onSuccess: () => {
      toast({
        title: "Invoice Sent",
        description: "Invoice has been sent to the customer.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", activeCompany?.id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to send invoice: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Record payment mutation
  const recordPaymentMutation = useMutation({
    mutationFn: async ({ id, amount, paymentDate }: { id: number, amount: string, paymentDate: string | Date }) => {
      return await apiRequest("POST", `/api/invoices/${id}/payments`, { 
        amount, 
        paymentDate: paymentDate instanceof Date ? paymentDate : new Date(paymentDate) 
      });
    },
    onSuccess: () => {
      toast({
        title: "Payment Recorded",
        description: "Payment has been recorded successfully.",
        variant: "default",
      });
      setOpenPaymentDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", activeCompany?.id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to record payment: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  const handleSendInvoice = (id: number) => {
    sendInvoiceMutation.mutate(id);
  };
  
  const handleRecordPayment = (invoice: Invoice) => {
    setSelectedInvoiceId(invoice.id);
    setSelectedInvoice(invoice);
    setPaymentAmount(getBalance(invoice).toString());
    setOpenPaymentDialog(true);
  };
  
  const submitPayment = async () => {
    if (!selectedInvoiceId) return;
    
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid payment amount",
        variant: "destructive",
      });
      return;
    }
    
    await recordPaymentMutation.mutateAsync({
      id: selectedInvoiceId,
      amount: paymentAmount,
      paymentDate: new Date(paymentDate)
    });
  };
  
  const formatCurrency = (amount: string | number | undefined) => {
    if (amount === undefined || amount === null) {
      return '$0.00';
    }
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(numericAmount);
  };
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const getStatusColor = (status: Invoice["status"]) => {
    switch (status) {
      case "draft": return "secondary";
      case "open": return "default";
      case "paid": return "default";
      case "partial": return "secondary";
      case "overdue": return "destructive";
      case "cancelled": return "destructive";
      case "voided": return "destructive";
      default: return "secondary";
    }
  };
  
  const getBalance = (invoice: Invoice) => {
    // Use balanceDue directly if it exists
    if (invoice.balanceDue !== undefined) {
      return typeof invoice.balanceDue === 'string' ? parseFloat(invoice.balanceDue) : invoice.balanceDue;
    }
    
    // Otherwise calculate it
    const total = typeof invoice.total === 'string' ? parseFloat(invoice.total) : invoice.total;
    const amountPaid = typeof invoice.amountPaid === 'string' ? parseFloat(invoice.amountPaid || '0') : (invoice.amountPaid || 0);
    return total - amountPaid;
  };
  
  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
        
        {/* Payment Recording Dialog */}
        <Dialog open={openPaymentDialog} onOpenChange={setOpenPaymentDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
              <DialogDescription>
                Enter payment details for invoice {selectedInvoice?.invoiceNumber}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="invoiceAmount" className="text-right text-sm">
                  Invoice Amount
                </label>
                <div className="col-span-3">
                  <input
                    type="text"
                    id="invoiceAmount"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={selectedInvoice ? formatCurrency(selectedInvoice.total) : ''}
                    disabled
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="amountPaid" className="text-right text-sm">
                  Amount Already Paid
                </label>
                <div className="col-span-3">
                  <input
                    type="text"
                    id="amountPaid"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={selectedInvoice && selectedInvoice.amountPaid ? formatCurrency(selectedInvoice.amountPaid) : '0.00'}
                    disabled
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="paymentAmount" className="text-right text-sm">
                  Payment Amount
                </label>
                <div className="col-span-3">
                  <input
                    type="number"
                    id="paymentAmount"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    step="0.01"
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="paymentDate" className="text-right text-sm">
                  Payment Date
                </label>
                <div className="col-span-3">
                  <input
                    type="date"
                    id="paymentDate"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenPaymentDialog(false)}>
                Cancel
              </Button>
              <Button onClick={submitPayment} disabled={recordPaymentMutation.isPending}>
                {recordPaymentMutation.isPending ? "Recording..." : "Record Payment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Invoice Dialog */}
        <Dialog open={openInvoiceDialog} onOpenChange={setOpenInvoiceDialog}>
          <DialogTrigger asChild>
            <Button>
              <i className="ri-add-line mr-2"></i>
              New Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New Invoice</DialogTitle>
              <DialogDescription>
                Enter the invoice details below to create a new invoice.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="customer" className="text-right text-sm">
                  Customer
                </label>
                <div className="col-span-3">
                  <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers?.map((customer: any) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="salesOrder" className="text-right text-sm">
                  From Sales Order
                </label>
                <div className="col-span-3">
                  <Select value={selectedSalesOrder} onValueChange={setSelectedSalesOrder}>
                    <SelectTrigger>
                      <SelectValue placeholder="(Optional) Select sales order" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {/* We'll implement this with real data later */}
                      <SelectItem value="1">SO-2025-001</SelectItem>
                      <SelectItem value="2">SO-2025-002</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="invoiceDate" className="text-right text-sm">
                  Invoice Date
                </label>
                <div className="col-span-3">
                  <input 
                    type="date" 
                    id="invoiceDate" 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="dueDate" className="text-right text-sm">
                  Due Date
                </label>
                <div className="col-span-3">
                  <input 
                    type="date" 
                    id="dueDate" 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenInvoiceDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateInvoice} 
                disabled={isSubmitting || createInvoiceMutation.isPending}
              >
                {isSubmitting || createInvoiceMutation.isPending ? "Creating..." : "Create Invoice"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid max-w-[600px] grid-cols-6 mb-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="partial">Partial</TabsTrigger>
          <TabsTrigger value="paid">Paid</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
        </TabsList>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col space-y-2">
                <h3 className="text-lg font-medium">Total Receivable</h3>
                <p className="text-3xl font-bold">
                  {formatCurrency(
                    invoices
                      .filter(inv => inv.status !== 'paid')
                      .reduce((total, inv) => total + getBalance(inv), 0)
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col space-y-2">
                <h3 className="text-lg font-medium">Invoices</h3>
                <p className="text-3xl font-bold">{invoices.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
            <CardDescription>Manage your customer invoices and payments</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Debug info */}
            <div className="bg-amber-50 p-2 mb-4 text-xs rounded">
              <div className="text-gray-500">
                <strong>Debug:</strong> Company ID: {activeCompany?.id || 'none'}, 
                Data type: {invoicesData ? (Array.isArray(invoicesData) ? 'array' : 
                           (invoicesData.invoices ? 'object with invoices array' : 'object')) : 'null'}, 
                Invoices: {invoices.length}
              </div>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-9 w-20 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-4">
                      No invoices found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>{invoice.customer?.name || 'Unknown'}</TableCell>
                      <TableCell>{formatDate(invoice.invoiceDate)}</TableCell>
                      <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                      <TableCell>{formatCurrency(invoice.total)}</TableCell>
                      <TableCell>{formatCurrency(getBalance(invoice))}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(invoice.status)}>
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {invoice.status === "draft" && (
                            <Button variant="outline" size="sm" onClick={() => handleSendInvoice(invoice.id)}>
                              Send
                            </Button>
                          )}
                          {["open", "partial", "overdue"].includes(invoice.status) && (
                            <Button variant="outline" size="sm" onClick={() => handleRecordPayment(invoice)}>
                              Record Payment
                            </Button>
                          )}
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}