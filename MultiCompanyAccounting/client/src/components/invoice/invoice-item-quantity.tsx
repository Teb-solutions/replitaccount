import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

interface InvoiceItemQuantityProps {
  orderQty: number;
  invoicedQty: number;
  receivedQty: number;
  currentQty: number;
  onInvoicedQtyChange: (value: number) => void;
  onReceivedQtyChange: (value: number) => void;
}

export default function InvoiceItemQuantity({
  orderQty,
  invoicedQty,
  receivedQty,
  currentQty,
  onInvoicedQtyChange,
  onReceivedQtyChange
}: InvoiceItemQuantityProps) {
  const remaining = Math.max(0, orderQty - (invoicedQty + currentQty));
  
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Order Quantity</Label>
            <div className="font-medium">{orderQty}</div>
          </div>
          
          <div>
            <Label className="text-xs">Previously Invoiced</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={invoicedQty}
              onChange={(e) => onInvoicedQtyChange(parseFloat(e.target.value) || 0)}
              className="h-8 mt-1"
            />
          </div>
          
          <div>
            <Label className="text-xs">Current Invoice</Label>
            <div className="font-medium">{currentQty}</div>
          </div>
          
          <div>
            <Label className="text-xs">Received Quantity</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={receivedQty}
              onChange={(e) => onReceivedQtyChange(parseFloat(e.target.value) || 0)}
              className="h-8 mt-1"
            />
          </div>
          
          <div>
            <Label className="text-xs">Remaining Quantity</Label>
            <div className={`font-medium ${remaining === 0 ? 'text-green-600' : ''}`}>
              {remaining}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}