import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Company, insertCompanySchema } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { useCompany } from "@/hooks/use-company";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Check, Edit, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Define the form data type
type CompanyFormData = {
  name: string;
  code: string;
  companyType: string;
  taxId?: string;
  address?: string;
  phone?: string;
  email?: string;
  industry?: string;
  baseCurrency: string;
  fiscalYear: string;
};

export default function Companies() {
  const { companies, activeCompany, setActiveCompany, isLoading: isCompanyLoading } = useCompany();
  const { toast } = useToast();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  
  // Form for creating a new company
  const createForm = useForm<CompanyFormData>({
    resolver: zodResolver(insertCompanySchema),
    defaultValues: {
      companyType: "distributor",
      baseCurrency: "USD",
      fiscalYear: "calendar"
    }
  });
  
  // Form for editing an existing company
  const editForm = useForm<CompanyFormData>({
    resolver: zodResolver(insertCompanySchema.partial())
  });
  
  // Create company mutation
  const createCompanyMutation = useMutation({
    mutationFn: async (data: CompanyFormData) => {
      console.log("Creating company with data:", data);
      
      const response = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include"
      });
      
      const responseText = await response.text();
      console.log("API response:", response.status, responseText);
      
      if (!response.ok) {
        try {
          const errorData = JSON.parse(responseText);
          throw new Error(errorData.message || `Server error: ${response.status}`);
        } catch (e) {
          throw new Error(`Error ${response.status}: ${responseText || response.statusText}`);
        }
      }
      
      return responseText ? JSON.parse(responseText) : {};
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      toast({
        title: "Company created",
        description: "The company was created successfully."
      });
      setIsCreateModalOpen(false);
      createForm.reset({
        companyType: "distributor",
        baseCurrency: "USD",
        fiscalYear: "calendar"
      });
    },
    onError: (error: Error) => {
      console.error("Company creation error:", error);
      toast({
        title: "Error",
        description: `Failed to create company: ${error.message}`,
        variant: "destructive"
      });
    }
  });
  
  // Update company mutation
  const updateCompanyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CompanyFormData }) => {
      const response = await fetch(`/api/companies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include"
      });
      
      const responseText = await response.text();
      
      if (!response.ok) {
        try {
          const errorData = JSON.parse(responseText);
          throw new Error(errorData.message || `Server error: ${response.status}`);
        } catch (e) {
          throw new Error(`Error ${response.status}: ${responseText || response.statusText}`);
        }
      }
      
      return responseText ? JSON.parse(responseText) : {};
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      toast({
        title: "Company updated",
        description: "The company was updated successfully."
      });
      setIsEditModalOpen(false);
      setEditingCompany(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update company: ${error.message}`,
        variant: "destructive"
      });
    }
  });
  
  // Handle create form submission
  const handleCreateSubmit = createForm.handleSubmit((data) => {
    console.log("Form submitted with data:", data);
    createCompanyMutation.mutate(data);
  });
  
  // Handle edit form submission
  const handleEditSubmit = editForm.handleSubmit((data) => {
    if (editingCompany) {
      updateCompanyMutation.mutate({ id: editingCompany.id, data });
    }
  });
  
  // Setup edit form with company data
  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
    
    editForm.reset({
      name: company.name,
      code: company.code,
      companyType: company.companyType,
      taxId: company.taxId || undefined,
      address: company.address || undefined,
      phone: company.phone || undefined,
      email: company.email || undefined,
      industry: company.industry || undefined,
      baseCurrency: company.baseCurrency,
      fiscalYear: company.fiscalYear
    });
    
    setIsEditModalOpen(true);
  };
  
  // Set active company
  const handleSetActiveCompany = async (company: Company) => {
    try {
      await setActiveCompany(company);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to switch company",
        variant: "destructive"
      });
    }
  };
  
  // Loading state
  if (isCompanyLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-gray-500">Loading companies...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div>
      {/* Header with add button */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Companies</h1>
        <div className="flex space-x-2">
          <Button 
            variant="outline"
            onClick={() => window.location.href = "/simple-company-create"}
          >
            Use Simple Form
          </Button>
          <Button 
            variant="outline"
            onClick={() => window.location.href = "/direct-company-form"}
          >
            Use Direct Form
          </Button>
          <Button 
            variant="default"
            className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700"
            onClick={() => window.location.href = "/complete-company-form"}
          >
            Complete Setup
          </Button>
          <Button 
            variant="default"
            className="bg-gradient-to-r from-green-500 to-teal-600 text-white hover:from-green-600 hover:to-teal-700"
            onClick={() => window.location.href = "/basic-company-form"}
          >
            Basic Setup
          </Button>
          <Button 
            variant="destructive"
            className="bg-gradient-to-r from-red-500 to-amber-500 text-white hover:from-red-600 hover:to-amber-600"
            onClick={() => window.location.href = "/emergency-company"}
          >
            Emergency Mode
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Company
          </Button>
        </div>
      </div>
      
      {/* No companies state */}
      {companies.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700">No Companies Found</h3>
            <p className="text-gray-500 text-center mt-2 max-w-md">
              You don't have any companies yet. Create your first company to get started with the accounting system.
            </p>
            <Button className="mt-6" onClick={() => setIsCreateModalOpen(true)}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Create First Company
            </Button>
          </CardContent>
        </Card>
      ) : (
        // Companies table
        <Card>
          <CardHeader>
            <CardTitle>Your Companies</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium">{company.name}</TableCell>
                    <TableCell>{company.code}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {company.companyType}
                      </Badge>
                    </TableCell>
                    <TableCell>{company.industry || "-"}</TableCell>
                    <TableCell>{company.baseCurrency}</TableCell>
                    <TableCell>
                      {company.isActive ? (
                        <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100 hover:text-green-800">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleEditCompany(company)}
                          title="Edit Company"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {activeCompany?.id === company.id ? (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-green-600 border-green-200" 
                            disabled
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Active
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleSetActiveCompany(company)}
                          >
                            Set Active
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      
      {/* Create Company Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Create New Company</DialogTitle>
            <DialogDescription>
              Fill out the form below to create a new company.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit}>
            <div className="grid gap-4 py-4">
              {/* Company Name */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Company Name*
                </Label>
                <div className="col-span-3">
                  <Input
                    id="name"
                    {...createForm.register("name")}
                    placeholder="Acme Inc."
                    className={createForm.formState.errors.name ? "border-red-500" : ""}
                  />
                  {createForm.formState.errors.name && (
                    <p className="text-red-500 text-xs mt-1">{createForm.formState.errors.name.message}</p>
                  )}
                </div>
              </div>
              
              {/* Company Code */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="code" className="text-right">
                  Company Code*
                </Label>
                <div className="col-span-3">
                  <Input
                    id="code"
                    {...createForm.register("code")}
                    placeholder="ACME"
                    className={createForm.formState.errors.code ? "border-red-500" : ""}
                  />
                  {createForm.formState.errors.code && (
                    <p className="text-red-500 text-xs mt-1">{createForm.formState.errors.code.message}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    A short unique code for your company (used in documents)
                  </p>
                </div>
              </div>
              
              {/* Company Type */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="companyType" className="text-right">
                  Company Type*
                </Label>
                <div className="col-span-3">
                  <Select
                    defaultValue={createForm.getValues("companyType")}
                    onValueChange={(value) => createForm.setValue("companyType", value, { shouldValidate: true })}
                  >
                    <SelectTrigger 
                      id="companyType" 
                      className={createForm.formState.errors.companyType ? "border-red-500" : ""}
                    >
                      <SelectValue placeholder="Select company type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manufacturer">Manufacturer</SelectItem>
                      <SelectItem value="plant">Plant</SelectItem>
                      <SelectItem value="distributor">Distributor</SelectItem>
                      <SelectItem value="relaypoint">Relaypoint</SelectItem>
                      <SelectItem value="dealer">Dealer</SelectItem>
                      <SelectItem value="carwash">CarWash</SelectItem>
                      <SelectItem value="alds">Alds</SelectItem>
                      <SelectItem value="lubs">Lubs</SelectItem>
                      <SelectItem value="customerentity">CustomerEntity</SelectItem>
                    </SelectContent>
                  </Select>
                  {createForm.formState.errors.companyType && (
                    <p className="text-red-500 text-xs mt-1">{createForm.formState.errors.companyType.message}</p>
                  )}
                </div>
              </div>
              
              {/* Tax ID */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="taxId" className="text-right">
                  Tax ID
                </Label>
                <Input
                  id="taxId"
                  {...createForm.register("taxId")}
                  placeholder="12-3456789"
                  className="col-span-3"
                />
              </div>
              
              {/* Industry */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="industry" className="text-right">
                  Industry
                </Label>
                <Input
                  id="industry"
                  {...createForm.register("industry")}
                  placeholder="Manufacturing"
                  className="col-span-3"
                />
              </div>
              
              {/* Base Currency */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="baseCurrency" className="text-right">
                  Base Currency
                </Label>
                <Input
                  id="baseCurrency"
                  {...createForm.register("baseCurrency")}
                  placeholder="USD"
                  defaultValue="USD"
                  className="col-span-3"
                />
              </div>
              
              {/* Hidden fiscal year field */}
              <input 
                type="hidden" 
                {...createForm.register("fiscalYear")} 
                defaultValue="calendar" 
              />
            </div>
            
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
                disabled={createCompanyMutation.isPending}
              >
                {createCompanyMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Company"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Company Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Edit Company</DialogTitle>
            <DialogDescription>
              Update your company information below.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="grid gap-4 py-4">
              {/* Company Name */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  Company Name*
                </Label>
                <div className="col-span-3">
                  <Input
                    id="edit-name"
                    {...editForm.register("name")}
                    className={editForm.formState.errors.name ? "border-red-500" : ""}
                  />
                  {editForm.formState.errors.name && (
                    <p className="text-red-500 text-xs mt-1">{editForm.formState.errors.name.message}</p>
                  )}
                </div>
              </div>
              
              {/* Company Code */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-code" className="text-right">
                  Company Code*
                </Label>
                <div className="col-span-3">
                  <Input
                    id="edit-code"
                    {...editForm.register("code")}
                    className={editForm.formState.errors.code ? "border-red-500" : ""}
                  />
                  {editForm.formState.errors.code && (
                    <p className="text-red-500 text-xs mt-1">{editForm.formState.errors.code.message}</p>
                  )}
                </div>
              </div>
              
              {/* Company Type */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-companyType" className="text-right">
                  Company Type*
                </Label>
                <div className="col-span-3">
                  <Select
                    defaultValue={editForm.getValues("companyType")}
                    onValueChange={(value) => editForm.setValue("companyType", value, { shouldValidate: true })}
                  >
                    <SelectTrigger id="edit-companyType" className={editForm.formState.errors.companyType ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select company type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manufacturer">Manufacturer</SelectItem>
                      <SelectItem value="plant">Plant</SelectItem>
                      <SelectItem value="distributor">Distributor</SelectItem>
                    </SelectContent>
                  </Select>
                  {editForm.formState.errors.companyType && (
                    <p className="text-red-500 text-xs mt-1">{editForm.formState.errors.companyType.message}</p>
                  )}
                </div>
              </div>
              
              {/* Tax ID */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-taxId" className="text-right">
                  Tax ID
                </Label>
                <Input
                  id="edit-taxId"
                  {...editForm.register("taxId")}
                  className="col-span-3"
                />
              </div>
              
              {/* Industry */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-industry" className="text-right">
                  Industry
                </Label>
                <Input
                  id="edit-industry"
                  {...editForm.register("industry")}
                  className="col-span-3"
                />
              </div>
              
              {/* Base Currency */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-baseCurrency" className="text-right">
                  Base Currency
                </Label>
                <Input
                  id="edit-baseCurrency"
                  {...editForm.register("baseCurrency")}
                  className="col-span-3"
                />
              </div>
            </div>
            
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
                disabled={updateCompanyMutation.isPending}
              >
                {updateCompanyMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Company"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}