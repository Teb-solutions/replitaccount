import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'wouter';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/hooks/use-company';

// Define the form schema
const formSchema = z.object({
  sourceCompanyId: z.string().min(1, "Source company is required"),
  targetCompanyId: z.string().min(1, "Target company is required"),
  productId: z.string().min(1, "Product is required"),
  quantity: z.string().transform(val => parseInt(val, 10)),
  unitPrice: z.string().transform(val => parseFloat(val)),
  description: z.string().optional(),
  deliveryDate: z.string().min(1, "Delivery date is required"),
});

// Define product type
type Product = {
  id: number;
  name: string;
  description: string;
  price: number;
};

// Define company type
type SimpleCompany = {
  id: number;
  name: string;
  code?: string;
};

// Main component
export default function IntercompanyOrderForm() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const { activeCompany } = useCompany();
  
  // Get all companies
  const { data: companies, isLoading: isLoadingCompanies } = useQuery({
    queryKey: ['/api/companies'],
    queryFn: async () => {
      const response = await fetch('/api/companies');
      if (!response.ok) {
        throw new Error('Failed to fetch companies');
      }
      const data = await response.json();
      return data as SimpleCompany[];
    }
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
    enabled: !!activeCompany?.id
  });
  
  // Define the form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sourceCompanyId: activeCompany?.id?.toString() || '',
      targetCompanyId: '',
      productId: '',
      quantity: '1',
      unitPrice: '0',
      description: '',
      deliveryDate: new Date().toISOString().split('T')[0],
    }
  });
  
  // Update source company when active company changes
  useEffect(() => {
    if (activeCompany?.id) {
      form.setValue('sourceCompanyId', activeCompany.id.toString());
    }
  }, [activeCompany, form]);
  
  // Handle form submission
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    
    try {
      // Calculate total
      const total = parseInt(values.quantity.toString()) * parseFloat(values.unitPrice.toString());
      
      // Find company and product names
      const sourceCompany = companies?.find(c => c.id.toString() === values.sourceCompanyId);
      const targetCompany = companies?.find(c => c.id.toString() === values.targetCompanyId);
      const product = activeCompanyProducts?.find(p => p.id.toString() === values.productId);
      
      if (!sourceCompany || !targetCompany || !product) {
        toast({
          title: "Form Error",
          description: "Missing company or product details",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      // Prepare the order data
      const orderData = {
        sourceCompanyId: parseInt(values.sourceCompanyId),
        targetCompanyId: parseInt(values.targetCompanyId),
        productId: parseInt(values.productId),
        quantity: parseInt(values.quantity.toString()),
        unitPrice: parseFloat(values.unitPrice.toString()),
        total,
        description: values.description || product.name,
        deliveryDate: values.deliveryDate,
        sourceCompanyName: sourceCompany.name,
        targetCompanyName: targetCompany.name,
        productName: product.name
      };
      
      // Submit the order
      const response = await fetch('/api/intercompany-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create intercompany order');
      }
      
      const result = await response.json();
      
      toast({
        title: "Order Created",
        description: `Intercompany order #${result.orderNumber || result.id} created successfully`,
      });
      
      // Navigate back to orders list
      navigate('/intercompany-orders');
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create order",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  // Filter out the source company from target companies
  const targetCompanies = companies?.filter(
    company => company.id.toString() !== form.watch('sourceCompanyId')
  );
  
  // Get the selected product
  const selectedProduct = activeCompanyProducts?.find(
    product => product.id.toString() === form.watch('productId')
  );
  
  // Update unit price when product changes
  useEffect(() => {
    if (selectedProduct) {
      form.setValue('unitPrice', selectedProduct.price.toString());
      form.setValue('description', selectedProduct.description);
    }
  }, [selectedProduct, form]);
  
  return (
    <div className="container mx-auto py-6">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Create Intercompany Order</CardTitle>
          <CardDescription>
            Create an order between two companies in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Source Company */}
                <FormField
                  control={form.control}
                  name="sourceCompanyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source Company</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        disabled
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select source company" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {activeCompany && (
                            <SelectItem 
                              key={activeCompany.id} 
                              value={activeCompany.id.toString()}
                            >
                              {activeCompany.name}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Target Company */}
                <FormField
                  control={form.control}
                  name="targetCompanyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Company</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select target company" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingCompanies ? (
                            <SelectItem value="loading">Loading...</SelectItem>
                          ) : (
                            targetCompanies?.map(company => (
                              <SelectItem 
                                key={company.id} 
                                value={company.id.toString()}
                              >
                                {company.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Product */}
                <FormField
                  control={form.control}
                  name="productId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingActiveProducts ? (
                            <SelectItem value="loading">Loading...</SelectItem>
                          ) : activeCompanyProducts && activeCompanyProducts.length > 0 ? (
                            activeCompanyProducts.map(product => (
                              <SelectItem 
                                key={product.id} 
                                value={product.id.toString()}
                              >
                                {product.name} (${product.price.toFixed(2)})
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-products">No products available</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Quantity */}
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Unit Price */}
                <FormField
                  control={form.control}
                  name="unitPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit Price</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Delivery Date */}
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
              </div>
              
              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Total (calculated) */}
              <div className="border p-4 rounded-md bg-muted/20">
                <h3 className="font-semibold mb-2">Order Summary</h3>
                <p className="text-sm mb-1">
                  <span className="font-medium">Product:</span>{" "}
                  {selectedProduct?.name || "No product selected"}
                </p>
                <p className="text-sm mb-1">
                  <span className="font-medium">Quantity:</span>{" "}
                  {form.watch("quantity") || 0}
                </p>
                <p className="text-sm mb-1">
                  <span className="font-medium">Unit Price:</span>{" "}
                  ${parseFloat(form.watch("unitPrice") || "0").toFixed(2)}
                </p>
                <p className="text-sm font-semibold mt-2">
                  <span className="font-medium">Total:</span>{" "}
                  ${(
                    parseFloat(form.watch("unitPrice") || "0") *
                    parseInt(form.watch("quantity") || "0", 10)
                  ).toFixed(2)}
                </p>
              </div>
              
              <CardFooter className="flex justify-between px-0">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => navigate("/intercompany-orders")}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Order
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}