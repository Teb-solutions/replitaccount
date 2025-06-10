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
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Loader2, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { useCompany } from "@/hooks/use-company";
import { apiRequest } from "@/lib/queryClient";

export default function CompanyBalances() {
  const { activeCompany } = useCompany();
  
  // Query for balance sheet summary
  const { data: balanceSheet, isLoading } = useQuery({
    queryKey: ["/api/reports/balance-sheet/summary", activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return null;
      const response = await apiRequest("GET", `/api/reports/balance-sheet/summary?companyId=${activeCompany.id}`);
      if (!response.ok) {
        console.log("Failed to fetch balance sheet:", response.status);
        return null;
      }
      return await response.json();
    },
    enabled: !!activeCompany?.id,
    retry: 1
  });
  
  console.log("Balance sheet data:", balanceSheet);
  
  if (isLoading || !balanceSheet) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Company Balances</CardTitle>
          <CardDescription>Key financial indicators</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Get values directly from the new summary endpoint format
  const totalAssets = balanceSheet.assets || 0;
  const totalLiabilities = balanceSheet.liabilities || 0;
  const equity = balanceSheet.equity || 0;
  const cashBalance = balanceSheet.cash || 0;
  const accountsReceivable = balanceSheet.receivables?.amount || 0;
  const accountsPayable = balanceSheet.payables?.amount || 0;
  
  // Get intercompany data from the balance sheet if available
  // If not present in the summary, fetch from specific account balances
  const intercompanyReceivable = balanceSheet.intercompanyReceivables || balanceSheet.receivables?.intercompany || 0;
  const intercompanyPayable = balanceSheet.intercompanyPayables || balanceSheet.payables?.intercompany || 0;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Company Balances</CardTitle>
        <CardDescription>
          Current financial position for {activeCompany?.name}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="bg-muted/30 p-4 rounded-lg grid grid-cols-3 gap-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Cash & Bank</h4>
              <p className="text-2xl font-bold">{formatCurrency(cashBalance)}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Receivables</h4>
              <p className="text-2xl font-bold">{formatCurrency(accountsReceivable)}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Payables</h4>
              <p className="text-2xl font-bold">{formatCurrency(accountsPayable)}</p>
            </div>
          </div>
          
          <div className="bg-muted/30 p-4 rounded-lg grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <h4 className="text-sm font-medium text-muted-foreground">Assets</h4>
              <div className="flex justify-between mt-2">
                <div>
                  <p className="text-sm text-muted-foreground">Total Assets</p>
                  <p className="text-xl font-semibold">{formatCurrency(totalAssets)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Intercompany Receivable</p>
                  <p className="text-xl font-semibold">{formatCurrency(intercompanyReceivable)}</p>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Net Worth</h4>
              <p className="text-xl font-semibold mt-2">{formatCurrency(equity)}</p>
            </div>
          </div>
          
          <div className="bg-muted/30 p-4 rounded-lg grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <h4 className="text-sm font-medium text-muted-foreground">Liabilities</h4>
              <div className="flex justify-between mt-2">
                <div>
                  <p className="text-sm text-muted-foreground">Total Liabilities</p>
                  <p className="text-xl font-semibold">{formatCurrency(totalLiabilities)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Intercompany Payable</p>
                  <p className="text-xl font-semibold">{formatCurrency(intercompanyPayable)}</p>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Intercompany Net</h4>
              <p className={`text-xl font-semibold mt-2 ${intercompanyReceivable - intercompanyPayable >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(intercompanyReceivable - intercompanyPayable)}
              </p>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Link href="/financial-reports">
              <Button variant="outline" size="sm">
                View Financial Reports
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}