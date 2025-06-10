import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useCompany } from "@/hooks/use-company";
import { Plus } from "lucide-react";

interface Vendor {
  id: number;
  name: string;
  contactPerson: string;
  email: string;
}

interface PurchaseOrder {
  id: number;
  orderNumber: string;
  vendorId: number;
  vendor?: {
    id: number;
    name: string;
  };
  orderDate: string;
  expectedDate?: string;
  total: string;
  notes?: string;
  status: "draft" | "sent" | "approved" | "processing" | "received" | "cancelled";
  companyId: number;
  createdAt: string;
  updatedAt?: string;
}

interface PurchaseOrderItem {
  id: number;
  productId: number;
  product: {
    id: number;
    name: string;
  };
  quantity: string;
  unitPrice: string;
  amount: string;
  description?: string;
}

interface PurchaseOrdersResponse {
  purchaseOrders: PurchaseOrder[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

export default function PurchaseOrders() {
  const [activeTab, setActiveTab] = useState("all");
  const [openPurchaseOrderDialog, setOpenPurchaseOrderDialog] = useState(false);
  const [openNewVendorDialog, setOpenNewVendorDialog] = useState(false);
  const [newVendor, setNewVendor] = useState({
    name: "",
    contactPerson: "",
    email: "",
    phone: "",
    address: ""
  });
  
  // Reset form state when dialog opens/closes
  const handleDialogChange = (open: boolean) => {
    setOpenPurchaseOrderDialog(open);
    
    if (!open) {
      // Reset form state when dialog closes
      setSelectedVendor("");
      setOrderDate(new Date().toISOString().split('T')[0]);
      setExpectedDate("");
      setNotes("");
    }
  };
  const { activeCompany } = useCompany();
  const { toast } = useToast();
  
  // Fetch purchase orders from API
  const { data: purchaseOrdersData, isLoading } = useQuery<PurchaseOrdersResponse>({
    queryKey: ["/api/purchase-orders", activeCompany?.id],
    enabled: !!activeCompany
  });
  
  const purchaseOrders = purchaseOrdersData?.purchaseOrders || [];
  
  const filteredOrders = purchaseOrders.filter(order => {
    if (activeTab === "all") return true;
    return order.status === activeTab;
  });
  
  // Form state
  const [selectedVendor, setSelectedVendor] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  
  // Create purchase order mutation
  const createPurchaseOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/purchase-orders", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      setOpenPurchaseOrderDialog(false);
      
      toast({
        title: "Purchase Order Created",
        description: "New purchase order has been created successfully.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create purchase order",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleCreatePurchaseOrder = () => {
    if (!selectedVendor) {
      toast({
        title: "Validation Error",
        description: "Please select a vendor",
        variant: "destructive",
      });
      return;
    }
    
    if (!orderDate) {
      toast({
        title: "Validation Error",
        description: "Please select an order date",
        variant: "destructive",
      });
      return;
    }
    
    const purchaseOrderData = {
      vendorId: parseInt(selectedVendor),
      orderDate: orderDate, // Send as string in ISO format - YYYY-MM-DD
      expectedDate: expectedDate || undefined, // Send as string in ISO format if it exists
      status: "draft",
      notes,
      items: [], // We'll add line items in a future enhancement
    };
    
    createPurchaseOrderMutation.mutate(purchaseOrderData);
  };
  
  // Fetch vendors
  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors", activeCompany?.id],
    enabled: !!activeCompany && openPurchaseOrderDialog
  });
  
  // Create vendor mutation
  const createVendorMutation = useMutation({
    mutationFn: async (vendorData: Omit<typeof newVendor, 'id'>) => {
      const response = await apiRequest("POST", "/api/vendors", vendorData);
      return await response.json();
    },
    onSuccess: (newVendor) => {
      // Invalidate vendors query to refetch the list
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      
      // Close dialog and show success toast
      setOpenNewVendorDialog(false);
      setNewVendor({
        name: "",
        contactPerson: "",
        email: "",
        phone: "",
        address: ""
      });
      
      toast({
        title: "Vendor Created",
        description: "New vendor has been created successfully.",
        variant: "default",
      });
      
      // Select the newly created vendor
      if (newVendor?.id) {
        setSelectedVendor(newVendor.id.toString());
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create vendor",
        variant: "destructive",
      });
    }
  });
  
  const handleCreateVendor = () => {
    if (!newVendor.name) {
      toast({
        title: "Error",
        description: "Vendor name is required",
        variant: "destructive",
      });
      return;
    }
    
    createVendorMutation.mutate(newVendor);
  };
  
  // Status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest("PATCH", `/api/purchase-orders/${id}/status`, { status });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const handleSendOrder = (id: number) => {
    updateStatusMutation.mutate({ id, status: "sent" });
    
    toast({
      title: "Purchase Order Sent",
      description: `Purchase Order #${id} has been sent to the vendor.`,
      variant: "default",
    });
  };
  
  const handleApproveOrder = (id: number) => {
    updateStatusMutation.mutate({ id, status: "approved" });
    
    toast({
      title: "Purchase Order Approved",
      description: `Purchase Order #${id} has been approved.`,
      variant: "default",
    });
  };
  
  const handleReceiveOrder = (id: number) => {
    updateStatusMutation.mutate({ id, status: "received" });
    
    toast({
      title: "Purchase Order Received",
      description: `Purchase Order #${id} has been marked as received.`,
      variant: "default",
    });
  };
  
