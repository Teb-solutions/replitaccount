import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

type PartialInvoiceItem = {
  id: number;
  productId: number;
  soItemId?: number;
  productName: string;
  description?: string;
  totalQuantity: number;
  previouslyInvoiced: number;
  remainingQuantity: number;
  invoiceQuantity: number;
  unitPrice: number;
  selected: boolean;
};

interface PartialInvoiceControlsProps {
  salesOrderItems: any[];
  previousTransactions?: any[];
  onQuantitiesChanged: (items: PartialInvoiceItem[]) => void;
}

export default function PartialInvoiceControls({ 
  salesOrderItems, 
  previousTransactions = [],
  onQuantitiesChanged 
}: PartialInvoiceControlsProps) {
  const [lineItems, setLineItems] = useState<PartialInvoiceItem[]>([]);
  
  // Initialize items from sales order
  useEffect(() => {
    if (!salesOrderItems || !Array.isArray(salesOrderItems)) return;
    
    const processedItems: PartialInvoiceItem[] = salesOrderItems.map((item, index) => {
      // Get item details with safety checks
      const id = item.id || index;
      const productId = item.productId || 0;
      const soItemId = item.id;
      const productName = item.productName || item.name || `Product ${productId}`;
      const description = item.description || '';
      
      // Parse quantities
      const totalQuantity = typeof item.quantity === 'number' 
        ? item.quantity 
        : parseFloat(String(item.quantity || '0').replace(/,/g, ''));
      
      // Calculate previously invoiced quantity
      let previouslyInvoiced = 0;
      if (previousTransactions && previousTransactions.length > 0) {
        previousTransactions.forEach(tx => {
          const matchingInvoiceItem = tx.invoices?.[0]?.items?.find((ii: any) => 
            ii.productId === productId || ii.soItemId === soItemId
          );
          if (matchingInvoiceItem) {
            previouslyInvoiced += typeof matchingInvoiceItem.quantity === 'number'
              ? matchingInvoiceItem.quantity
              : parseFloat(String(matchingInvoiceItem.quantity || '0').replace(/,/g, ''));
          }
        });
      }
      
      // Calculate remaining quantity
      const remainingQuantity = Math.max(0, totalQuantity - previouslyInvoiced);
      
      // Get unit price
      const unitPrice = typeof item.unitPrice === 'number'
        ? item.unitPrice
        : parseFloat(String(item.unitPrice || '0').replace(/,/g, ''));
      
      return {
        id,
        productId,
        soItemId,
        productName,
        description,
        totalQuantity,
        previouslyInvoiced,
        remainingQuantity,
        invoiceQuantity: remainingQuantity, // Default to invoice all remaining
        unitPrice,
        selected: true // Selected by default
      };
    });
    
    setLineItems(processedItems);
    onQuantitiesChanged(processedItems);
  }, [salesOrderItems, previousTransactions, onQuantitiesChanged]);
  
  // Handle quantity changes
  const handleQuantityChange = (index: number, value: number) => {
    const updatedItems = [...lineItems];
    const item = updatedItems[index];
    
    // Ensure quantity is within valid range
    const newQuantity = Math.max(0, Math.min(value, item.remainingQuantity));
    
    updatedItems[index] = {
      ...item,
      invoiceQuantity: newQuantity
    };
    
    setLineItems(updatedItems);
    onQuantitiesChanged(updatedItems);
  };
  
  // Handle item selection
  const handleItemSelection = (index: number, selected: boolean) => {
    const updatedItems = [...lineItems];
    updatedItems[index] = {
      ...updatedItems[index],
      selected
    };
    
    // Ensure at least one item is selected
    const hasSelected = updatedItems.some(item => item.selected);
    if (!hasSelected && !selected) {
      updatedItems[index].selected = true;
    }
    
    setLineItems(updatedItems);
    onQuantitiesChanged(updatedItems);
  };
  
  // Select all or none
  const handleSelectAll = (selected: boolean) => {
    const updatedItems = lineItems.map(item => ({
      ...item,
      selected
    }));
    
    // If "deselect all", keep at least the first valid item selected
    if (!selected && updatedItems.length > 0) {
      const firstValidIndex = updatedItems.findIndex(item => item.remainingQuantity > 0);
      if (firstValidIndex >= 0) {
        updatedItems[firstValidIndex].selected = true;
      }
    }
    
    setLineItems(updatedItems);
    onQuantitiesChanged(updatedItems);
  };
  
  // Calculate totals
  const totalQuantity = lineItems.reduce((sum, item) => sum + (item.selected ? item.totalQuantity : 0), 0);
  const totalInvoiced = lineItems.reduce((sum, item) => sum + (item.selected ? item.previouslyInvoiced : 0), 0);
  const totalRemaining = lineItems.reduce((sum, item) => sum + (item.selected ? item.remainingQuantity : 0), 0);
  const currentInvoiceQuantity = lineItems.reduce((sum, item) => sum + (item.selected ? item.invoiceQuantity : 0), 0);
  const currentInvoiceValue = lineItems.reduce((sum, item) => sum + (item.selected ? item.invoiceQuantity * item.unitPrice : 0), 0);
  
  // Check if we have any items with remaining quantities
  const hasRemainingQuantities = lineItems.some(item => item.remainingQuantity > 0);
  
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
        <h3 className="text-blue-800 font-medium text-sm mb-2">Partial Invoicing</h3>
        <p className="text-blue-700 text-xs">
          You can invoice specific quantities from this sales order. {totalInvoiced > 0 ? 
            `Some quantities have already been invoiced in previous transactions.` : 
            `No quantities have been invoiced yet.`}
        </p>
      </div>
      
      {!hasRemainingQuantities && (
        <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
          <h3 className="text-yellow-800 font-medium text-sm">All quantities invoiced</h3>
          <p className="text-yellow-700 text-xs">
            All quantities from this sales order have already been fully invoiced.
          </p>
        </div>
      )}
      
      <div className="border rounded-md overflow-hidden">
        <div className="bg-gray-100 grid grid-cols-12 gap-4 py-2 px-3 text-sm font-medium text-gray-600">
          <div className="col-span-1">
            <Checkbox 
              checked={lineItems.every(item => item.selected)}
              onCheckedChange={(checked) => handleSelectAll(!!checked)}
              id="select-all"
            />
          </div>
          <div className="col-span-3">Product</div>
          <div className="col-span-2 text-right">Total Qty</div>
          <div className="col-span-2 text-right">Invoiced</div>
          <div className="col-span-2 text-right">Remaining</div>
          <div className="col-span-2 text-right">This Invoice</div>
        </div>
        
        {lineItems.map((item, index) => (
          <div 
            key={item.id || index} 
            className={`grid grid-cols-12 gap-4 py-3 px-3 text-sm border-t
                      ${!item.remainingQuantity ? 'bg-gray-50 text-gray-500' : ''}
                      ${item.selected ? 'bg-blue-50/20' : ''}`}
          >
            <div className="col-span-1">
              <Checkbox 
                checked={item.selected}
                onCheckedChange={(checked) => handleItemSelection(index, !!checked)}
                disabled={!item.remainingQuantity}
                id={`select-item-${index}`}
              />
            </div>
            <div className="col-span-3">
              <div className="font-medium">{item.productName}</div>
              {item.description && (
                <div className="text-xs text-gray-500">{item.description}</div>
              )}
              <div className="text-xs text-gray-400">ID: {item.productId}</div>
            </div>
            <div className="col-span-2 text-right">{item.totalQuantity}</div>
            <div className="col-span-2 text-right">
              <span className={item.previouslyInvoiced > 0 ? 'text-blue-600 font-medium' : ''}>
                {item.previouslyInvoiced}
              </span>
            </div>
            <div className="col-span-2 text-right">
              <span className={!item.remainingQuantity ? 'text-gray-400' : 'text-green-600 font-medium'}>
                {item.remainingQuantity}
              </span>
            </div>
            <div className="col-span-2 text-right">
              {item.remainingQuantity > 0 ? (
                <Input 
                  type="number"
                  min="0"
                  max={item.remainingQuantity}
                  value={item.invoiceQuantity}
                  onChange={(e) => handleQuantityChange(index, Number(e.target.value))}
                  className="text-right w-full"
                  disabled={!item.selected}
                />
              ) : (
                <span className="text-gray-400">0</span>
              )}
            </div>
          </div>
        ))}
        
        <div className="bg-gray-100 grid grid-cols-12 gap-4 py-3 px-3 text-sm font-medium">
          <div className="col-span-4 text-right">Totals:</div>
          <div className="col-span-2 text-right">{totalQuantity}</div>
          <div className="col-span-2 text-right">{totalInvoiced}</div>
          <div className="col-span-2 text-right">{totalRemaining}</div>
          <div className="col-span-2 text-right">{currentInvoiceQuantity}</div>
        </div>
      </div>
      
      <div className="flex justify-between items-center p-4 bg-gray-50 border rounded-md">
        <div>
          <span className="text-sm font-medium">Current Invoice Value:</span>
          <span className="ml-2 text-lg font-bold text-primary">
            {formatCurrency(currentInvoiceValue, 'USD')}
          </span>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              // Set all quantities to maximum remaining
              const updatedItems = lineItems.map(item => ({
                ...item,
                invoiceQuantity: item.selected ? item.remainingQuantity : 0
              }));
              setLineItems(updatedItems);
              onQuantitiesChanged(updatedItems);
            }}
          >
            Invoice All Remaining
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              // Set all quantities to half of remaining (rounded up)
              const updatedItems = lineItems.map(item => ({
                ...item,
                invoiceQuantity: item.selected ? Math.ceil(item.remainingQuantity / 2) : 0
              }));
              setLineItems(updatedItems);
              onQuantitiesChanged(updatedItems);
            }}
          >
            Invoice Half
          </Button>
        </div>
      </div>
    </div>
  );
}