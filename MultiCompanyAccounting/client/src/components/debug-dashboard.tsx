import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

// This component helps diagnose dashboard data display issues
export function DebugDashboard() {
  const [visible, setVisible] = useState(false);
  const [balanceSheetData, setBalanceSheetData] = useState<any>(null);
  const [salesOrdersData, setSalesOrdersData] = useState<any>(null);
  const [invoicesData, setInvoicesData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Function to fetch all necessary dashboard data
  const fetchDashboardData = async () => {
    setIsLoading(true);
    
    try {
      // Fetch balance sheet data
      const balanceSheetRes = await fetch("/api/reports/balance-sheet/summary");
      const balanceSheet = balanceSheetRes.ok ? await balanceSheetRes.json() : { error: balanceSheetRes.statusText };
      setBalanceSheetData(balanceSheet);
      
      // Fetch sales orders
      const salesOrdersRes = await fetch("/api/sales-orders/summary");
      const salesOrders = salesOrdersRes.ok ? await salesOrdersRes.json() : { error: salesOrdersRes.statusText };
      setSalesOrdersData(salesOrders);
      
      // Fetch invoices
      const invoicesRes = await fetch("/api/invoices/summary");
      const invoices = invoicesRes.ok ? await invoicesRes.json() : { error: invoicesRes.statusText };
      setInvoicesData(invoices);
    } catch (error) {
      console.error("Error fetching debug data:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    // If the debug panel is visible, fetch data
    if (visible) {
      fetchDashboardData();
    }
  }, [visible]);
  
  // Toggle the debug panel visibility
  const toggleVisibility = () => {
    setVisible(prev => !prev);
    if (!visible) {
      fetchDashboardData();
    }
  };
  
  if (!visible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button 
          onClick={toggleVisibility}
          className="bg-gray-800 hover:bg-gray-700"
        >
          Debug Dashboard
        </Button>
      </div>
    );
  }
  
  return (
    <div className="fixed bottom-0 right-0 z-50 w-96 h-[80vh] bg-background border-l border-t shadow-xl flex flex-col">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="font-bold text-lg">Dashboard Debug</h2>
        <Button variant="ghost" onClick={toggleVisibility}>Close</Button>
      </div>
      
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <>
            {/* Balance Sheet Data */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Balance Sheet</CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-2">
                {balanceSheetData?.error ? (
                  <div className="text-red-500">Error: {balanceSheetData.error}</div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="font-medium">Assets:</span> {formatCurrency(balanceSheetData?.assets?.total || 0)}
                      </div>
                      <div>
                        <span className="font-medium">Liabilities:</span> {formatCurrency(balanceSheetData?.liabilities?.total || 0)}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="font-medium">Receivables:</span> {
                          formatCurrency(
                            balanceSheetData?.assets?.categories?.find(
                              (c: any) => c.name.toLowerCase().includes("receivable")
                            )?.accounts?.reduce((sum: number, account: any) => sum + parseFloat(account.balance || 0), 0) || 0
                          )
                        }
                      </div>
                      <div>
                        <span className="font-medium">Payables:</span> {
                          formatCurrency(
                            balanceSheetData?.liabilities?.categories?.find(
                              (c: any) => c.name.toLowerCase().includes("payable")
                            )?.accounts?.reduce((sum: number, account: any) => sum + parseFloat(account.balance || 0), 0) || 0
                          )
                        }
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="font-medium">IC Receivable:</span> {
                          formatCurrency(
                            balanceSheetData?.assets?.categories?.find(
                              (c: any) => c.name.toLowerCase().includes("intercompany")
                            )?.accounts?.reduce((sum: number, account: any) => sum + parseFloat(account.balance || 0), 0) || 0
                          )
                        }
                      </div>
                      <div>
                        <span className="font-medium">IC Payable:</span> {
                          formatCurrency(
                            balanceSheetData?.liabilities?.categories?.find(
                              (c: any) => c.name.toLowerCase().includes("intercompany")
                            )?.accounts?.reduce((sum: number, account: any) => sum + parseFloat(account.balance || 0), 0) || 0
                          )
                        }
                      </div>
                    </div>
                    
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-muted-foreground">Raw Data</summary>
                      <pre className="mt-2 p-2 bg-muted text-[10px] rounded overflow-auto max-h-40">
                        {JSON.stringify(balanceSheetData, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Sales Orders Data */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Sales Orders</CardTitle>
              </CardHeader>
              <CardContent className="text-xs">
                {salesOrdersData?.error ? (
                  <div className="text-red-500">Error: {salesOrdersData.error}</div>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">Count:</span> {salesOrdersData?.length || 0}
                    </div>
                    
                    {salesOrdersData && salesOrdersData.length > 0 && (
                      <div className="border rounded overflow-hidden">
                        <table className="w-full text-xs">
                          <thead className="bg-muted">
                            <tr>
                              <th className="p-1 text-left">Order #</th>
                              <th className="p-1 text-left">Date</th>
                              <th className="p-1 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {salesOrdersData.slice(0, 3).map((order: any) => (
                              <tr key={order.id} className="border-t">
                                <td className="p-1">{order.order_number || order.orderNumber}</td>
                                <td className="p-1">{
                                  new Date(order.order_date || order.orderDate).toLocaleDateString()
                                }</td>
                                <td className="p-1 text-right">{formatCurrency(parseFloat(order.total || 0))}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-muted-foreground">Raw Data</summary>
                      <pre className="mt-2 p-2 bg-muted text-[10px] rounded overflow-auto max-h-40">
                        {JSON.stringify(salesOrdersData, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Invoices Data */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Invoices</CardTitle>
              </CardHeader>
              <CardContent className="text-xs">
                {invoicesData?.error ? (
                  <div className="text-red-500">Error: {invoicesData.error}</div>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">Count:</span> {invoicesData?.length || 0}
                    </div>
                    
                    {invoicesData && invoicesData.length > 0 && (
                      <div className="border rounded overflow-hidden">
                        <table className="w-full text-xs">
                          <thead className="bg-muted">
                            <tr>
                              <th className="p-1 text-left">Invoice #</th>
                              <th className="p-1 text-left">Date</th>
                              <th className="p-1 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {invoicesData.slice(0, 3).map((invoice: any) => (
                              <tr key={invoice.id} className="border-t">
                                <td className="p-1">{invoice.invoice_number || invoice.invoiceNumber}</td>
                                <td className="p-1">{
                                  new Date(invoice.invoice_date || invoice.invoiceDate).toLocaleDateString()
                                }</td>
                                <td className="p-1 text-right">{formatCurrency(parseFloat(invoice.total || 0))}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-muted-foreground">Raw Data</summary>
                      <pre className="mt-2 p-2 bg-muted text-[10px] rounded overflow-auto max-h-40">
                        {JSON.stringify(invoicesData, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Button 
              onClick={fetchDashboardData} 
              className="w-full"
              disabled={isLoading}
            >
              Refresh Data
            </Button>
          </>
        )}
      </div>
    </div>
  );
}