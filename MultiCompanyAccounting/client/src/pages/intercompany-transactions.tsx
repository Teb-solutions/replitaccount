import React, { useState } from "react";
import { useCompany } from "@/hooks/use-company";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useIntercompany } from "@/hooks/use-intercompany";
import Layout from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { z } from "zod";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ArrowRightLeft } from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Textarea } from "@/components/ui/textarea";

// Define schema for the form
const formSchema = z.object({
  sourceCompanyId: z.number({
    required_error: "Source company is required",
    invalid_type_error: "Source company must be a number"
  }),
  targetCompanyId: z.number({
    required_error: "Target company is required",
    invalid_type_error: "Target company must be a number"
  }).refine(val => val > 0, "Please select a target company"),
  description: z.string().min(3, "Description must be at least 3 characters"),
  amount: z.string()
    .min(1, "Amount is required")
    .refine(val => !isNaN(parseFloat(val)), "Invalid amount format")
    .refine(val => parseFloat(val) > 0, "Amount must be greater than 0"),
  transactionDate: z.date({
    required_error: "Transaction date is required",
    invalid_type_error: "Transaction date must be a valid date"
  }),
});

type IntercompanyTransaction = {
  id: number;
  sourceCompanyId?: number;
  targetCompanyId?: number;
  description: string;
  amount: string;
  transactionDate?: string;
  date?: string; // API returns date instead of transactionDate
  sourceJournalEntryId?: number | null;
  targetJournalEntryId?: number | null;
  status: string;
  sourceCompany?: { name: string };
  targetCompany?: { name: string };
  // For the new API format that uses fromCompany/toCompany instead of source/target
  fromCompany?: { 
    id: number;
    name: string;
    code: string;
  };
  toCompany?: {
    id: number;
    name: string;
    code: string;
  };
  transactionNumber?: string;
  // Order IDs
  sourceOrderId?: number;
  targetOrderId?: number;
  // Legacy fields (deprecated but still used in some places)
  salesOrderId?: number;
  purchaseOrderId?: number;
  // Invoice and bill IDs
  sourceInvoiceId?: number;
  targetBillId?: number;
  // Receipt and payment IDs
  sourceReceiptId?: number;
  targetPaymentId?: number;
  // Delivery and goods receipt IDs
  sourceDeliveryId?: number;
  targetGoodsReceiptId?: number;
  // Status flags
  hasInvoice?: boolean;
  hasPayment?: boolean;
  hasDelivery?: boolean;
  hasGoodsReceipt?: boolean;
  isPartialInvoice?: boolean;
  // Related documents collections
  invoices?: { id: number, status: string }[];
  bills?: { id: number, status: string }[];
  // New API includes these directly
  invoice?: {
    id: number;
    number: string;
    date: string;
    dueDate: string;
    totalAmount: number;
    balanceDue: number;
  };
  lines?: {
    id: number;
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }[];
  receipts?: {
    id: number;
    date: string;
    amount: number;
    reference: string;
    paymentMethod: string;
  }[];
};

type Company = {
  id: number;
  name: string;
  code: string;
};

