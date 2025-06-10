import { useState, useEffect } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Layout from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useCompany } from "@/hooks/use-company";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import OrderStatusInfo from "@/components/intercompany/order-status-info";

// Form schema for processing an existing order into a transaction
const formSchema = z.object({
  sourceOrderId: z.string().min(1, "Please select a source order"),
  targetCompanyId: z.string().min(1, "Please select a target company"),
  description: z.string().min(3, "Description must be at least 3 characters"),
});

type FormValues = z.infer<typeof formSchema>;

export default function ExistingOrderTransactionForm() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const [isLoading, setIsLoading] = useState(false);
  const [, navigate] = useLocation();
  const [transactionCreated, setTransactionCreated] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  
  // Use the active company ID as the source company ID for API calls
  const sourceCompanyId = activeCompany?.id;

  // Get tenant companies from the external database
  const { data: tenantCompanies, isLoading: isLoadingTenantCompanies } = useQuery({
    queryKey: ['/api/tenant-companies', user?.tenantId],
    queryFn: async () => {
      if (!user?.tenantId) {
        console.log('No tenant ID available');
        return [];
      }
      
      try {
        console.log(`Fetching companies for tenant ID: ${user.tenantId}`);
        
        const response = await fetch(`/api/tenant-companies/${user.tenantId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch tenant companies: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Found ${data.length} companies for tenant ${user.tenantId}:`, data);
        
        return data;
      } catch (error) {
        console.error("Error fetching tenant companies:", error);
        return [];
      }
    },
    enabled: !!user?.tenantId
  });
  
  // Filter out the active company to get target companies
  const targetCompanies = Array.isArray(tenantCompanies) 
    ? tenantCompanies.filter(company => company.id !== activeCompany?.id) 
    : [];

  // Get open sales orders for the active company
  const { data: salesOrders, isLoading: isLoadingSalesOrders } = useQuery({
    queryKey: ['/api/sales-orders/open', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) {
        console.log('No active company ID available');
        return [];
      }
      
      try {
        console.log(`Fetching open sales orders for company ID: ${activeCompany.id}`);
        
        // Use the sales orders API to get open orders
        const response = await fetch(`/api/sales-orders/open/${activeCompany.id}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch sales orders: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Found ${data.length} open sales orders for company ${activeCompany.id}:`, data);
        
        // Return the formatted orders
        return data;
      } catch (error) {
        console.error("Error fetching sales orders:", error);
        return [];
      }
    },
    enabled: !!activeCompany?.id
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sourceOrderId: "",
      targetCompanyId: "",
      description: "Intercompany transaction for existing sales order",
    },
  });

  async function onSubmit(values: FormValues): Promise<void> {
    setIsLoading(true);
    
    try {
      if (!activeCompany) {
        toast({
          title: "Error",
          description: "No active company selected",
          variant: "destructive",
        });
        return;
      }
      
      const targetCompanyId = parseInt(values.targetCompanyId);
      const sourceOrderId = parseInt(values.sourceOrderId);
      
      // Verify the values are valid numbers
      if (isNaN(targetCompanyId) || targetCompanyId <= 0) {
        toast({
          title: "Error",
          description: "Invalid target company selection",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      if (isNaN(sourceOrderId) || sourceOrderId <= 0) {
        toast({
          title: "Error",
          description: "Invalid source order selection",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      // Prepare the request payload
      const payload = {
        sourceOrderId: sourceOrderId,
        sourceCompanyId: activeCompany.id,
        targetCompanyId: targetCompanyId,
        description: values.description,
      };
      
      // Make the API request to process the order and create a transaction using our new endpoint
      const response = await apiRequest('POST', `/api/order-transaction-processor/create-from-order/${sourceOrderId}`, {
        targetCompanyId: targetCompanyId,
        description: values.description
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Failed to process transaction');
      }
      
      const result = await response.json();
      
      if (result.success) {
        // Save the transaction ID and order ID for displaying status information
        setSelectedOrderId(sourceOrderId);
        setTransactionCreated(true);
        
        toast({
          title: "Success!",
          description: `Intercompany transaction created successfully. Transaction ID: ${result.transaction.id}`,
        });
      } else {
        toast({
          title: "Error creating transaction",
          description: result.error || "An unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error creating intercompany transaction:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create intercompany transaction. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (!activeCompany) {
    return (
      <Layout>
        <Card className="w-full max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>No Active Company</CardTitle>
            <CardDescription>
              Please select an active company to create intercompany transactions
            </CardDescription>
          </CardHeader>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout>
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Process Existing Order into Transaction</CardTitle>
          <CardDescription>
            Create an intercompany transaction from an existing sales order
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactionCreated && selectedOrderId && (
            <div className="mb-6">
              <OrderStatusInfo orderId={selectedOrderId} />
            </div>
          )}
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-1 md:col-span-2">
                  <h3 className="text-lg font-medium mb-2">Source Company</h3>
                  <div className="p-3 border rounded-md bg-slate-50">
                    <p className="font-medium">{activeCompany.name}</p>
                    <p className="text-sm text-muted-foreground">Code: {activeCompany.code || 'N/A'}</p>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="sourceOrderId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source Sales Order</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a sales order" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingSalesOrders ? (
                            <div className="flex items-center justify-center p-2">
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              <span>Loading orders...</span>
                            </div>
                          ) : salesOrders && salesOrders.length > 0 ? (
                            salesOrders.map((order) => (
                              <SelectItem key={order.id} value={order.id.toString()}>
                                {order.order_number} - ${order.total} ({order.status})
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem disabled value="none">
                              No open sales orders available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select an existing sales order to process into an intercompany transaction
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="targetCompanyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Company</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select target company" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingTenantCompanies ? (
                            <div className="flex items-center justify-center p-2">
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              <span>Loading companies...</span>
                            </div>
                          ) : targetCompanies.length > 0 ? (
                            targetCompanies.map((company) => (
                              <SelectItem key={company.id} value={company.id.toString()}>
                                {company.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem disabled value="none">
                              No other companies available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select the target company for the intercompany transaction
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                


                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="col-span-1 md:col-span-2">
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Description of the intercompany transaction"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Provide a description for this transaction
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end">
                <Button 
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : "Create Transaction"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </Layout>
  );
}