import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createIntercompanyInvoice } from "@/lib/intercompany-connector";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { Link } from "wouter";

export default function InvoiceDebug() {
  const { toast } = useToast();
  const [result, setResult] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // Test invoice with minimal data
  const mockTestInvoice = {
    sourceCompanyId: 5, // Replace with real company ID
    targetCompanyId: 4, // Replace with real company ID
    salesOrderId: 6,   // Replace with real order ID
    purchaseOrderId: 7, // Replace with real order ID
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    description: "Debug test invoice",
    items: [
      {
        productId: 1, // Replace with a real product ID
        quantity: 5,
        unitPrice: 100,
        description: "Test product",
        calculatedAmount: 500,
        soItemId: 10 // Replace with a real sales order item ID
      }
    ],
    createPurchaseInvoice: true,
    invoiceType: 'full' as const
  };
  
  const createTestInvoice = async () => {
    setIsCreating(true);
    try {
      console.log("Sending test invoice data:", JSON.stringify(mockTestInvoice, null, 2));
      
      const response = await createIntercompanyInvoice(mockTestInvoice);
      console.log("Invoice creation response:", response);
      
      setResult(response);
      
      if (response.success) {
        toast({
          title: "Success",
          description: `Invoice created successfully!`,
        });
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to create invoice",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating test invoice:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };
  
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Invoice Creation Debug</h1>
      
      <div className="mb-4">
        <Link href="/intercompany">
          <Button variant="outline">← Back to Intercompany</Button>
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Test Invoice Data</CardTitle>
            <CardDescription>
              This will attempt to create a test invoice with the data below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-md text-xs overflow-auto max-h-96">
              {JSON.stringify(mockTestInvoice, null, 2)}
            </pre>
            
            <Button 
              onClick={createTestInvoice} 
              className="mt-4 w-full"
              disabled={isCreating}
            >
              {isCreating ? "Creating..." : "Create Test Invoice"}
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>API Response</CardTitle>
            <CardDescription>
              The response from the invoice creation API
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result ? (
              <pre className="bg-muted p-4 rounded-md text-xs overflow-auto max-h-96">
                {JSON.stringify(result, null, 2)}
              </pre>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No response yet. Create a test invoice to see results.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}