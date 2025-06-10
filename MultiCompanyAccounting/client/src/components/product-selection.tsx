import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Loader2, Edit, Save, Plus, Minus, Trash2 } from "lucide-react";

export type ProductItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
  selected: boolean;
};

type ProductSelectionProps = {
  companyId: number;
  onProductsChange: (products: ProductItem[]) => void;
};

export default function ProductSelection({ companyId, onProductsChange }: ProductSelectionProps) {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [editingPrice, setEditingPrice] = useState<string>("");
  const [viewMode, setViewMode] = useState<"list" | "table">("table");
  
  // Fetch products for the selected company
  const { data: productData, isLoading } = useQuery({
    queryKey: ['/api/company-products', companyId],
    queryFn: async () => {
      // Use the company-products endpoint which handles Gas Manufacturing products correctly
      const response = await fetch(`/api/company-products/${companyId}`);
      if (!response.ok) {
        console.error('Failed to fetch products:', await response.text());
        throw new Error('Failed to fetch products');
      }
      return await response.json();
    },
    enabled: !!companyId
  });
  
  // Initialize products state when data is loaded
  useEffect(() => {
    if (productData && Array.isArray(productData)) {
      const initialProducts = productData.map(product => {
        // Get the price from salesPrice or purchasePrice or default to 0
        const price = product.salesPrice ? parseFloat(product.salesPrice) : 
                     (product.purchasePrice ? parseFloat(product.purchasePrice) : 0);
        
        return {
          id: product.id,
          name: product.name,
          price: price,
          quantity: 1,
          selected: false
        };
      });
      setProducts(initialProducts);
      console.log('Product data loaded:', productData);
    }
  }, [productData]);
  
  // Update selected status
  const toggleProduct = (productId: number) => {
    const updatedProducts = products.map(product => 
      product.id === productId 
        ? { ...product, selected: !product.selected } 
        : product
    );
    setProducts(updatedProducts);
    notifyChange(updatedProducts);
  };
  
  // Update quantity
  const updateQuantity = (productId: number, quantity: number) => {
    // Ensure quantity is at least 1
    const validQuantity = Math.max(1, quantity);
    
    const updatedProducts = products.map(product => 
      product.id === productId 
        ? { ...product, quantity: validQuantity } 
        : product
    );
    setProducts(updatedProducts);
    notifyChange(updatedProducts);
  };
  
  // Increment quantity
  const incrementQuantity = (productId: number) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      updateQuantity(productId, product.quantity + 1);
    }
  };
  
  // Decrement quantity
  const decrementQuantity = (productId: number) => {
    const product = products.find(p => p.id === productId);
    if (product && product.quantity > 1) {
      updateQuantity(productId, product.quantity - 1);
    }
  };
  
  // Start editing product price
  const startEditPrice = (productId: number) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setEditingProductId(productId);
      setEditingPrice(product.price.toString());
    }
  };
  
  // Save edited price
  const saveEditedPrice = (productId: number) => {
    // Parse the price and ensure it's a valid number
    const price = parseFloat(editingPrice);
    if (!isNaN(price) && price > 0) {
      const updatedProducts = products.map(product => 
        product.id === productId 
          ? { ...product, price: price } 
          : product
      );
      setProducts(updatedProducts);
      notifyChange(updatedProducts);
    }
    setEditingProductId(null);
  };
  
  // Cancel editing
  const cancelEditing = () => {
    setEditingProductId(null);
  };
  
  // Handle enter key press while editing
  const handleKeyPress = (e: React.KeyboardEvent, productId: number) => {
    if (e.key === 'Enter') {
      saveEditedPrice(productId);
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };
  
  // Remove product from selection
  const removeProduct = (productId: number) => {
    const updatedProducts = products.map(product => 
      product.id === productId 
        ? { ...product, selected: false } 
        : product
    );
    setProducts(updatedProducts);
    notifyChange(updatedProducts);
  };
  
  // Notify parent component about changes
  const notifyChange = (updatedProducts: ProductItem[]) => {
    onProductsChange(updatedProducts.filter(p => p.selected));
  };
  
  // Format currency
  const formatCurrency = (value: number) => {
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    });
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle>Select Products</CardTitle>
          <div className="flex items-center space-x-2">
            <Badge variant="outline">
              {products.filter(p => p.selected).length} selected
            </Badge>
            <div className="border-l pl-2 flex items-center space-x-2">
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="h-8 px-3"
              >
                List
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="h-8 px-3"
              >
                Table
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground text-sm">No products available for this company</p>
          </div>
        ) : viewMode === "list" ? (
          <div className="space-y-4">
            {products.map(product => (
              <div key={product.id} className="flex items-start space-x-3 p-3 border rounded-md">
                <Checkbox 
                  id={`product-${product.id}`} 
                  checked={product.selected}
                  onCheckedChange={() => toggleProduct(product.id)}
                />
                <div className="flex-1 space-y-1">
                  <Label 
                    htmlFor={`product-${product.id}`}
                    className="font-medium cursor-pointer"
                  >
                    {product.name}
                  </Label>
                  <div className="text-sm flex items-center space-x-2">
                    {editingProductId === product.id ? (
                      <div className="flex items-center">
                        <Input
                          value={editingPrice}
                          onChange={(e) => setEditingPrice(e.target.value)}
                          onKeyDown={(e) => handleKeyPress(e, product.id)}
                          onBlur={() => saveEditedPrice(product.id)}
                          className="w-24 h-8"
                          autoFocus
                        />
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => saveEditedPrice(product.id)}
                          className="ml-1 h-8 w-8 p-0"
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div 
                        className="flex items-center cursor-pointer" 
                        onClick={() => startEditPrice(product.id)}
                      >
                        <span className="text-muted-foreground">{formatCurrency(product.price)} per unit</span>
                        <Edit className="ml-1 h-3 w-3 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  
                  {product.selected && (
                    <div className="mt-2 flex items-center">
                      <Label htmlFor={`quantity-${product.id}`} className="text-sm mr-2">
                        Quantity:
                      </Label>
                      <div className="flex items-center">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-r-none"
                          onClick={() => decrementQuantity(product.id)}
                          disabled={product.quantity <= 1}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          id={`quantity-${product.id}`}
                          type="number"
                          min="1"
                          className="w-16 h-8 rounded-none text-center"
                          value={product.quantity}
                          onChange={(e) => updateQuantity(product.id, parseInt(e.target.value) || 1)}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-l-none"
                          onClick={() => incrementQuantity(product.id)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="ml-3 text-sm font-medium">
                        Total: {formatCurrency(product.price * product.quantity)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Select</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Price (per unit)</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map(product => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <Checkbox 
                        id={`table-product-${product.id}`} 
                        checked={product.selected}
                        onCheckedChange={() => toggleProduct(product.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Label 
                        htmlFor={`table-product-${product.id}`}
                        className="font-medium cursor-pointer"
                      >
                        {product.name}
                      </Label>
                    </TableCell>
                    <TableCell>
                      {editingProductId === product.id ? (
                        <div className="flex items-center">
                          <Input
                            value={editingPrice}
                            onChange={(e) => setEditingPrice(e.target.value)}
                            onKeyDown={(e) => handleKeyPress(e, product.id)}
                            onBlur={() => saveEditedPrice(product.id)}
                            className="w-24 h-8"
                            autoFocus
                          />
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => saveEditedPrice(product.id)}
                            className="ml-1 h-8 w-8 p-0"
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div 
                          className="flex items-center cursor-pointer" 
                          onClick={() => startEditPrice(product.id)}
                        >
                          <span>{formatCurrency(product.price)}</span>
                          <Edit className="ml-1 h-3 w-3 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {product.selected ? (
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => decrementQuantity(product.id)}
                            disabled={product.quantity <= 1}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            min="1"
                            className="w-16 h-8 text-center"
                            value={product.quantity}
                            onChange={(e) => updateQuantity(product.id, parseInt(e.target.value) || 1)}
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => incrementQuantity(product.id)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {product.selected 
                        ? formatCurrency(product.price * product.quantity)
                        : "—"
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
        {products.filter(p => p.selected).length > 0 && (
          <div className="pt-4 border-t mt-4">
            <div className="font-medium flex justify-between">
              <span>Total Order Value:</span>
              <span>
                {formatCurrency(
                  products
                    .filter(p => p.selected)
                    .reduce((sum, p) => sum + (p.price * p.quantity), 0)
                )}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}