import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { createIntercompanyDeliveryNote } from "@/lib/intercompany-connector";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/hooks/use-company";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const formSchema = z.object({
  invoiceId: z.number().min(1, "Invoice is required"),
  deliveryDate: z.string().min(1, "Delivery date is required"),
  shippingMethod: z.string().min(1, "Shipping method is required"),
  carrierName: z.string().optional(),
  trackingNumber: z.string().optional(),
  notes: z.string().optional(),
  deliveredItems: z.array(
    z.object({
      productId: z.number(),
      quantity: z.number().min(1, "Quantity must be at least 1"),
      notes: z.string().optional(),
    })
  ).min(1, "At least one item must be delivered"),
});

type FormValues = z.infer<typeof formSchema>;

export default function IntercompanyDeliveryNoteForm() {
  const { activeCompany } = useCompany();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [invoiceId, setInvoiceId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // Get URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("invoiceId");
    
    if (id) {
      setInvoiceId(parseInt(id, 10));
    }
  }, []);
  
  // Query for invoice details
  const { data: invoice, isLoading: isLoadingInvoice } = useQuery({
    queryKey: ["/api/invoices", invoiceId],
    queryFn: async () => {
      if (!invoiceId) return null;
      const res = await apiRequest("GET", `/api/invoices/${invoiceId}`);
      return await res.json();
    },
    enabled: !!invoiceId
  });
  
  // Query for invoice items
  const { data: invoiceItems, isLoading: isLoadingItems } = useQuery({
    queryKey: ["/api/invoice-items", invoiceId],
    queryFn: async () => {
      if (!invoiceId) return [];
      const res = await apiRequest("GET", `/api/invoice-items/${invoiceId}`);
      return await res.json();
    },
    enabled: !!invoiceId
  });
  
  // Initialize form with defaults
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      invoiceId: invoiceId || 0,
      deliveryDate: new Date().toISOString().split('T')[0],
      shippingMethod: "standard",
      carrierName: "",
      trackingNumber: "",
      notes: "",
      deliveredItems: []
    }
  });

  // Update form values when data is loaded
  useEffect(() => {
    if (invoice && invoiceItems && invoiceItems.length > 0) {
      // Map invoice items to delivery items
      const deliveredItems = invoiceItems.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity,
        notes: ""
      }));
      
      form.reset({
        invoiceId: invoiceId || 0,
        deliveryDate: new Date().toISOString().split('T')[0],
        shippingMethod: "standard",
        carrierName: "",
        trackingNumber: "",
        notes: "",
        deliveredItems
      });
    }
  }, [invoice, invoiceItems, form, invoiceId]);
  
  const onSubmit = async (data: FormValues) => {
    setIsCreating(true);
    
    try {
      // Use the enhanced intercompany connector with auth error handling
      const result = await createIntercompanyDeliveryNote(data);
      
      // Check if there was an authentication error
      if (!result.success && 'authError' in result && result.authError) {
        console.error("Authentication error detected:", result.error);
        
        toast({
          title: "Authentication Required",
          description: "Your session has expired. Please log in again.",
          variant: "destructive",
        });
        
        // Redirect to login page with current page as redirect target
        setTimeout(() => {
          navigate(`/auth?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        }, 1500);
        return;
      }
      
      // Handle other errors
      if (!result.success) {
        throw new Error(result.error || "Failed to create delivery note");
      }
      
      toast({
        title: "Success",
        description: "Intercompany delivery note created successfully",
      });
      
      // Invalidate affected queries
      queryClient.invalidateQueries({ queryKey: ["/api/intercompany-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/journal-entries"] });
      
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
  
  const isLoading = isLoadingInvoice || isLoadingItems;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading invoice details...</span>
      </div>
    );
  }
  
  if (!invoice || !invoiceItems || invoiceItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Intercompany Delivery Note</CardTitle>
          <CardDescription>No invoice found or invoice has no items</CardDescription>
        </CardHeader>
        <CardContent>
          <p>The specified invoice could not be found or has no items to deliver.</p>
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
        <h1 className="text-3xl font-bold">Create Intercompany Delivery Note</h1>
        <Button variant="outline" onClick={() => navigate("/intercompany-transactions")}>
          Cancel
        </Button>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
          <CardDescription>
            Creating delivery note for invoice #{invoice.invoiceNumber}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Invoice Information</h3>
              <p>Invoice Number: {invoice.invoiceNumber}</p>
              <p>Customer: {invoice.customerName}</p>
              <p>Issue Date: {new Date(invoice.issueDate).toLocaleDateString()}</p>
              <p>Total Amount: {formatCurrency(invoice.totalAmount, 'USD')}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Shipping Information</h3>
              <p>{invoice.customerName || "N/A"}</p>
              {invoice.shippingAddress?.addressLine1 && <p>{invoice.shippingAddress.addressLine1}</p>}
              {invoice.shippingAddress?.addressLine2 && <p>{invoice.shippingAddress.addressLine2}</p>}
              <p>
                {invoice.shippingAddress?.city || ""}, {invoice.shippingAddress?.state || ""} {invoice.shippingAddress?.postalCode || ""}
              </p>
              <p>{invoice.shippingAddress?.country || ""}</p>
            </div>
          </div>
          
          <div className="mt-6">
            <h3 className="font-semibold mb-2">Invoice Items</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoiceItems.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unitPrice, 'USD')}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.totalPrice, 'USD')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Delivery Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="deliveryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="shippingMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shipping Method</FormLabel>
                      <FormControl>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                          {...field}
                        >
                          <option value="standard">Standard Shipping</option>
                          <option value="express">Express Shipping</option>
                          <option value="overnight">Overnight Shipping</option>
                          <option value="pickup">Customer Pickup</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="carrierName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Carrier Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. FedEx, UPS" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="trackingNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tracking Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Tracking number (if available)" {...field} />
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
                    <FormLabel>Delivery Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Add notes about this delivery"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="mt-6">
                <h3 className="font-semibold mb-4">Delivered Items</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Invoice Qty</TableHead>
                      <TableHead className="text-right">Delivery Qty</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoiceItems.map((item: any, index: number) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min="0"
                            max={item.quantity}
                            className="w-20 ml-auto"
                            value={form.watch(`deliveredItems.${index}.quantity`) || item.quantity}
                            onChange={(e) => {
                              const value = parseInt(e.target.value, 10);
                              const updatedItems = [...form.getValues("deliveredItems")];
                              updatedItems[index] = {
                                ...updatedItems[index],
                                quantity: value
                              };
                              form.setValue("deliveredItems", updatedItems);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder="Item-specific notes"
                            value={form.watch(`deliveredItems.${index}.notes`) || ""}
                            onChange={(e) => {
                              const updatedItems = [...form.getValues("deliveredItems")];
                              updatedItems[index] = {
                                ...updatedItems[index],
                                notes: e.target.value
                              };
                              form.setValue("deliveredItems", updatedItems);
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
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
                  Creating...
                </>
              ) : 'Create Delivery Note'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}