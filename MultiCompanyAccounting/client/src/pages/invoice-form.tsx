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
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Loader2, Calculator, Receipt, Percent } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InvoiceItemQuantity from "@/components/invoice/invoice-item-quantity";

const formSchema = z.object({
  companyId: z.number().min(1, "Company is required"),
  salesOrderId: z.number().min(1, "Sales order is required"),
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  customer: z.object({
    id: z.number().min(1, "Customer is required"),
    name: z.string()
  }),
  items: z.array(
    z.object({
      id: z.number().optional(),
      productId: z.number().min(1, "Product is required"),
      description: z.string(),
      quantity: z.number().min(1, "Quantity must be at least 1"),
      unitPrice: z.number().min(0.01, "Unit price must be greater than 0"),
      subtotal: z.number()
    })
  ),
  subtotal: z.number(),
  tax: z.number(),
  total: z.number(),
  notes: z.string().optional(),
  attachments: z.array(z.string()).optional(),
  taxType: z.string().optional(),
  taxBreakdown: z.object({
    cgst: z.number().optional(),
    sgst: z.number().optional(),
    igst: z.number().optional(),
    taxByRate: z.record(z.object({
      rate: z.number(),
      amount: z.number()
    })).optional()
  }).optional()
});

type FormValues = z.infer<typeof formSchema>;

