import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useCompany } from "@/hooks/use-company";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { Check, ExternalLink, FilePen, FileText } from "lucide-react";

interface IntercompanyTransaction {
  id: number;
  sourceCompanyId: number;
  sourceCompany: string;
  targetCompanyId: number;
  targetCompany: string;
  description: string;
  amount: number;
  transactionDate: string;
  status: string;
  paymentStatus: string;
  sourceOrderId?: number;
  targetOrderId?: number;
  sourceInvoiceId?: number;
  targetBillId?: number;
  sourceReceiptId?: number;
  targetPaymentId?: number;
}

export default function IntercompanyTransactionTracker() {
  const { activeCompany } = useCompany();
  const [view, setView] = useState<"incoming" | "outgoing">("outgoing");

  // Fetch intercompany transactions
  const { data: transactions, isLoading } = useQuery<IntercompanyTransaction[]>({
    queryKey: ["/api/intercompany/transactions", activeCompany?.id, view],
    queryFn: async () => {
      if (!activeCompany?.id) return [];
      const response = await apiRequest(
        "GET",
        `/api/v2/intercompany/transactions?companyId=${activeCompany.id}&direction=${view}`
      );
      return await response.json();
    },
    enabled: !!activeCompany?.id,
  });

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return (
          <Badge variant="default" className="bg-green-500">
            Completed
          </Badge>
        );
      case "partial":
        return <Badge variant="secondary">Partial</Badge>;
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      case "draft":
        return <Badge variant="outline" className="bg-gray-100">Draft</Badge>;
      default:
        return <Badge variant="outline">{status || "Unknown"}</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "paid":
        return (
          <Badge variant="default" className="bg-green-500">
            Paid
          </Badge>
        );
      case "partial":
        return <Badge variant="secondary">Partial</Badge>;
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      default:
        return <Badge variant="outline">{status || "Not Paid"}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Function to show document IDs with status indicators
  const renderDocumentStatus = (transaction: IntercompanyTransaction) => {
    return (
      <div className="flex flex-col space-y-1">
        <div className="flex items-center text-sm">
          <FilePen className="h-3 w-3 mr-1" />
          Order: 
          {transaction.sourceOrderId ? (
            <span className="ml-1 text-primary">{`#${transaction.sourceOrderId}`}</span>
          ) : (
            <span className="ml-1 text-muted-foreground">Not created</span>
          )}
        </div>
        
        <div className="flex items-center text-sm">
          <FileText className="h-3 w-3 mr-1" />
          Invoice: 
          {transaction.sourceInvoiceId ? (
            <span className="ml-1 text-primary">{`#${transaction.sourceInvoiceId}`}</span>
          ) : (
            <span className="ml-1 text-muted-foreground">Not created</span>
          )}
        </div>
        
        <div className="flex items-center text-sm">
          <Check className="h-3 w-3 mr-1" />
          Payment: 
          {transaction.sourceReceiptId ? (
            <span className="ml-1 text-green-500">{`#${transaction.sourceReceiptId}`}</span>
          ) : (
            <span className="ml-1 text-muted-foreground">Not received</span>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Intercompany Transactions</CardTitle>
          <CardDescription>
            Track orders, invoices, and payments between companies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full mb-4" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Intercompany Transactions</CardTitle>
        <CardDescription>
          Track orders, invoices, and payments between companies
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={view} onValueChange={(v) => setView(v as "incoming" | "outgoing")}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="outgoing">Outgoing</TabsTrigger>
            <TabsTrigger value="incoming">Incoming</TabsTrigger>
          </TabsList>
          
          <TabsContent value="outgoing">
            {transactions && transactions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>To Company</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Documents</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        {formatDate(transaction.transactionDate)}
                      </TableCell>
                      <TableCell>{transaction.targetCompany}</TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell>
                        {formatCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(transaction.status)}
                      </TableCell>
                      <TableCell>
                        {getPaymentStatusBadge(transaction.paymentStatus)}
                      </TableCell>
                      <TableCell>
                        {renderDocumentStatus(transaction)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 border rounded-md bg-muted/20">
                <p className="text-muted-foreground">No outgoing transactions found</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="incoming">
            {transactions && transactions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>From Company</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Documents</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        {formatDate(transaction.transactionDate)}
                      </TableCell>
                      <TableCell>{transaction.sourceCompany}</TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell>
                        {formatCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(transaction.status)}
                      </TableCell>
                      <TableCell>
                        {getPaymentStatusBadge(transaction.paymentStatus)}
                      </TableCell>
                      <TableCell>
                        {renderDocumentStatus(transaction)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 border rounded-md bg-muted/20">
                <p className="text-muted-foreground">No incoming transactions found</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}