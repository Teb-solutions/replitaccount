import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { 
  ChevronDown, 
  ChevronUp, 
  Loader2, 
  Package, 
  ShoppingBag, 
  ShoppingCart 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";

interface AccountOrdersProps {
  accountCode: string;
  companyId: number;
}

export default function AccountOrdersDisplay({ accountCode, companyId }: AccountOrdersProps) {
  const [orderType, setOrderType] = useState<'sales' | 'purchase'>(
    accountCode === '1100' ? 'sales' : 'purchase'
  );
  const [expandedOrders, setExpandedOrders] = useState<Record<number, boolean>>({});
  
  // Toggle order expanded state
  const toggleOrderExpanded = (orderId: number) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  // Fetch sales orders if this is Accounts Receivable (1100) or Intercompany Receivable (1150)
  const { data: salesOrders, isLoading: salesLoading } = useQuery({
    queryKey: ['/api/sales-orders', companyId],
    queryFn: async () => {
      try {
        console.log(`Fetching sales orders for company ${companyId} for AR display`);
        const response = await fetch(`/api/sales-orders?companyId=${companyId}`);
        
        if (!response.ok) {
          console.error(`Failed to fetch sales orders: ${response.status}`);
          throw new Error('Failed to fetch sales orders');
        }
        
        const data = await response.json();
        console.log(`Retrieved ${data?.length || 0} sales orders for AR display`);
        return data;
      } catch (error) {
        console.error('Error fetching sales orders:', error);
        throw error;
      }
    },
    enabled: accountCode === '1100' || accountCode === '1150',
    refetchInterval: 30000, // Refresh every 30 seconds to get latest orders
    refetchOnWindowFocus: true // Refresh when window gains focus
  });

  // Fetch purchase orders if this is Accounts Payable (2000)
  const { data: purchaseOrders, isLoading: purchaseLoading } = useQuery({
    queryKey: ['/api/purchase-orders', companyId],
    queryFn: async () => {
      try {
        console.log(`Fetching purchase orders for company ${companyId} for AP display`);
        const response = await fetch(`/api/purchase-orders?companyId=${companyId}`);
        
        if (!response.ok) {
          console.error(`Failed to fetch purchase orders: ${response.status}`);
          throw new Error('Failed to fetch purchase orders');
        }
        
        const data = await response.json();
        console.log(`Retrieved ${data?.length || 0} purchase orders for AP display`);
        return data;
      } catch (error) {
        console.error('Error fetching purchase orders:', error);
        throw error;
      }
    },
    enabled: accountCode === '2000',
    refetchInterval: 30000, // Refresh every 30 seconds to get latest orders
    refetchOnWindowFocus: true // Refresh when window gains focus
  });

  // Determine if any orders exist
  const hasOrders = 
    (accountCode === '1100' && salesOrders && salesOrders.length > 0) ||
    (accountCode === '1150' && salesOrders && salesOrders.length > 0) ||
    (accountCode === '2000' && purchaseOrders && purchaseOrders.length > 0);

  // Get order status badge color
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Open</Badge>;
      case 'invoiced': return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Invoiced</Badge>;
      case 'completed': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
      case 'partial': return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Partial</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Toggle expanded state already defined above

  if (accountCode !== '1100' && accountCode !== '1150' && accountCode !== '2000') {
    return null;
  }

  // Determine loading state based on account code
  const isLoading = (accountCode === '1100' || accountCode === '1150') 
    ? salesLoading 
    : purchaseLoading;

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center">
          {accountCode === '1100' || accountCode === '1150' ? (
            <>
              <ShoppingBag className="h-5 w-5 mr-2" />
              Open Sales Orders
            </>
          ) : (
            <>
              <ShoppingCart className="h-5 w-5 mr-2" />
              Open Purchase Orders
            </>
          )}
        </CardTitle>
        <CardDescription>
          {accountCode === '1100' 
            ? 'Sales orders associated with accounts receivable' 
            : accountCode === '1150'
            ? 'Sales orders associated with intercompany receivable'
            : 'Purchase orders associated with accounts payable'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center p-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !hasOrders ? (
          <div className="text-center py-6 text-muted-foreground">
            No {accountCode === '1100' ? 'sales' : 'purchase'} orders found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>
                    {accountCode === '1100' ? 'Customer' : 'Vendor'}
                  </TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accountCode === '1100' && salesOrders ? (
                  salesOrders.map((order: any) => (
                    <>
                      <TableRow 
                        key={order.id}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                        onClick={() => toggleOrderExpanded(order.id)}
                      >
                        <TableCell className="font-medium flex items-center">
                          {expandedOrders[order.id] ? 
                            <ChevronUp className="h-4 w-4 mr-2" /> : 
                            <ChevronDown className="h-4 w-4 mr-2" />
                          }
                          {order.orderNumber || `SO-${order.id}`}
                        </TableCell>
                        <TableCell>{formatDate(order.orderDate || order.date || '')}</TableCell>
                        <TableCell>{order.customerName || 'N/A'}</TableCell>
                        <TableCell className="text-right">{formatCurrency(order.total || 0)}</TableCell>
                        <TableCell>{getStatusBadge(order.status || 'Open')}</TableCell>
                      </TableRow>
                      
                      {/* Order items */}
                      {expandedOrders[order.id] && order.items && order.items.length > 0 && (
                        <TableRow className="bg-gray-50 dark:bg-gray-800">
                          <TableCell colSpan={5} className="p-0">
                            <div className="p-4">
                              <h4 className="text-sm font-medium mb-2 flex items-center">
                                <Package className="h-4 w-4 mr-2" />
                                Order Items
                              </h4>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Product</TableHead>
                                    <TableHead className="text-right">Quantity</TableHead>
                                    <TableHead className="text-right">Unit Price</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {order.items.map((item: any) => (
                                    <TableRow key={item.id}>
                                      <TableCell>{item.productName || 'Unknown Product'}</TableCell>
                                      <TableCell className="text-right">{item.quantity}</TableCell>
                                      <TableCell className="text-right">{formatCurrency(item.unitPrice || 0)}</TableCell>
                                      <TableCell className="text-right">{formatCurrency(item.total || 0)}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      
                      {/* Empty items message */}
                      {expandedOrders[order.id] && (!order.items || order.items.length === 0) && (
                        <TableRow className="bg-gray-50 dark:bg-gray-800">
                          <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                            No items found for this order
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))
                ) : accountCode === '2000' && purchaseOrders ? (
                  purchaseOrders.map((order: any) => (
                    <>
                      <TableRow 
                        key={order.id}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                        onClick={() => toggleOrderExpanded(order.id)}
                      >
                        <TableCell className="font-medium flex items-center">
                          {expandedOrders[order.id] ? 
                            <ChevronUp className="h-4 w-4 mr-2" /> : 
                            <ChevronDown className="h-4 w-4 mr-2" />
                          }
                          {order.orderNumber || `PO-${order.id}`}
                        </TableCell>
                        <TableCell>{formatDate(order.orderDate || order.date || '')}</TableCell>
                        <TableCell>{order.vendorName || 'N/A'}</TableCell>
                        <TableCell className="text-right">{formatCurrency(order.total || 0)}</TableCell>
                        <TableCell>{getStatusBadge(order.status || 'Open')}</TableCell>
                      </TableRow>
                      
                      {/* Order items */}
                      {expandedOrders[order.id] && order.items && order.items.length > 0 && (
                        <TableRow className="bg-gray-50 dark:bg-gray-800">
                          <TableCell colSpan={5} className="p-0">
                            <div className="p-4">
                              <h4 className="text-sm font-medium mb-2 flex items-center">
                                <Package className="h-4 w-4 mr-2" />
                                Order Items
                              </h4>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Product</TableHead>
                                    <TableHead className="text-right">Quantity</TableHead>
                                    <TableHead className="text-right">Unit Price</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {order.items.map((item: any) => (
                                    <TableRow key={item.id}>
                                      <TableCell>{item.productName || 'Unknown Product'}</TableCell>
                                      <TableCell className="text-right">{item.quantity}</TableCell>
                                      <TableCell className="text-right">{formatCurrency(item.unitPrice || 0)}</TableCell>
                                      <TableCell className="text-right">{formatCurrency(item.total || 0)}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      
                      {/* Empty items message */}
                      {expandedOrders[order.id] && (!order.items || order.items.length === 0) && (
                        <TableRow className="bg-gray-50 dark:bg-gray-800">
                          <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                            No items found for this order
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))
                ) : null}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}