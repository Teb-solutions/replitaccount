import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
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
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

// Form schema for invoice creation
const formSchema = z.object({
  salesOrderId: z.number().min(1, "Sales order is required"),
  issueDate: z.string().min(1, "Issue date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  description: z.string().min(3, "Description is required"),
  isPartialInvoice: z.boolean().default(false),
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  items: z.array(z.object({
    salesOrderItemId: z.number(),
    productId: z.number(),
    quantity: z.number().min(0.01, "Quantity must be greater than 0"),
    unitPrice: z.number().min(0.01, "Unit price must be greater than 0"),
    description: z.string().optional(),
    included: z.boolean().default(true),
  }))
});

type FormValues = z.infer<typeof formSchema>;

export default function CreateInvoiceFromSalesOrder() {
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
  
  // Function to get all available sales orders
  const { data: salesOrders, isLoading: isLoadingSalesOrders } = useQuery({
    queryKey: ["/api/sales-orders/summary"],
    queryFn: async () => {
      if (!activeCompany) return [];
      const res = await apiRequest("GET", "/api/sales-orders/summary");
      return await res.json();
    },
    enabled: !!activeCompany
  });
  
  // Function to get selected sales order details
  const { data: salesOrder, isLoading: isLoadingSalesOrder } = useQuery({
    queryKey: ["/api/sales-orders", salesOrderId],
    queryFn: async () => {
      if (!salesOrderId) return null;
      const res = await apiRequest("GET", `/api/sales-orders/${salesOrderId}`);
      return await res.json();
    },
    enabled: !!salesOrderId
  });
  
  // Function to get sales order items
  const { data: salesOrderItems, isLoading: isLoadingSalesOrderItems } = useQuery({
    queryKey: ["/api/sales-orders", salesOrderId, "items"],
    queryFn: async () => {
      if (!salesOrderId) return [];
      const res = await apiRequest("GET", `/api/sales-orders/${salesOrderId}/items`);
      return await res.json();
    },
    enabled: !!salesOrderId
  });

  // Generate invoice number
  const generateInvoiceNumber = () => {
    const prefix = activeCompany?.code || "INV";
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    return `${prefix}-${date}-${random}`;
  };
  
  // Initialize the form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      salesOrderId: salesOrderId || 0,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      description: "",
      isPartialInvoice: false,
      invoiceNumber: generateInvoiceNumber(),
      items: []
    }
  });
  
  // Update form values when sales order is loaded
  useEffect(() => {
    if (salesOrderId && salesOrder && salesOrderItems && salesOrderItems.length > 0) {
      form.reset({
        ...form.getValues(),
        salesOrderId,
        description: salesOrder.description || "",
        items: salesOrderItems.map((item: any) => ({
          salesOrderItemId: item.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          description: item.description || "",
          included: true
        }))
      });
    }
  }, [salesOrderId, salesOrder, salesOrderItems, form]);

  // Handle changes to partial invoice flag
  const handlePartialInvoiceChange = (isPartial: boolean) => {
    form.setValue("isPartialInvoice", isPartial);
    
    // If switching to non-partial, reset all items to full quantity from sales order
    if (!isPartial && salesOrderItems) {
      const updatedItems = form.getValues("items").map((item, index) => ({
        ...item,
        quantity: salesOrderItems[index]?.quantity || item.quantity
      }));
      form.setValue("items", updatedItems);
    }
  };

  // Handle form submission
  const onSubmit = async (data: FormValues) => {
    // Only include items that are marked as included
    const itemsToSubmit = data.items
      .filter(item => item.included)
      .map(({ included, ...rest }) => rest);
    
    if (itemsToSubmit.length === 0) {
      toast({
        title: "Error",
        description: "You must include at least one item in the invoice",
        variant: "destructive"
      });
      return;
    }
    
    setIsCreating(true);
    
    try {
      // Calculate totals for invoice
      const subtotal = itemsToSubmit.reduce((sum, item) => 
        sum + (item.quantity * item.unitPrice), 0);
      
      // Prepare payload with more details
      const payload = {
        ...data,
        items: itemsToSubmit,
        companyId: activeCompany?.id,
        subtotal: subtotal.toString(),
        taxAmount: "0", // Add tax calculation if needed
        total: subtotal.toString(),
        // Use the field names expected by the backend
        invoiceDate: data.issueDate,
        notes: data.description
      };
      
      console.log("Submitting invoice payload:", payload);
      const response = await apiRequest("POST", "/api/invoices", payload);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create invoice");
      }
      
      const result = await response.json();
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-orders", salesOrderId] });
      
      toast({
        title: "Success",
        description: "Invoice created successfully",
      });
      
      // Navigate to the invoices list or the new invoice
      navigate("/invoices");
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
  
  // Handle sales order selection change
  const handleSalesOrderChange = (value: string) => {
    const id = parseInt(value, 10);
    setSalesOrderId(id);
    form.setValue("salesOrderId", id);
    // The URL will not be updated - this is intentional as it's not a navigation
  };

  const isLoading = isLoadingSalesOrders || isLoadingSalesOrder || isLoadingSalesOrderItems;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading sales order details...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Create Invoice from Sales Order</h1>
        <Button variant="outline" onClick={() => navigate("/invoices")}>
          Cancel
        </Button>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Sales Order Selection</CardTitle>
          <CardDescription>
            Select a sales order to create an invoice from
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="salesOrder">Sales Order</Label>
              <Select
                value={salesOrderId?.toString() || ""}
                onValueChange={handleSalesOrderChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sales order" />
                </SelectTrigger>
                <SelectContent>
                  {salesOrders && salesOrders.map((order: any) => (
                    <SelectItem key={order.id} value={order.id.toString()}>
                      {order.order_number} - {new Date(order.order_date).toLocaleDateString()} - {formatCurrency(order.total_amount, 'USD')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {salesOrder && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Sales Order Details</CardTitle>
            <CardDescription>
              Order #{salesOrder.orderNumber}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Order Information</h3>
                <p>Order Number: {salesOrder.orderNumber}</p>
                <p>Customer: {salesOrder.customerName}</p>
                <p>Order Date: {new Date(salesOrder.orderDate).toLocaleDateString()}</p>
                <p>Total Amount: {formatCurrency(salesOrder.totalAmount, 'USD')}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Customer Information</h3>
                <p>{salesOrder.customerName}</p>
                {salesOrder.billingAddress?.addressLine1 && <p>{salesOrder.billingAddress.addressLine1}</p>}
                {salesOrder.billingAddress?.addressLine2 && <p>{salesOrder.billingAddress.addressLine2}</p>}
                <p>
                  {salesOrder.billingAddress?.city || ""}, {salesOrder.billingAddress?.state || ""} {salesOrder.billingAddress?.postalCode || ""}
                </p>
                <p>{salesOrder.billingAddress?.country || ""}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Invoice Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="invoiceNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice Number</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="isPartialInvoice"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Partial Invoice</FormLabel>
                        <FormDescription>
                          Enable to create an invoice for only a portion of the sales order
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            handlePartialInvoiceChange(checked);
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="issueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issue Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
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
              </div>
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter invoice description"
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
          
          {salesOrderItems && salesOrderItems.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Invoice Items</CardTitle>
                <CardDescription>
                  {form.watch("isPartialInvoice") 
                    ? "Adjust quantities or exclude items for partial invoicing" 
                    : "Review the items to be included in the invoice"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Include</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">SO Quantity</TableHead>
                      <TableHead className="text-right">Invoice Quantity</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {form.watch('items').map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Checkbox
                            checked={item.included}
                            onCheckedChange={(checked) => {
                              const newItems = [...form.getValues("items")];
                              newItems[index].included = !!checked;
                              form.setValue("items", newItems);
                            }}
                            disabled={!form.watch("isPartialInvoice")}
                          />
                        </TableCell>
                        <TableCell>{salesOrderItems[index]?.productName || 'Unknown'}</TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-right">{salesOrderItems[index]?.quantity || 0}</TableCell>
                        <TableCell className="text-right">
                          {form.watch("isPartialInvoice") ? (
                            <Input
                              type="number"
                              min="0.01"
                              max={salesOrderItems[index]?.quantity || 0}
                              step="0.01"
                              value={item.quantity}
                              onChange={(e) => {
                                const newItems = [...form.getValues("items")];
                                newItems[index].quantity = parseFloat(e.target.value) || 0;
                                form.setValue("items", newItems);
                              }}
                              className="w-24 mx-auto text-right"
                            />
                          ) : (
                            item.quantity
                          )}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unitPrice, 'USD')}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.quantity * item.unitPrice, 'USD')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                <div className="mt-4 flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">Subtotal:</span>
                      <span>
                        {formatCurrency(
                          form.watch('items')
                            .filter(item => item.included)
                            .reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0),
                          'USD'
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Total:</span>
                      <span>
                        {formatCurrency(
                          form.watch('items')
                            .filter(item => item.included)
                            .reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0),
                          'USD'
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          <div className="flex justify-end gap-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate("/invoices")}
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
                  Creating...
                </>
              ) : 'Create Invoice'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}