  const formatCurrency = (amount?: string | number) => {
    if (amount === undefined || amount === null || amount === '') return '$0.00';
    
    try {
      const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
      
      if (isNaN(numericAmount)) return '$0.00';
      
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(numericAmount);
    } catch (error) {
      console.error('Currency formatting error:', error);
      return '$0.00';
    }
  };
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return ''; // Return empty string for undefined/null/empty dates
    
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return '';
    }
  };
  
  const getStatusColor = (status: PurchaseOrder["status"]) => {
    switch (status) {
      case "draft": return "secondary";
      case "sent": return "default";
      case "approved": return "default";
      case "processing": return "secondary";
      case "received": return "default";
      case "cancelled": return "destructive";
      default: return "secondary";
    }
  };
  
  return (
    <div className="space-y-6 p-6">
      {/* New Vendor Dialog */}
      <Dialog open={openNewVendorDialog} onOpenChange={setOpenNewVendorDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Vendor</DialogTitle>
            <DialogDescription>
              Enter vendor details below to create a new vendor record.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="name" className="text-right text-sm">
                Name *
              </label>
              <div className="col-span-3">
                <Input 
                  id="name" 
                  value={newVendor.name}
                  onChange={(e) => setNewVendor({...newVendor, name: e.target.value})}
                  placeholder="Company or Vendor Name" 
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="contactPerson" className="text-right text-sm">
                Contact Person
              </label>
              <div className="col-span-3">
                <Input 
                  id="contactPerson" 
                  value={newVendor.contactPerson}
                  onChange={(e) => setNewVendor({...newVendor, contactPerson: e.target.value})}
                  placeholder="Primary Contact" 
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="email" className="text-right text-sm">
                Email
              </label>
              <div className="col-span-3">
                <Input 
                  id="email" 
                  type="email"
                  value={newVendor.email}
                  onChange={(e) => setNewVendor({...newVendor, email: e.target.value})}
                  placeholder="Contact Email" 
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="phone" className="text-right text-sm">
                Phone
              </label>
              <div className="col-span-3">
                <Input 
                  id="phone" 
                  value={newVendor.phone}
                  onChange={(e) => setNewVendor({...newVendor, phone: e.target.value})}
                  placeholder="Contact Phone" 
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="address" className="text-right text-sm">
                Address
              </label>
              <div className="col-span-3">
                <Input 
                  id="address" 
                  value={newVendor.address}
                  onChange={(e) => setNewVendor({...newVendor, address: e.target.value})}
                  placeholder="Business Address" 
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setOpenNewVendorDialog(false)}
              disabled={createVendorMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateVendor}
              disabled={createVendorMutation.isPending}
            >
              {createVendorMutation.isPending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : "Create Vendor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Purchase Orders</h1>
        <Dialog open={openPurchaseOrderDialog} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button>
              <i className="ri-add-line mr-2"></i>
              New Purchase Order
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New Purchase Order</DialogTitle>
              <DialogDescription>
                Enter the purchase order details below to create a new order.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="vendor" className="text-right text-sm">
                  Vendor
                </label>
                <div className="col-span-3 flex gap-2">
                  <div className="flex-1">
                    <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select vendor" />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoading ? (
                          <SelectItem value="loading">Loading vendors...</SelectItem>
                        ) : vendors.length === 0 ? (
                          <SelectItem value="none">No vendors available</SelectItem>
                        ) : (
                          vendors.map((vendor) => (
                            <SelectItem key={vendor.id} value={vendor.id.toString()}>
                              {vendor.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon"
                    onClick={() => setOpenNewVendorDialog(true)}
                    title="Add new vendor"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="orderDate" className="text-right text-sm">
                  Order Date
                </label>
                <div className="col-span-3">
                  <Input 
                    id="orderDate" 
                    type="date" 
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)} 
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="expectedDeliveryDate" className="text-right text-sm">
                  Expected Delivery
                </label>
                <div className="col-span-3">
                  <Input 
                    id="expectedDeliveryDate" 
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="notes" className="text-right text-sm">
                  Notes
                </label>
                <div className="col-span-3">
                  <Input 
                    id="notes" 
                    placeholder="Additional notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleDialogChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreatePurchaseOrder}>Create Order</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid max-w-[600px] grid-cols-6 mb-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="sent">Sent</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="processing">Processing</TabsTrigger>
          <TabsTrigger value="received">Received</TabsTrigger>
        </TabsList>
        
        <Card>
          <CardHeader>
            <CardTitle>Purchase Orders</CardTitle>
            <CardDescription>Manage your vendor purchase orders</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Delivery Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(3).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-9 w-20 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4">
                      No purchase orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.orderNumber}</TableCell>
                      <TableCell>{order.vendor?.name || ''}</TableCell>
                      <TableCell>{formatDate(order.orderDate)}</TableCell>
                      <TableCell>{formatDate(order.expectedDate)}</TableCell>
                      <TableCell>{formatCurrency(order.total)}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(order.status)}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {order.status === "draft" && (
                            <Button variant="outline" size="sm" onClick={() => handleSendOrder(order.id)}>
                              Send
                            </Button>
                          )}
                          {order.status === "sent" && (
                            <Button variant="outline" size="sm" onClick={() => handleApproveOrder(order.id)}>
                              Approve
                            </Button>
                          )}
                          {order.status === "approved" && (
                            <Button variant="outline" size="sm" onClick={() => handleReceiveOrder(order.id)}>
                              Receive
                            </Button>
                          )}
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}