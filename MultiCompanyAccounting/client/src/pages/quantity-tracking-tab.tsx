import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface QuantityTrackingTabProps {
  items: Array<{
    productId: number;
    productName: string;
    orderQty: number;
    invoicedQty: number;
    receivedQty: number;
    currentQty: number;
  }>;
  onInvoicedQtyChange: (index: number, value: number) => void;
  onReceivedQtyChange: (index: number, value: number) => void;
}

export default function QuantityTrackingTab({ 
  items, 
  onInvoicedQtyChange, 
  onReceivedQtyChange 
}: QuantityTrackingTabProps) {
  return (
    <div>
      <h3 className="text-lg font-medium mb-4">Quantity Tracking</h3>
      <div className="rounded-md border">
        <table className="min-w-full divide-y divide-border">
          <thead>
            <tr className="bg-muted/50">
              <th className="px-4 py-3 text-left text-sm font-medium">Product</th>
              <th className="px-4 py-3 text-right text-sm font-medium">Order Qty</th>
              <th className="px-4 py-3 text-right text-sm font-medium">Invoiced Qty</th>
              <th className="px-4 py-3 text-right text-sm font-medium">This Invoice</th>
              <th className="px-4 py-3 text-right text-sm font-medium">Received Qty</th>
              <th className="px-4 py-3 text-right text-sm font-medium">Remaining</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item, index) => {
              const orderQty = item.orderQty || 0;
              const invoicedQty = item.invoicedQty || 0;
              const thisInvoiceQty = item.currentQty || 0;
              const receivedQty = item.receivedQty || 0;
              const remaining = Math.max(0, orderQty - (invoicedQty + thisInvoiceQty));
              
              return (
                <tr key={index}>
                  <td className="px-4 py-3 text-sm">
                    {item.productName || `Product #${item.productId}`}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    {orderQty}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={invoicedQty}
                      onChange={(e) => onInvoicedQtyChange(index, parseFloat(e.target.value) || 0)}
                      className="border border-gray-300 rounded px-2 py-1 text-sm text-right w-20 h-8"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium">
                    {thisInvoiceQty}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={receivedQty}
                      onChange={(e) => onReceivedQtyChange(index, parseFloat(e.target.value) || 0)}
                      className="border border-gray-300 rounded px-2 py-1 text-sm text-right w-20 h-8"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    {remaining}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}