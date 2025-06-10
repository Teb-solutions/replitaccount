import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useCompany } from "@/hooks/use-company";

interface Customer {
  id: number;
  name: string;
  contactPerson: string;
  email: string;
}

interface SalesOrder {
  id: number;
  orderNumber: string;
  customerId: number;
  customer: string | { id: number; name: string; email?: string; phone?: string; };
  orderDate: string;
  deliveryDate: string;
  total: number;
  status: "draft" | "confirmed" | "processing" | "shipped" | "completed" | "cancelled";
}

interface SalesOrderItem {
  id: number;
  productId: number;
  product: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

const mockSalesOrders: SalesOrder[] = [
  {
    id: 1,
    orderNumber: "SO-2025-001",
    customerId: 1,
    customer: "ABC Corporation",
    orderDate: "2025-05-01",
    deliveryDate: "2025-05-15",
    total: 5250.00,
    status: "confirmed"
  },
  {
    id: 2,
    orderNumber: "SO-2025-002",
    customerId: 2,
    customer: "XYZ Enterprises",
    orderDate: "2025-05-03",
    deliveryDate: "2025-05-20",
    total: 3750.50,
    status: "processing"
  },
  {
    id: 3,
    orderNumber: "SO-2025-003",
    customerId: 3,
    customer: "Global Services Ltd",
    orderDate: "2025-05-05",
    deliveryDate: "2025-05-25",
    total: 8900.25,
    status: "draft"
  }
];

export default function SalesOrders() {
  const [activeTab, setActiveTab] = useState("all");
  const [openSalesOrderDialog, setOpenSalesOrderDialog] = useState(false);
  const [openNewCustomerDialog, setOpenNewCustomerDialog] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    contactPerson: "",
    email: "",
    phone: "",
    address: ""
  });
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { activeCompany } = useCompany();
  
  // Fetch customers for the dropdown
  const { data: customers, isLoading: isLoadingCustomers } = useQuery<Customer[]>({
    queryKey: ["/api/customers", activeCompany?.id],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/customers");
      return await response.json();
    },
    enabled: !!activeCompany
  });
  
  // Fetch real sales orders from API - use regular API for all companies
  // We'll handle special cases in the API itself rather than in the frontend
  const { data: salesOrdersData, isLoading } = useQuery<SalesOrder[]>({
    queryKey: ["/api/sales-orders", activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) {
        return [];
      }

      // Use the regular API for all companies - the backend will handle company-specific data
      const response = await apiRequest("GET", `/api/sales-orders?companyId=${activeCompany.id}`);
      
      if (!response.ok) {
        console.error("Failed to fetch sales orders:", response.status);
        return [];
      }
      
      const data = await response.json();
      
      // Handle both array format and object format with pagination
      if (Array.isArray(data)) {
        return data;
      } else if (data && data.salesOrders && Array.isArray(data.salesOrders)) {
        return data.salesOrders;
      }
      
      console.log("Unexpected sales orders response format:", data);
      return [];
    },
    enabled: !!activeCompany
  });
  
  const salesOrders = Array.isArray(salesOrdersData) ? salesOrdersData : [];
  
  const filteredOrders = salesOrders.filter(order => {
    if (activeTab === "all") return true;
    return order.status === activeTab;
  });
  
  const handleCreateOrder = () => {
    if (!selectedCustomerId) {
      toast({
        title: "Error",
        description: "Please select a customer",
        variant: "destructive",
      });
      return;
    }
    
    // Get values from form
    const orderDateInput = document.getElementById('orderDate') as HTMLInputElement;
    const deliveryDateInput = document.getElementById('deliveryDate') as HTMLInputElement;
    
    const orderData = {
      customerId: parseInt(selectedCustomerId),
      orderDate: orderDateInput.value,
      expectedDeliveryDate: deliveryDateInput.value || undefined,
      status: "draft",
      total: 0 // This will be calculated on the server based on items
    };
    
    createSalesOrderMutation.mutate(orderData);
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const getStatusColor = (status: SalesOrder["status"]) => {
    switch (status) {
      case "draft": return "secondary";
      case "confirmed": return "default";
      case "processing": return "secondary";
      case "shipped": return "default";
      case "completed": return "default";
      case "cancelled": return "destructive";
      default: return "secondary";
    }
  };
  
  // Add mutation for creating a new customer
  const createCustomerMutation = useMutation({
    mutationFn: async (customerData: Omit<typeof newCustomer, 'id'>) => {
      const response = await apiRequest('POST', '/api/customers', {
        ...customerData,
        companyId: activeCompany?.id
      });
      
      return await response.json();
    },
    onSuccess: (newCustomer) => {
      // Invalidate customers query to refetch the list
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      
      // Close dialog and show success toast
      setOpenNewCustomerDialog(false);
      setNewCustomer({
        name: "",
        contactPerson: "",
        email: "",
        phone: "",
        address: ""
      });
      
      toast({
        title: "Customer Created",
        description: "New customer has been created successfully.",
        variant: "default",
      });
      
      // Select the newly created customer
      if (newCustomer?.id) {
        setSelectedCustomerId(newCustomer.id.toString());
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create customer",
        variant: "destructive",
      });
    }
  });
  
  const handleCreateCustomer = () => {
    if (!newCustomer.name) {
      toast({
        title: "Error",
        description: "Customer name is required",
        variant: "destructive",
      });
      return;
    }
    
    createCustomerMutation.mutate(newCustomer);
  };
  
  // Mutation for creating sales orders
  const createSalesOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await apiRequest('POST', '/api/sales-orders', {
        ...orderData,
        companyId: activeCompany?.id
      });
      
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate sales orders query to refetch the list
      queryClient.invalidateQueries({ queryKey: ['/api/sales-orders'] });
      
      // Close dialog and show success toast
      setOpenSalesOrderDialog(false);
      setSelectedCustomerId("");
      
      toast({
        title: "Sales Order Created",
        description: "New sales order has been created successfully.",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create sales order",
        variant: "destructive",
      });
    }
  });

  return (
    <div className="space-y-6 p-6">
      {/* New Customer Dialog */}
      <Dialog open={openNewCustomerDialog} onOpenChange={setOpenNewCustomerDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
            <DialogDescription>
              Enter customer details below to create a new customer record.
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
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                  placeholder="Company or Customer Name" 
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
                  value={newCustomer.contactPerson}
                  onChange={(e) => setNewCustomer({...newCustomer, contactPerson: e.target.value})}
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
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
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
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
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
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                  placeholder="Business Address" 
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setOpenNewCustomerDialog(false)}
              disabled={createCustomerMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateCustomer}
              disabled={createCustomerMutation.isPending}
            >
              {createCustomerMutation.isPending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : "Create Customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Sales Orders</h1>
        <Dialog open={openSalesOrderDialog} onOpenChange={setOpenSalesOrderDialog}>
          <DialogTrigger asChild>
            <Button>
              <i className="ri-add-line mr-2"></i>
              New Sales Order
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New Sales Order</DialogTitle>
              <DialogDescription>
                Enter the sales order details below to create a new order.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="customer" className="text-right text-sm">
                  Customer
                </label>
                <div className="col-span-3 flex gap-2">
                  <div className="flex-1">
                    <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingCustomers ? (
                          <SelectItem value="loading">Loading customers...</SelectItem>
                        ) : !customers || customers.length === 0 ? (
                          <SelectItem value="none">No customers available</SelectItem>
                        ) : (
                          customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id.toString()}>
                              {customer.name}
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
                    onClick={() => setOpenNewCustomerDialog(true)}
                    title="Add new customer"
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
                  <Input id="orderDate" type="date" defaultValue={new Date().toISOString().split('T')[0]} />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="deliveryDate" className="text-right text-sm">
                  Delivery Date
                </label>
                <div className="col-span-3">
                  <Input id="deliveryDate" type="date" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setOpenSalesOrderDialog(false)}
                disabled={createSalesOrderMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateOrder}
                disabled={createSalesOrderMutation.isPending}
              >
                {createSalesOrderMutation.isPending ? "Creating..." : "Create Order"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid max-w-[600px] grid-cols-6 mb-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
          <TabsTrigger value="processing">Processing</TabsTrigger>
          <TabsTrigger value="shipped">Shipped</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
        
        <Card>
          <CardHeader>
            <CardTitle>Sales Orders</CardTitle>
            <CardDescription>Manage your customer sales orders</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
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
                      No sales orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.orderNumber}</TableCell>
                      <TableCell>{typeof order.customer === 'object' ? order.customer.name : order.customer}</TableCell>
                      <TableCell>{formatDate(order.orderDate)}</TableCell>
                      <TableCell>{formatDate(order.deliveryDate)}</TableCell>
                      <TableCell>{formatCurrency(order.total)}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(order.status)}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                          >
                            View
                          </Button>
                          {/* Add button to create invoice from sales order */}
                          {(order.status === "confirmed" || order.status === "processing") && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => navigate(`/create-invoice-from-sales-order?salesOrderId=${order.id}`)}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              Create Invoice
                            </Button>
                          )}
                          {/* Add button to generate invoice for intercompany orders */}
                          {order.status === "confirmed" && order.orderNumber.includes("ICO") && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                // Navigate to intercompany invoice form with the sales order ID
                                const soId = order.id || 0;
                                console.log("Navigating to intercompany invoice with order ID:", soId);
                                
                                // Check if we're working with intercompany orders
                                const url = `/intercompany-invoice-form?soId=${soId}`;
                                console.log("Navigation URL:", url);
                                
                                // Use window.location for hard reload to ensure query params are fresh
                                window.location.href = url;
                              }}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              Create Intercompany Invoice
                            </Button>
                          )}
                          {/* Add button to generate invoice for regular orders */}
                          {order.status === "confirmed" && !order.orderNumber.includes("ICO") && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                // Navigate to invoice form with the sales order ID
                                const salesOrderId = order.id || 0;
                                console.log("Navigating to regular invoice with order ID:", salesOrderId);
                                const url = `/invoice-form?salesOrderId=${salesOrderId}`;
                                console.log("Navigation URL:", url);
                                
                                // Use window.location for hard reload to ensure query params are fresh
                                window.location.href = url;
                              }}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              Create Invoice
                            </Button>
                          )}
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