import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useCompany } from "@/hooks/use-company";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";

// Helper function to safely render account rows with null checking
const renderAccountRows = (category: any) => {
  if (!category || !category.accounts || !Array.isArray(category.accounts) || category.accounts.length === 0) {
    return (
      <TableRow className="text-sm">
        <TableCell colSpan={3} className="pl-8 text-muted-foreground">No accounts in this category</TableCell>
      </TableRow>
    );
  }
  
  return category.accounts.map((account: any) => (
    <TableRow key={account.id} className="text-sm">
      <TableCell className="pl-8">{account.code}</TableCell>
      <TableCell>{account.name}</TableCell>
      <TableCell className="text-right">{formatCurrency(account.balance)}</TableCell>
    </TableRow>
  ));
};

interface BalanceSheetItem {
  type: string;
  categoryName: string;
  accounts: {
    id: number;
    code: string;
    name: string;
    balance: number;
  }[];
  total: number;
}

interface BalanceSheetData {
  assets: BalanceSheetItem[];
  liabilities: BalanceSheetItem[];
  equity: BalanceSheetItem[];
  revenue: BalanceSheetItem[];
  expenses: BalanceSheetItem[];
  netIncome: number;
  totals: {
    assets: number;
    liabilities: number;
    equity: number;
    equityWithNetIncome: number;
    liabilitiesAndEquity: number;
  };
  balanced: boolean;
  asOfDate: string;
}

interface IncomeStatementItem {
  categoryName: string;
  accounts: {
    id: number;
    code: string;
    name: string;
    balance: number;
  }[];
  total: number;
}

interface IncomeStatementData {
  revenue: IncomeStatementItem[];
  expenses: IncomeStatementItem[];
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  startDate: string;
  endDate: string;
}

