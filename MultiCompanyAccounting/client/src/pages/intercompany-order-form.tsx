import { useState, useEffect, useMemo } from "react";
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
import { createIntercompanySalesOrder } from "@/lib/intercompany-connector";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import OrderStatusInfo from "@/components/intercompany/order-status-info";

// Form schema for intercompany order
const formSchema = z.object({
  targetCompanyId: z.string(),
  date: z.date(),
  expectedDate: z.date(),
  description: z.string().min(3, "Description must be at least 3 characters"),
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, "Quantity must be a positive number"),
      unitPrice: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, "Unit price must be a positive number"),
      description: z.string().optional(),
    })
  ).min(1, "At least one item is required"),
});

type FormValues = z.infer<typeof formSchema>;

export default function IntercompanyOrderForm() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeCompany, companies } = useCompany();
  const [isLoading, setIsLoading] = useState(false);
  const [, navigate] = useLocation();
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
        
        // Use our tenant companies API
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

  // Use our specialized direct database query API to get products with correct pricing
  const { data: sourceCompanyProducts, isLoading: isLoadingSourceProducts } = useQuery({
    queryKey: ['/api/company-products', sourceCompanyId],
    queryFn: async () => {
      try {
        if (!sourceCompanyId) {
          console.log('No source company ID available');
          return [];
        }
        
        console.log(`Fetching products for source company ID: ${sourceCompanyId}`);
        
        // Use the company products API that correctly handles pricing fields
        const response = await fetch(`/api/company-products/${sourceCompanyId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch source company products: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Found ${data.length} products for source company ${sourceCompanyId}:`, data);
        
        // Return the formatted products
        return data;
      } catch (error) {
        console.error("Error fetching source company products:", error);
        return [];
      }
    },
    enabled: !!sourceCompanyId
  });
  
  // Get products for the active company
  const { data: activeCompanyProducts, isLoading: isLoadingActiveProducts } = useQuery({
    queryKey: ['/api/products-db', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return [];
      
      try {
        console.log(`Fetching products for active company ${activeCompany.id}`);
        
        // First try the direct database endpoint
        const response = await fetch(`/api/products-db/${activeCompany.id}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`Found ${data.length} products for company ${activeCompany.id}:`, data);
          
          if (Array.isArray(data) && data.length > 0) {
            return data.map(product => ({
              id: product.id,
              name: product.name,
              description: product.description || '',
              price: product.sales_price || product.price || 0
            }));
          }
        }
        
        // Try regular products endpoint as fallback
        console.log("Trying regular products endpoint as fallback");
        const regularResponse = await fetch(`/api/products?companyId=${activeCompany.id}`);
        if (regularResponse.ok) {
          const regularData = await regularResponse.json();
          if (Array.isArray(regularData) && regularData.length > 0) {
            return regularData.map(product => ({
              id: product.id,
              name: product.name,
              description: product.description || '',
              price: product.price || 0
            }));
          }
        }
        
        console.log('No products found, returning empty array');
        return [];
      } catch (error) {
        console.error("Error fetching products:", error);
        return [];
      }
    },
    enabled: true, // Always fetch Gas Manufacturing products
  });
  
  // Get products from active company as well
  const { data: companyProducts, isLoading: isLoadingCompanyProducts } = useQuery({
    queryKey: ['/api/products-db', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return [];
      try {
        console.log(`Directly fetching products for active company (ID: ${activeCompany.id}) from database`);
        const response = await fetch(`/api/products-db/${activeCompany.id}`);
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Found ${data.length} products for company ${activeCompany.id}:`, data);
        
        if (Array.isArray(data) && data.length > 0) {
          return data.map(product => ({
            id: product.id,
            name: product.name,
            description: product.description || '',
            price: product.sales_price || product.price || 0
          }));
        }
        
        return [];
      } catch (error) {
        console.error(`Error fetching products for company ${activeCompany.id}:`, error);
        return [];
      }
    },
    enabled: !!activeCompany,
  });
  
  // Combine both product sets and remove duplicates
  const products = useMemo(() => {
    const allProducts = [...(sourceCompanyProducts || [])];
    
    // Add company products if available
    if (Array.isArray(companyProducts)) {
      allProducts.push(...companyProducts);
    }
    
    // Remove potential duplicates by id
    const uniqueProducts = allProducts.filter((product, index, self) => 
      index === self.findIndex(p => p.id === product.id)
    );
    
    console.log(`Combined unique products: ${uniqueProducts.length}`);
    return uniqueProducts;
  }, [sourceCompanyProducts, companyProducts, activeCompany?.id]);
  
  const isLoadingProducts = isLoadingSourceProducts || isLoadingCompanyProducts;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      targetCompanyId: "",
      date: new Date(),
      expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      description: "",
      items: [
        {
          productId: "",
          quantity: "1",
          unitPrice: "0",
          description: "",
        },
      ],
    },
  });

  // All company types are now allowed to create intercompany orders
  useEffect(() => {
    if (activeCompany) {
      console.log(`Creating intercompany order for company code: ${activeCompany.code}`);
    }
  }, [activeCompany]);

  const onAddItem = () => {
    const currentItems = form.getValues("items");
    form.setValue("items", [
      ...currentItems,
      { productId: "", quantity: "1", unitPrice: "0", description: "" },
    ]);
  };

  const onRemoveItem = (index: number) => {
    const currentItems = form.getValues("items");
    if (currentItems.length > 1) {
      form.setValue(
        "items",
        currentItems.filter((_, i) => i !== index)
      );
    }
  };

  const calculateSubtotal = () => {
    const items = form.getValues("items");
    return items.reduce((total, item) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      return total + quantity * unitPrice;
    }, 0);
  };

  async function onSubmit(values: FormValues) {
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
      
      // Ensure targetCompanyId is selected
      if (!values.targetCompanyId) {
        toast({
          title: "Error",
          description: "Please select a target company",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      const targetCompanyId = parseInt(values.targetCompanyId);
      
      // Verify the targetCompanyId is a valid number
      if (isNaN(targetCompanyId) || targetCompanyId <= 0) {
        toast({
          title: "Error",
          description: "Invalid target company selection",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Format the items
      const formattedItems = values.items.map(item => ({
        productId: parseInt(item.productId),
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        description: item.description || "",
      }));
      
      // Verify that at least one item exists and all items have valid values
      if (formattedItems.length === 0) {
        toast({
          title: "Error",
          description: "Please add at least one item to the order",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      // Check for invalid product IDs, quantities, or prices
      const invalidItem = formattedItems.find(
        item => isNaN(item.productId) || item.productId <= 0 || 
               isNaN(item.quantity) || item.quantity <= 0 || 
               isNaN(item.unitPrice) || item.unitPrice <= 0
      );
      
      if (invalidItem) {
        toast({
          title: "Error",
          description: "Some items have invalid product, quantity, or price values",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Create the intercompany order with all required fields
      const result = await createIntercompanySalesOrder({
        sourceCompanyId: activeCompany.id,
        targetCompanyId: targetCompanyId,
        date: format(values.date, "yyyy-MM-dd"),
        expectedDate: format(values.expectedDate, "yyyy-MM-dd"),
        description: values.description,
        items: formattedItems,
      });

      if (result.success) {
        // Save the order ID for displaying status information
        if (result.sourceOrder && result.sourceOrder.id) {
          setSelectedOrderId(result.sourceOrder.id);
        }
        
        toast({
          title: "Success!",
          description: `Intercompany order created. Sales Order: ${result.sourceOrder?.order_number || result.sourceOrder?.id || 'N/A'}, Purchase Order: ${result.targetOrder?.order_number || result.targetOrder?.id || 'N/A'}`,
        });
        
        // Instead of navigating away, stay on the page to show order status
        // navigate("/intercompany-transactions");
      } else {
        toast({
          title: "Error creating intercompany order",
          description: result.error || "An unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating intercompany order:", error);
      toast({
        title: "Error",
        description: "Failed to create intercompany order. Please try again.",
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
              Please select an active company to create intercompany orders
            </CardDescription>
          </CardHeader>
        </Card>
      </Layout>
    );
  }

  {/* All company types can now create intercompany orders */}

  return (
    <Layout>
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Create Intercompany Order</CardTitle>
          <CardDescription>
            Create a matched sales and purchase order between your company and a distributor
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedOrderId && (
            <OrderStatusInfo orderId={selectedOrderId} />
          )}
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-1 md:col-span-2">
                  <h3 className="text-lg font-medium mb-2">Source Company (Manufacturer)</h3>
                  <div className="p-3 border rounded-md bg-slate-50">
                    <p className="font-medium">{activeCompany.name}</p>
                    <p className="text-sm text-muted-foreground">Code: {activeCompany.code || 'N/A'}</p>
                  </div>
                </div>

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
                          {targetCompanies.length > 0 ? (
                            targetCompanies.map((company) => (
                              <SelectItem key={company.id} value={company.id.toString()}>
                                {company.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-companies" disabled>
                              No other companies available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {targetCompanies.length === 0 && (
                          <span className="text-red-500">Please create at least one more company</span>
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Transaction Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expectedDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Expected Delivery Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="col-span-1 md:col-span-2">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Details about this intercompany transaction"
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Line Items</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onAddItem}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add Item
                  </Button>
                </div>

                <div className="border rounded-md p-4 space-y-4">
                  {form.watch("items").map((_, index) => (
                    <div key={index} className="space-y-4">
                      {index > 0 && <hr className="my-4" />}
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Item {index + 1}</h4>
                        {form.watch("items").length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onRemoveItem(index)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`items.${index}.productId`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Product</FormLabel>
                              <Select
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  // Update the unit price when product changes
                                  const selectedProduct = products?.find(p => p.id.toString() === value);
                                  if (selectedProduct) {
                                    // Handle different naming conventions for price fields
                                    const price = selectedProduct.sales_price || selectedProduct.salesPrice || 0;
                                    form.setValue(`items.${index}.unitPrice`, price.toString());
                                    form.setValue(`items.${index}.description`, selectedProduct.description || "");
                                  }
                                }}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select product" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {isLoadingProducts ? (
                                    <SelectItem value="loading">
                                      Loading products...
                                    </SelectItem>
                                  ) : products && Array.isArray(products) && products.length > 0 ? (
                                    products.map((product: any) => (
                                      <SelectItem
                                        key={product.id}
                                        value={product.id.toString()}
                                      >
                                        {product.name} - {typeof product.sales_price === 'number' 
                                        ? `$${product.sales_price.toFixed(2)}` 
                                        : typeof product.sales_price === 'string' 
                                          ? `$${parseFloat(product.sales_price).toFixed(2)}` 
                                          : typeof product.salesPrice === 'number' 
                                            ? `$${product.salesPrice.toFixed(2)}`
                                            : typeof product.salesPrice === 'string'
                                              ? `$${parseFloat(product.salesPrice).toFixed(2)}`
                                              : '$0.00'}
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <SelectItem value="no_products_available">
                                      No products available
                                    </SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`items.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description (Optional)</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Item description"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`items.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quantity</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="1"
                                  step="1"
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    form.trigger("items");
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`items.${index}.unitPrice`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Unit Price</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    form.trigger("items");
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Subtotal</p>
                  <p className="text-lg font-medium">
                    ${calculateSubtotal().toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate("/intercompany-transactions")}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading || !targetCompanies.length || !(products && Array.isArray(products) && products.length > 0)}
                >
                  {isLoading ? "Creating..." : "Create Intercompany Order"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </Layout>
  );
}