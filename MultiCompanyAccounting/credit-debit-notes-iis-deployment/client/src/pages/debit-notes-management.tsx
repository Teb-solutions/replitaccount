import { useState, useEffect } from "react";
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
import { Plus, Search, FileText, DollarSign } from "lucide-react";

interface DebitNote {
  id: number;
  debit_note_number: string;
  bill_id?: number;
  company_id: number;
  vendor_id: number;
  amount: number;
  reason: string;
  status: string;
  debit_note_date: string;
  company_name?: string;
  vendor_name?: string;
  bill_number?: string;
}

interface DebitNoteItem {
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

export default function DebitNotesManagement() {
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    bill_id: "",
    company_id: "",
    vendor_id: "",
    amount: "",
    reason: "",
    debit_note_date: new Date().toISOString().split('T')[0],
    products: [] as DebitNoteItem[]
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
    enabled: !!selectedCompany,
  });

  // Fetch debit notes
  const { data: debitNotes = [], isLoading } = useQuery<DebitNote[]>({
    queryKey: ["/api/debit-notes", selectedCompany],
    queryFn: async () => {
      const params = selectedCompany ? `?companyId=${selectedCompany}` : "";
      const response = await fetch(`/api/debit-notes${params}`);
      if (!response.ok) throw new Error('Failed to fetch debit notes');
      const data = await response.json();
      return data.debitNotes || [];
    },
  });

  // Create debit note mutation
  const createDebitNoteMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/debit-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to create debit note');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/debit-notes"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Debit Note Created",
        description: "Debit note has been successfully created.",
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
      bill_id: "",
      company_id: "",
      vendor_id: "",
      amount: "",
      reason: "",
      debit_note_date: new Date().toISOString().split('T')[0],
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

    const newProduct: DebitNoteItem = {
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
    if (!formData.company_id || !formData.vendor_id || !formData.amount || !formData.reason) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const submitData = {
      ...formData,
      company_id: parseInt(formData.company_id),
      vendor_id: parseInt(formData.vendor_id),
      amount: parseFloat(formData.amount),
      bill_id: formData.bill_id ? parseInt(formData.bill_id) : undefined,
    };

    createDebitNoteMutation.mutate(submitData);
  };

  const products = productsData?.products || [];

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Debit Notes Management</h1>
          <p className="text-muted-foreground">Manage debit notes for vendor charges and adjustments</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Debit Note
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Debit Note</DialogTitle>
              <DialogDescription>
                Create a debit note to increase vendor payables for additional charges or adjustments.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="company_id">Company *</Label>
                  <Select value={formData.company_id} onValueChange={(value) => setFormData(prev => ({ ...prev, company_id: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select company" />
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
                  <Label htmlFor="vendor_id">Vendor *</Label>
                  <Select value={formData.vendor_id} onValueChange={(value) => setFormData(prev => ({ ...prev, vendor_id: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select vendor" />
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
                  <Label htmlFor="bill_id">Bill ID</Label>
                  <Input
                    id="bill_id"
                    type="number"
                    value={formData.bill_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, bill_id: e.target.value }))}
                    placeholder="Related bill ID"
                  />
                </div>

                <div>
                  <Label htmlFor="amount">Total Amount *</Label>
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
                  <Label htmlFor="debit_note_date">Debit Note Date *</Label>
                  <Input
                    id="debit_note_date"
                    type="date"
                    value={formData.debit_note_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, debit_note_date: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="reason">Reason *</Label>
                  <Textarea
                    id="reason"
                    value={formData.reason}
                    onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="Reason for debit note"
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
              <Button onClick={handleSubmit} disabled={createDebitNoteMutation.isPending}>
                {createDebitNoteMutation.isPending ? "Creating..." : "Create Debit Note"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="h-5 w-5 mr-2" />
            Filter Debit Notes
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
            Debit Notes
          </CardTitle>
          <CardDescription>
            {debitNotes.length} debit note{debitNotes.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading debit notes...</div>
          ) : debitNotes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No debit notes found. Create your first debit note to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Debit Note #</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {debitNotes.map((debitNote) => (
                  <TableRow key={debitNote.id}>
                    <TableCell className="font-medium">{debitNote.debit_note_number}</TableCell>
                    <TableCell>{debitNote.company_name || `Company ${debitNote.company_id}`}</TableCell>
                    <TableCell>{debitNote.vendor_name || `Vendor ${debitNote.vendor_id}`}</TableCell>
                    <TableCell className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-1" />
                      {debitNote.amount.toFixed(2)}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{debitNote.reason}</TableCell>
                    <TableCell>
                      <Badge variant={debitNote.status === 'applied' ? 'default' : 'secondary'}>
                        {debitNote.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(debitNote.debit_note_date).toLocaleDateString()}</TableCell>
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