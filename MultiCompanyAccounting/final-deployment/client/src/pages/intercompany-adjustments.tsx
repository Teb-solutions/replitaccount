import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, FileText, DollarSign, ArrowRightLeft } from "lucide-react";

interface IntercompanyAdjustment {
  id: number;
  reference_number: string;
  source_company_id: number;
  target_company_id: number;
  amount: number;
  reason: string;
  adjustment_date: string;
  status: string;
  source_company_name?: string;
  target_company_name?: string;
  credit_note_number?: string;
  debit_note_number?: string;
}

interface AdjustmentProduct {
  product_id: number;
  quantity: number;
  unit_price: number;
  total_amount: number;
  reason: string;
}

interface Company {
  id: number;
  name: string;
  code: string;
}

interface Product {
  id: number;
  name: string;
  price: number;
}

export default function IntercompanyAdjustments() {
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    source_company_id: "",
    target_company_id: "",
    invoice_id: "",
    bill_id: "",
    amount: "",
    reason: "",
    adjustment_date: new Date().toISOString().split('T')[0],
    products: [] as AdjustmentProduct[]
  });
  const [currentProduct, setCurrentProduct] = useState({
    product_id: "",
    quantity: "",
    unit_price: "",
    reason: ""
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch companies
  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  // Fetch products
  const { data: productsData } = useQuery({
    queryKey: ["/api/products/tested"],
  });

  // Fetch intercompany adjustments
  const { data: adjustments = [], isLoading } = useQuery<IntercompanyAdjustment[]>({
    queryKey: ["/api/intercompany-adjustments", selectedCompany],
    queryFn: async () => {
      const params = selectedCompany ? `?companyId=${selectedCompany}` : "";
      const response = await fetch(`/api/intercompany-adjustments${params}`);
      if (!response.ok) throw new Error('Failed to fetch intercompany adjustments');
      const data = await response.json();
      return data.adjustments || [];
    },
  });

  // Create intercompany adjustment mutation
  const createAdjustmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/intercompany-adjustment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to create intercompany adjustment');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/intercompany-adjustments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credit-notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/debit-notes"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Intercompany Adjustment Created",
        description: "Both credit and debit notes have been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      source_company_id: "",
      target_company_id: "",
      invoice_id: "",
      bill_id: "",
      amount: "",
      reason: "",
      adjustment_date: new Date().toISOString().split('T')[0],
      products: []
    });
    setCurrentProduct({
      product_id: "",
      quantity: "",
      unit_price: "",
      reason: ""
    });
  };

  const addProduct = () => {
    if (!currentProduct.product_id || !currentProduct.quantity || !currentProduct.unit_price) {
      toast({
        title: "Error",
        description: "Please fill in all product fields",
        variant: "destructive",
      });
      return;
    }

    const quantity = parseFloat(currentProduct.quantity);
    const unitPrice = parseFloat(currentProduct.unit_price);
    const totalAmount = quantity * unitPrice;

    const newProduct: AdjustmentProduct = {
      product_id: parseInt(currentProduct.product_id),
      quantity,
      unit_price: unitPrice,
      total_amount: totalAmount,
      reason: currentProduct.reason || formData.reason
    };

    setFormData(prev => ({
      ...prev,
      products: [...prev.products, newProduct]
    }));

    // Update total amount
    const newTotal = formData.products.reduce((sum, p) => sum + p.total_amount, 0) + totalAmount;
    setFormData(prev => ({ ...prev, amount: newTotal.toString() }));

    setCurrentProduct({
      product_id: "",
      quantity: "",
      unit_price: "",
      reason: ""
    });
  };

  const removeProduct = (index: number) => {
    const removedProduct = formData.products[index];
    setFormData(prev => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index),
      amount: (parseFloat(prev.amount) - removedProduct.total_amount).toString()
    }));
  };

  const handleSubmit = () => {
    if (!formData.source_company_id || !formData.target_company_id || !formData.amount || !formData.reason) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (formData.source_company_id === formData.target_company_id) {
      toast({
        title: "Error",
        description: "Source and target companies must be different",
        variant: "destructive",
      });
      return;
    }

    const submitData = {
      ...formData,
      source_company_id: parseInt(formData.source_company_id),
      target_company_id: parseInt(formData.target_company_id),
      amount: parseFloat(formData.amount),
      invoice_id: formData.invoice_id ? parseInt(formData.invoice_id) : undefined,
      bill_id: formData.bill_id ? parseInt(formData.bill_id) : undefined,
    };

    createAdjustmentMutation.mutate(submitData);
  };

  const products = productsData?.products || [];

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Intercompany Adjustments</h1>
          <p className="text-muted-foreground">Manage adjustments between companies with simultaneous credit and debit notes</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Adjustment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Intercompany Adjustment</DialogTitle>
              <DialogDescription>
                Create simultaneous credit and debit notes for intercompany adjustments.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="source_company_id">Source Company (Credit Note) *</Label>
                  <Select value={formData.source_company_id} onValueChange={(value) => setFormData(prev => ({ ...prev, source_company_id: value }))}>
                    <SelectTrigger>
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

                <div className="flex items-center justify-center py-2">
                  <ArrowRightLeft className="h-6 w-6 text-muted-foreground" />
                </div>

                <div>
                  <Label htmlFor="target_company_id">Target Company (Debit Note) *</Label>
                  <Select value={formData.target_company_id} onValueChange={(value) => setFormData(prev => ({ ...prev, target_company_id: value }))}>
                    <SelectTrigger>
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

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="invoice_id">Invoice ID</Label>
                    <Input
                      id="invoice_id"
                      type="number"
                      value={formData.invoice_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, invoice_id: e.target.value }))}
                      placeholder="Related invoice"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bill_id">Bill ID</Label>
                    <Input
                      id="bill_id"
                      type="number"
                      value={formData.bill_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, bill_id: e.target.value }))}
                      placeholder="Related bill"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="amount">Adjustment Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label htmlFor="adjustment_date">Adjustment Date *</Label>
                  <Input
                    id="adjustment_date"
                    type="date"
                    value={formData.adjustment_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, adjustment_date: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="reason">Reason *</Label>
                  <Textarea
                    id="reason"
                    value={formData.reason}
                    onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="Reason for intercompany adjustment"
                    rows={3}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Product Details</h3>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Product</Label>
                    <Select value={currentProduct.product_id} onValueChange={(value) => setCurrentProduct(prev => ({ ...prev, product_id: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product: Product) => (
                          <SelectItem key={product.id} value={product.id.toString()}>
                            {product.name} - ${product.price}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={currentProduct.quantity}
                      onChange={(e) => setCurrentProduct(prev => ({ ...prev, quantity: e.target.value }))}
                      placeholder="Qty"
                    />
                  </div>

                  <div>
                    <Label>Unit Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={currentProduct.unit_price}
                      onChange={(e) => setCurrentProduct(prev => ({ ...prev, unit_price: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <Label>Product Reason</Label>
                    <Input
                      value={currentProduct.reason}
                      onChange={(e) => setCurrentProduct(prev => ({ ...prev, reason: e.target.value }))}
                      placeholder="Product-specific reason"
                    />
                  </div>
                </div>

                <Button type="button" onClick={addProduct} variant="outline" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>

                {formData.products.length > 0 && (
                  <div className="border rounded-md p-4">
                    <h4 className="font-semibold mb-2">Added Products</h4>
                    <div className="space-y-2">
                      {formData.products.map((product, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                          <div className="text-sm">
                            <div>Product ID: {product.product_id}</div>
                            <div>Qty: {product.quantity} × ${product.unit_price} = ${product.total_amount.toFixed(2)}</div>
                          </div>
                          <Button type="button" onClick={() => removeProduct(index)} variant="destructive" size="sm">
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={createAdjustmentMutation.isPending}>
                {createAdjustmentMutation.isPending ? "Creating..." : "Create Adjustment"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="h-5 w-5 mr-2" />
            Filter Adjustments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Filter by company" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Companies</SelectItem>
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
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Intercompany Adjustments
          </CardTitle>
          <CardDescription>
            {adjustments.length} adjustment{adjustments.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading adjustments...</div>
          ) : adjustments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No intercompany adjustments found. Create your first adjustment to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Source Company</TableHead>
                  <TableHead>Target Company</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adjustments.map((adjustment) => (
                  <TableRow key={adjustment.id}>
                    <TableCell className="font-medium">{adjustment.reference_number}</TableCell>
                    <TableCell>{adjustment.source_company_name || `Company ${adjustment.source_company_id}`}</TableCell>
                    <TableCell>{adjustment.target_company_name || `Company ${adjustment.target_company_id}`}</TableCell>
                    <TableCell className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-1" />
                      {adjustment.amount.toFixed(2)}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{adjustment.reason}</TableCell>
                    <TableCell>
                      <Badge variant={adjustment.status === 'completed' ? 'default' : 'secondary'}>
                        {adjustment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(adjustment.adjustment_date).toLocaleDateString()}</TableCell>
                    <TableCell className="text-xs">
                      <div>CN: {adjustment.credit_note_number}</div>
                      <div>DN: {adjustment.debit_note_number}</div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}