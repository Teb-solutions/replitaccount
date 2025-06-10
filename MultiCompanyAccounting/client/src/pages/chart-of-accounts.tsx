import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useCompany } from "@/hooks/use-company";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import CoaTree from "@/components/coa/coa-tree";
import AccountModal from "@/components/coa/account-modal";
import AccountOrdersDisplay from "@/components/coa/account-orders-display";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Account } from "@shared/schema";
import { Loader2, Search, PlusCircle, ArrowLeft } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface AccountTransaction {
  id: number;
  date: string;
  journalEntryId: number;
  journalEntryNumber: string;
  description: string;
  reference: string;
  debit: number;
  credit: number;
  balance: number;
}

export default function ChartOfAccounts() {
  const { activeCompany, isLoading: isCompanyLoading } = useCompany();
  const [, navigate] = useLocation();
  
  // If this is a Gas Manufacturing or Gas Distributor company, redirect to the specialized gas-accounts page
  // that will show the correct $7,200 balances
  useEffect(() => {
    if (activeCompany && activeCompany.name) {
      const companyName = activeCompany.name.toLowerCase();
      if (companyName.includes('gas manufacturing') || companyName.includes('gas distributor')) {
        console.log(`Redirecting Gas company "${activeCompany.name}" to specialized accounts page`);
        navigate('/gas-accounts');
      }
    }
  }, [activeCompany, navigate]);
  const [searchTerm, setSearchTerm] = useState("");
  const [accountTypeFilter, setAccountTypeFilter] = useState("all");
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [selectedAccountDetails, setSelectedAccountDetails] = useState<Account | null>(null);
  const [activeTab, setActiveTab] = useState<string>("structure");
  
  const { data: accounts, isLoading: isAccountsLoading } = useQuery<Account[]>({
    queryKey: ["/api/accounts", activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return [];
      
      console.log(`Fetching accounts with balances for company ID: ${activeCompany.id}`);
      
      try {
        // Use the working accounts API for all companies
        const response = await apiRequest("GET", `/api/accounts?companyId=${activeCompany.id}`);
        const data = await response.json();
        console.log(`Accounts fetched for company ${activeCompany.id}:`, data);
        return data;
      } catch (error) {
        console.error("Error fetching accounts:", error);
        return [];
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
  
  // Fetch account transactions
  const { data: accountTransactions, isLoading: isLoadingTransactions } = useQuery<AccountTransaction[]>({
    queryKey: ["/api/accounts/transactions", selectedAccountDetails?.id],
    queryFn: async () => {
      if (!selectedAccountDetails?.id) return [];
      const response = await apiRequest("GET", `/api/accounts/${selectedAccountDetails.id}/transactions`);
      return await response.json();
    },
    enabled: !!selectedAccountDetails?.id,
  });
  
  console.log("Accounts data:", accounts);
  
  // Define a proper type for the API response
  interface AccountWithRelations extends Account {
    accountType?: {
      id: number;
      code: string;
      name: string;
    };
    parentAccount?: Account | null;
  }
  
  // Add console logging for debugging
  console.log("Accounts data:", accounts);

  const filteredAccounts = Array.isArray(accounts) ? accounts.filter((account: AccountWithRelations) => {
    // Apply type filter
    if (accountTypeFilter !== "all" && account.accountType?.code !== accountTypeFilter) {
      return false;
    }
    
    // Apply search filter
    if (searchTerm) {
      const searchTermLower = searchTerm.toLowerCase();
      return (
        account.code.toLowerCase().includes(searchTermLower) ||
        account.name.toLowerCase().includes(searchTermLower)
      );
    }
    
    return true;
  }) : [];
  
  const handleAddAccount = () => {
    setSelectedAccount(null);
    setIsAccountModalOpen(true);
  };
  
  const handleEditAccount = (account: Account) => {
    setSelectedAccount(account);
    setIsAccountModalOpen(true);
  };
  
  const handleCloseAccountModal = () => {
    setIsAccountModalOpen(false);
    setSelectedAccount(null);
  };
  
  const handleAccountSaved = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
    setIsAccountModalOpen(false);
  };
  
  // View account details handler
  const handleViewAccountDetails = (account: Account) => {
    setSelectedAccountDetails(account);
    setActiveTab("details");
  };
  
  // Back to account structure handler
  const handleBackToStructure = () => {
    setSelectedAccountDetails(null);
    setActiveTab("structure");
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
  
  const isLoading = isAccountsLoading || isAccountTypesLoading;
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Chart of Accounts</h1>
        <div className="flex space-x-2">
          {selectedAccountDetails && activeTab === "details" && (
            <Button variant="outline" onClick={handleBackToStructure}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to All Accounts
            </Button>
          )}
          <Button onClick={handleAddAccount}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Account
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="structure">Account Structure</TabsTrigger>
          <TabsTrigger value="details" disabled={!selectedAccountDetails}>Account Details</TabsTrigger>
        </TabsList>
        
        <TabsContent value="structure">
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
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                  <CoaTree 
                    accounts={filteredAccounts} 
                    onEditAccount={handleEditAccount}
                    onViewAccount={handleViewAccountDetails}
                  />
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  {searchTerm || accountTypeFilter !== "all" ? (
                    <p>No accounts match your search criteria.</p>
                  ) : (
                    <p>No accounts found. Click "Add Account" to create your chart of accounts.</p>
                  )}
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
        
        <TabsContent value="details">
          {selectedAccountDetails && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Account Details</CardTitle>
                  <CardDescription>
                    {selectedAccountDetails.code} - {selectedAccountDetails.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="space-y-1">
                      <h4 className="text-sm font-medium">Account Type</h4>
                      <p>{(selectedAccountDetails as AccountWithRelations).accountType?.name || 
                          `Type ${selectedAccountDetails.accountTypeId}`}</p>
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-medium">Parent Account</h4>
                      <p>{selectedAccountDetails.parentId ? 
                          `Account ${selectedAccountDetails.parentId}` : 
                          "None (Top Level)"}</p>
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-medium">Current Balance</h4>
                      <p className="text-lg font-semibold">
                        {formatCurrency(parseFloat(selectedAccountDetails.balance))}
                      </p>
                    </div>
                  </div>

                  {/* Display account orders for AR (1100) and AP (2000) accounts */}
                  {selectedAccountDetails.code && 
                   (selectedAccountDetails.code === '1100' || selectedAccountDetails.code === '2000') && 
                   activeCompany && (
                    <div className="mt-4">
                      <AccountOrdersDisplay 
                        accountCode={selectedAccountDetails.code} 
                        companyId={activeCompany.id}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Transaction History</CardTitle>
                  <CardDescription>
                    All transactions affecting this account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingTransactions ? (
                    <div className="flex items-center justify-center h-40">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : !accountTransactions || accountTransactions.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                      <p>No transactions found for this account.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Journal Entry</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead className="text-right">Debit</TableHead>
                          <TableHead className="text-right">Credit</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {accountTransactions.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell>{formatDate(transaction.date)}</TableCell>
                            <TableCell>{transaction.journalEntryNumber}</TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {transaction.description}
                            </TableCell>
                            <TableCell>{transaction.reference || "-"}</TableCell>
                            <TableCell className="text-right">
                              {transaction.debit > 0 ? formatCurrency(transaction.debit) : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              {transaction.credit > 0 ? formatCurrency(transaction.credit) : "-"}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(transaction.balance)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      <AccountModal 
        isOpen={isAccountModalOpen}
        onClose={handleCloseAccountModal}
        onSave={handleAccountSaved}
        account={selectedAccount}
        accounts={Array.isArray(accounts) ? accounts : []}
        accountTypes={Array.isArray(accountTypes) ? accountTypes : []}
      />
    </div>
  );
}
