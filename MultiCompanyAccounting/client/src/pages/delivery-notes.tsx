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
import { useCompany } from "@/hooks/use-company";

interface DeliveryNote {
  id: number;
  deliveryNumber: string;
  salesOrderId: number;
  salesOrderNumber: string;
  customerId: number;
  customer: string;
  deliveryDate: string;
  status: "pending" | "preparing" | "shipped" | "delivered" | "cancelled";
  items: number;
}

// Sample data - in a real app this would come from the API
const mockDeliveryNotes: DeliveryNote[] = [
  {
    id: 1,
    deliveryNumber: "DN-2025-001",
    salesOrderId: 1,
    salesOrderNumber: "SO-2025-001",
    customerId: 1,
    customer: "ABC Corporation",
    deliveryDate: "2025-05-15",
    status: "preparing",
    items: 5
  },
  {
    id: 2,
    deliveryNumber: "DN-2025-002",
    salesOrderId: 2,
    salesOrderNumber: "SO-2025-002",
    customerId: 2,
    customer: "XYZ Enterprises",
    deliveryDate: "2025-05-20",
    status: "pending",
    items: 3
  },
  {
    id: 3,
    deliveryNumber: "DN-2025-003",
    salesOrderId: 3,
    salesOrderNumber: "SO-2025-003",
    customerId: 3,
    customer: "Global Services Ltd",
    deliveryDate: "2025-05-10",
    status: "shipped",
    items: 7
  },
  {
    id: 4,
    deliveryNumber: "DN-2025-004",
    salesOrderId: 4,
    salesOrderNumber: "SO-2025-004",
    customerId: 4,
    customer: "Tech Innovators",
    deliveryDate: "2025-05-02",
    status: "delivered",
    items: 2
  }
];

export default function DeliveryNotes() {
  const [activeTab, setActiveTab] = useState("all");
  const [openDeliveryDialog, setOpenDeliveryDialog] = useState(false);
  const { activeCompany } = useCompany();
  const { toast } = useToast();
  
  // This would be replaced with actual API calls
  const { data: deliveryNotes, isLoading } = useQuery<DeliveryNote[]>({
    queryKey: ["/api/delivery-notes", activeCompany?.id],
    queryFn: async () => {
      // Simulating API call
      await new Promise(resolve => setTimeout(resolve, 500));
      return mockDeliveryNotes;
    },
    enabled: !!activeCompany
  });
  
  const filteredDeliveryNotes = deliveryNotes?.filter(note => {
    if (activeTab === "all") return true;
    return note.status === activeTab;
  }) || [];
  
  const handleCreateDeliveryNote = () => {
    toast({
      title: "Delivery Note Created",
      description: "New delivery note has been created successfully.",
      variant: "default",
    });
    setOpenDeliveryDialog(false);
  };
  
  const handleShipment = (id: number) => {
    toast({
      title: "Shipment Updated",
      description: `Delivery Note #${id} has been marked as shipped.`,
      variant: "default",
    });
  };
  
  const handleDelivery = (id: number) => {
    toast({
      title: "Delivery Confirmed",
      description: `Delivery Note #${id} has been marked as delivered.`,
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
  
  const getStatusColor = (status: DeliveryNote["status"]) => {
    switch (status) {
      case "pending": return "secondary";
      case "preparing": return "secondary";
      case "shipped": return "default";
      case "delivered": return "default";
      case "cancelled": return "destructive";
      default: return "secondary";
    }
  };
  
  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Delivery Notes</h1>
        <Dialog open={openDeliveryDialog} onOpenChange={setOpenDeliveryDialog}>
          <DialogTrigger asChild>
            <Button>
              <i className="ri-add-line mr-2"></i>
              New Delivery Note
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create Delivery Note</DialogTitle>
              <DialogDescription>
                Create a delivery note for a sales order.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="salesOrder" className="text-right text-sm">
                  Sales Order
                </label>
                <div className="col-span-3">
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select sales order" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="so001">SO-2025-001 - ABC Corporation</SelectItem>
                      <SelectItem value="so002">SO-2025-002 - XYZ Enterprises</SelectItem>
                      <SelectItem value="so003">SO-2025-003 - Global Services Ltd</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="deliveryDate" className="text-right text-sm">
                  Delivery Date
                </label>
                <div className="col-span-3">
                  <input 
                    type="date" 
                    id="deliveryDate" 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    defaultValue={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="deliveryMethod" className="text-right text-sm">
                  Delivery Method
                </label>
                <div className="col-span-3">
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select delivery method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="courier">Courier</SelectItem>
                      <SelectItem value="pickup">Customer Pickup</SelectItem>
                      <SelectItem value="company">Company Delivery</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenDeliveryDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateDeliveryNote}>Create Delivery Note</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid max-w-[600px] grid-cols-5 mb-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="preparing">Preparing</TabsTrigger>
          <TabsTrigger value="shipped">Shipped</TabsTrigger>
          <TabsTrigger value="delivered">Delivered</TabsTrigger>
        </TabsList>
        
        <Card>
          <CardHeader>
            <CardTitle>Delivery Notes</CardTitle>
            <CardDescription>Manage your product deliveries</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Delivery #</TableHead>
                  <TableHead>Sales Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Delivery Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(4).fill(0).map((_, i) => (
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
                ) : filteredDeliveryNotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4">
                      No delivery notes found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDeliveryNotes.map((note) => (
                    <TableRow key={note.id}>
                      <TableCell className="font-medium">{note.deliveryNumber}</TableCell>
                      <TableCell>{note.salesOrderNumber}</TableCell>
                      <TableCell>{note.customer}</TableCell>
                      <TableCell>{formatDate(note.deliveryDate)}</TableCell>
                      <TableCell>{note.items}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(note.status)}>
                          {note.status.charAt(0).toUpperCase() + note.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {note.status === "preparing" && (
                            <Button variant="outline" size="sm" onClick={() => handleShipment(note.id)}>
                              Ship
                            </Button>
                          )}
                          {note.status === "shipped" && (
                            <Button variant="outline" size="sm" onClick={() => handleDelivery(note.id)}>
                              Confirm Delivery
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