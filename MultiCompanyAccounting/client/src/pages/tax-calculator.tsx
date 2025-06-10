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

export default function TaxCalculator() {
  const [amount, setAmount] = useState<number>(0);
  const [taxType, setTaxType] = useState<string>("gst");
  const [taxRate, setTaxRate] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [cgst, setCgst] = useState<number>(0);
  const [sgst, setSgst] = useState<number>(0);
  const [igst, setIgst] = useState<number>(0);
  const [taxByRate, setTaxByRate] = useState<Record<string, {rate: number, amount: number}>>({});

  // Handle tax type change
  const handleTaxTypeChange = (type: string) => {
    setTaxType(type);
    // Recalculate tax based on new type
    calculateTax(amount, taxRate, type);
  };

  // Handle amount change
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAmount = parseFloat(e.target.value) || 0;
    setAmount(newAmount);
    calculateTax(newAmount, taxRate, taxType);
  };

  // Handle applying tax rate
  const handleApplyTaxRate = (rate: number) => {
    setTaxRate(rate);
    calculateTax(amount, rate, taxType);
  };

  // Calculate tax based on amount, rate, and type
  const calculateTax = (baseAmount: number, rate: number, type: string) => {
    const tax = (baseAmount * rate) / 100;
    setTaxAmount(tax);

    // Reset all tax type values
    setCgst(0);
    setSgst(0);
    setIgst(0);

    // Update tax breakdown by rate
    const rateKey = `rate_${rate}`;
    const newTaxByRate = {
      [rateKey]: { rate, amount: tax }
    };
    setTaxByRate(newTaxByRate);

    // Set values based on tax type
    if (type === "gst") {
      // Split tax between CGST and SGST
      setCgst(tax / 2);
      setSgst(tax / 2);
    } else {
      // All tax goes to IGST
      setIgst(tax);
    }
  };

  const totalAmount = amount + taxAmount;

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">GST Calculator</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Calculate Tax</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="amount">Amount (before tax)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                value={amount || ""}
                onChange={handleAmountChange}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Tax Type</Label>
              <div className="flex space-x-2 mt-1">
                <Button
                  type="button"
                  size="sm"
                  variant={taxType === 'gst' ? 'default' : 'outline'}
                  onClick={() => handleTaxTypeChange('gst')}
                >
                  CGST + SGST (Intrastate)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={taxType === 'igst' ? 'default' : 'outline'}
                  onClick={() => handleTaxTypeChange('igst')}
                >
                  IGST (Interstate)
                </Button>
              </div>
            </div>

            <div>
              <Label>Tax Rate</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {GST_RATES.map((gst) => (
                  <Button 
                    key={gst.rate}
                    variant={taxRate === gst.rate ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleApplyTaxRate(gst.rate)}
                  >
                    <Percent className="h-3 w-3 mr-1" />
                    {gst.name}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label>Custom Tax Rate</Label>
              <div className="flex items-center mt-1">
                <Input
                  type="number"
                  placeholder="Custom rate"
                  min="0"
                  max="100"
                  step="0.01"
                  onChange={(e) => handleApplyTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-32 mr-2"
                />
                <span>%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tax Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm font-medium">Base Amount:</div>
                <div className="text-right">{formatCurrency(amount)}</div>
                
                <div className="text-sm font-medium">Tax Rate:</div>
                <div className="text-right">{taxRate}%</div>
                
                <div className="text-sm font-medium">Total Tax:</div>
                <div className="text-right">{formatCurrency(taxAmount)}</div>
                
                {taxType === "gst" && (
                  <>
                    <div className="text-sm font-medium">CGST ({taxRate/2}%):</div>
                    <div className="text-right">{formatCurrency(cgst)}</div>
                    
                    <div className="text-sm font-medium">SGST ({taxRate/2}%):</div>
                    <div className="text-right">{formatCurrency(sgst)}</div>
                  </>
                )}
                
                {taxType === "igst" && (
                  <>
                    <div className="text-sm font-medium">IGST ({taxRate}%):</div>
                    <div className="text-right">{formatCurrency(igst)}</div>
                  </>
                )}
                
                <div className="text-lg font-bold border-t pt-2 mt-2">Total Amount:</div>
                <div className="text-lg font-bold text-right border-t pt-2 mt-2">{formatCurrency(totalAmount)}</div>
              </div>
              
              <div className="mt-6">
                <h3 className="text-sm font-semibold mb-2">Notes:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• CGST and SGST apply for intrastate transactions (within the same state)</li>
                  <li>• IGST applies for interstate transactions (between different states)</li>
                  <li>• For export transactions, GST is typically zero-rated</li>
                  <li>• Different goods and services have different applicable GST rates</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}