import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useCompany } from "@/hooks/use-company";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CalendarIcon, MoreHorizontal, Plus, FileText, FileUp, Ban } from "lucide-react";
import { format } from "date-fns";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

// Define Zod schema for the form
const debitNoteFormSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  billId: z.string().optional(),
  issueDate: z.date({
    required_error: "Issue date is required",
  }),
  dueDate: z.date().optional(),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      description: z.string().min(2, "Description is required"),
      quantity: z.coerce.number().positive("Quantity must be positive"),
      unitPrice: z.coerce.number().min(0, "Unit price must be non-negative"),
      amount: z.coerce.number().min(0, "Amount must be non-negative"),
      productId: z.string().optional(),
    })
  ).min(1, "At least one item is required"),
});

type DebitNoteFormValues = z.infer<typeof debitNoteFormSchema>;

const statusColors = {
  draft: "bg-gray-500",
  issued: "bg-blue-500",
  partial: "bg-yellow-500",
  applied: "bg-green-500",
  cancelled: "bg-red-500",
};

function formatDate(date: string | Date) {
  return date ? format(new Date(date), "PPP") : "";
}

export default function DebitNotesPage() {
  const { activeCompany } = useCompany();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedDebitNote, setSelectedDebitNote] = useState<any>(null);

  const { data: debitNotesData, isLoading: isLoadingDebitNotes } = useQuery({
    queryKey: ["/api/debit-notes", page],
    queryFn: async () => {
      const response = await fetch(`/api/debit-notes?page=${page}`);
      if (!response.ok) throw new Error("Failed to fetch debit notes");
      return response.json();
    },
    enabled: !!activeCompany,
  });

  const { data: vendorsData, isLoading: isLoadingVendors } = useQuery({
    queryKey: ["/api/vendors"],
    queryFn: async () => {
      const response = await fetch("/api/vendors");
      if (!response.ok) throw new Error("Failed to fetch vendors");
      return response.json();
    },
    enabled: !!activeCompany,
  });

  const { data: billsData, isLoading: isLoadingBills } = useQuery({
    queryKey: ["/api/bills"],
    queryFn: async () => {
      const response = await fetch("/api/bills");
      if (!response.ok) throw new Error("Failed to fetch bills");
      return response.json();
    },
    enabled: !!activeCompany,
  });

  const createDebitNoteMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/debit-notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create debit note");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Debit note created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/debit-notes"] });
      setIsCreateModalOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateDebitNoteStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await fetch(`/api/debit-notes/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update debit note status");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Debit note status updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/debit-notes"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteDebitNoteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/debit-notes/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete debit note");
      }

      return true;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Debit note deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/debit-notes"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const fetchDebitNoteDetails = async (id: number) => {
    try {
      const response = await fetch(`/api/debit-notes/${id}`);
      if (!response.ok) throw new Error("Failed to fetch debit note details");
      const data = await response.json();
      setSelectedDebitNote(data);
      setIsViewModalOpen(true);
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const form = useForm<DebitNoteFormValues>({
    resolver: zodResolver(debitNoteFormSchema),
    defaultValues: {
      vendorId: "",
      billId: "",
      issueDate: new Date(),
      notes: "",
      items: [
        {
          description: "",
          quantity: 1,
          unitPrice: 0,
          amount: 0,
          productId: "",
        },
      ],
    },
  });

  const { fields, append, remove } = form.control._fields.items || { fields: [], append: () => {}, remove: () => {} };

  const onSubmit = (data: DebitNoteFormValues) => {
    // Transform data to match API requirements
    const debitNoteData = {
      vendorId: parseInt(data.vendorId),
      billId: data.billId && data.billId !== "none" ? parseInt(data.billId) : undefined,
      issueDate: data.issueDate.toISOString(),
      dueDate: data.dueDate ? data.dueDate.toISOString() : undefined,
      notes: data.notes,
      status: "draft",
      items: data.items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.amount,
        productId: item.productId ? parseInt(item.productId) : undefined,
      })),
    };

    createDebitNoteMutation.mutate(debitNoteData);
  };

  const calculateItemAmount = (index: number) => {
    const quantity = form.watch(`items.${index}.quantity`) || 0;
    const unitPrice = form.watch(`items.${index}.unitPrice`) || 0;
    const amount = quantity * unitPrice;
    form.setValue(`items.${index}.amount`, amount);
  };

  const calculateTotal = () => {
    const items = form.watch("items") || [];
    return items.reduce((sum, item) => sum + (item.amount || 0), 0);
  };

  if (!activeCompany) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>No Company Selected</CardTitle>
            <CardDescription>
              Please select a company to view debit notes.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Debit Notes</h1>
          <p className="text-muted-foreground">
            Manage vendor debit notes for {activeCompany.name}
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Create Debit Note
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoadingDebitNotes ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : debitNotesData?.data?.length === 0 ? (
            <div className="text-center py-10">
              <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-lg font-semibold">No Debit Notes Found</p>
              <p className="text-muted-foreground">
                Create your first debit note to get started.
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Note Number</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {debitNotesData?.data?.map((debitNote: any) => (
                    <TableRow key={debitNote.id}>
                      <TableCell>{debitNote.noteNumber}</TableCell>
                      <TableCell>{debitNote.vendor.name}</TableCell>
                      <TableCell>{formatDate(debitNote.issueDate)}</TableCell>
                      <TableCell>{formatCurrency(debitNote.total)}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[debitNote.status as keyof typeof statusColors]}>
                          {debitNote.status.charAt(0).toUpperCase() + debitNote.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => fetchDebitNoteDetails(debitNote.id)}>
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {debitNote.status === "draft" && (
                              <>
                                <DropdownMenuItem onClick={() => updateDebitNoteStatusMutation.mutate({ 
                                  id: debitNote.id, 
                                  status: "issued" 
                                })}>
                                  <FileUp className="mr-2 h-4 w-4" />
                                  Issue
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => deleteDebitNoteMutation.mutate(debitNote.id)}>
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                            {(debitNote.status === "issued" || debitNote.status === "partial") && (
                              <DropdownMenuItem onClick={() => updateDebitNoteStatusMutation.mutate({ 
                                id: debitNote.id, 
                                status: "applied" 
                              })}>
                                Apply Fully
                              </DropdownMenuItem>
                            )}
                            {debitNote.status !== "cancelled" && debitNote.status !== "applied" && (
                              <DropdownMenuItem onClick={() => updateDebitNoteStatusMutation.mutate({ 
                                id: debitNote.id, 
                                status: "cancelled" 
                              })}>
                                <Ban className="mr-2 h-4 w-4" />
                                Cancel
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {debitNotesData?.pagination?.totalPages > 1 && (
                <div className="mt-4 flex justify-center">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page === 1} 
                        />
                      </PaginationItem>
                      {Array.from({ length: debitNotesData.pagination.totalPages }, (_, i) => (
                        <PaginationItem key={i + 1}>
                          <PaginationLink
                            isActive={page === i + 1}
                            onClick={() => setPage(i + 1)}
                          >
                            {i + 1}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setPage(p => Math.min(debitNotesData.pagination.totalPages, p + 1))}
                          disabled={page === debitNotesData.pagination.totalPages} 
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Debit Note Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Debit Note</DialogTitle>
            <DialogDescription>
              Create a debit note for a vendor to adjust or claim refunds on bills.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="vendorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select vendor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingVendors ? (
                            <SelectItem value="loading">Loading...</SelectItem>
                          ) : (
                            vendorsData?.map((vendor: any) => (
                              <SelectItem key={vendor.id} value={vendor.id.toString()}>
                                {vendor.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="billId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Related Bill (Optional)</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select bill" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {isLoadingBills ? (
                            <SelectItem value="loading">Loading...</SelectItem>
                          ) : (
                            billsData?.data?.map((bill: any) => (
                              <SelectItem key={bill.id} value={bill.id.toString()}>
                                {bill.billNumber} - {formatCurrency(bill.total)}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="issueDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Issue Date *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className="w-full pl-3 text-left font-normal"
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

                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Due Date (Optional)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className="w-full pl-3 text-left font-normal"
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
                            selected={field.value || undefined}
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

              <div>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter any additional notes or terms"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Items</h3>
                <div className="bg-secondary/50 p-4 rounded-md">
                  <div className="grid grid-cols-12 gap-2 mb-2 font-semibold">
                    <div className="col-span-5">Description</div>
                    <div className="col-span-2">Quantity</div>
                    <div className="col-span-2">Unit Price</div>
                    <div className="col-span-2">Amount</div>
                    <div className="col-span-1"></div>
                  </div>

                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-12 gap-2 mb-2">
                      <div className="col-span-5">
                        <FormField
                          control={form.control}
                          name={`items.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input {...field} placeholder="Description" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-2">
                        <FormField
                          control={form.control}
                          name={`items.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  type="number" 
                                  min="0.01" 
                                  step="0.01"
                                  onChange={(e) => {
                                    field.onChange(e);
                                    calculateItemAmount(index);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-2">
                        <FormField
                          control={form.control}
                          name={`items.${index}.unitPrice`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  type="number" 
                                  min="0" 
                                  step="0.01"
                                  onChange={(e) => {
                                    field.onChange(e);
                                    calculateItemAmount(index);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-2">
                        <FormField
                          control={form.control}
                          name={`items.${index}.amount`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input {...field} type="number" min="0" step="0.01" readOnly />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-1 flex items-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                          disabled={fields.length === 1}
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() =>
                      append({
                        description: "",
                        quantity: 1,
                        unitPrice: 0,
                        amount: 0,
                        productId: "",
                      })
                    }
                  >
                    Add Item
                  </Button>
                </div>

                <div className="flex justify-end mt-4">
                  <div className="bg-secondary/50 p-4 rounded-md w-1/3">
                    <div className="flex justify-between mb-2">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(calculateTotal())}</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between font-bold">
                      <span>Total:</span>
                      <span>{formatCurrency(calculateTotal())}</span>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createDebitNoteMutation.isPending}>
                  {createDebitNoteMutation.isPending ? "Creating..." : "Create Debit Note"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Debit Note Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedDebitNote ? (
            <>
              <DialogHeader>
                <DialogTitle>Debit Note {selectedDebitNote.noteNumber}</DialogTitle>
                <DialogDescription>
                  <Badge className={statusColors[selectedDebitNote.status as keyof typeof statusColors]}>
                    {selectedDebitNote.status.charAt(0).toUpperCase() + selectedDebitNote.status.slice(1)}
                  </Badge>
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-sm font-semibold">Vendor</p>
                  <p>{selectedDebitNote.vendor?.name}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">Related Bill</p>
                  <p>{selectedDebitNote.bill?.billNumber || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">Issue Date</p>
                  <p>{formatDate(selectedDebitNote.issueDate)}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">Due Date</p>
                  <p>{selectedDebitNote.dueDate ? formatDate(selectedDebitNote.dueDate) : "N/A"}</p>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">Items</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedDebitNote.items?.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex justify-end mt-4">
                  <div className="bg-secondary/50 p-4 rounded-md w-1/3">
                    <div className="flex justify-between font-bold">
                      <span>Total:</span>
                      <span>{formatCurrency(selectedDebitNote.total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {selectedDebitNote.notes && (
                <div className="mt-4">
                  <h3 className="text-md font-semibold">Notes</h3>
                  <p className="text-sm mt-1">{selectedDebitNote.notes}</p>
                </div>
              )}

              <DialogFooter className="mt-6">
                <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
                  Close
                </Button>
                {selectedDebitNote.status === "draft" && (
                  <>
                    <Button 
                      onClick={() => {
                        updateDebitNoteStatusMutation.mutate({
                          id: selectedDebitNote.id,
                          status: "issued"
                        });
                        setIsViewModalOpen(false);
                      }}
                    >
                      <FileUp className="mr-2 h-4 w-4" />
                      Issue Debit Note
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          ) : (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}