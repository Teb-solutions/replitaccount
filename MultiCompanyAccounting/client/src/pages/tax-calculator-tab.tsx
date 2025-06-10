import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Percent } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

// Standard GST rates in India
const GST_RATES = [
  { name: "Exempt", rate: 0 },
  { name: "GST 5%", rate: 5 },
  { name: "GST 12%", rate: 12 },
  { name: "GST 18%", rate: 18 },
  { name: "GST 28%", rate: 28 }
];

interface TaxCalculatorTabProps {
  taxType: string;
  onTaxTypeChange: (type: string) => void;
  onApplyTaxRate: (rate: number) => void;
  subtotal: number;
  tax: number;
  total: number;
  taxBreakdown: {
    cgst: number;
    sgst: number;
    igst: number;
    taxByRate: Record<string, {rate: number, amount: number}>;
  };
}

export default function TaxCalculatorTab({
  taxType,
  onTaxTypeChange,
  onApplyTaxRate,
  subtotal,
  tax,
  total,
  taxBreakdown
}: TaxCalculatorTabProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h3 className="text-md font-medium mb-4">Tax Type</h3>
        <div className="space-x-2 mb-6">
          <Button
            type="button"
            size="sm"
            variant={taxType === 'gst' ? 'default' : 'outline'}
            onClick={() => onTaxTypeChange('gst')}
          >
            CGST + SGST (Intrastate)
          </Button>
          <Button
            type="button"
            size="sm"
            variant={taxType === 'igst' ? 'default' : 'outline'}
            onClick={() => onTaxTypeChange('igst')}
          >
            IGST (Interstate)
          </Button>
        </div>
        
        <h3 className="text-md font-medium mb-2">Tax Presets</h3>
        <div className="flex flex-wrap gap-2">
          {GST_RATES.map((gst) => (
            <Button 
              key={gst.rate}
              variant="outline"
              size="sm"
              onClick={() => onApplyTaxRate(gst.rate)}
            >
              <Percent className="h-3 w-3 mr-1" />
              {gst.name}
            </Button>
          ))}
        </div>
      </div>
      
      <div className="bg-muted p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4">Tax Breakdown</h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="text-sm">Subtotal:</div>
            <div className="text-sm font-medium text-right">{formatCurrency(subtotal)}</div>
            
            <div className="text-sm">Total Tax:</div>
            <div className="text-sm font-medium text-right">{formatCurrency(tax)}</div>
            
            {taxType === "gst" && (
              <>
                <div className="text-sm">CGST:</div>
                <div className="text-sm font-medium text-right">{formatCurrency(taxBreakdown.cgst)}</div>
                
                <div className="text-sm">SGST:</div>
                <div className="text-sm font-medium text-right">{formatCurrency(taxBreakdown.sgst)}</div>
              </>
            )}
            
            {taxType === "igst" && (
              <>
                <div className="text-sm">IGST:</div>
                <div className="text-sm font-medium text-right">{formatCurrency(taxBreakdown.igst)}</div>
              </>
            )}
            
            <div className="text-sm font-semibold border-t pt-2">Total Amount:</div>
            <div className="text-sm font-bold text-right border-t pt-2">{formatCurrency(total)}</div>
          </div>
          
          {/* Tax by rate table */}
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Tax by Rate</h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left pb-2">Rate</th>
                  <th className="text-right pb-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(taxBreakdown.taxByRate || {}).map(([rate, data]) => (
                  <tr key={rate} className="border-b last:border-0">
                    <td className="py-2">{data.rate}%</td>
                    <td className="py-2 text-right">{formatCurrency(data.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}