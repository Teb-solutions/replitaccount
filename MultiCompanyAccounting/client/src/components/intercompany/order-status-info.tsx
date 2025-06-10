import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle, CheckCircle2, Receipt, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { formatCurrency } from "@/lib/utils";
import CreateInvoiceButton from "@/components/intercompany/create-invoice-button";

interface OrderStatusInfoProps {
  orderId: number | string;
}

export default function OrderStatusInfo({ orderId }: OrderStatusInfoProps) {
  // Fetch order status information
  const { data, isLoading, isError } = useQuery({
    queryKey: ["/api/intercompany-order-status", orderId],
    queryFn: async () => {
      if (!orderId) return null;
      try {
        const res = await apiRequest("GET", `/api/intercompany-order-status/${orderId}`);
        return res.json();
      } catch (error) {
        console.error("Error fetching order status:", error);
        // Try fetching with transaction type specified
        try {
          // First try as a sales order
          const salesRes = await apiRequest("GET", `/api/intercompany-order-status/${orderId}/sales`);
          return salesRes.json();
        } catch (salesError) {
          // Then try as purchase order
          try {
            const purchaseRes = await apiRequest("GET", `/api/intercompany-order-status/${orderId}/purchase`);
            return purchaseRes.json();
          } catch (purchaseError) {
            throw new Error("Failed to fetch order status");
          }
        }
      }
    },
    enabled: !!orderId,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
        <span>Loading order information...</span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load order status information
        </AlertDescription>
      </Alert>
    );
  }

  const { order, invoices, receipts, summary } = data;

  return (
    <Card className="mb-6 border-blue-100">
      <CardHeader className="bg-blue-50/50">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center text-blue-700">
              <FileText className="h-5 w-5 mr-2" />
              Order Status Information
            </CardTitle>
            <CardDescription>
              Information about related invoices and receipts for this order
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {summary.invoiceCount > 0 && (
              <Badge variant={summary.isFullyInvoiced ? "secondary" : "default"} className={summary.isFullyInvoiced ? "bg-green-500 hover:bg-green-600 text-white" : ""}>
                {summary.isFullyInvoiced ? "Fully Invoiced" : "Partially Invoiced"}
              </Badge>
            )}
            {summary.receiptCount > 0 && (
              <Badge variant={summary.isFullyPaid ? "secondary" : "default"} className={summary.isFullyPaid ? "bg-green-500 hover:bg-green-600 text-white" : ""}>
                {summary.isFullyPaid ? "Fully Paid" : "Partially Paid"}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-md font-medium mb-3 flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Invoice Status
            </h3>
            {invoices.length === 0 ? (
              <>
                <p className="text-sm text-muted-foreground mb-4">No invoices have been created for this order yet.</p>
                {order && order.source_order_id && order.target_order_id && (
                  <div className="mt-2">
                    <CreateInvoiceButton 
                      sourceOrderId={order.source_order_id} 
                      targetOrderId={order.target_order_id}
                      onSuccess={() => window.location.reload()}
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="mb-4 text-sm">
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>Total Invoiced Amount:</div>
                    <div className="font-medium">{formatCurrency(summary.totalInvoiced)}</div>
                    
                    <div>Order Total Amount:</div>
                    <div className="font-medium">{formatCurrency(order.total)}</div>
                    
                    <div>Invoicing Status:</div>
                    <div className="font-medium">
                      {summary.isFullyInvoiced ? (
                        <span className="text-green-600 flex items-center">
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Fully Invoiced
                        </span>
                      ) : (
                        <span className="text-amber-600">
                          Partially Invoiced ({Math.round((summary.totalInvoiced / order.total) * 100)}%)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <h4 className="text-sm font-medium mb-2">Invoice Details</h4>
                <div className="border rounded-md">
                  <div className="bg-muted/50 px-3 py-2 text-xs font-medium grid grid-cols-12">
                    <div className="col-span-3">Invoice #</div>
                    <div className="col-span-3">Date</div>
                    <div className="col-span-3 text-right">Amount</div>
                    <div className="col-span-3 text-right">Status</div>
                  </div>
                  <div className="divide-y">
                    {invoices.map((invoice: any) => (
                      <div key={invoice.id} className="px-3 py-2 text-xs grid grid-cols-12">
                        <div className="col-span-3">{invoice.invoice_number}</div>
                        <div className="col-span-3">
                          {new Date(invoice.invoice_date).toLocaleDateString()}
                        </div>
                        <div className="col-span-3 text-right">{formatCurrency(invoice.total)}</div>
                        <div className="col-span-3 text-right">
                          <Badge 
                            className={`text-xs ${
                              invoice.status === 'Paid' ? 'bg-green-500 text-white' : 
                              invoice.status === 'Partial' ? 'bg-amber-500 text-white' : ''
                            }`}
                          >
                            {invoice.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          
          <div>
            <h3 className="text-md font-medium mb-3 flex items-center">
              <Receipt className="h-4 w-4 mr-2" />
              Payment Status
            </h3>
            {receipts.length === 0 ? (
              <p className="text-sm text-muted-foreground mb-4">No payments have been received for this order yet.</p>
            ) : (
              <>
                <div className="mb-4 text-sm">
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>Total Received Amount:</div>
                    <div className="font-medium">{formatCurrency(summary.totalReceived)}</div>
                    
                    <div>Total Invoiced Amount:</div>
                    <div className="font-medium">{formatCurrency(summary.totalInvoiced)}</div>
                    
                    <div>Balance Due:</div>
                    <div className="font-medium">
                      {summary.balanceDue <= 0 ? (
                        <span className="text-green-600">No Balance Due</span>
                      ) : (
                        <span className="text-red-600">{formatCurrency(summary.balanceDue)}</span>
                      )}
                    </div>
                    
                    <div>Payment Status:</div>
                    <div className="font-medium">
                      {summary.isFullyPaid ? (
                        <span className="text-green-600 flex items-center">
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Fully Paid
                        </span>
                      ) : (
                        <span className="text-amber-600">
                          Partially Paid ({Math.round((summary.totalReceived / summary.totalInvoiced) * 100)}%)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <h4 className="text-sm font-medium mb-2">Receipt Details</h4>
                <div className="border rounded-md">
                  <div className="bg-muted/50 px-3 py-2 text-xs font-medium grid grid-cols-12">
                    <div className="col-span-3">Receipt #</div>
                    <div className="col-span-3">Date</div>
                    <div className="col-span-3 text-right">Amount</div>
                    <div className="col-span-3">Method</div>
                  </div>
                  <div className="divide-y">
                    {receipts.map((receipt: any) => (
                      <div key={receipt.id} className="px-3 py-2 text-xs grid grid-cols-12">
                        <div className="col-span-3">{receipt.receipt_number}</div>
                        <div className="col-span-3">
                          {new Date(receipt.receipt_date).toLocaleDateString()}
                        </div>
                        <div className="col-span-3 text-right">{formatCurrency(receipt.amount)}</div>
                        <div className="col-span-3">{receipt.payment_method}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}