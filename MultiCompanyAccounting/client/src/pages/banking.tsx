import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/hooks/use-company";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BankAccount, BankTransaction } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface TransactionResponse {
  transactions: BankTransaction[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

// Form schema for creating a bank account
const bankAccountSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  accountNumber: z.string().min(4, "Account number must be at least 4 characters"),
  bankName: z.string().min(2, "Bank name must be at least 2 characters"),
  routingNumber: z.string().optional(),
  currency: z.string().default("USD"),
  accountId: z.number({
    required_error: "Please select an account from the chart of accounts"
  }),
  isActive: z.boolean().default(true),
});

// Form schema for adding a transaction
const transactionSchema = z.object({
  date: z.string({
    required_error: "Please select a date",
  }),
  description: z.string().min(2, "Description must be at least 2 characters"),
  amount: z.string().min(1, "Amount is required"),
  type: z.enum(["debit", "credit"], {
    required_error: "Please select a transaction type",
  }),
  reference: z.string().optional(),
  status: z.enum(["reconciled", "pending", "unreconciled"]).default("unreconciled"),
});

export default function Banking() {
  const [activeTab, setActiveTab] = useState("accounts");
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [openAccountDialog, setOpenAccountDialog] = useState(false);
  const [openTransactionDialog, setOpenTransactionDialog] = useState(false);
  const { toast } = useToast();
  const { activeCompany } = useCompany();
  
  // Fetch bank accounts from the API
  const { data: bankAccounts = [], isLoading: isLoadingAccounts, refetch: refetchAccounts } = useQuery<BankAccount[]>({
    queryKey: ["/api/banking/accounts", activeCompany?.id],
    enabled: !!activeCompany,
  });
  
  // Fetch transactions for the selected account
  const { data: transactionsData, isLoading: isLoadingTransactions, refetch: refetchTransactions } = useQuery<TransactionResponse>({
    queryKey: ["/api/banking/accounts", selectedAccountId, "transactions"],
    enabled: !!selectedAccountId,
  });
  
  const transactions = transactionsData?.transactions || [];
  
  // Fetch accounts from chart of accounts for dropdown
  const { data: accounts = [] } = useQuery({
    queryKey: ["/api/accounts", activeCompany?.id],
    enabled: !!activeCompany && openAccountDialog,
  });
  
  // Filter only bank/cash accounts
  const bankAccountOptions = (accounts || []).filter((account: any) => 
    account.accountType?.balanceSheetSection === "assets" && 
    (account.name.toLowerCase().includes("bank") || 
     account.name.toLowerCase().includes("cash"))
  );
  
  // Form for creating a new bank account
  const bankAccountForm = useForm<z.infer<typeof bankAccountSchema>>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      name: "",
      accountNumber: "",
      bankName: "",
      routingNumber: "",
      currency: "USD",
      isActive: true
    }
  });
  
  // Form for adding a transaction
  const transactionForm = useForm<z.infer<typeof transactionSchema>>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      description: "",
      amount: "",
      type: "credit",
      reference: "",
      status: "unreconciled"
    }
  });
  
  // Create bank account mutation
  const createBankAccountMutation = useMutation({
    mutationFn: async (data: z.infer<typeof bankAccountSchema>) => {
      const response = await apiRequest("POST", "/api/banking/accounts", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Bank Account Created",
        description: "New bank account has been added successfully.",
        variant: "default",
      });
      setOpenAccountDialog(false);
      bankAccountForm.reset();
      refetchAccounts();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create bank account: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Create transaction mutation
  const createTransactionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof transactionSchema>) => {
      if (!selectedAccountId) return null;
      const response = await apiRequest("POST", `/api/banking/accounts/${selectedAccountId}/transactions`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Transaction Added",
        description: "New transaction has been recorded successfully.",
        variant: "default",
      });
      setOpenTransactionDialog(false);
      transactionForm.reset({
        date: new Date().toISOString().split('T')[0],
        description: "",
        amount: "",
        type: "credit",
        reference: "",
        status: "unreconciled"
      });
      refetchTransactions();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to add transaction: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Update transaction status mutation
  const updateTransactionStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest("PATCH", `/api/banking/transactions/${id}/status`, { status });
      return await response.json();
    },
    onSuccess: () => {
      refetchTransactions();
    }
  });
  
  const handleCreateBankAccount = (data: z.infer<typeof bankAccountSchema>) => {
    createBankAccountMutation.mutate(data);
  };
  
  const handleCreateTransaction = (data: z.infer<typeof transactionSchema>) => {
    createTransactionMutation.mutate(data);
  };
  
  const handleSync = () => {
    toast({
      title: "Bank Sync Started",
      description: "Synchronizing with your bank accounts...",
      variant: "default",
    });
  };
  
  const handleReconcile = (id: number) => {
    updateTransactionStatusMutation.mutate({ id, status: "reconciled" });
    
    toast({
      title: "Transaction Reconciled",
      description: `Transaction #${id} has been marked as reconciled.`,
      variant: "default",
    });
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Banking</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setOpenAccountDialog(true)}
          >
            Add Bank Account
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              if (bankAccounts.length === 0) {
                toast({
                  title: "No Bank Accounts",
                  description: "Please add a bank account first before adding transactions.",
                  variant: "destructive",
                });
                return;
              }
              setSelectedAccountId(bankAccounts[0].id);
              setOpenTransactionDialog(true);
            }}
            disabled={bankAccounts.length === 0}
          >
            Add Transaction
          </Button>
          <Button onClick={handleSync}>
            Sync with Bank
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full md:w-auto grid-cols-3 mb-4">
          <TabsTrigger value="accounts">Bank Accounts</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
        </TabsList>
        
        <TabsContent value="accounts">
          <div className="grid md:grid-cols-2 gap-6">
            {isLoadingAccounts ? (
              Array(2).fill(0).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-48 mb-2" />
                    <Skeleton className="h-4 w-32" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-36 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </CardContent>
                </Card>
              ))
            ) : bankAccounts.length === 0 ? (
              <div className="col-span-2 text-center py-10">
                <h3 className="text-lg font-medium mb-2">No Bank Accounts</h3>
                <p className="text-gray-500 mb-4">Add your first bank account to get started</p>
                <Button onClick={() => setOpenAccountDialog(true)}>Add Bank Account</Button>
              </div>
            ) : (
              bankAccounts.map((account) => (
                <Card key={account.id}>
                  <CardHeader>
                    <CardTitle>{account.name}</CardTitle>
                    <CardDescription>
                      {account.bankName} • Account Number: {account.accountNumber}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold mb-2">
                      {formatCurrency(parseFloat(account.balance))}
                    </div>
                    <div className="flex justify-between items-center">
                      <Badge variant={account.isActive ? "default" : "secondary"}>
                        {account.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedAccountId(account.id);
                            setActiveTab("transactions");
                          }}
                        >
                          View Transactions
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedAccountId(account.id);
                            setOpenTransactionDialog(true);
                          }}
                        >
                          Add Transaction
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="transactions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>View and manage your bank transactions</CardDescription>
              </div>
              
              {bankAccounts.length > 0 && (
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedAccountId?.toString() || ""}
                    onValueChange={(value) => setSelectedAccountId(parseInt(value))}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select Bank Account" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!selectedAccountId) {
                        toast({
                          title: "No Account Selected",
                          description: "Please select a bank account first.",
                          variant: "destructive",
                        });
                        return;
                      }
                      setOpenTransactionDialog(true);
                    }}
                    disabled={!selectedAccountId}
                  >
                    Add Transaction
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {!selectedAccountId ? (
                <div className="text-center py-10">
                  <h3 className="text-lg font-medium mb-2">No Account Selected</h3>
                  <p className="text-gray-500 mb-4">Select a bank account to view transactions</p>
                  {bankAccounts.length === 0 ? (
                    <Button onClick={() => setOpenAccountDialog(true)}>Add Bank Account</Button>
                  ) : null}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingTransactions ? (
                      Array(3).fill(0).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell className="text-right"><Skeleton className="h-9 w-20 ml-auto" /></TableCell>
                        </TableRow>
                      ))
                    ) : transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6">
                          <p className="text-gray-500">No transactions found for this account</p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-2"
                            onClick={() => setOpenTransactionDialog(true)}
                          >
                            Add Transaction
                          </Button>
                        </TableCell>
                      </TableRow>
                    ) : (
                      transactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>{formatDate(transaction.date.toString())}</TableCell>
                          <TableCell>{transaction.description}</TableCell>
                          <TableCell>{transaction.reference || "-"}</TableCell>
                          <TableCell className={transaction.type === "credit" ? "text-green-600" : "text-red-600"}>
                            {transaction.type === "credit" ? "+" : "-"}{formatCurrency(parseFloat(transaction.amount.toString()))}
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              transaction.status === "reconciled" ? "default" :
                              transaction.status === "pending" ? "secondary" : "outline"
                            }>
                              {transaction.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {transaction.status !== "reconciled" && (
                              <Button variant="outline" size="sm" onClick={() => handleReconcile(transaction.id)}>
                                Reconcile
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="reconciliation">
          <Card>
            <CardHeader>
              <CardTitle>Bank Reconciliation</CardTitle>
              <CardDescription>Match bank transactions with your accounting records</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-10">
                <h3 className="text-lg font-medium mb-2">Ready to Reconcile</h3>
                <p className="text-gray-500 mb-4">Start by selecting an account and statement period</p>
                <Button>Start Reconciliation</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Add Bank Account Dialog */}
      <Dialog open={openAccountDialog} onOpenChange={setOpenAccountDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Bank Account</DialogTitle>
            <DialogDescription>
              Connect a bank account to track transactions and reconcile with your accounting records.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...bankAccountForm}>
            <form onSubmit={bankAccountForm.handleSubmit(handleCreateBankAccount)} className="space-y-6">
              <FormField
                control={bankAccountForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Main Checking Account" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={bankAccountForm.control}
                  name="bankName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Chase Bank" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={bankAccountForm.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="USD">USD - US Dollar</SelectItem>
                          <SelectItem value="EUR">EUR - Euro</SelectItem>
                          <SelectItem value="GBP">GBP - British Pound</SelectItem>
                          <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={bankAccountForm.control}
                  name="accountNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Number</FormLabel>
                      <FormControl>
                        <Input placeholder="XXXX-XXXX-1234" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={bankAccountForm.control}
                  name="routingNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Routing Number (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="123456789" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={bankAccountForm.control}
                name="accountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Linked Account (Chart of Accounts)</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {bankAccountOptions.map((account) => (
                          <SelectItem key={account.id} value={account.id.toString()}>
                            {account.name} ({account.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setOpenAccountDialog(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createBankAccountMutation.isPending}
                >
                  {createBankAccountMutation.isPending ? "Creating..." : "Create Account"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Add Transaction Dialog */}
      <Dialog open={openTransactionDialog} onOpenChange={setOpenTransactionDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
            <DialogDescription>
              Record a new transaction for your bank account.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...transactionForm}>
            <form onSubmit={transactionForm.handleSubmit(handleCreateTransaction)} className="space-y-6">
              {bankAccounts.length > 1 && (
                <div className="mb-4">
                  <FormLabel>Bank Account</FormLabel>
                  <Select
                    value={selectedAccountId?.toString() || ""}
                    onValueChange={(value) => setSelectedAccountId(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Bank Account" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <FormField
                control={transactionForm.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={transactionForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transaction Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="credit">Credit (Deposit)</SelectItem>
                          <SelectItem value="debit">Debit (Withdrawal)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={transactionForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={transactionForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Vendor payment" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={transactionForm.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Invoice #123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={transactionForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="unreconciled">Unreconciled</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="reconciled">Reconciled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setOpenTransactionDialog(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createTransactionMutation.isPending || !selectedAccountId}
                >
                  {createTransactionMutation.isPending ? "Adding..." : "Add Transaction"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}