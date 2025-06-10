import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/hooks/use-company";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const formSchema = z.object({
  salesOrderId: z.number().min(1, "Sales order is required"),
  companyId: z.number().min(1, "Company is required"),
  customerId: z.number().min(1, "Customer is required"),
  receiptNumber: z.string().min(1, "Receipt number is required"),
  receiptDate: z.string().min(1, "Receipt date is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  paymentMethod: z.string().min(1, "Payment method is required"),
  reference: z.string().optional(),
  isPartialPayment: z.boolean().default(false),
  // Account information for double-entry bookkeeping
  debitAccountId: z.number().min(1, "Debit account is required"),
  creditAccountId: z.number().min(1, "Credit account is required"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// Payment methods
const PAYMENT_METHODS = [
  { id: "bank_transfer", name: "Bank Transfer" },
  { id: "cash", name: "Cash" },
  { id: "check", name: "Check" },
  { id: "credit_card", name: "Credit Card" },
  { id: "debit_card", name: "Debit Card" },
  { id: "wire_transfer", name: "Wire Transfer" },
  { id: "other", name: "Other" },
];

export default function SalesOrderPaymentForm() {
  const { activeCompany } = useCompany();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [salesOrderId, setSalesOrderId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // Get URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const soId = params.get("salesOrderId");
    
    if (soId) {
      setSalesOrderId(parseInt(soId, 10));
    }
  }, []);
  
  // Query for sales order details
  const { data: salesOrder, isLoading: isLoadingSalesOrder } = useQuery({
    queryKey: ["/api/sales-orders", salesOrderId],
    queryFn: async () => {
      if (!salesOrderId) return null;
      try {
        const res = await apiRequest("GET", `/api/sales-orders/${salesOrderId}`);
        return await res.json();
      } catch (error) {
        console.error("Error fetching sales order:", error);
        toast({
          title: "Error",
          description: "Failed to fetch sales order details.",
          variant: "destructive"
        });
        return null;
      }
    },
    enabled: !!salesOrderId && !!activeCompany
  });
  
  // Query for total order amount
  const { data: orderItems, isLoading: isLoadingItems } = useQuery({
    queryKey: ["/api/sales-order-items", salesOrderId],
    queryFn: async () => {
      if (!salesOrderId) return [];
      try {
        const res = await apiRequest("GET", `/api/sales-order-items/${salesOrderId}`);
        return await res.json();
      } catch (error) {
        console.error("Error fetching sales order items:", error);
        toast({
          title: "Error",
          description: "Failed to fetch sales order items.",
          variant: "destructive"
        });
        return [];
      }
    },
    enabled: !!salesOrderId && !!activeCompany
  });
  
  // Calculate total order amount
  const calculateTotalAmount = () => {
    if (!orderItems || orderItems.length === 0) return 0;
    
    return orderItems.reduce((sum, item) => {
      const quantity = parseFloat(item.quantity);
      const unitPrice = parseFloat(item.unitPrice);
      const discount = item.discount ? parseFloat(item.discount) : 0;
      const discountedPrice = unitPrice * (1 - discount / 100);
      return sum + (quantity * discountedPrice);
    }, 0);
  };
  
  const totalAmount = calculateTotalAmount();
  
  // Query for receipts already made
  const { data: previousPayments = [], isLoading: isLoadingPayments } = useQuery({
    queryKey: ["/api/receipts", salesOrderId],
    queryFn: async () => {
      if (!salesOrderId) return [];
      try {
        const res = await apiRequest("GET", `/api/sales-orders/${salesOrderId}/receipts`);
        return await res.json();
      } catch (error) {
        console.error("Error fetching sales order receipts:", error);
        // If API endpoint doesn't exist yet, don't show error toast
        if ((error as any)?.status !== 404) {
          toast({
            title: "Error",
            description: "Failed to fetch previous receipts.",
            variant: "destructive"
          });
        }
        return [];
      }
    },
    enabled: !!salesOrderId && !!activeCompany
  });
  
  // Calculate total amount already paid
  const totalPaid = previousPayments.reduce((sum, receipt) => sum + parseFloat(receipt.amount), 0);
  
  // Calculate remaining amount to be paid
  const remainingAmount = totalAmount - totalPaid;
  
  // Query for available accounts for the company (for double-entry accounting)
  const { data: accounts = [], isLoading: isLoadingAccounts } = useQuery({
    queryKey: ["/api/accounts", activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return [];
      try {
        const res = await apiRequest("GET", `/api/accounts?companyId=${activeCompany.id}`);
        return await res.json();
      } catch (error) {
        console.error("Error fetching accounts:", error);
        return [];
      }
    },
    enabled: !!activeCompany?.id
  });
  
  // Find default accounts for receipts (Bank/Cash account for debit and Accounts Receivable for credit)
  const findAccountByType = (type: string) => {
    return accounts.find((account: any) => account.type === type)?.id || 0;
  };
  
  // Get the accounts receivable and cash/bank accounts
  const defaultCreditAccountId = findAccountByType("accounts_receivable");
  const defaultDebitAccountId = findAccountByType("cash") || findAccountByType("bank");
  
  // Generate receipt number
  const generateReceiptNumber = () => {
    const prefix = activeCompany?.code || "REC";
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    return `${prefix}-${date}-${random}`;
  };
  
  // Initialize the form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      salesOrderId: salesOrderId || 0,
      companyId: activeCompany?.id || 0,
      customerId: 0,
      receiptNumber: generateReceiptNumber(),
      receiptDate: new Date().toISOString().split('T')[0],
      amount: remainingAmount > 0 ? remainingAmount : 0,
      paymentMethod: "bank_transfer",
      reference: "",
      isPartialPayment: false,
      debitAccountId: defaultDebitAccountId,
      creditAccountId: defaultCreditAccountId,
      notes: ""
    }
  });
  
  // Update form values when data is loaded
  useEffect(() => {
    if (salesOrder && remainingAmount >= 0) {
      form.reset({
        salesOrderId: salesOrderId || 0,
        companyId: activeCompany?.id || 0,
        customerId: salesOrder.customerId,
        receiptNumber: generateReceiptNumber(),
        receiptDate: new Date().toISOString().split('T')[0],
        amount: remainingAmount,
        paymentMethod: "bank_transfer",
        reference: "",
        isPartialPayment: remainingAmount < totalAmount,
        debitAccountId: defaultDebitAccountId,
        creditAccountId: defaultCreditAccountId,
        notes: ""
      });
    }
  }, [salesOrder, remainingAmount, salesOrderId, activeCompany, form, totalAmount, defaultDebitAccountId, defaultCreditAccountId]);
  
  // Create receipt mutation
  const createReceiptMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      // Updated endpoint for creating receipts, which will handle the journal entries
      const res = await apiRequest("POST", "/api/receipts", data);
      return await res.json();
    },
    onSuccess: (data) => {
      // Invalidate all relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/receipts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-orders", salesOrderId, "receipts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      
      toast({
        title: "Success",
        description: "Receipt recorded successfully and ledger updated.",
      });
      navigate("/sales-orders");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record receipt.",
        variant: "destructive"
      });
    }
  });
  
  // Handle form submission
  const onSubmit = async (data: FormValues) => {
    setIsCreating(true);
    
    try {
      createReceiptMutation.mutate(data);
    } catch (error) {
      console.error("Error creating receipt:", error);
      toast({
        title: "Error",
        description: "Failed to record receipt.",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };
  
  // Loading state
  if (isLoadingSalesOrder || isLoadingItems || isLoadingPayments) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }
  
  // Error state if sales order not found
  if (salesOrderId && !salesOrder) {
    return (
      <div className="container mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>Sales order not found</CardDescription>
          </CardHeader>
          <CardContent>
            <p>The specified sales order could not be found. Please check the order ID and try again.</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate("/sales-orders")}>Back to Sales Orders</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // If order is already fully paid
  if (remainingAmount <= 0) {
    return (
      <div className="container mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle>Order Fully Paid</CardTitle>
            <CardDescription>
              Sales order #{salesOrder?.orderNumber} is already fully paid.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Total amount: {formatCurrency(totalAmount)}</p>
            <p>Amount paid: {formatCurrency(totalPaid)}</p>
            <p>Remaining amount: {formatCurrency(remainingAmount)}</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate("/sales-orders")}>Back to Sales Orders</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Record Payment for Sales Order</CardTitle>
          <CardDescription>
            Record payment for sales order #{salesOrder?.orderNumber}
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Company</Label>
                  <Input value={activeCompany?.name || ""} disabled />
                  <input type="hidden" {...form.register("companyId", { valueAsNumber: true })} />
                </div>
                <div>
                  <Label>Customer</Label>
                  <Input value={salesOrder?.customer?.name || ""} disabled />
                  <input type="hidden" {...form.register("customerId", { valueAsNumber: true })} />
                  <input type="hidden" {...form.register("salesOrderId", { valueAsNumber: true })} />
                </div>

                <FormField
                  control={form.control}
                  name="receiptNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Receipt Number</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="receiptDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Receipt Date</FormLabel>
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
                        defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PAYMENT_METHODS.map(method => (
                            <SelectItem key={method.id} value={method.id}>
                              {method.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          min="0.01" 
                          max={remainingAmount}
                          {...field}
                          onChange={e => {
                            const value = parseFloat(e.target.value);
                            field.onChange(value);
                            // If amount is less than remaining, it's a partial payment
                            form.setValue("isPartialPayment", value < remainingAmount);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Remaining balance: {formatCurrency(remainingAmount)}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="reference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reference Number</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Check #, Transaction ID, etc."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="isPartialPayment"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Partial Payment</FormLabel>
                      <FormDescription>
                        Mark as partial payment if this doesn't fully satisfy the order amount.
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
              
              {previousPayments.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-4">Previous Payments</h3>
                  <div className="rounded-md border overflow-hidden">
                    <table className="min-w-full divide-y divide-border">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="px-4 py-2 text-left text-sm font-medium">Date</th>
                          <th className="px-4 py-2 text-left text-sm font-medium">Method</th>
                          <th className="px-4 py-2 text-left text-sm font-medium">Reference</th>
                          <th className="px-4 py-2 text-right text-sm font-medium">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {previousPayments.map((receipt, index) => {
                          const methodName = PAYMENT_METHODS.find(m => m.id === receipt.payment_method)?.name || receipt.payment_method;
                          
                          return (
                            <tr key={index}>
                              <td className="px-4 py-2 text-sm">
                                {new Date(receipt.receipt_date).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-2 text-sm">{methodName}</td>
                              <td className="px-4 py-2 text-sm">{receipt.reference || '-'}</td>
                              <td className="px-4 py-2 text-sm text-right">{formatCurrency(parseFloat(receipt.amount))}</td>
                            </tr>
                          );
                        })}
                        <tr className="bg-muted/30">
                          <td colSpan={3} className="px-4 py-2 text-right font-medium">Total Paid:</td>
                          <td className="px-4 py-2 text-right font-medium">{formatCurrency(totalPaid)}</td>
                        </tr>
                        <tr className="bg-muted/30">
                          <td colSpan={3} className="px-4 py-2 text-right font-medium">Order Total:</td>
                          <td className="px-4 py-2 text-right font-medium">{formatCurrency(totalAmount)}</td>
                        </tr>
                        <tr className="bg-muted/30">
                          <td colSpan={3} className="px-4 py-2 text-right font-medium">Remaining:</td>
                          <td className="px-4 py-2 text-right font-medium">{formatCurrency(remainingAmount)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => navigate("/sales-orders")}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Record Payment
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}