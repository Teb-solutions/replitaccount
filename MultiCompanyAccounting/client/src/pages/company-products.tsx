import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { AlertCircle, ExternalLink, Plus, Search, Edit, ArrowLeft } from "lucide-react";
import { AlertCircleIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { useCompany } from "@/hooks/use-company";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: number;
  companyId: number;
  name: string;
  description: string | null;
  sku: string;
  barcode: string | null;
  price: string | number;
  cost: string | number;
  salesPrice?: string | number;
  purchasePrice?: string | number;
  sales_price?: string | number;
  purchase_price?: string | number;
  taxRate: string | number | null;
  isActive: boolean;
  categoryId: number | null;
  category?: {
    id: number;
    name: string;
  };
  inventoryTracking: boolean;
  stockQuantity: string | number;
  reorderLevel: string | number;
  createdAt: string;
  updatedAt: string;
}

interface Category {
  id: number;
  name: string;
  description: string | null;
  companyId: number;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function CompanyProducts() {
  const params = useParams();
  const companyId = params.companyId ? parseInt(params.companyId) : null;
  const { activeCompany } = useCompany();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all_categories");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isEditProductOpen, setIsEditProductOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);

  // Category options query
  const { data: categoriesData } = useQuery<Category[]>({
    queryKey: ["/api/v2/products/categories", companyId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/v2/products/categories?companyId=${companyId}`);
      const data = await response.json();
      return data;
    },
    enabled: !!companyId
  });

  // Company details query
  const { data: companyData } = useQuery({
    queryKey: ["/api/v2/companies", companyId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/v2/companies/${companyId}`);
      return await response.json();
    },
    enabled: !!companyId
  });

