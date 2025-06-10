import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useCompany } from "@/hooks/use-company";

interface Vendor {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  taxId: string;
  companyId: number;
  isActive: boolean;
  createdAt: string;
}

interface GoodsReceipt {
  id: number;
  receiptNumber: string;
  purchaseOrderId: number;
  purchaseOrderNumber: string;
  vendorId: number;
  vendor: string | Vendor;
  receiptDate: string;
  status: "draft" | "processing" | "received" | "inspected" | "completed" | "rejected";
  items: number;
}

export default function GoodsReceipts() {
  const [activeTab, setActiveTab] = useState("all");
  const [openReceiptDialog, setOpenReceiptDialog] = useState(false);
  const { activeCompany } = useCompany();
  const { toast } = useToast();
  
  // Company-specific data
  const { data: goodsReceipts, isLoading } = useQuery<GoodsReceipt[]>({
    queryKey: ["/api/goods-receipts", activeCompany?.id],
    queryFn: async () => {
      // In a real implementation, this would be:
      // const res = await apiRequest("GET", `/api/goods-receipts?companyId=${activeCompany?.id}`);
      // return await res.json();
      
      // Simulating API call with company-specific data
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Only return data for company with ID 1
      if (activeCompany?.id === 1) {
        return [
          {
            id: 1,
            receiptNumber: "GR-2025-001",
            purchaseOrderId: 1,
            purchaseOrderNumber: "PO-2025-001",
            vendorId: 1,
            vendor: "Supplier Co.",
            receiptDate: "2025-05-05",
            status: "completed",
            items: 5
          },
          {
            id: 2,
            receiptNumber: "GR-2025-002",
            purchaseOrderId: 2,
            purchaseOrderNumber: "PO-2025-002",
            vendorId: 2,
            vendor: "Manufacturing Solutions",
            receiptDate: "2025-05-10",
            status: "processing",
            items: 3
          },
          {
            id: 3,
            receiptNumber: "GR-2025-003",
            purchaseOrderId: 3,
            purchaseOrderNumber: "PO-2025-003",
            vendorId: 3,
            vendor: "Raw Materials Inc",
            receiptDate: "2025-05-12",
            status: "draft",
            items: 7
          }
        ];
      }
      
      // Return empty array for all other companies
      return [];
    },
    enabled: !!activeCompany
  });
  
  const filteredReceipts = goodsReceipts?.filter(receipt => {
    if (activeTab === "all") return true;
    return receipt.status === activeTab;
  }) || [];
  
  const handleCreateReceipt = () => {
    toast({
      title: "Goods Receipt Created",
      description: "New goods receipt has been created as a draft.",
      variant: "default",
    });
    setOpenReceiptDialog(false);
  };
  
  const handleReceive = (id: number) => {
    toast({
      title: "Goods Received",
      description: `Goods Receipt #${id} has been marked as received.`,
      variant: "default",
    });
  };
  
  const handleInspect = (id: number) => {
    toast({
      title: "Goods Inspected",
      description: `Goods Receipt #${id} has been marked as inspected.`,
      variant: "default",
    });
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const getStatusColor = (status: GoodsReceipt["status"]) => {
    switch (status) {
      case "draft": return "secondary";
      case "processing": return "secondary";
      case "received": return "default";
      case "inspected": return "default";
      case "completed": return "default";
      case "rejected": return "destructive";
      default: return "secondary";
    }
  };
  
  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Goods Receipts</h1>
        <Dialog open={openReceiptDialog} onOpenChange={setOpenReceiptDialog}>
          <DialogTrigger asChild>
            <Button>
              <i className="ri-add-line mr-2"></i>
              New Goods Receipt
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create Goods Receipt</DialogTitle>
              <DialogDescription>
                Record received goods from a purchase order.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="purchaseOrder" className="text-right text-sm">
                  Purchase Order
                </label>
                <div className="col-span-3">
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select purchase order" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="po001">PO-2025-001 - Supplier Co.</SelectItem>
                      <SelectItem value="po002">PO-2025-002 - Manufacturing Solutions</SelectItem>
                      <SelectItem value="po003">PO-2025-003 - Raw Materials Inc</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="receiptDate" className="text-right text-sm">
                  Receipt Date
                </label>
                <div className="col-span-3">
                  <Input 
                    id="receiptDate" 
                    type="date" 
                    defaultValue={new Date().toISOString().split('T')[0]} 
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="deliveryNote" className="text-right text-sm">
                  Delivery Note #
                </label>
                <div className="col-span-3">
                  <Input id="deliveryNote" placeholder="Vendor's delivery note number" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenReceiptDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateReceipt}>Create Receipt</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-6 max-w-[600px] mb-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="processing">Processing</TabsTrigger>
          <TabsTrigger value="received">Received</TabsTrigger>
          <TabsTrigger value="inspected">Inspected</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
        
        <Card>
          <CardHeader>
            <CardTitle>Goods Receipts</CardTitle>
            <CardDescription>Manage your received goods and inventory</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt #</TableHead>
                  <TableHead>Purchase Order</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Receipt Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(3).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-9 w-20 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredReceipts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4">
                      No goods receipts found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReceipts.map((receipt) => (
                    <TableRow key={receipt.id}>
                      <TableCell className="font-medium">{receipt.receiptNumber}</TableCell>
                      <TableCell>{receipt.purchaseOrderNumber}</TableCell>
                      <TableCell>{typeof receipt.vendor === 'object' ? receipt.vendor.name : receipt.vendor}</TableCell>
                      <TableCell>{formatDate(receipt.receiptDate)}</TableCell>
                      <TableCell>{receipt.items}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(receipt.status)}>
                          {receipt.status.charAt(0).toUpperCase() + receipt.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {receipt.status === "processing" && (
                            <Button variant="outline" size="sm" onClick={() => handleReceive(receipt.id)}>
                              Receive
                            </Button>
                          )}
                          {receipt.status === "received" && (
                            <Button variant="outline" size="sm" onClick={() => handleInspect(receipt.id)}>
                              Inspect
                            </Button>
                          )}
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </div>
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