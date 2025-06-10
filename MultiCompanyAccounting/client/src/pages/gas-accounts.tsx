import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCompany } from "@/hooks/use-company";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { Account } from "@shared/schema";
import { Loader2, Search, PlusCircle, ArrowLeft } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useLocation } from "wouter";

// Define a custom type for our gas accounts that includes the accountType property
interface GasAccount extends Omit<Account, 'accountType'> {
  accountType?: { 
    id: number; 
    code: string; 
    name: string; 
  }
}

// Helper function to get account type name from ID
function getAccountTypeName(accountTypeId: number): string {
  switch(accountTypeId) {
    case 1: return "Asset";
    case 2: return "Liability";
    case 3: return "Equity";
    case 4: return "Revenue";
    case 5: return "Expense";
    default: return `Type ${accountTypeId}`;
  }
}

// Helper function to get account type code from ID
function getAccountTypeCode(accountTypeId: number): string {
  switch(accountTypeId) {
    case 1: return "ASSET";
    case 2: return "LIABILITY";
    case 3: return "EQUITY";
    case 4: return "REVENUE";
    case 5: return "EXPENSE";
    default: return "";
  }
}

export default function GasAccounts() {
  const [, navigate] = useLocation();
  const { activeCompany, isLoading: isCompanyLoading } = useCompany();
  const [searchTerm, setSearchTerm] = useState("");
  const [accountTypeFilter, setAccountTypeFilter] = useState("all");
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [activeTab, setActiveTab] = useState<string>("structure");
  
  const { data: accounts, isLoading: isAccountsLoading } = useQuery<GasAccount[]>({
    queryKey: ["/api/accounts", activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return [];
      
      console.log(`Fetching accounts for company ID: ${activeCompany.id}`);
      
      try {
        // Use the working generic accounts API
        const response = await apiRequest("GET", `/api/accounts?companyId=${activeCompany.id}`);
        const data = await response.json();
        console.log(`Accounts fetched for company ${activeCompany.id}:`, data);
        return data;
      } catch (error) {
        console.error("Error fetching accounts:", error);
        throw error;
      }
    },
    enabled: !!activeCompany,
  });
  
  const { data: accountTypes, isLoading: isAccountTypesLoading } = useQuery<Array<{ id: number; code: string; name: string; }>>({
    queryKey: ["/api/account-types"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/account-types");
      const data = await response.json();
      console.log("Account types fetched:", data);
      return data;
    },
    enabled: !!activeCompany,
  });

  // If not a gas company, redirect to regular chart of accounts
  useEffect(() => {
    if (activeCompany && activeCompany.id !== 7 && activeCompany.id !== 8) {
      navigate("/chart-of-accounts");
    }
  }, [activeCompany, navigate]);

  const filteredAccounts = accounts?.filter(account => {
    // Filter by search term
    const matchesSearch = searchTerm === "" || 
      account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.code.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by account type
    // The accountType is nested in our API response, as an object with id, code, name
    const accountTypeCode = account.accountType && 'code' in account.accountType 
      ? account.accountType.code 
      : getAccountTypeCode(account.accountTypeId);
    
    const matchesType = accountTypeFilter === "all" || accountTypeCode === accountTypeFilter;
    
    return matchesSearch && matchesType;
  });

  const handleBackToDashboard = () => {
    navigate("/");
  };

  if (isCompanyLoading || !activeCompany) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-gray-500">Loading company data...</p>
        </div>
      </div>
    );
  }

  // Only Gas Manufacturing (ID: 7) and Gas Distributor (ID: 8) companies can access this
  if (activeCompany.id !== 7 && activeCompany.id !== 8) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="mt-2 text-gray-500">Redirecting to regular chart of accounts...</p>
        </div>
      </div>
    );
  }

  const isLoading = isAccountsLoading || isAccountTypesLoading;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Chart of Accounts
          <Badge variant="outline" className="ml-2 text-sm">Gas Company</Badge>
        </h1>
        <Button variant="outline" onClick={handleBackToDashboard}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      <Card className="shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search accounts..."
              className="pl-9 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={accountTypeFilter} onValueChange={setAccountTypeFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Account Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Account Types</SelectItem>
              <SelectItem value="ASSET">Assets</SelectItem>
              <SelectItem value="LIABILITY">Liabilities</SelectItem>
              <SelectItem value="EQUITY">Equity</SelectItem>
              <SelectItem value="REVENUE">Revenue</SelectItem>
              <SelectItem value="EXPENSE">Expenses</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="p-6 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredAccounts && filteredAccounts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Code</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">{account.code}</TableCell>
                    <TableCell>{account.name}</TableCell>
                    <TableCell>
                      {account.accountType?.name || 
                        getAccountTypeName(account.accountTypeId)}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${
                        parseFloat(account.balance) !== 0 ? 
                        parseFloat(account.balance) > 0 ? 
                          'text-green-600' : 'text-red-600'
                        : 'text-gray-500'}`}>
                      {formatCurrency(parseFloat(account.balance))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-gray-500">
              {searchTerm || accountTypeFilter !== "all" ? (
                <p>No accounts match your search criteria.</p>
              ) : (
                <p>No accounts found.</p>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}