export default function FinancialReports() {
  const [activeTab, setActiveTab] = useState("balanceSheet");
  const { activeCompany } = useCompany();
  
  // Default date range for income statement (current month)
  const today = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(today), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(today), "yyyy-MM-dd"));
  
  // Balance Sheet data query
  const { 
    data: balanceSheetData, 
    isLoading: isLoadingBalanceSheet,
    refetch: refetchBalanceSheet
  } = useQuery<BalanceSheetData>({
    queryKey: ["/api/reports/balance-sheet", activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return null;
      const res = await apiRequest("GET", `/api/reports/balance-sheet?companyId=${activeCompany.id}`);
      return await res.json();
    },
    enabled: !!activeCompany
  });
  
  // Income Statement data query
  const { 
    data: incomeStatementData, 
    isLoading: isLoadingIncomeStatement,
    refetch: refetchIncomeStatement
  } = useQuery<IncomeStatementData>({
    queryKey: ["/api/reports/income-statement", activeCompany?.id, startDate, endDate],
    queryFn: async () => {
      if (!activeCompany?.id) return null;
      const res = await apiRequest(
        "GET", 
        `/api/reports/income-statement?companyId=${activeCompany.id}&startDate=${startDate}&endDate=${endDate}`
      );
      return await res.json();
    },
    enabled: !!activeCompany
  });
  
  const handlePeriodChange = (period: string) => {
    const today = new Date();
    let newStartDate: Date;
    let newEndDate: Date = endOfMonth(today);
    
    switch (period) {
      case "thisMonth":
        newStartDate = startOfMonth(today);
        break;
      case "lastMonth":
        newStartDate = startOfMonth(subMonths(today, 1));
        newEndDate = endOfMonth(subMonths(today, 1));
        break;
      case "lastThreeMonths":
        newStartDate = startOfMonth(subMonths(today, 3));
        break;
      case "yearToDate":
        newStartDate = new Date(today.getFullYear(), 0, 1); // January 1st of current year
        break;
      default:
        newStartDate = startOfMonth(today);
    }
    
    setStartDate(format(newStartDate, "yyyy-MM-dd"));
    setEndDate(format(newEndDate, "yyyy-MM-dd"));
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  const printReport = () => {
    window.print();
  };
  
  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Financial Reports</h1>
        <Button onClick={printReport}>
          <i className="ri-printer-line mr-2"></i>
          Print Report
        </Button>
      </div>
      
      <Tabs defaultValue="balanceSheet" value={activeTab} onValueChange={setActiveTab} className="print:pb-8">
        <TabsList className="grid max-w-[400px] grid-cols-2 mb-4 print:hidden">
          <TabsTrigger value="balanceSheet">Balance Sheet</TabsTrigger>
          <TabsTrigger value="incomeStatement">Income Statement</TabsTrigger>
        </TabsList>
        
        <TabsContent value="balanceSheet">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Balance Sheet</CardTitle>
                <CardDescription>
                  {balanceSheetData ? 
                    `As of ${formatDate(balanceSheetData.asOfDate)}` : 
                    "Financial position at a specific point in time"
                  }
                </CardDescription>
              </div>
              <div className="print:hidden">
                <Button 
                  variant="outline" 
                  onClick={() => refetchBalanceSheet()}
                  disabled={isLoadingBalanceSheet}
                >
                  <i className="ri-refresh-line mr-2"></i>
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingBalanceSheet ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-40 mb-4" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-8 w-40 my-4" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                </div>
              ) : balanceSheetData ? (
                <div className="space-y-6">
                  {/* Assets Section */}
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Assets</h3>
                    <Table>
                      <TableBody>
                        {balanceSheetData.assets && balanceSheetData.assets.length > 0 ? (
                          balanceSheetData.assets.map((category, index) => (
                            <React.Fragment key={`asset-${index}`}>
                              <TableRow className="hover:bg-muted/50 font-medium">
                                <TableCell colSpan={2}>{category.categoryName}</TableCell>
                                <TableCell className="text-right"></TableCell>
                              </TableRow>
                              {renderAccountRows(category)}
                              <TableRow>
                                <TableCell></TableCell>
                                <TableCell className="font-medium">Total {category.categoryName}</TableCell>
                                <TableCell className="text-right font-medium">{formatCurrency(category.total)}</TableCell>
                              </TableRow>
                            </React.Fragment>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground">No asset categories found</TableCell>
                          </TableRow>
                        )}
                        <TableRow className="bg-muted/50">
                          <TableCell></TableCell>
                          <TableCell className="font-bold">Total Assets</TableCell>
                          <TableCell className="text-right font-bold">{formatCurrency(balanceSheetData.totals?.assets || 0)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                  
                  {/* Liabilities Section */}
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Liabilities</h3>
                    <Table>
                      <TableBody>
                        {balanceSheetData.liabilities && balanceSheetData.liabilities.length > 0 ? (
                          balanceSheetData.liabilities.map((category, index) => (
                            <React.Fragment key={`liability-${index}`}>
                              <TableRow className="hover:bg-muted/50 font-medium">
                                <TableCell colSpan={2}>{category.categoryName}</TableCell>
                                <TableCell className="text-right"></TableCell>
                              </TableRow>
                              {renderAccountRows(category)}
                              <TableRow>
                                <TableCell></TableCell>
                                <TableCell className="font-medium">Total {category.categoryName}</TableCell>
                                <TableCell className="text-right font-medium">{formatCurrency(category.total)}</TableCell>
                              </TableRow>
                            </React.Fragment>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground">No liability categories found</TableCell>
                          </TableRow>
                        )}
                        <TableRow className="bg-muted/50">
                          <TableCell></TableCell>
                          <TableCell className="font-bold">Total Liabilities</TableCell>
                          <TableCell className="text-right font-bold">{formatCurrency(balanceSheetData.totals?.liabilities || 0)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                  
                  {/* Equity Section */}
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Equity</h3>
                    <Table>
                      <TableBody>
                        {balanceSheetData.equity && balanceSheetData.equity.length > 0 ? (
                          balanceSheetData.equity.map((category, index) => (
                            <React.Fragment key={`equity-${index}`}>
                              <TableRow className="hover:bg-muted/50 font-medium">
                                <TableCell colSpan={2}>{category.categoryName}</TableCell>
                                <TableCell className="text-right"></TableCell>
                              </TableRow>
                              {renderAccountRows(category)}
                              <TableRow>
                                <TableCell></TableCell>
                                <TableCell className="font-medium">Total {category.categoryName}</TableCell>
                                <TableCell className="text-right font-medium">{formatCurrency(category.total)}</TableCell>
                              </TableRow>
                            </React.Fragment>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground">No equity categories found</TableCell>
                          </TableRow>
                        )}
                        
                        {/* Net Income */}
                        <TableRow className="bg-muted/30">
                          <TableCell></TableCell>
                          <TableCell>Net Income</TableCell>
                          <TableCell className="text-right">{formatCurrency(balanceSheetData.netIncome)}</TableCell>
                        </TableRow>
                        
                        <TableRow className="bg-muted/50">
                          <TableCell></TableCell>
                          <TableCell className="font-bold">Total Equity</TableCell>
                          <TableCell className="text-right font-bold">{formatCurrency(balanceSheetData.totals?.equityWithNetIncome || 0)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                  
                  {/* Total Liabilities and Equity */}
                  <div>
                    <Table>
                      <TableBody>
                        <TableRow className="bg-muted/70">
                          <TableCell></TableCell>
                          <TableCell className="font-bold text-lg">Total Liabilities & Equity</TableCell>
                          <TableCell className="text-right font-bold text-lg">
                            {formatCurrency(balanceSheetData.totals?.liabilitiesAndEquity || 0)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                  
                  {/* Balance Status */}
                  <div className="mt-4 text-right">
                    {balanceSheetData.balanced ? (
                      <span className="text-green-600 font-medium">Balanced ✓</span>
                    ) : (
                      <span className="text-red-600 font-medium">
                        Not Balanced: Difference of {formatCurrency(
                          (balanceSheetData.totals?.assets || 0) - 
                          (balanceSheetData.totals?.liabilitiesAndEquity || 0)
                        )}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">No balance sheet data available.</p>
                  <p className="text-sm text-muted-foreground mt-2">Try refreshing or creating journal entries.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="incomeStatement">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Income Statement</CardTitle>
                <CardDescription>
                  {incomeStatementData ? 
                    `${formatDate(incomeStatementData.startDate)} to ${formatDate(incomeStatementData.endDate)}` :
                    "Revenue and expenses over a period of time"
                  }
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2 print:hidden">
                <Select 
                  defaultValue="thisMonth" 
                  onValueChange={handlePeriodChange}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="thisMonth">This Month</SelectItem>
                    <SelectItem value="lastMonth">Last Month</SelectItem>
                    <SelectItem value="lastThreeMonths">Last 3 Months</SelectItem>
                    <SelectItem value="yearToDate">Year to Date</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  onClick={() => refetchIncomeStatement()}
                  disabled={isLoadingIncomeStatement}
                >
                  <i className="ri-refresh-line mr-2"></i>
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingIncomeStatement ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-40 mb-4" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-8 w-40 my-4" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                </div>
              ) : incomeStatementData ? (
                <div className="space-y-6">
                  {/* Revenue Section */}
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Revenue</h3>
                    <Table>
                      <TableBody>
                        {incomeStatementData.revenue && incomeStatementData.revenue.length > 0 ? (
                          incomeStatementData.revenue.map((category, index) => (
                            <>
                              <TableRow key={`revenue-heading-${index}`} className="hover:bg-muted/50 font-medium">
                                <TableCell colSpan={2}>{category.categoryName}</TableCell>
                                <TableCell className="text-right"></TableCell>
                              </TableRow>
                              {renderAccountRows(category)}
                              <TableRow key={`revenue-total-${index}`}>
                                <TableCell></TableCell>
                                <TableCell className="font-medium">Total {category.categoryName}</TableCell>
                                <TableCell className="text-right font-medium">{formatCurrency(category.total)}</TableCell>
                              </TableRow>
                            </>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground">No revenue categories found</TableCell>
                          </TableRow>
                        )}
                        <TableRow className="bg-muted/50">
                          <TableCell></TableCell>
                          <TableCell className="font-bold">Total Revenue</TableCell>
                          <TableCell className="text-right font-bold">{formatCurrency(incomeStatementData.totalRevenue)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                  
                  {/* Expenses Section */}
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Expenses</h3>
                    <Table>
                      <TableBody>
                        {incomeStatementData.expenses && incomeStatementData.expenses.length > 0 ? (
                          incomeStatementData.expenses.map((category, index) => (
                            <>
                              <TableRow key={`expense-heading-${index}`} className="hover:bg-muted/50 font-medium">
                                <TableCell colSpan={2}>{category.categoryName}</TableCell>
                                <TableCell className="text-right"></TableCell>
                              </TableRow>
                              {renderAccountRows(category)}
                              <TableRow key={`expense-total-${index}`}>
                                <TableCell></TableCell>
                                <TableCell className="font-medium">Total {category.categoryName}</TableCell>
                                <TableCell className="text-right font-medium">{formatCurrency(category.total)}</TableCell>
                              </TableRow>
                            </>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground">No expense categories found</TableCell>
                          </TableRow>
                        )}
                        <TableRow className="bg-muted/50">
                          <TableCell></TableCell>
                          <TableCell className="font-bold">Total Expenses</TableCell>
                          <TableCell className="text-right font-bold">{formatCurrency(incomeStatementData.totalExpenses)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                  
                  {/* Net Income */}
                  <div>
                    <Table>
                      <TableBody>
                        <TableRow className="bg-muted/70">
                          <TableCell></TableCell>
                          <TableCell className="font-bold text-lg">Net Income</TableCell>
                          <TableCell className="text-right font-bold text-lg">
                            {formatCurrency(incomeStatementData.netIncome)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">No income statement data available for the selected period.</p>
                  <p className="text-sm text-muted-foreground mt-2">Try selecting a different period or creating journal entries.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}