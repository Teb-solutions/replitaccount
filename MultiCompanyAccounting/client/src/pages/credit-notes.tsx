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
const creditNoteFormSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  invoiceId: z.string().optional(),
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

type CreditNoteFormValues = z.infer<typeof creditNoteFormSchema>;

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

export default function CreditNotesPage() {
  const { activeCompany } = useCompany();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedCreditNote, setSelectedCreditNote] = useState<any>(null);

  const { data: creditNotesData, isLoading: isLoadingCreditNotes } = useQuery({
    queryKey: ["/api/credit-notes", page],
    queryFn: async () => {
      const response = await fetch(`/api/credit-notes?page=${page}`);
      if (!response.ok) throw new Error("Failed to fetch credit notes");
      return response.json();
    },
    enabled: !!activeCompany,
  });

  const { data: customersData, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const response = await fetch("/api/customers");
      if (!response.ok) throw new Error("Failed to fetch customers");
      return response.json();
    },
    enabled: !!activeCompany,
  });

  const { data: invoicesData, isLoading: isLoadingInvoices } = useQuery({
    queryKey: ["/api/invoices"],
    queryFn: async () => {
      const response = await fetch("/api/invoices");
      if (!response.ok) throw new Error("Failed to fetch invoices");
      return response.json();
    },
    enabled: !!activeCompany,
  });

  const createCreditNoteMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/credit-notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create credit note");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Credit note created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/credit-notes"] });
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

  const updateCreditNoteStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await fetch(`/api/credit-notes/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update credit note status");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Credit note status updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/credit-notes"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCreditNoteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/credit-notes/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete credit note");
      }

      return true;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Credit note deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/credit-notes"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const fetchCreditNoteDetails = async (id: number) => {
    try {
      const response = await fetch(`/api/credit-notes/${id}`);
      if (!response.ok) throw new Error("Failed to fetch credit note details");
      const data = await response.json();
      setSelectedCreditNote(data);
      setIsViewModalOpen(true);
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const form = useForm<CreditNoteFormValues>({
    resolver: zodResolver(creditNoteFormSchema),
    defaultValues: {
      customerId: "",
      invoiceId: "",
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

  const onSubmit = (data: CreditNoteFormValues) => {
    // Transform data to match API requirements
    const creditNoteData = {
      customerId: parseInt(data.customerId),
      invoiceId: data.invoiceId && data.invoiceId !== "none" ? parseInt(data.invoiceId) : undefined,
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

    createCreditNoteMutation.mutate(creditNoteData);
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
              Please select a company to view credit notes.
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
          <h1 className="text-3xl font-bold tracking-tight">Credit Notes</h1>
          <p className="text-muted-foreground">
            Manage customer credit notes for {activeCompany.name}
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Create Credit Note
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoadingCreditNotes ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : creditNotesData?.data?.length === 0 ? (
            <div className="text-center py-10">
              <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-lg font-semibold">No Credit Notes Found</p>
              <p className="text-muted-foreground">
                Create your first credit note to get started.
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Note Number</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditNotesData?.data?.map((creditNote: any) => (
                    <TableRow key={creditNote.id}>
                      <TableCell>{creditNote.noteNumber}</TableCell>
                      <TableCell>{creditNote.customer.name}</TableCell>
                      <TableCell>{formatDate(creditNote.issueDate)}</TableCell>
                      <TableCell>{formatCurrency(creditNote.total)}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[creditNote.status as keyof typeof statusColors]}>
                          {creditNote.status.charAt(0).toUpperCase() + creditNote.status.slice(1)}
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
                            <DropdownMenuItem onClick={() => fetchCreditNoteDetails(creditNote.id)}>
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {creditNote.status === "draft" && (
                              <>
                                <DropdownMenuItem onClick={() => updateCreditNoteStatusMutation.mutate({ 
                                  id: creditNote.id, 
                                  status: "issued" 
                                })}>
                                  <FileUp className="mr-2 h-4 w-4" />
                                  Issue
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => deleteCreditNoteMutation.mutate(creditNote.id)}>
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                            {(creditNote.status === "issued" || creditNote.status === "partial") && (
                              <DropdownMenuItem onClick={() => updateCreditNoteStatusMutation.mutate({ 
                                id: creditNote.id, 
                                status: "applied" 
                              })}>
                                Apply Fully
                              </DropdownMenuItem>
                            )}
                            {creditNote.status !== "cancelled" && creditNote.status !== "applied" && (
                              <DropdownMenuItem onClick={() => updateCreditNoteStatusMutation.mutate({ 
                                id: creditNote.id, 
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

              {creditNotesData?.pagination?.totalPages > 1 && (
                <div className="mt-4 flex justify-center">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page === 1} 
                        />
                      </PaginationItem>
                      {Array.from({ length: creditNotesData.pagination.totalPages }, (_, i) => (
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
                          onClick={() => setPage(p => Math.min(creditNotesData.pagination.totalPages, p + 1))}
                          disabled={page === creditNotesData.pagination.totalPages} 
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

      {/* Create Credit Note Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Credit Note</DialogTitle>
            <DialogDescription>
              Create a credit note for a customer to refund or adjust an invoice.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select customer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingCustomers ? (
                            <SelectItem value="loading">Loading...</SelectItem>
                          ) : (
                            customersData?.map((customer: any) => (
                              <SelectItem key={customer.id} value={customer.id.toString()}>
                                {customer.name}
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
                  name="invoiceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Related Invoice (Optional)</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select invoice" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {isLoadingInvoices ? (
                            <SelectItem value="loading">Loading...</SelectItem>
                          ) : (
                            invoicesData?.data?.map((invoice: any) => (
                              <SelectItem key={invoice.id} value={invoice.id.toString()}>
                                {invoice.invoiceNumber} - {formatCurrency(invoice.total)}
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
                <Button type="submit" disabled={createCreditNoteMutation.isPending}>
                  {createCreditNoteMutation.isPending ? "Creating..." : "Create Credit Note"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Credit Note Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedCreditNote ? (
            <>
              <DialogHeader>
                <DialogTitle>Credit Note {selectedCreditNote.noteNumber}</DialogTitle>
                <DialogDescription>
                  <Badge className={statusColors[selectedCreditNote.status as keyof typeof statusColors]}>
                    {selectedCreditNote.status.charAt(0).toUpperCase() + selectedCreditNote.status.slice(1)}
                  </Badge>
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-sm font-semibold">Customer</p>
                  <p>{selectedCreditNote.customer?.name}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">Related Invoice</p>
                  <p>{selectedCreditNote.invoice?.invoiceNumber || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">Issue Date</p>
                  <p>{formatDate(selectedCreditNote.issueDate)}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">Due Date</p>
                  <p>{selectedCreditNote.dueDate ? formatDate(selectedCreditNote.dueDate) : "N/A"}</p>
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
                    {selectedCreditNote.items?.map((item: any) => (
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
                      <span>{formatCurrency(selectedCreditNote.total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {selectedCreditNote.notes && (
                <div className="mt-4">
                  <h3 className="text-md font-semibold">Notes</h3>
                  <p className="text-sm mt-1">{selectedCreditNote.notes}</p>
                </div>
              )}

              <DialogFooter className="mt-6">
                <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
                  Close
                </Button>
                {selectedCreditNote.status === "draft" && (
                  <>
                    <Button 
                      onClick={() => {
                        updateCreditNoteStatusMutation.mutate({
                          id: selectedCreditNote.id,
                          status: "issued"
                        });
                        setIsViewModalOpen(false);
                      }}
                    >
                      <FileUp className="mr-2 h-4 w-4" />
                      Issue Credit Note
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