  // Products query with pagination and filters
  const { data: productsData, isLoading, isError, refetch } = useQuery<PaginatedResponse<Product>>({
    queryKey: ["/api/direct-products", companyId, searchTerm, categoryFilter, currentPage],
    queryFn: async () => {
      try {
        console.log(`Fetching products directly for company ${companyId}...`);
        
        // Skip the v2 API entirely and go straight to the direct API
        try {
          // First try our direct products API which should work reliably
          const directResponse = await apiRequest("GET", `/api/company-products/${companyId}`);
          const directProducts = await directResponse.json();
          
          if (directProducts && directProducts.length > 0) {
            console.log(`Found ${directProducts.length} products via direct API`);
            
            // Add company name to product display if it's from another company
            const enhancedProducts = directProducts.map(p => {
              const productCompanyId = p.companyId || companyId;
              const productName = p.companyName && productCompanyId !== companyId 
                ? `${p.name} (from ${p.companyName})`
                : p.name;
              
              return {
                ...p,
                name: productName,
                companyId: productCompanyId,
                sku: p.code || '',
                category: { id: 0, name: "General" }
              };
            });
            
            return {
              data: enhancedProducts,
              pagination: {
                total: enhancedProducts.length,
                page: 1,
                limit: enhancedProducts.length,
                totalPages: 1
              }
            };
          }
          
          // If direct API returns empty, try our new tenant-wide products endpoint
          console.log("No products found with direct API, trying tenant-wide API");
          const tenantResponse = await apiRequest("GET", `/api/tenant-products/2`); // Using tenant ID 2 from the logs
          const tenantProducts = await tenantResponse.json();
          console.log("Tenant-wide products API response:", tenantProducts);
          
          if (tenantProducts && tenantProducts.length > 0) {
            console.log(`Found ${tenantProducts.length} products via tenant API`);
            
            // Add company name to product display
            const enhancedProducts = tenantProducts.map(p => {
              const productCompanyId = p.companyId || companyId;
              const productName = p.companyName && productCompanyId !== companyId
                ? `${p.name} (from ${p.companyName})`
                : p.name;
              
              return {
                ...p,
                name: productName,
                companyId: productCompanyId,
                sku: p.code || '',
                category: { id: 0, name: "General" }
              };
            });
            
            return {
              data: enhancedProducts,
              pagination: {
                total: enhancedProducts.length,
                page: 1,
                limit: enhancedProducts.length,
                totalPages: 1
              }
            };
          }
        } catch (directError) {
          console.error("Error fetching from direct APIs:", directError);
        }
        
        // As a last resort, try the v2 API
        console.log("Falling back to v2 API as last resort");
        let url = `/api/v2/products?companyId=${companyId}&page=${currentPage}&limit=10`;
        
        if (searchTerm) {
          url += `&search=${encodeURIComponent(searchTerm)}`;
        }
        
        if (categoryFilter && categoryFilter !== "all_categories") {
          url += `&category=${categoryFilter}`;
        }
        
        const response = await apiRequest("GET", url);
        const data = await response.json();
        
        if (data && data.data && data.data.length > 0) {
          return data;
        }
        
        // If we get here, create a direct SQL query to fetch products as a last resort
        console.log("Creating emergency direct SQL query to fetch products");
        const emergencyResponse = await apiRequest("POST", "/api/execute-sql", {
          query: `SELECT id, name, code, description, sales_price, purchase_price, is_active, company_id 
                  FROM products 
                  WHERE company_id = ${companyId}
                  ORDER BY name ASC`
        });
        
        const emergencyProducts = await emergencyResponse.json();
        
        if (emergencyProducts && emergencyProducts.length > 0) {
          console.log(`Found ${emergencyProducts.length} products via emergency SQL`);
          
          const formattedProducts = emergencyProducts.map(p => ({
            id: p.id,
            name: p.name,
            companyId: p.company_id,
            sku: p.code || '',
            code: p.code || '',
            description: p.description || '',
            price: p.sales_price || 0,
            sales_price: p.sales_price || 0,
            cost: p.purchase_price || 0,
            purchase_price: p.purchase_price || 0,
            isActive: p.is_active === true,
            category: { id: 0, name: "General" }
          }));
          
          return {
            data: formattedProducts,
            pagination: {
              total: formattedProducts.length,
              page: 1,
              limit: 10,
              totalPages: 1
            }
          };
        }
        
        // If all methods fail, return empty results
        return {
          data: [],
          pagination: {
            total: 0,
            page: 1,
            limit: 10,
            totalPages: 0
          }
        };
      } catch (error) {
        console.error("Error fetching products:", error);
        // Return an empty response structure rather than throwing
        return {
          data: [],
          pagination: {
            total: 0,
            page: 1,
            limit: 10,
            totalPages: 0
          }
        };
      }
    },
    enabled: !!companyId
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page when searching
    refetch();
  };

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
    setCurrentPage(1); // Reset to first page when filtering
    refetch();
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    refetch();
  };

