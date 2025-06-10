import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCompany } from "@/hooks/use-company";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";

interface Account {
  id: number;
  companyId: number;
  code: string;
  name: string;
  type: string;
  balance: string;
}

interface JournalEntry {
  id: number;
  companyId: number;
  entryNumber: string;
  date: string;
  description: string;
  reference: string;
  isPosted: boolean;
  total: number;
  items: JournalEntryItem[];
}

interface JournalEntryItem {
  id: number;
  journalEntryId: number;
  accountId: number;
  account: {
    id: number;
    name: string;
    code: string;
  };
  description: string;
  debit: number;
  credit: number;
}

const entryFormSchema = z.object({
  date: z.string().min(1, { message: "Date is required" }),
  description: z.string().min(1, { message: "Description is required" }),
  reference: z.string().optional(),
  items: z.array(z.object({
    accountId: z.number().min(1, { message: "Account is required" }),
    description: z.string().optional(),
    debit: z.number().min(0, { message: "Debit must be a positive number" }),
    credit: z.number().min(0, { message: "Credit must be a positive number" })
  })).min(2, { message: "At least two entries are required" })
    .refine(items => {
      const debits = items.reduce((sum, item) => sum + (item.debit || 0), 0);
      const credits = items.reduce((sum, item) => sum + (item.credit || 0), 0);
      return Math.abs(debits - credits) < 0.01; // Allow for small rounding errors
    }, { message: "Debits must equal credits" })
});

