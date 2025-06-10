import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { createIntercompanyInvoice } from "@/lib/intercompany-connector";
import { AlertCircle, Check } from "lucide-react";

// Debug page for testing invoice items creation
export default function InvoiceItemDebug() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [companies, setCompanies] = useState<any[]>([]);
  const [sourceCompanyId, setSourceCompanyId] = useState<number | null>(null);
  const [targetCompanyId, setTargetCompanyId] = useState<number | null>(null);
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [selectedSalesOrderId, setSelectedSalesOrderId] = useState<number | null>(null);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [selectedPurchaseOrderId, setSelectedPurchaseOrderId] = useState<number | null>(null);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([
    { productId: 0, quantity: "1", unitPrice: "10", description: "Test Item", soItemId: undefined }
  ]);
  const [loading, setLoading] = useState(false);

  // Load companies
  useEffect(() => {
    if (user) {
      fetch('/api/companies')
        .then(res => res.json())
        .then(data => {
          setCompanies(data);
          if (data.length > 0) {
            setSourceCompanyId(data[0].id);
            if (data.length > 1) {
              setTargetCompanyId(data[1].id);
            }
          }
        })
        .catch(err => {
          console.error("Error fetching companies:", err);
          toast({
            title: "Error fetching companies",
            description: err.message,
            variant: "destructive"
          });
        });
    }
  }, [user, toast]);

  // Load products
  useEffect(() => {
    if (sourceCompanyId) {
      fetch(`/api/companies/${sourceCompanyId}/products`)
        .then(res => res.json())
        .then(data => {
          setProducts(data);
          // Update the first item with the first product if available
          if (data.length > 0) {
            setItems(prevItems => {
              const newItems = [...prevItems];
              if (newItems.length > 0) {
                newItems[0] = {
                  ...newItems[0],
                  productId: data[0].id,
                  description: data[0].name
                };
              }
              return newItems;
            });
          }
        })
        .catch(err => {
          console.error("Error fetching products:", err);
        });
    }
  }, [sourceCompanyId]);

  // Load sales orders when source company changes
  useEffect(() => {
    if (sourceCompanyId) {
      fetch(`/api/sales-orders?companyId=${sourceCompanyId}`)
        .then(res => res.json())
        .then(data => {
          console.log("Sales orders response:", data);
          const orders = data.salesOrders || [];
          setSalesOrders(orders);
          
          // Clear selected sales order when company changes to avoid mismatch
          setSelectedSalesOrderId(orders.length > 0 ? orders[0].id : null);
          
          // Display toast with instructions if no orders are found
          if (orders.length === 0) {
            toast({
              title: "No sales orders found",
              description: `No sales orders found for this company. Please select a different source company.`,
              variant: "warning"
            });
          }
        })
        .catch(err => {
          console.error("Error fetching sales orders:", err);
        });
    }
  }, [sourceCompanyId, toast]);

  // Load purchase orders when target company changes
  useEffect(() => {
    if (targetCompanyId) {
      fetch(`/api/purchase-orders?companyId=${targetCompanyId}`)
        .then(res => res.json())
        .then(data => {
          console.log("Purchase orders response:", data);
          const orders = data.purchaseOrders || [];
          setPurchaseOrders(orders);
          if (orders.length > 0) {
            setSelectedPurchaseOrderId(orders[0].id);
          }
        })
        .catch(err => {
          console.error("Error fetching purchase orders:", err);
        });
    }
  }, [targetCompanyId]);

  // Handle item changes
  const handleItemChange = (index: number, field: string, value: any) => {
    setItems(prevItems => {
      const newItems = [...prevItems];
      newItems[index] = {
        ...newItems[index],
        [field]: value
      };
      return newItems;
    });
  };

  // Add new item
  const addItem = () => {
    const defaultProductId = products.length > 0 ? products[0].id : 0;
    const defaultDescription = products.length > 0 ? products[0].name : "Test Item";

    setItems(prevItems => [
      ...prevItems,
      { productId: defaultProductId, quantity: "1", unitPrice: "10", description: defaultDescription, soItemId: undefined }
    ]);
  };

  // Remove item
  const removeItem = (index: number) => {
    setItems(prevItems => prevItems.filter((_, i) => i !== index));
  };

  // Submit form
  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      // Validate form
      if (!sourceCompanyId) throw new Error("Source company is required");
      if (!targetCompanyId) throw new Error("Target company is required");
      if (!selectedSalesOrderId) throw new Error("Sales order is required");
      // Make purchase order optional for testing
      // if (!selectedPurchaseOrderId) throw new Error("Purchase order is required");
      if (items.length === 0) throw new Error("At least one item is required");

      // Process items
      const processedItems = items.map(item => ({
        productId: Number(item.productId),
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 10,
        description: item.description || "Test Item",
        soItemId: item.soItemId ? Number(item.soItemId) : undefined
      }));

      // Create payload
      // Create payload with optional purchase order ID
      const payload = {
        sourceCompanyId,
        targetCompanyId,
        salesOrderId: selectedSalesOrderId,
        // Only include purchaseOrderId if it has a value
        ...(selectedPurchaseOrderId ? { purchaseOrderId: selectedPurchaseOrderId } : {}),
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        description: "Debug Test Invoice",
        invoiceType: "full" as "full",
        items: processedItems
      };

      console.log("Submitting payload:", payload);

      // Create intercompany invoice
      const result = await createIntercompanyInvoice(payload);
      
      console.log("API response:", result);
      
      if (result.success) {
        setResponse(result);
        toast({
          title: "Success",
          description: "Invoice and bill created successfully",
          variant: "default"
        });
      } else {
        setError(result.error || "Unknown error");
        toast({
          title: "Error creating invoice",
          description: result.error || "An unknown error occurred",
          variant: "destructive"
        });
      }
    } catch (err: any) {
      console.error("Error in submit handler:", err);
      setError(err.message || "An unknown error occurred");
      toast({
        title: "Error",
        description: err.message || "An unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Invoice Item Debug Tool</h1>
      <p className="text-gray-600 mb-8">
        This tool helps test the creation of invoices and bills with line items. It creates real database records
        that will appear in the actual system.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Select Companies</CardTitle>
            <CardDescription>Choose source and target companies for the intercompany transaction</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="sourceCompany">Source Company (Seller)</Label>
              <Select value={sourceCompanyId?.toString()} onValueChange={(value) => setSourceCompanyId(Number(value))}>
                <SelectTrigger id="sourceCompany">
                  <SelectValue placeholder="Select source company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id.toString()}>
                      {company.name} ({company.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="targetCompany">Target Company (Buyer)</Label>
              <Select value={targetCompanyId?.toString()} onValueChange={(value) => setTargetCompanyId(Number(value))}>
                <SelectTrigger id="targetCompany">
                  <SelectValue placeholder="Select target company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id.toString()}>
                      {company.name} ({company.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Select Orders</CardTitle>
            <CardDescription>Choose sales and purchase orders to link</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="salesOrder">Sales Order</Label>
              <Select 
                value={selectedSalesOrderId?.toString()} 
                onValueChange={(value) => setSelectedSalesOrderId(Number(value))}
              >
                <SelectTrigger id="salesOrder">
                  <SelectValue placeholder="Select sales order" />
                </SelectTrigger>
                <SelectContent>
                  {salesOrders.map((order) => (
                    <SelectItem key={order.id} value={order.id.toString()}>
                      {order.orderNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="purchaseOrder">Purchase Order</Label>
              <Select 
                value={selectedPurchaseOrderId?.toString() || "0"} 
                onValueChange={(value) => {
                  // Treat value "0" as null/undefined
                  if (value === "0") {
                    setSelectedPurchaseOrderId(null);
                  } else {
                    setSelectedPurchaseOrderId(Number(value));
                  }
                }}
              >
                <SelectTrigger id="purchaseOrder">
                  <SelectValue placeholder="Select purchase order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">None (Optional - Create without purchase order)</SelectItem>
                  {purchaseOrders.map((order) => (
                    <SelectItem key={order.id} value={order.id.toString()}>
                      {order.orderNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Invoice & Bill Items</CardTitle>
          <CardDescription>Define the line items for the invoice and bill</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border rounded-md">
                <div>
                  <Label htmlFor={`product-${index}`}>Product</Label>
                  <Select 
                    value={item.productId?.toString()} 
                    onValueChange={(value) => handleItemChange(index, 'productId', Number(value))}
                  >
                    <SelectTrigger id={`product-${index}`}>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id.toString()}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor={`qty-${index}`}>Quantity</Label>
                  <Input 
                    id={`qty-${index}`} 
                    type="number" 
                    min="0.01" 
                    step="0.01"
                    value={item.quantity} 
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor={`price-${index}`}>Unit Price</Label>
                  <Input 
                    id={`price-${index}`} 
                    type="number" 
                    min="0.01" 
                    step="0.01"
                    value={item.unitPrice} 
                    onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor={`desc-${index}`}>Description</Label>
                  <Input 
                    id={`desc-${index}`} 
                    value={item.description} 
                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button variant="destructive" onClick={() => removeItem(index)} disabled={items.length <= 1}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <Button variant="outline" className="mt-4" onClick={addItem}>
            Add Item
          </Button>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            variant="secondary" 
            onClick={() => {
              setItems([
                { productId: products[0]?.id || 0, quantity: "1", unitPrice: "10", description: products[0]?.name || "Test Item", soItemId: null }
              ]);
              setResponse(null);
              setError(null);
            }}
          >
            Reset
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Processing..." : "Create Invoice & Bill"}
          </Button>
        </CardFooter>
      </Card>

      {error && (
        <Alert variant="destructive" className="mt-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {response && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              Success: Invoice & Bill Created
            </CardTitle>
            <CardDescription>The invoice and bill were created successfully with all items</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Invoice Details</h3>
                <ScrollArea className="h-60 rounded-md border p-4">
                  <pre className="text-xs">{JSON.stringify(response.sourceInvoice, null, 2)}</pre>
                </ScrollArea>
              </div>
              <div>
                <h3 className="text-lg font-medium mb-2">Bill Details</h3>
                <ScrollArea className="h-60 rounded-md border p-4">
                  <pre className="text-xs">{JSON.stringify(response.targetBill, null, 2)}</pre>
                </ScrollArea>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}