export default function IntercompanyTransactions() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeCompany, companies } = useCompany();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<IntercompanyTransaction | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  type FormData = {
    sourceCompanyId: number;
    targetCompanyId: number;
    description: string;
    amount: string;
    transactionDate: Date;
  };

  // Form setup
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sourceCompanyId: activeCompany?.id || 0,
      targetCompanyId: 0,
      description: "",
      amount: "0.01",
      transactionDate: new Date(),
    },
  });

  // Use our custom hook for intercompany transactions
  const {
    transactions,
    isLoading,
    createTransaction,
    updateTransactionStatus,
    createMutation,
    getStatusColor
  } = useIntercompany();

  const onSubmit = (data: FormData) => {
    createTransaction(data);
    setIsCreateDialogOpen(false);
    form.reset();
  };

  const handleStatusChange = (id: number, status: string) => {
    updateTransactionStatus(id, status);
    setIsViewDialogOpen(false);
  };

  const handleViewTransaction = (transaction: IntercompanyTransaction) => {
    setSelectedTransaction(transaction);
    setIsViewDialogOpen(true);
  };

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Intercompany Transactions</h1>
          <div className="flex space-x-3">
            <Button 
              variant="outline"
              onClick={() => {
                if (!activeCompany) {
                  toast({
                    title: "No Company Selected",
                    description: "Please select a company first",
                    variant: "destructive",
                  });
                  return;
                }
                
                // Navigate to the intercompany order form
                window.location.href = "/intercompany-order-form";
              }}
              disabled={!activeCompany}
            >
              Create Intercompany Orders
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                if (!activeCompany) {
                  toast({
                    title: "No Company Selected",
                    description: "Please select a company first",
                    variant: "destructive",
                  });
                  return;
                }
                
                // Navigate to the intercompany invoice form
                window.location.href = "/intercompany-invoice-form";
              }}
              disabled={!activeCompany}
            >
              Create Intercompany Invoices
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                if (!activeCompany) {
                  toast({
                    title: "No Company Selected",
                    description: "Please select a company first",
                    variant: "destructive",
                  });
                  return;
                }
                
                // Navigate to the receipt eligible transactions page
                window.location.href = "/intercompany-receipt-eligible-transactions";
              }}
              disabled={!activeCompany}
            >
              Receipt Eligible Transactions
            </Button>
            <Button 
              onClick={() => {
                if (!activeCompany) {
                  toast({
                    title: "No Company Selected",
                    description: "Please select a company first",
                    variant: "destructive",
                  });
                  return;
                }
                
                form.reset({
                  sourceCompanyId: activeCompany.id,
                  targetCompanyId: 0,
                  description: "",
                  amount: "0.01",
                  transactionDate: new Date(),
                });
                
                setIsCreateDialogOpen(true);
              }}
              disabled={!activeCompany}
            >
              New Transaction
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Transaction List</CardTitle>
            <CardDescription>
              View and manage intercompany transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-4">Loading transactions...</div>
            ) : transactions?.length === 0 ? (
              <div className="text-center p-4 text-gray-500">
                No intercompany transactions found.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Invoice/Receipt</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions?.map((transaction: IntercompanyTransaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        {formatDate(new Date(transaction.transactionDate || transaction.date), { year: 'numeric', month: 'short', day: 'numeric' })}
                      </TableCell>
                      <TableCell>{transaction.sourceCompany?.name || transaction.fromCompany?.name}</TableCell>
                      <TableCell>{transaction.targetCompany?.name || transaction.toCompany?.name}</TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell>{formatCurrency(parseFloat(transaction.amount), 'USD')}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-xs">
                          {transaction.sourceInvoiceId ? (
                            <div className="flex items-center">
                              <span className="font-semibold text-green-700">Invoiced:</span> 
                              <span className="ml-1">{formatCurrency(parseFloat(transaction.invoiceAmount || transaction.amount), 'USD')}</span>
                            </div>
                          ) : (
                            <div className="text-gray-500">Not Invoiced</div>
                          )}
                          
                          {transaction.sourceReceiptId ? (
                            <div className="flex items-center">
                              <span className="font-semibold text-blue-700">Paid:</span> 
                              <span className="ml-1">{formatCurrency(parseFloat(transaction.receiptAmount || transaction.paidAmount || '0'), 'USD')}</span>
                            </div>
                          ) : transaction.sourceInvoiceId ? (
                            <div className="text-orange-500">Unpaid</div>
                          ) : null}
                          
                          {transaction.sourceInvoiceId && parseFloat(transaction.receiptAmount || transaction.paidAmount || '0') < parseFloat(transaction.invoiceAmount || transaction.amount) && (
                            <div className="flex items-center">
                              <span className="font-semibold text-orange-700">Remaining:</span> 
                              <span className="ml-1">
                                {formatCurrency(
                                  parseFloat(transaction.invoiceAmount || transaction.amount) - 
                                  parseFloat(transaction.receiptAmount || transaction.paidAmount || '0')
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge className={getStatusColor(transaction.status)}>
                            {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                          </Badge>
                          {transaction.isPartialInvoice && (
                            <Badge variant="outline" className="border-amber-500 text-amber-500">
                              Partial Invoice
                            </Badge>
                          )}
                          {/* Show Invoice Badge if invoice exists */}
                          {transaction.sourceInvoiceId && (
                            <Badge variant="outline" className="border-green-500 text-green-500">
                              Invoice #{transaction.sourceInvoiceId}
                            </Badge>
                          )}
                          {/* Show Bill Badge if bill exists */}
                          {transaction.targetBillId && (
                            <Badge variant="outline" className="border-blue-500 text-blue-500">
                              Bill #{transaction.targetBillId}
                            </Badge>
                          )}
                          {/* Show if payment exists */}
                          {transaction.hasPayment && (
                            <Badge variant="outline" className="border-purple-500 text-purple-500">
                              Payment Recorded
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleViewTransaction(transaction)}
                          >
                            View
                          </Button>
                          {/* Create Invoice button - show if status is confirmed or completed and no invoice exists */}
                          {(transaction.status === 'confirmed' || transaction.status === 'completed') && !transaction.hasInvoice && !transaction.sourceInvoiceId && transaction.sourceOrderId && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => {
                                if (transaction.sourceOrderId) {
                                  window.location.href = `/intercompany-invoice-form?soId=${transaction.sourceOrderId}`;
                                }
                              }}
                            >
                              Create Invoice
                            </Button>
                          )}
                          {/* View Invoice button - show when invoice exists */}
                          {transaction.sourceInvoiceId && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="bg-green-50 hover:bg-green-100 border-green-200"
                              onClick={() => {
                                window.location.href = `/invoices/${transaction.sourceInvoiceId}`;
                              }}
                            >
                              View Invoice
                            </Button>
                          )}
                          {/* View Bill button - show when bill exists */}
                          {transaction.targetBillId && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="bg-blue-50 hover:bg-blue-100 border-blue-200"
                              onClick={() => {
                                window.location.href = `/bills/${transaction.targetBillId}`;
                              }}
                            >
                              View Bill
                            </Button>
                          )}
                          
                          {/* Add Receipt button - when source invoice exists but no receipt/payment yet */}
                          {transaction.sourceInvoiceId && !transaction.hasPayment && !transaction.sourceReceiptId && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="bg-purple-50 hover:bg-purple-100 border-purple-200"
                              onClick={() => {
                                window.location.href = `/intercompany-receipt-form?invoiceId=${transaction.sourceInvoiceId}`;
                              }}
                            >
                              Create Receipt
                            </Button>
                          )}
                          
                          {/* Process Payment button */}
                          {transaction.sourceInvoiceId && !transaction.hasPayment && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="bg-green-50 hover:bg-green-100 border-green-200"
                              onClick={() => {
                                window.location.href = `/intercompany-payment-form?invoiceId=${transaction.sourceInvoiceId}`;
                              }}
                            >
                              Process Payment
                            </Button>
                          )}
                          {/* View Receipt button when receipt exists */}
                          {transaction.sourceReceiptId && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="bg-purple-50 hover:bg-purple-100 border-purple-200" 
                              onClick={() => {
                                window.location.href = `/receipts/${transaction.sourceReceiptId}`;
                              }}
                            >
                              View Receipt
                            </Button>
                          )}
                          {/* Delivery note buttons */}
                          {transaction.sourceInvoiceId && !transaction.hasDelivery && !transaction.sourceDeliveryId && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="bg-orange-50 hover:bg-orange-100 border-orange-200"
                              onClick={() => {
                                window.location.href = `/intercompany-delivery-note-form?invoiceId=${transaction.sourceInvoiceId}`;
                              }}
                            >
                              Create Delivery Note
                            </Button>
                          )}
                          
                          {/* View Delivery note button */}
                          {transaction.sourceDeliveryId && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="bg-orange-50 hover:bg-orange-100 border-orange-200"
                              onClick={() => {
                                window.location.href = `/deliveries/${transaction.sourceDeliveryId}`;
                              }}
                            >
                              View Delivery Note
                            </Button>
                          )}
                          
                          {/* Goods receipt buttons */}
                          {transaction.targetBillId && !transaction.hasGoodsReceipt && !transaction.targetGoodsReceiptId && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="bg-cyan-50 hover:bg-cyan-100 border-cyan-200"
                              onClick={() => {
                                window.location.href = `/intercompany-goods-receipt-form?billId=${transaction.targetBillId}`;
                              }}
                            >
                              Create Goods Receipt
                            </Button>
                          )}
                          
                          {/* View Goods receipt button */}
                          {transaction.targetGoodsReceiptId && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="bg-cyan-50 hover:bg-cyan-100 border-cyan-200" 
                              onClick={() => {
                                window.location.href = `/goods-receipts/${transaction.targetGoodsReceiptId}`;
                              }}
                            >
                              View Goods Receipt
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Create Transaction Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create Intercompany Transaction</DialogTitle>
              <DialogDescription>
                Create a new transaction between two companies
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="sourceCompanyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>From Company</FormLabel>
                        <FormControl>
                          <Select
                            disabled
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            defaultValue={activeCompany?.id?.toString()}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select company" />
                            </SelectTrigger>
                            <SelectContent>
                              {activeCompany && (
                                <SelectItem value={activeCompany.id.toString()}>
                                  {activeCompany.name}
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="targetCompanyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>To Company</FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            defaultValue={field.value?.toString()}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select company" />
                            </SelectTrigger>
                            <SelectContent>
                              {companies
                                ?.filter(company => company.id !== activeCompany?.id)
                                .map((company: Company) => (
                                  <SelectItem key={company.id} value={company.id.toString()}>
                                    {company.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter transaction description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0.00" 
                            step="0.01" 
                            min="0.01" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="transactionDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Transaction Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation?.isPending}
                  >
                    {createMutation?.isPending ? "Creating..." : "Create Transaction"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* View Transaction Dialog */}
        {selectedTransaction && (
          <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Transaction Details</DialogTitle>
                <DialogDescription>
                  View details of the intercompany transaction
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex items-center justify-center space-x-4 text-center pb-2">
                  <div className="font-semibold">{selectedTransaction.sourceCompany?.name || selectedTransaction.fromCompany?.name}</div>
                  <div>
                    <ArrowRightLeft className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="font-semibold">{selectedTransaction.targetCompany?.name || selectedTransaction.toCompany?.name}</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Date</p>
                    <p>{formatDate(new Date(selectedTransaction.transactionDate || selectedTransaction.date), { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Amount</p>
                    <p className="font-semibold">{formatCurrency(parseFloat(selectedTransaction.amount), 'USD')}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500">Description</p>
                  <p>{selectedTransaction.description}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <div className="flex flex-col gap-1">
                    <Badge className={getStatusColor(selectedTransaction.status)}>
                      {selectedTransaction.status.charAt(0).toUpperCase() + selectedTransaction.status.slice(1)}
                    </Badge>
                    {selectedTransaction.isPartialInvoice && (
                      <Badge variant="outline" className="border-amber-500 text-amber-500">
                        Partial Invoice
                      </Badge>
                    )}
                  </div>
                </div>

                {selectedTransaction.sourceJournalEntryId && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Source Journal Entry ID</p>
                    <p>{selectedTransaction.sourceJournalEntryId}</p>
                  </div>
                )}

                {selectedTransaction.targetJournalEntryId && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Target Journal Entry ID</p>
                    <p>{selectedTransaction.targetJournalEntryId}</p>
                  </div>
                )}

                {selectedTransaction.status === 'pending' && (
                  <div className="flex space-x-2 pt-4">
                    <Button 
                      variant="outline"
                      onClick={() => handleStatusChange(selectedTransaction.id, 'cancelled')}
                      disabled={false}
                    >
                      Cancel Transaction
                    </Button>
                    <Button 
                      onClick={() => handleStatusChange(selectedTransaction.id, 'completed')}
                      disabled={false}
                    >
                      Complete Transaction
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </Layout>
  );
}