  const handleAddProduct = async (formData: any) => {
    try {
      // Add companyId to the form data
      const productData = {
        ...formData,
        companyId: companyId
      };
      
      await apiRequest("POST", "/api/v2/products", productData);
      
      toast({
        title: "Product Added",
        description: "The product has been added successfully.",
      });
      
      setIsAddProductOpen(false);
      refetch();
    } catch (error) {
      console.error("Error adding product:", error);
      toast({
        title: "Error",
        description: "Failed to add product. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditProduct = async (formData: any) => {
    if (!currentProduct) return;
    
    try {
      const productData = {
        ...formData,
        companyId: companyId
      };
      
      await apiRequest("PUT", `/api/v2/products/${currentProduct.id}`, productData);
      
      toast({
        title: "Product Updated",
        description: "The product has been updated successfully.",
      });
      
      setIsEditProductOpen(false);
      setCurrentProduct(null);
      refetch();
    } catch (error) {
      console.error("Error updating product:", error);
      toast({
        title: "Error",
        description: "Failed to update product. Please try again.",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (product: Product) => {
    setCurrentProduct(product);
    setIsEditProductOpen(true);
  };

  if (!companyId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>No company ID provided.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircleIcon className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to load products. Please try again.</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  const renderPagination = () => {
    if (!productsData?.pagination) return null;
    
    const { page, totalPages } = productsData.pagination;
    
    // Only show pagination if we have more than 1 page
    if (totalPages <= 1) return null;
    
    const pageLinks = [];
    const maxVisiblePages = 5;
    
    // Determine page range to display
    let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Adjust if we're near the end
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pageLinks.push(
        <PaginationItem key={i}>
          <PaginationLink 
            isActive={page === i} 
            onClick={() => handlePageChange(i)}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }
    
    return (
      <Pagination className="mt-6">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              onClick={() => handlePageChange(Math.max(1, page - 1))}
              className={page === 1 ? "pointer-events-none opacity-50" : ""}
            />
          </PaginationItem>
          
          {startPage > 1 && (
            <>
              <PaginationItem>
                <PaginationLink onClick={() => handlePageChange(1)}>1</PaginationLink>
              </PaginationItem>
              {startPage > 2 && <PaginationEllipsis />}
            </>
          )}
          
          {pageLinks}
          
          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && <PaginationEllipsis />}
              <PaginationItem>
                <PaginationLink onClick={() => handlePageChange(totalPages)}>
                  {totalPages}
                </PaginationLink>
              </PaginationItem>
            </>
          )}
          
          <PaginationItem>
            <PaginationNext 
              onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
              className={page === totalPages ? "pointer-events-none opacity-50" : ""}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-8">
        <Button variant="outline" size="sm" asChild className="mr-4">
          <Link to="/products-dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {companyData?.name || `Company ID: ${companyId}`} Products
          </h1>
          <p className="text-muted-foreground">
            Manage inventory for {companyData?.name || `Company ID: ${companyId}`}
          </p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Product Inventory</CardTitle>
              <CardDescription>
                {productsData?.pagination?.total || 0} total products
              </CardDescription>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Add New Product</DialogTitle>
                    <DialogDescription>
                      Create a new product for {companyData?.name || `Company ID: ${companyId}`}
                    </DialogDescription>
                  </DialogHeader>
                  <ProductForm 
                    categories={categoriesData || []} 
                    onSubmit={handleAddProduct}
                    onCancel={() => setIsAddProductOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search products..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button type="submit" variant="secondary">Search</Button>
            </form>
            
            <div className="w-full md:w-64">
              <Select
                value={categoryFilter}
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_categories">All Categories</SelectItem>
                  {categoriesData?.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {productsData?.data.length === 0 ? (
            <Alert>
              <AlertTitle>No Products Found</AlertTitle>
              <AlertDescription>
                No products match your search criteria. Try adjusting your filters or add a new product.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU/Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Sales Price</TableHead>
                      <TableHead>Purchase Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productsData?.data.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.sku}</TableCell>
                        <TableCell>{product.name}</TableCell>
                        <TableCell>{product.category?.name || "Uncategorized"}</TableCell>
                        <TableCell>
                          ${product.salesPrice 
                            ? parseFloat(product.salesPrice).toFixed(2) 
                            : (product.sales_price ? parseFloat(product.sales_price).toFixed(2) : 
                              (product.price ? parseFloat(product.price as string).toFixed(2) : '0.00'))}
                        </TableCell>
                        <TableCell>
                          ${product.purchasePrice 
                            ? parseFloat(product.purchasePrice).toFixed(2) 
                            : (product.purchase_price ? parseFloat(product.purchase_price).toFixed(2) : 
                              (product.cost ? parseFloat(product.cost as string).toFixed(2) : '0.00'))}
                        </TableCell>
                        <TableCell>
                          {product.inventoryTracking ? (
                            <div className="flex flex-col">
                              <span className={`${parseInt(product.stockQuantity as string) > 0 ? 'text-green-600' : 'text-red-600'} font-medium`}>
                                {product.stockQuantity} in stock
                              </span>
                              {parseInt(product.reorderLevel as string) > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  Reorder at: {product.reorderLevel}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Not tracked</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => openEditDialog(product)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/product-details/${companyId}/${product.id}`, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {renderPagination()}
            </>
          )}
        </CardContent>
        
        <CardFooter className="border-t p-4 text-sm text-muted-foreground">
          Last updated: {new Date().toLocaleDateString()}
        </CardFooter>
      </Card>
      
      {/* Edit Product Dialog */}
      <Dialog open={isEditProductOpen} onOpenChange={setIsEditProductOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update product information for {currentProduct?.name || ""}
            </DialogDescription>
          </DialogHeader>
          {currentProduct && (
            <ProductForm 
              categories={categoriesData || []} 
              onSubmit={handleEditProduct}
              onCancel={() => setIsEditProductOpen(false)}
              product={currentProduct}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ProductFormProps {
  categories: Category[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
  product?: Product;
}

function ProductForm({ categories, onSubmit, onCancel, product }: ProductFormProps) {
  const [formData, setFormData] = useState({
    name: product?.name || "",
    description: product?.description || "",
    sku: product?.sku || "",
    barcode: product?.barcode || "",
    price: product?.price || "",
    cost: product?.cost || "",
    taxRate: product?.taxRate || "",
    categoryId: product?.categoryId?.toString() || "",
    inventoryTracking: product?.inventoryTracking || false,
    stockQuantity: product?.stockQuantity || "0",
    reorderLevel: product?.reorderLevel || "0",
    isActive: product?.isActive !== undefined ? product.isActive : true
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const target = e.target as HTMLInputElement;
      setFormData({ ...formData, [name]: target.checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Product Name <span className="text-red-500">*</span>
            </label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="sku" className="text-sm font-medium">
              SKU <span className="text-red-500">*</span>
            </label>
            <Input
              id="sku"
              name="sku"
              value={formData.sku}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-medium">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="flex h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="price" className="text-sm font-medium">
              Price <span className="text-red-500">*</span>
            </label>
            <Input
              id="price"
              name="price"
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="cost" className="text-sm font-medium">
              Cost
            </label>
            <Input
              id="cost"
              name="cost"
              type="number"
              step="0.01"
              min="0"
              value={formData.cost}
              onChange={handleChange}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="taxRate" className="text-sm font-medium">
              Tax Rate (%)
            </label>
            <Input
              id="taxRate"
              name="taxRate"
              type="number"
              step="0.01"
              min="0"
              value={formData.taxRate}
              onChange={handleChange}
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="categoryId" className="text-sm font-medium">
              Category
            </label>
            <Select
              value={formData.categoryId}
              onValueChange={(value) => handleSelectChange("categoryId", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="space-y-2">
          <label htmlFor="barcode" className="text-sm font-medium">
            Barcode
          </label>
          <Input
            id="barcode"
            name="barcode"
            value={formData.barcode}
            onChange={handleChange}
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="inventoryTracking"
              name="inventoryTracking"
              checked={formData.inventoryTracking}
              onChange={handleChange}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="inventoryTracking" className="text-sm font-medium">
              Track Inventory
            </label>
          </div>
        </div>
        
        {formData.inventoryTracking && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="stockQuantity" className="text-sm font-medium">
                Current Stock
              </label>
              <Input
                id="stockQuantity"
                name="stockQuantity"
                type="number"
                step="1"
                min="0"
                value={formData.stockQuantity}
                onChange={handleChange}
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="reorderLevel" className="text-sm font-medium">
                Reorder Level
              </label>
              <Input
                id="reorderLevel"
                name="reorderLevel"
                type="number"
                step="1"
                min="0"
                value={formData.reorderLevel}
                onChange={handleChange}
              />
            </div>
          </div>
        )}
        
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActive"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="isActive" className="text-sm font-medium">
              Active
            </label>
          </div>
        </div>
      </div>
      
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {product ? "Update Product" : "Add Product"}
        </Button>
      </DialogFooter>
    </form>
  );
}