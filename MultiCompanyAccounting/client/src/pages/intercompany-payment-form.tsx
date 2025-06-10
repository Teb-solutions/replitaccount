import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/hooks/use-company";
import { createIntercompanyPayment } from "@/lib/intercompany-connector";
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
});

type FormValues = z.infer<typeof formSchema>;

interface InvoiceData {
  id: number;
  invoiceNumber: string;
  customerId: number;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  amountPaid: number;
  remainingAmount: number;
  status: string;
}

export default function IntercompanyPaymentForm() {
  const { activeCompany } = useCompany();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [invoiceId, setInvoiceId] = useState<number | null>(null);
  const [billId, setBillId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // Get URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invId = params.get("invoiceId");
    
    if (invId) {
      setInvoiceId(parseInt(invId, 10));
    }
  }, []);
  
  // Query for intercompany transactions to find the matching bill
  const { data: intercompanyTransactions, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ["/api/intercompany-transactions"],
    queryFn: async () => {
      if (!activeCompany) return [];
      const res = await apiRequest("GET", "/api/intercompany-transactions");
      return await res.json();
    },
    enabled: !!activeCompany
  });
  
  // Find the related invoice/bill pair
  useEffect(() => {
    if (invoiceId && intercompanyTransactions) {
      // Find the transaction that has this invoice
      const relatedTransaction = intercompanyTransactions.find((tx: any) => {
        return tx.invoices && tx.invoices.some((inv: any) => inv.id === invoiceId);
      });
      
      if (relatedTransaction && relatedTransaction.bills) {
        // Find the matching bill
        const matchingBill = relatedTransaction.bills[0];
        if (matchingBill) {
          setBillId(matchingBill.id);
        }
      }
    }
  }, [invoiceId, intercompanyTransactions]);
  
  // Query for invoice details
  const { data: invoice, isLoading: isLoadingInvoice } = useQuery<InvoiceData>({
    queryKey: ["/api/invoices", invoiceId],
    queryFn: async () => {
      if (!invoiceId) return null;
      const res = await apiRequest("GET", `/api/invoices/${invoiceId}`);
      return await res.json();
    },
    enabled: !!invoiceId
  });
  
  // Query for bill details
  const { data: bill, isLoading: isLoadingBill } = useQuery({
    queryKey: ["/api/bills", billId],
    queryFn: async () => {
      if (!billId) return null;
      const res = await apiRequest("GET", `/api/bills/${billId}`);
      return await res.json();
    },
    enabled: !!billId
  });
  
  // Initialize the form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sourceCompanyId: 0,
      targetCompanyId: 0,
      invoiceId: invoiceId || 0,
      billId: billId || 0,
      paymentDate: new Date().toISOString().split('T')[0],
      amount: 0,
      paymentMethod: "bank_transfer",
      reference: "",
      isPartialPayment: false,
      notes: ""
    }
  });
  
  // Update form values when data is loaded
  useEffect(() => {
    if (invoice && bill) {
      const sourceCompanyId = invoice.customerId; // The company that issued the invoice
      const targetCompanyId = bill.vendorId; // The company that received the bill
      
      form.reset({
        sourceCompanyId,
        targetCompanyId,
        invoiceId: invoiceId || 0,
        billId: billId || 0,
        paymentDate: new Date().toISOString().split('T')[0],
        amount: invoice.remainingAmount || invoice.totalAmount, // Default to remaining amount
        paymentMethod: "bank_transfer",
        reference: "",
        isPartialPayment: false,
        notes: ""
      });
    }
  }, [invoice, bill, form, invoiceId, billId]);
  
  // Handle amount change based on partial payment selection
  const handlePartialPaymentChange = (isPartial: boolean) => {
    form.setValue("isPartialPayment", isPartial);
    
    if (!isPartial && invoice) {
      // If not partial, set amount to the full remaining amount
      form.setValue("amount", invoice.remainingAmount || invoice.totalAmount);
    }
  };
  
  const onSubmit = async (data: FormValues) => {
    setIsCreating(true);
    
    try {
      const result = await createIntercompanyPayment({
        ...data,
        sourceCompanyId: Number(data.sourceCompanyId),
        targetCompanyId: Number(data.targetCompanyId),
        invoiceId: Number(data.invoiceId),
        billId: Number(data.billId),
        amount: Number(data.amount)
      });
      
      if (!result.success) {
        throw new Error(result.error || "Failed to process intercompany payment");
      }
      
      // Invalidate queries to refresh the related data
      queryClient.invalidateQueries({ queryKey: ["/api/intercompany-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      queryClient.invalidateQueries({ queryKey: ["/api/journal-entries"] });
      
      toast({
        title: "Success",
        description: "Intercompany payment processed successfully",
      });
      
      navigate("/intercompany-transactions");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };
  
  const isLoading = isLoadingTransactions || isLoadingInvoice || isLoadingBill;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading payment details...</span>
      </div>
    );
  }
  
  if (!invoice || !bill) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Intercompany Payment</CardTitle>
          <CardDescription>No matching invoice or bill found</CardDescription>
        </CardHeader>
        <CardContent>
          <p>The specified invoice could not be found or does not have a matching bill.</p>
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
        <h1 className="text-3xl font-bold">Process Intercompany Payment</h1>
        <Button variant="outline" onClick={() => navigate("/intercompany-transactions")}>
          Cancel
        </Button>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
          <CardDescription>
            Process payment for intercompany invoice
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Invoice Details</h3>
              <p>Invoice Number: {invoice.invoiceNumber}</p>
              <p>Issue Date: {new Date(invoice.issueDate).toLocaleDateString()}</p>
              <p>Due Date: {new Date(invoice.dueDate).toLocaleDateString()}</p>
              <p>Total Amount: {formatCurrency(invoice.totalAmount, 'USD')}</p>
              <p>Amount Paid: {formatCurrency(invoice.amountPaid || 0, 'USD')}</p>
              <p>Remaining Amount: {formatCurrency(invoice.remainingAmount || invoice.totalAmount, 'USD')}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Bill Details</h3>
              <p>Bill Number: {bill.billNumber}</p>
              <p>Issue Date: {new Date(bill.issueDate).toLocaleDateString()}</p>
              <p>Due Date: {new Date(bill.dueDate).toLocaleDateString()}</p>
              <p>Total Amount: {formatCurrency(bill.totalAmount, 'USD')}</p>
              <p>Amount Paid: {formatCurrency(bill.amountPaid || 0, 'USD')}</p>
              <p>Remaining Amount: {formatCurrency(bill.remainingAmount || bill.totalAmount, 'USD')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Payment Information</CardTitle>
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
                  name="isPartialPayment"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Partial Payment</FormLabel>
                        <FormDescription>
                          Enable to pay only a portion of the total amount
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            handlePartialPaymentChange(checked);
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Amount</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          min="0.01"
                          max={form.watch("isPartialPayment") ? undefined : invoice.remainingAmount || invoice.totalAmount}
                          disabled={!form.watch("isPartialPayment") && !!invoice}
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        {form.watch("isPartialPayment") 
                          ? "Enter the amount you wish to pay" 
                          : "Full remaining amount will be paid"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Add notes about this payment"
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
                  Processing...
                </>
              ) : 'Process Payment'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}