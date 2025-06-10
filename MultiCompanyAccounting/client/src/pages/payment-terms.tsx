import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useCompany } from "@/hooks/use-company";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, MoreHorizontal, Plus, Edit, Trash } from "lucide-react";
import { format } from "date-fns";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

// Define Zod schema for the form
const paymentTermFormSchema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().optional(),
  daysUntilDue: z.coerce.number().min(0, "Days must be non-negative"),
  billingFrequency: z.enum(["one_time", "monthly", "quarterly", "annually"]),
  discountDays: z.coerce.number().min(0, "Days must be non-negative").optional(),
  discountPercent: z.coerce.number().min(0, "Percentage must be non-negative").max(100, "Percentage must be 100 or less").optional(),
  isActive: z.boolean().default(true),
});

type PaymentTermFormValues = z.infer<typeof paymentTermFormSchema>;

export default function PaymentTermsPage() {
  const { activeCompany } = useCompany();
  const { toast } = useToast();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPaymentTerm, setSelectedPaymentTerm] = useState<any>(null);

  const { data: paymentTermsData, isLoading } = useQuery({
    queryKey: ["/api/payment-terms"],
    queryFn: async () => {
      const response = await fetch(`/api/payment-terms?companyId=${activeCompany?.id}`);
      if (!response.ok) throw new Error("Failed to fetch payment terms");
      return response.json();
    },
    enabled: !!activeCompany,
  });

  const createForm = useForm<PaymentTermFormValues>({
    resolver: zodResolver(paymentTermFormSchema),
    defaultValues: {
      name: "",
      description: "",
      daysUntilDue: 30,
      billingFrequency: "one_time",
      discountDays: 0,
      discountPercent: 0,
      isActive: true,
    },
  });

  const editForm = useForm<PaymentTermFormValues>({
    resolver: zodResolver(paymentTermFormSchema),
    defaultValues: {
      name: "",
      description: "",
      daysUntilDue: 30,
      billingFrequency: "one_time",
      discountDays: 0,
      discountPercent: 0,
      isActive: true,
    },
  });

  const createPaymentTermMutation = useMutation({
    mutationFn: async (data: PaymentTermFormValues) => {
      const response = await fetch("/api/payment-terms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          companyId: activeCompany?.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create payment term");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Payment term created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payment-terms"] });
      setIsCreateModalOpen(false);
      createForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updatePaymentTermMutation = useMutation({
    mutationFn: async (data: PaymentTermFormValues & { id: number }) => {
      const { id, ...paymentTermData } = data;
      const response = await fetch(`/api/payment-terms/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentTermData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update payment term");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Payment term updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payment-terms"] });
      setIsEditModalOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deletePaymentTermMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/payment-terms/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete payment term");
      }

      return true;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Payment term deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payment-terms"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onCreateSubmit = (data: PaymentTermFormValues) => {
    createPaymentTermMutation.mutate(data);
  };

  const onEditSubmit = (data: PaymentTermFormValues) => {
    if (selectedPaymentTerm) {
      updatePaymentTermMutation.mutate({
        ...data,
        id: selectedPaymentTerm.id,
      });
    }
  };

  const handleEdit = (paymentTerm: any) => {
    setSelectedPaymentTerm(paymentTerm);
    editForm.reset({
      name: paymentTerm.name,
      description: paymentTerm.description || "",
      daysUntilDue: paymentTerm.daysUntilDue,
      billingFrequency: paymentTerm.billingFrequency,
      discountDays: paymentTerm.discountDays || 0,
      discountPercent: paymentTerm.discountPercent || 0,
      isActive: paymentTerm.isActive,
    });
    setIsEditModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this payment term?")) {
      deletePaymentTermMutation.mutate(id);
    }
  };

  const getBillingFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case "one_time":
        return "One-time";
      case "monthly":
        return "Monthly";
      case "quarterly":
        return "Quarterly";
      case "annually":
        return "Annually";
      default:
        return frequency;
    }
  };

  if (!activeCompany) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>No Company Selected</CardTitle>
            <CardDescription>
              Please select a company to view payment terms.
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
          <h1 className="text-3xl font-bold tracking-tight">Payment Terms</h1>
          <p className="text-muted-foreground">
            Manage payment terms for {activeCompany.name}
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Create Payment Term
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : !paymentTermsData || paymentTermsData.length === 0 ? (
            <div className="text-center py-10">
              <CalendarIcon className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-lg font-semibold">No Payment Terms Found</p>
              <p className="text-muted-foreground">
                Create your first payment term to get started.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Due Period</TableHead>
                  <TableHead>Billing Frequency</TableHead>
                  <TableHead>Early Payment Discount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentTermsData.map((term: any) => (
                  <TableRow key={term.id}>
                    <TableCell className="font-medium">{term.name}</TableCell>
                    <TableCell>{term.daysUntilDue} days</TableCell>
                    <TableCell>{getBillingFrequencyLabel(term.billingFrequency)}</TableCell>
                    <TableCell>
                      {term.discountPercent > 0 ? `${term.discountPercent}% if paid within ${term.discountDays} days` : "None"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={term.isActive ? "default" : "secondary"}>
                        {term.isActive ? "Active" : "Inactive"}
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
                          <DropdownMenuItem onClick={() => handleEdit(term)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDelete(term.id)}
                            className="text-red-600"
                          >
                            <Trash className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Payment Term Dialog */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create Payment Term</DialogTitle>
            <DialogDescription>
              Add a new payment term for your company.
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-5">
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Net 30" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Payment due within 30 days" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={createForm.control}
                  name="daysUntilDue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Days Until Due</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="billingFrequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Billing Frequency</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="one_time">One-time</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="annually">Annually</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={createForm.control}
                  name="discountDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Days</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" placeholder="e.g., 10 days" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="discountPercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Percentage</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" max="100" step="0.01" placeholder="e.g., 2%" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={createForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Active</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        This payment term will be available for selection on invoices and bills.
                      </p>
                    </div>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createPaymentTermMutation.isPending}
                >
                  {createPaymentTermMutation.isPending ? 
                    "Creating..." : "Create Payment Term"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Payment Term Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Payment Term</DialogTitle>
            <DialogDescription>
              Update payment term details.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-5">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Net 30" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Payment due within 30 days" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="daysUntilDue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Days Until Due</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="billingFrequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Billing Frequency</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="one_time">One-time</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="annually">Annually</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="discountDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Days</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" placeholder="e.g., 10 days" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="discountPercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Percentage</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" max="100" step="0.01" placeholder="e.g., 2%" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Active</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        This payment term will be available for selection on invoices and bills.
                      </p>
                    </div>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updatePaymentTermMutation.isPending}
                >
                  {updatePaymentTermMutation.isPending ? 
                    "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}