export default function InvoiceForm() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { activeCompany } = useCompany();
  
  const [salesOrderId, setSalesOrderId] = useState<number | null>(null);
  const [taxType, setTaxType] = useState<string>("gst");
  const [taxBreakdown, setTaxBreakdown] = useState({
    cgst: 0,
    sgst: 0,
    igst: 0,
    taxByRate: {} as Record<string, {rate: number, amount: number}>
  });
  
  // Get the salesOrderId from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const soId = params.get("salesOrderId");
    if (soId) {
      setSalesOrderId(parseInt(soId));
    }
  }, []);
  
  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyId: activeCompany?.id || 0,
      salesOrderId: 0,
      invoiceNumber: "",
      invoiceDate: new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      customer: {
        id: 0,
        name: ""
      },
      items: [],
      subtotal: 0,
      tax: 0,
      total: 0,
      notes: "",
      taxType: "gst",
      taxBreakdown: {
        cgst: 0,
        sgst: 0,
        igst: 0,
        taxByRate: {}
      }
    }
  });
  
  // Get sales order details if salesOrderId is provided
  const { data: salesOrder, isLoading: isLoadingSalesOrder } = useQuery({
    queryKey: ["/api/sales-orders", salesOrderId],
    queryFn: async () => {
      if (!salesOrderId) return null;
      const res = await apiRequest("GET", `/api/sales-orders/${salesOrderId}`);
      return res.json();
    },
    enabled: !!salesOrderId
  });
  
  // Get sales order items
  const { data: salesOrderItems, isLoading: isLoadingSalesOrderItems } = useQuery({
    queryKey: ["/api/sales-orders", salesOrderId, "items"],
    queryFn: async () => {
      if (!salesOrderId) return [];
      const res = await apiRequest("GET", `/api/sales-orders/${salesOrderId}/items`);
      return res.json();
    },
    enabled: !!salesOrderId
  });
  
  // Get existing invoices for this sales order
  const { data: existingInvoices, isLoading: isLoadingExistingInvoices } = useQuery({
    queryKey: ["/api/sales-orders", salesOrderId, "invoices"],
    queryFn: async () => {
      if (!salesOrderId) return [];
      const res = await apiRequest("GET", `/api/sales-orders/${salesOrderId}/invoices`);
      return res.json();
    },
    enabled: !!salesOrderId
  });
  
  // Get existing receipts for this sales order
  const { data: existingReceipts, isLoading: isLoadingExistingReceipts } = useQuery({
    queryKey: ["/api/sales-orders", salesOrderId, "receipts"],
    queryFn: async () => {
      if (!salesOrderId) return [];
      const res = await apiRequest("GET", `/api/sales-orders/${salesOrderId}/receipts`);
      return res.json();
    },
    enabled: !!salesOrderId
  });
  
  // Update form when sales order data is loaded
  useEffect(() => {
    if (salesOrder && salesOrderItems) {
      // Generate invoice number
      const currentDate = new Date();
      const dateStr = currentDate.toISOString().slice(2, 10).replace(/-/g, "");
      const randomStr = Math.floor(Math.random() * 100000).toString().padStart(5, "0");
      const invoiceNumber = `INV-${activeCompany?.code || "CO"}-${dateStr}-${randomStr}`;
      
      // Format sales order items for the form
      const formattedItems = salesOrderItems.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        description: item.description || "",
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.quantity * item.unitPrice
      }));
      
      // Calculate initial totals
      const subtotal = formattedItems.reduce((sum: number, item: any) => sum + item.subtotal, 0);
      
      form.reset({
        companyId: activeCompany?.id || 0,
        salesOrderId: salesOrderId || 0,
        invoiceNumber,
        invoiceDate: new Date().toISOString().split("T")[0],
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        customer: {
          id: salesOrder.customerId,
          name: salesOrder.customerName || ""
        },
        items: formattedItems,
        subtotal,
        tax: 0,
        total: subtotal,
        notes: salesOrder.notes || "",
        taxType,
        taxBreakdown
      });
    }
  }, [salesOrder, salesOrderItems, activeCompany, salesOrderId, form, taxType, taxBreakdown]);
  
  // Recalculate totals when form values change
  useEffect(() => {
    const items = form.watch("items");
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const tax = form.watch("tax") || 0;
    
    form.setValue("subtotal", subtotal);
    form.setValue("total", subtotal + tax);
  }, [form.watch("items"), form.watch("tax"), form]);
  
  // Handle tax type change
  const handleTaxTypeChange = (type: string) => {
    setTaxType(type);
    form.setValue("taxType", type);
  };
  
  // Handle applying tax rate
  const handleApplyTaxRate = (rate: number) => {
    const subtotal = form.getValues("subtotal");
    const taxAmount = (subtotal * rate) / 100;
    
    let updatedTaxBreakdown = { ...taxBreakdown };
    
    if (taxType === "gst") {
      // Split tax between CGST and SGST
      updatedTaxBreakdown.cgst = taxAmount / 2;
      updatedTaxBreakdown.sgst = taxAmount / 2;
      updatedTaxBreakdown.igst = 0;
    } else {
      // All tax goes to IGST
      updatedTaxBreakdown.cgst = 0;
      updatedTaxBreakdown.sgst = 0;
      updatedTaxBreakdown.igst = taxAmount;
    }
    
    // Update tax by rate
    const rateKey = `rate_${rate}`;
    updatedTaxBreakdown.taxByRate = {
      [rateKey]: { rate, amount: taxAmount }
    };
    
    setTaxBreakdown(updatedTaxBreakdown);
    form.setValue("tax", taxAmount);
    form.setValue("taxBreakdown", updatedTaxBreakdown);
  };
  
  // Handle updating invoiced quantities
  const handleInvoicedQtyChange = (index: number, value: number) => {
    const items = form.getValues("items");
    if (items && items[index]) {
      const updatedItems = [...items];
      updatedItems[index] = {
        ...updatedItems[index],
        invoicedQty: value
      };
      form.setValue("items", updatedItems);
    }
  };
  
  // Handle updating received quantities
  const handleReceivedQtyChange = (index: number, value: number) => {
    const items = form.getValues("items");
    if (items && items[index]) {
      const updatedItems = [...items];
      updatedItems[index] = {
        ...updatedItems[index],
        receivedQty: value
      };
      form.setValue("items", updatedItems);
    }
  };
  
  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const response = await apiRequest("POST", "/api/invoices", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Invoice created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-orders"] });
      navigate("/invoices");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice",
        variant: "destructive",
      });
    }
  });
  
  // Form submission
  const onSubmit = (values: FormValues) => {
    createInvoiceMutation.mutate(values);
  };
  
  // Loading state
  const isLoading = isLoadingSalesOrder || isLoadingSalesOrderItems || isLoadingExistingInvoices || isLoadingExistingReceipts || createInvoiceMutation.isPending;
  
  if (isLoading && !createInvoiceMutation.isPending) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }
  
  // Get quantity tracking data
  const getQuantityTrackingItems = () => {
    if (!salesOrderItems) return [];
    
    return salesOrderItems.map((item: any) => {
      // Get totals from existing invoices
      const invoicedQty = (existingInvoices || []).reduce((sum: number, invoice: any) => {
        const invoiceItem = invoice.items?.find((i: any) => i.productId === item.productId);
        return sum + (invoiceItem?.quantity || 0);
      }, 0);
      
      // Get totals from existing receipts
      const receivedQty = (existingReceipts || []).reduce((sum: number, receipt: any) => {
        const receiptItem = receipt.items?.find((i: any) => i.productId === item.productId);
        return sum + (receiptItem?.quantity || 0);
      }, 0);
      
      return {
        productId: item.productId,
        productName: item.productName || `Product #${item.productId}`,
        orderQty: item.quantity,
        invoicedQty,
        receivedQty,
        currentQty: item.quantity
      };
    });
  };
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Create New Invoice</h1>
      </div>
      
      {/* Show warning if there are existing invoices */}
      {existingInvoices && existingInvoices.length > 0 && (
        <Card className="mb-6 border-amber-500">
          <CardHeader className="bg-amber-50">
            <CardTitle className="text-amber-800">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 inline-block mr-2"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Existing Invoices Found
            </CardTitle>
            <CardDescription className="text-amber-700">
              This sales order already has {existingInvoices.length} invoice(s). Creating another invoice might result in double billing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b text-sm">
                    <th className="py-2 text-left">Invoice Number</th>
                    <th className="py-2 text-left">Date</th>
                    <th className="py-2 text-right">Amount</th>
                    <th className="py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {existingInvoices.map((invoice: any) => (
                    <tr key={invoice.id} className="border-b text-sm">
                      <td className="py-2">{invoice.invoiceNumber}</td>
                      <td className="py-2">{new Date(invoice.invoiceDate).toLocaleDateString()}</td>
                      <td className="py-2 text-right">{formatCurrency(invoice.total)}</td>
                      <td className="py-2">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                          invoice.status === 'Paid' 
                            ? 'bg-green-100 text-green-800' 
                            : invoice.status === 'Partial' 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-blue-100 text-blue-800'
                        }`}>
                          {invoice.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  name="invoiceDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice Date</FormLabel>
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
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter any additional notes or instructions"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md">
                <div className="grid grid-cols-12 gap-2 p-3 bg-muted/50 font-medium text-sm">
                  <div className="col-span-4">Product</div>
                  <div className="col-span-3">Description</div>
                  <div className="col-span-1 text-right">Qty</div>
                  <div className="col-span-2 text-right">Unit Price</div>
                  <div className="col-span-2 text-right">Amount</div>
                </div>
                
                {form.watch("items").map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 p-3 border-t text-sm">
                    <div className="col-span-4">
                      Product #{item.productId}
                    </div>
                    <div className="col-span-3">
                      {item.description}
                    </div>
                    <div className="col-span-1 text-right">
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const qty = parseInt(e.target.value, 10);
                          if (qty > 0) {
                            const items = [...form.getValues("items")];
                            items[index] = {
                              ...items[index],
                              quantity: qty,
                              subtotal: qty * item.unitPrice
                            };
                            form.setValue("items", items);
                          }
                        }}
                        className="w-16 text-right"
                      />
                    </div>
                    <div className="col-span-2 text-right">
                      {formatCurrency(item.unitPrice)}
                    </div>
                    <div className="col-span-2 text-right">
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="tax" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="tax">
                    <Percent className="h-4 w-4 mr-2" />
                    Tax Calculation
                  </TabsTrigger>
                  <TabsTrigger value="quantity">
                    <Receipt className="h-4 w-4 mr-2" />
                    Quantity Tracking
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="tax" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-md font-medium mb-4">Tax Type</h3>
                      <div className="space-x-2 mb-6">
                        <Button
                          type="button"
                          size="sm"
                          variant={taxType === 'gst' ? 'default' : 'outline'}
                          onClick={() => handleTaxTypeChange('gst')}
                        >
                          CGST + SGST (Intrastate)
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={taxType === 'igst' ? 'default' : 'outline'}
                          onClick={() => handleTaxTypeChange('igst')}
                        >
                          IGST (Interstate)
                        </Button>
                      </div>
                      
                      <h3 className="text-md font-medium mb-2">Tax Presets</h3>
                      <div className="flex flex-wrap gap-2">
                        {[0, 5, 12, 18, 28].map((rate) => (
                          <Button 
                            key={rate}
                            variant="outline"
                            size="sm"
                            onClick={() => handleApplyTaxRate(rate)}
                          >
                            <Percent className="h-3 w-3 mr-1" />
                            {rate === 0 ? 'Exempt' : `GST ${rate}%`}
                          </Button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="bg-muted p-4 rounded-lg">
                      <h3 className="font-medium text-lg mb-4">Tax Breakdown</h3>
                      
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="text-sm">Subtotal:</div>
                          <div className="text-sm font-medium text-right">{formatCurrency(form.watch("subtotal"))}</div>
                          
                          <div className="text-sm">Total Tax:</div>
                          <div className="text-sm font-medium text-right">{formatCurrency(form.watch("tax"))}</div>
                          
                          {taxType === "gst" && (
                            <>
                              <div className="text-sm">CGST:</div>
                              <div className="text-sm font-medium text-right">{formatCurrency(taxBreakdown.cgst)}</div>
                              
                              <div className="text-sm">SGST:</div>
                              <div className="text-sm font-medium text-right">{formatCurrency(taxBreakdown.sgst)}</div>
                            </>
                          )}
                          
                          {taxType === "igst" && (
                            <>
                              <div className="text-sm">IGST:</div>
                              <div className="text-sm font-medium text-right">{formatCurrency(taxBreakdown.igst)}</div>
                            </>
                          )}
                          
                          <div className="text-sm font-semibold border-t pt-2">Total Amount:</div>
                          <div className="text-sm font-bold text-right border-t pt-2">{formatCurrency(form.watch("total"))}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="quantity">
                  <div className="rounded-md border">
                    <table className="min-w-full divide-y divide-border">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="px-4 py-3 text-left text-sm font-medium">Product</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">Order Qty</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">Invoiced Qty</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">This Invoice</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">Received Qty</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">Remaining</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {getQuantityTrackingItems().map((item, index) => {
                          const orderQty = item.orderQty || 0;
                          const invoicedQty = item.invoicedQty || 0;
                          const thisInvoiceQty = form.watch(`items.${index}.quantity`) || 0;
                          const receivedQty = item.receivedQty || 0;
                          const remaining = Math.max(0, orderQty - (invoicedQty + thisInvoiceQty));
                          
                          return (
                            <tr key={index}>
                              <td className="px-4 py-3 text-sm">
                                {item.productName}
                              </td>
                              <td className="px-4 py-3 text-sm text-right">
                                {orderQty}
                              </td>
                              <td className="px-4 py-3 text-sm text-right">
                                {invoicedQty}
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-medium">
                                {thisInvoiceQty}
                              </td>
                              <td className="px-4 py-3 text-sm text-right">
                                {receivedQty}
                              </td>
                              <td className="px-4 py-3 text-sm text-right">
                                {remaining}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => navigate("/sales-orders")}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Invoice
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}