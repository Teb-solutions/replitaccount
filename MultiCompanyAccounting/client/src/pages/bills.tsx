import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Plus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useCompany } from "@/hooks/use-company";

interface Bill {
  id: number;
  billNumber: string;
  vendor: string | { id: number; name: string };
  date: string;
  dueDate: string;
  total: number;
  balanceDue: number;
  status: "draft" | "open" | "paid" | "cancelled" | "overdue" | "partial";
  isIntercompany?: boolean;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export default function Bills() {
  const [activeTab, setActiveTab] = useState("all");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { activeCompany } = useCompany();

  // Fetch bills with the active company ID
  const { data: bills, isLoading } = useQuery<Bill[]>({
    queryKey: ["/api/bills", activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) {
        return [];
      }
      
      // Check if Gas Distributor Company (ID: 8)
      if (activeCompany.id === 8) {
        // Use Gas Distributor-specific API
        const response = await apiRequest("GET", `/api/gas-company-bills?companyId=${activeCompany.id}`);
        const data = await response.json();
        console.log("Gas company bill data received:", data);
        return data;
      } else {
        // Use regular bills API
        const response = await apiRequest("GET", `/api/bills?companyId=${activeCompany.id}`);
        const data = await response.json();
        return data;
      }
    },
    enabled: !!activeCompany,
  });

  // Filter bills based on the active tab
  const filteredBills = (bills || []).filter((bill) => {
    if (activeTab === "all") return true;
    if (activeTab === "draft" && bill.status === "draft") return true;
    if (activeTab === "open" && bill.status === "open") return true;
    if (activeTab === "paid" && bill.status === "paid") return true;
    if (activeTab === "overdue" && bill.status === "overdue") return true;
    if (activeTab === "intercompany" && bill.isIntercompany) return true;
    return false;
  });

  // Get the appropriate badge variant for bill status
  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status.toLowerCase()) {
      case "draft": return "secondary";
      case "open": return "outline";
      case "paid": return "default";
      case "cancelled": return "destructive";
      case "overdue": return "destructive";
      case "partial": return "secondary"; // Changed from "warning" which is not in the allowed types
      default: return "secondary";
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Bills</h1>
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
            // Navigate to bill form page (to be created later)
            navigate("/bill-form");
          }}
          disabled={!activeCompany}
        >
          New Bill
        </Button>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-6 w-full max-w-2xl">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="paid">Paid</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
          <TabsTrigger value="intercompany">Intercompany</TabsTrigger>
        </TabsList>
        
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Bills</CardTitle>
            <CardDescription>Manage your vendor bills and payments</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill #</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Balance Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(3).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-9 w-20 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredBills.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-4">
                      No bills found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBills.map((bill) => (
                    <TableRow key={bill.id}>
                      <TableCell className="font-medium">{bill.billNumber}</TableCell>
                      <TableCell>
                        {typeof bill.vendor === 'object' ? bill.vendor.name : bill.vendor}
                      </TableCell>
                      <TableCell>{formatDate(bill.date)}</TableCell>
                      <TableCell>{formatDate(bill.dueDate)}</TableCell>
                      <TableCell>{formatCurrency(bill.total)}</TableCell>
                      <TableCell>{formatCurrency(bill.balanceDue)}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(bill.status)}>
                          {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                        </Badge>
                        {bill.isIntercompany && (
                          <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700">
                            Intercompany
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mr-2"
                          onClick={() => navigate(`/bills/${bill.id}`)}
                        >
                          <FileText className="mr-1 h-4 w-4" />
                          View
                        </Button>
                        
                        {bill.status === "open" && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="bg-green-50 hover:bg-green-100 border-green-200"
                            onClick={() => navigate(`/bill-payment-form?billId=${bill.id}`)}
                          >
                            <Plus className="mr-1 h-4 w-4" />
                            Pay
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}