export default function JournalEntries() {
  const [activeTab, setActiveTab] = useState("all");
  const [openEntryDialog, setOpenEntryDialog] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);
  const { activeCompany } = useCompany();
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof entryFormSchema>>({
    resolver: zodResolver(entryFormSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      description: "",
      reference: "",
      items: [
        { accountId: 0, description: "", debit: 0, credit: 0 },
        { accountId: 0, description: "", debit: 0, credit: 0 },
      ]
    }
  });
  
  // Fetch journal entries
  const { data, isLoading } = useQuery({
    queryKey: ["/api/journal-entries", activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return { entries: [] };
      const res = await apiRequest("GET", `/api/journal-entries?companyId=${activeCompany.id}`);
      return await res.json();
    },
    enabled: !!activeCompany
  });
  
  // Extract entries from the response
  const journalEntries = data?.entries || [];
  
  // Fetch accounts for the form
  const { data: accounts } = useQuery<Account[]>({
    queryKey: ["/api/accounts", activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return [];
      const res = await apiRequest("GET", `/api/accounts?companyId=${activeCompany.id}`);
      return await res.json();
    },
    enabled: !!activeCompany
  });
  
  // Fetch single journal entry details
  const { data: selectedEntry, isLoading: isLoadingEntry } = useQuery<JournalEntry>({
    queryKey: ["/api/journal-entries", selectedEntryId],
    queryFn: async () => {
      if (!selectedEntryId) throw new Error("No entry selected");
      const res = await apiRequest("GET", `/api/journal-entries/${selectedEntryId}`);
      return await res.json();
    },
    enabled: !!selectedEntryId
  });
  
  // Create journal entry mutation
  const createEntryMutation = useMutation({
    mutationFn: async (data: z.infer<typeof entryFormSchema>) => {
      const res = await apiRequest("POST", "/api/journal-entries", {
        ...data,
        companyId: activeCompany?.id
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Journal Entry Created",
        description: "New journal entry has been created successfully.",
        variant: "default",
      });
      setOpenEntryDialog(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/journal-entries"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create journal entry.",
        variant: "destructive",
      });
    }
  });
  
  const handleCreateEntry = (data: z.infer<typeof entryFormSchema>) => {
    createEntryMutation.mutate(data);
  };
  
  const handleAddLine = () => {
    const items = form.getValues("items");
    form.setValue("items", [...items, { accountId: 0, description: "", debit: 0, credit: 0 }]);
  };
  
  const handleRemoveLine = (index: number) => {
    const items = form.getValues("items");
    if (items.length <= 2) return;
    form.setValue("items", items.filter((_, i) => i !== index));
  };
  
  const handleViewEntry = (id: number) => {
    setSelectedEntryId(id);
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const filteredEntries = journalEntries?.filter(entry => {
    if (activeTab === "all") return true;
    return (activeTab === "posted") === entry.isPosted;
  }) || [];
  
  const calculateDebits = (entry: JournalEntry) => {
    return entry.items.reduce((sum, item) => sum + (item.debit || 0), 0);
  };
  
  const calculateCredits = (entry: JournalEntry) => {
    return entry.items.reduce((sum, item) => sum + (item.credit || 0), 0);
  };
  
  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Journal Entries</h1>
        <Dialog open={openEntryDialog} onOpenChange={setOpenEntryDialog}>
          <DialogTrigger asChild>
            <Button>
              <i className="ri-add-line mr-2"></i>
              New Journal Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px]">
            <DialogHeader>
              <DialogTitle>Create Manual Journal Entry</DialogTitle>
              <DialogDescription>
                Enter the journal entry details below. Debits must equal credits.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateEntry)} className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
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
                  
                  <FormField
                    control={form.control}
                    name="reference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reference</FormLabel>
                        <FormControl>
                          <Input placeholder="Optional reference" {...field} />
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
                        <Textarea placeholder="Journal entry description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="border rounded-md p-4">
                  <div className="grid grid-cols-12 gap-2 mb-2 font-medium">
                    <div className="col-span-5">Account</div>
                    <div className="col-span-3">Description</div>
                    <div className="col-span-1">Debit</div>
                    <div className="col-span-1">Credit</div>
                    <div className="col-span-2"></div>
                  </div>
                  
                  {form.watch("items").map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 mb-3 items-start">
                      <div className="col-span-5">
                        <FormField
                          control={form.control}
                          name={`items.${index}.accountId`}
                          render={({ field }) => (
                            <FormItem>
                              <Select 
                                onValueChange={(value) => field.onChange(Number(value))}
                                value={field.value ? String(field.value) : undefined}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select account" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {accounts?.map(account => (
                                    <SelectItem key={account.id} value={String(account.id)}>
                                      {account.code} - {account.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-3">
                        <FormField
                          control={form.control}
                          name={`items.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input placeholder="Description" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-1">
                        <FormField
                          control={form.control}
                          name={`items.${index}.debit`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.01"
                                  placeholder="0.00"
                                  {...field}
                                  onChange={(e) => {
                                    const value = e.target.valueAsNumber || 0;
                                    field.onChange(value);
                                    if (value > 0) {
                                      // If debit has a value, set credit to 0
                                      form.setValue(`items.${index}.credit`, 0);
                                    }
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-1">
                        <FormField
                          control={form.control}
                          name={`items.${index}.credit`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.01"
                                  placeholder="0.00"
                                  {...field}
                                  onChange={(e) => {
                                    const value = e.target.valueAsNumber || 0;
                                    field.onChange(value);
                                    if (value > 0) {
                                      // If credit has a value, set debit to 0
                                      form.setValue(`items.${index}.debit`, 0);
                                    }
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-2 flex items-center">
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleRemoveLine(index)}
                          disabled={form.watch("items").length <= 2}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleAddLine}
                    className="mt-2"
                  >
                    Add Line
                  </Button>
                  
                  <div className="grid grid-cols-12 gap-2 mt-4 font-medium border-t pt-4">
                    <div className="col-span-8 text-right">Totals:</div>
                    <div className="col-span-1">
                      {formatCurrency(form.watch("items").reduce((sum, item) => sum + (item.debit || 0), 0))}
                    </div>
                    <div className="col-span-1">
                      {formatCurrency(form.watch("items").reduce((sum, item) => sum + (item.credit || 0), 0))}
                    </div>
                    <div className="col-span-2"></div>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" type="button" onClick={() => setOpenEntryDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createEntryMutation.isPending}>
                    {createEntryMutation.isPending ? "Creating..." : "Create Entry"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        {selectedEntry && (
          <Dialog open={!!selectedEntryId} onOpenChange={(open) => !open && setSelectedEntryId(null)}>
            <DialogContent className="sm:max-w-[800px]">
              <DialogHeader>
                <DialogTitle>Journal Entry #{selectedEntry.entryNumber}</DialogTitle>
                <DialogDescription>
                  {formatDate(selectedEntry.date)} - {selectedEntry.description}
                </DialogDescription>
              </DialogHeader>
              
              {isLoadingEntry ? (
                <div className="py-4">
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : (
                <div className="py-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <span className="font-medium">Date:</span> {formatDate(selectedEntry.date)}
                    </div>
                    <div>
                      <span className="font-medium">Reference:</span> {selectedEntry.reference || "N/A"}
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium">Description:</span> {selectedEntry.description}
                    </div>
                    <div>
                      <span className="font-medium">Status:</span>{" "}
                      <Badge variant={selectedEntry.isPosted ? "default" : "secondary"}>
                        {selectedEntry.isPosted ? "Posted" : "Draft"}
                      </Badge>
                    </div>
                  </div>
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Debit</TableHead>
                        <TableHead className="text-right">Credit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedEntry.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.account.code} - {item.account.name}</TableCell>
                          <TableCell>{item.description || "-"}</TableCell>
                          <TableCell className="text-right">{item.debit ? formatCurrency(item.debit) : "-"}</TableCell>
                          <TableCell className="text-right">{item.credit ? formatCurrency(item.credit) : "-"}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={2} className="font-medium text-right">Total</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(calculateDebits(selectedEntry))}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(calculateCredits(selectedEntry))}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
              
              <DialogFooter>
                <Button onClick={() => setSelectedEntryId(null)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
      
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid max-w-[300px] grid-cols-3 mb-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="posted">Posted</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
        </TabsList>
        
        <Card>
          <CardHeader>
            <CardTitle>Journal Entries</CardTitle>
            <CardDescription>View and manage accounting transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entry #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Debit/Credit</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-9 w-20 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4">
                      No journal entries found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.entryNumber}</TableCell>
                      <TableCell>{formatDate(entry.date)}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{entry.description}</TableCell>
                      <TableCell>{entry.reference || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={entry.isPosted ? "default" : "secondary"}>
                          {entry.isPosted ? "Posted" : "Draft"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(entry.total)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleViewEntry(entry.id)}>
                          View
                        </Button>
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