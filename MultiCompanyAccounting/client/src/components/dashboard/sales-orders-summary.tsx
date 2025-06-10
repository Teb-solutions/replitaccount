import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCompany } from "@/hooks/use-company";
import { apiRequest } from "@/lib/queryClient";
import { 
  Card, 
  CardContent, 
  CardDescription, 
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Loader2, Eye, ArrowRight } from "lucide-react";
import { Link } from "wouter";

// Status badge variants for different statuses
const getStatusBadge = (status: string) => {
  switch (status.toLowerCase()) {
    case 'draft':
      return <Badge variant="outline">Draft</Badge>;
    case 'confirmed':
      return <Badge variant="default">Confirmed</Badge>;
    case 'fulfilled':
      return <Badge className="bg-green-500 text-white">Fulfilled</Badge>;
    case 'partially_fulfilled':
      return <Badge className="bg-amber-500 text-white">Partially Fulfilled</Badge>;
    case 'invoiced':
      return <Badge variant="secondary">Invoiced</Badge>;
    case 'cancelled':
      return <Badge variant="destructive">Cancelled</Badge>;
    case 'overdue':
      return <Badge variant="destructive">Overdue</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const getDueStatusBadge = (dueStatus: string) => {
  switch (dueStatus.toLowerCase()) {
    case 'paid':
      return <Badge className="bg-green-500 text-white">Paid</Badge>;
    case 'due':
      return <Badge className="bg-amber-500 text-white">Due</Badge>;
    case 'overdue':
      return <Badge variant="destructive">Overdue</Badge>;
    case 'partial':
      return <Badge className="bg-amber-500 text-white">Partially Paid</Badge>;
    default:
      return <Badge variant="outline">{dueStatus}</Badge>;
  }
};

export default function SalesOrdersSummary() {
  const [activeTab, setActiveTab] = useState("sales");
  
  // Import useCompany hook at the top of the file
  const { activeCompany } = useCompany();
  
  // Query for sales orders
  const { data: salesOrders, isLoading: isLoadingSales } = useQuery({
    queryKey: ["/api/sales-orders", activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) return [];
      console.log("Fetching sales orders for company ID:", activeCompany.id);
      
      // Instead of using the summary endpoint which doesn't exist, use the main sales orders endpoint
      const response = await apiRequest("GET", `/api/sales-orders?companyId=${activeCompany.id}`);
      if (!response.ok) {
        console.error("Failed to fetch sales orders:", response.status);
        throw new Error("Failed to fetch sales orders");
      }
      
      const data = await response.json();
      console.log("Sales orders data received:", data);
      
      // Format the data to match expected structure with 'recent' property
      return {
        total: Array.isArray(data) ? data.length : 0,
        recent: Array.isArray(data) ? data.slice(0, 5) : []
      };
    },
    enabled: !!activeCompany,
    retry: 1
  });
  
  // Query for purchase orders
  const { data: purchaseOrders, isLoading: isLoadingPurchases } = useQuery({
    queryKey: ["/api/purchase-orders/summary", activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) return [];
      const response = await apiRequest("GET", `/api/purchase-orders/summary?companyId=${activeCompany.id}`);
      if (!response.ok) throw new Error("Failed to fetch purchase orders");
      return await response.json();
    },
    enabled: !!activeCompany
  });
  
  // Get sales orders total from API response
  const getSalesOrdersTotal = (ordersData: any = {}) => {
    // First try to get the value property from the API response
    if (ordersData && ordersData.value !== undefined) {
      const value = parseFloat(ordersData.value || '0');
      if (!isNaN(value)) {
        console.log("Using value from API response:", value);
        return value;
      }
    }
    
    // If no value property or it's invalid, calculate from items
    const orders = ordersData?.recent || (Array.isArray(ordersData) ? ordersData : []);
    
    if (!orders || !orders.length) {
      console.log("No orders found to calculate total");
      return 0;
    }
    
    // Calculate from order items
    return orders.reduce((acc: number, order: any) => {
      if (order.status === 'cancelled' || order.status === 'paid') {
        return acc;
      }
      
      try {
        // Try to get balanceDue directly if it exists
        if (order.balanceDue !== undefined) {
          const balanceDue = parseFloat(order.balanceDue.toString());
          return acc + (isNaN(balanceDue) ? 0 : balanceDue);
        }
        
        // Otherwise calculate from total - amountPaid
        const amountPaid = order.amount_paid !== undefined ? order.amount_paid : (order.amountPaid || '0');
        const orderTotal = parseFloat(order.total?.toString() || '0');
        const orderPaid = parseFloat(amountPaid?.toString() || '0');
        
        if (isNaN(orderTotal) || isNaN(orderPaid)) {
          console.warn('Invalid numeric values in order', order.id);
          return acc;
        }
        
        const outstanding = orderTotal - orderPaid;
        return acc + outstanding;
      } catch (error) {
        console.error('Error calculating outstanding amount for order', order.id, error);
        return acc;
      }
    }, 0);
  };
  
  // Get purchase orders total from API response
  const getPurchaseOrdersTotal = (ordersData: any = {}) => {
    // First try to get the value property from the API response
    if (ordersData && ordersData.value !== undefined) {
      const value = parseFloat(ordersData.value || '0');
      if (!isNaN(value)) {
        console.log("Using value from API response:", value);
        return value;
      }
    }
    
    // If no value property or it's invalid, calculate from items
    const orders = ordersData?.recent || (Array.isArray(ordersData) ? ordersData : []);
    
    if (!orders || !orders.length) {
      console.log("No orders found to calculate total");
      return 0;
    }
    
    return orders.reduce((acc: number, order: any) => {
      if (!order) return acc;
      
      try {
        const total = parseFloat(order.total || '0');
        if (isNaN(total)) return acc;
        return acc + total;
      } catch (error) {
        console.error("Error calculating total:", error);
        return acc;
      }
    }, 0);
  };
  
  const salesOutstandingTotal = getSalesOrdersTotal(salesOrders);
  const purchasesOutstandingTotal = getPurchaseOrdersTotal(purchaseOrders);
  
  const isLoading = isLoadingSales || isLoadingPurchases;
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
          <CardDescription>Recent sales and purchase orders</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Order Summary</CardTitle>
        <CardDescription>
          Track your sales and purchase orders
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sales">Sales Orders</TabsTrigger>
            <TabsTrigger value="purchases">Purchase Orders</TabsTrigger>
          </TabsList>
          
          <TabsContent value="sales" className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Total Outstanding</p>
                  <p className="text-2xl font-bold">{formatCurrency(salesOutstandingTotal)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Orders</p>
                  <p className="text-2xl font-bold">{
                    // Get order count from API total if available
                    salesOrders?.total || 
                    // Otherwise count recent items
                    (salesOrders?.recent ? salesOrders.recent.length : 0)
                  }</p>
                </div>
              </div>
            </div>
            
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Payment Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Debug info */}
                  <TableRow className="bg-amber-50">
                    <TableCell colSpan={6} className="text-xs">
                      <div className="text-gray-500">
                        <strong>Debug:</strong> Company ID: {activeCompany?.id || 'none'}, 
                        Data type: {salesOrders ? (Array.isArray(salesOrders) ? 'array' : 
                                   (salesOrders.recent ? 'object with recent array' : 'object')) : 'null'}, 
                        Orders: {salesOrders?.recent ? salesOrders.recent.length : 
                                 (Array.isArray(salesOrders) ? salesOrders.length : 0)}
                      </div>
                    </TableCell>
                  </TableRow>
                  
                  {/* Use salesOrders.recent if it exists, otherwise use salesOrders directly if it's an array */}
                  {salesOrders?.recent ? 
                    // Handle object with recent property (correct API response format)
                    salesOrders.recent.slice(0, 5).map((order: any) => (
                      <TableRow key={order.id} data-company-id={activeCompany?.id}>
                        <TableCell className="font-medium">{order.order_number || order.orderNumber}</TableCell>
                        <TableCell>{formatDate(order.order_date || order.orderDate || order.date)}</TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(parseFloat(order.total))}</TableCell>
                        <TableCell>{getDueStatusBadge(order.payment_status || order.paymentStatus || 'due')}</TableCell>
                        <TableCell>
                          <Link href={`/sales-orders/${order.id}`}>
                            <Button size="sm" variant="ghost">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    )) 
                    : (Array.isArray(salesOrders) && salesOrders.length > 0) ?
                    // Handle array response (old format)
                    salesOrders.slice(0, 5).map((order: any) => (
                      <TableRow key={order.id} data-company-id={activeCompany?.id}>
                        <TableCell className="font-medium">{order.order_number || order.orderNumber}</TableCell>
                        <TableCell>{formatDate(order.order_date || order.orderDate || order.date)}</TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(parseFloat(order.total))}</TableCell>
                        <TableCell>{getDueStatusBadge(order.payment_status || order.paymentStatus || 'due')}</TableCell>
                        <TableCell>
                          <Link href={`/sales-orders/${order.id}`}>
                            <Button size="sm" variant="ghost">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                    : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                          No sales orders found
                        </TableCell>
                      </TableRow>
                    )
                  }
                </TableBody>
              </Table>
            </div>
            
            <div className="flex justify-end">
              <Link href="/sales-orders">
                <Button variant="outline" size="sm">
                  View All Sales Orders
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </TabsContent>
          
          <TabsContent value="purchases" className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Total Payable</p>
                  <p className="text-2xl font-bold">{formatCurrency(purchasesOutstandingTotal)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Orders</p>
                  <p className="text-2xl font-bold">{
                    // Get order count from API total if available
                    purchaseOrders?.total || 
                    // Otherwise count recent items
                    (purchaseOrders?.recent ? purchaseOrders.recent.length : 0)
                  }</p>
                </div>
              </div>
            </div>
            
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Payment Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Debug info */}
                  <TableRow className="bg-amber-50">
                    <TableCell colSpan={6} className="text-xs">
                      <div className="text-gray-500">
                        <strong>Debug:</strong> Company ID: {activeCompany?.id || 'none'}, 
                        Data type: {purchaseOrders ? (Array.isArray(purchaseOrders) ? 'array' : 
                                   (purchaseOrders.recent ? 'object with recent array' : 'object')) : 'null'}, 
                        Orders: {purchaseOrders?.recent ? purchaseOrders.recent.length : 
                                 (Array.isArray(purchaseOrders) ? purchaseOrders.length : 0)}
                      </div>
                    </TableCell>
                  </TableRow>
                  
                  {/* Use purchaseOrders.recent if it exists, otherwise use purchaseOrders directly if it's an array */}
                  {purchaseOrders?.recent ? 
                    // Handle object with recent property (correct API response format)
                    purchaseOrders.recent.slice(0, 5).map((order: any) => (
                      <TableRow key={order.id} data-company-id={activeCompany?.id}>
                        <TableCell className="font-medium">{order.order_number || order.orderNumber}</TableCell>
                        <TableCell>{formatDate(order.order_date || order.orderDate || order.date)}</TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(parseFloat(order.total))}</TableCell>
                        <TableCell>{getDueStatusBadge(order.payment_status || order.paymentStatus || 'due')}</TableCell>
                        <TableCell>
                          <Link href={`/purchase-orders/${order.id}`}>
                            <Button size="sm" variant="ghost">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  : (Array.isArray(purchaseOrders) && purchaseOrders.length > 0) ?
                    // Handle array response (old format)
                    purchaseOrders.slice(0, 5).map((order: any) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.order_number || order.orderNumber}</TableCell>
                        <TableCell>{formatDate(order.order_date || order.orderDate)}</TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(parseFloat(order.total))}</TableCell>
                        <TableCell>{getDueStatusBadge(order.payment_status || order.paymentStatus || 'due')}</TableCell>
                        <TableCell>
                          <Link href={`/purchase-orders/${order.id}`}>
                            <Button size="sm" variant="ghost">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                          No purchase orders found
                        </TableCell>
                      </TableRow>
                    )
                  }
                </TableBody>
              </Table>
            </div>
            
            <div className="flex justify-end">
              <Link href="/purchase-orders">
                <Button variant="outline" size="sm">
                  View All Purchase Orders
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}