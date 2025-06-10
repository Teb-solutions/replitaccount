import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { createIntercompanyGoodsReceipt } from "@/lib/intercompany-connector";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/hooks/use-company";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const formSchema = z.object({
  billId: z.number().min(1, "Bill is required"),
  receiptDate: z.string().min(1, "Receipt date is required"),
  notes: z.string().optional(),
  receivedItems: z.array(
    z.object({
      productId: z.number(),
      quantity: z.number().min(1, "Quantity must be at least 1"),
      condition: z.string().default("good"),
      isAccepted: z.boolean().default(true),
      notes: z.string().optional(),
    })
  ).min(1, "At least one item must be received"),
});

type FormValues = z.infer<typeof formSchema>;

export default function IntercompanyGoodsReceiptForm() {
  const { activeCompany } = useCompany();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [billId, setBillId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // Get URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("billId");
    
    if (id) {
      setBillId(parseInt(id, 10));
    }
  }, []);
  
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
  
  // Query for bill items
  const { data: billItems, isLoading: isLoadingItems } = useQuery({
    queryKey: ["/api/bill-items", billId],
    queryFn: async () => {
      if (!billId) return [];
      const res = await apiRequest("GET", `/api/bill-items/${billId}`);
      return await res.json();
    },
    enabled: !!billId
  });
  
  // Initialize the form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      billId: billId || 0,
      receiptDate: new Date().toISOString().split('T')[0],
      notes: "",
      receivedItems: []
    }
  });
  
  // Update form values when data is loaded
  useEffect(() => {
    if (bill && billItems && billItems.length > 0) {
      // Map bill items to receipt items
      const receivedItems = billItems.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity,
        condition: "good",
        isAccepted: true,
        notes: ""
      }));
      
      form.reset({
        billId: billId || 0,
        receiptDate: new Date().toISOString().split('T')[0],
        notes: "",
        receivedItems
      });
    }
  }, [bill, billItems, form, billId]);
  
  const onSubmit = async (data: FormValues) => {
    setIsCreating(true);
    
    try {
      // Use the enhanced intercompany connector with auth error handling
      const result = await createIntercompanyGoodsReceipt(data);
      
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
        throw new Error(result.error || "Failed to create goods receipt");
      }
      
      toast({
        title: "Success",
        description: "Intercompany goods receipt created successfully",
      });
      
      // Invalidate queries that might be affected
      queryClient.invalidateQueries({ queryKey: ["/api/intercompany-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
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
  
  const isLoading = isLoadingBill || isLoadingItems;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading bill details...</span>
      </div>
    );
  }
  
  if (!bill || !billItems || billItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Intercompany Goods Receipt</CardTitle>
          <CardDescription>No bill found or bill has no items</CardDescription>
        </CardHeader>
        <CardContent>
          <p>The specified bill could not be found or has no items to receive.</p>
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
        <h1 className="text-3xl font-bold">Create Intercompany Goods Receipt</h1>
        <Button variant="outline" onClick={() => navigate("/intercompany-transactions")}>
          Cancel
        </Button>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Bill Details</CardTitle>
          <CardDescription>
            Creating goods receipt for bill #{bill.billNumber}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Bill Information</h3>
              <p>Bill Number: {bill.billNumber}</p>
              <p>Vendor: {bill.vendorName}</p>
              <p>Issue Date: {new Date(bill.issueDate).toLocaleDateString()}</p>
              <p>Total Amount: {formatCurrency(bill.totalAmount, 'USD')}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Vendor Information</h3>
              <p>{bill.vendorName || "N/A"}</p>
              {bill.vendorAddress?.addressLine1 && <p>{bill.vendorAddress.addressLine1}</p>}
              {bill.vendorAddress?.addressLine2 && <p>{bill.vendorAddress.addressLine2}</p>}
              <p>
                {bill.vendorAddress?.city || ""}, {bill.vendorAddress?.state || ""} {bill.vendorAddress?.postalCode || ""}
              </p>
              <p>{bill.vendorAddress?.country || ""}</p>
            </div>
          </div>
          
          <div className="mt-6">
            <h3 className="font-semibold mb-2">Bill Items</h3>
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
                {billItems.map((item: any) => (
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
              <CardTitle>Receipt Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Receipt Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Add notes about this goods receipt"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="mt-6">
                <h3 className="font-semibold mb-4">Received Items</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Expected Qty</TableHead>
                      <TableHead className="text-right">Received Qty</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Accept</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billItems.map((item: any, index: number) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min="0"
                            max={item.quantity}
                            className="w-20 ml-auto"
                            value={form.watch(`receivedItems.${index}.quantity`) || item.quantity}
                            onChange={(e) => {
                              const value = parseInt(e.target.value, 10);
                              const updatedItems = [...form.getValues("receivedItems")];
                              updatedItems[index] = {
                                ...updatedItems[index],
                                quantity: value
                              };
                              form.setValue("receivedItems", updatedItems);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <select
                            className="border border-gray-300 rounded-md px-2 py-1 w-full"
                            value={form.watch(`receivedItems.${index}.condition`) || "good"}
                            onChange={(e) => {
                              const updatedItems = [...form.getValues("receivedItems")];
                              updatedItems[index] = {
                                ...updatedItems[index],
                                condition: e.target.value
                              };
                              form.setValue("receivedItems", updatedItems);
                            }}
                          >
                            <option value="good">Good</option>
                            <option value="damaged">Damaged</option>
                            <option value="partial">Partial</option>
                            <option value="incorrect">Incorrect</option>
                          </select>
                        </TableCell>
                        <TableCell>
                          <Checkbox
                            checked={form.watch(`receivedItems.${index}.isAccepted`) ?? true}
                            onCheckedChange={(checked) => {
                              const updatedItems = [...form.getValues("receivedItems")];
                              updatedItems[index] = {
                                ...updatedItems[index],
                                isAccepted: !!checked
                              };
                              form.setValue("receivedItems", updatedItems);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder="Item-specific notes"
                            value={form.watch(`receivedItems.${index}.notes`) || ""}
                            onChange={(e) => {
                              const updatedItems = [...form.getValues("receivedItems")];
                              updatedItems[index] = {
                                ...updatedItems[index],
                                notes: e.target.value
                              };
                              form.setValue("receivedItems", updatedItems);
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
              ) : 'Create Goods Receipt'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}