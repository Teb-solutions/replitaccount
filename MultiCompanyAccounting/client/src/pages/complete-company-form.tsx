import React, { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

// Form schema
const formSchema = z.object({
  name: z.string().min(2, "Company name must be at least 2 characters"),
  code: z.string().min(2, "Company code must be at least 2 characters"),
  companyType: z.enum(["manufacturer", "plant", "distributor"], {
    required_error: "Company type is required",
  }),
  baseCurrency: z.string().default("USD"),
  fiscalYear: z.string().default("calendar"),
});

type FormValues = z.infer<typeof formSchema>;

export default function CompleteCompanyForm() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [isCreatingAccounts, setIsCreatingAccounts] = useState(false);
  
  // Redirect if not logged in
  if (!user) {
    setLocation("/auth");
    return null;
  }
  
  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      code: "",
      companyType: "manufacturer" as const,
      baseCurrency: "USD",
      fiscalYear: "calendar",
    },
  });
  
  // Create company mutation
  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      console.log("Creating company with data:", data);
      setIsCreatingAccounts(true);
      const response = await apiRequest("POST", "/api/complete-company-create", data);
      return await response.json();
    },
    onSuccess: (data) => {
      console.log("Company created successfully:", data);
      setIsCreatingAccounts(false);
      
      if (data.success) {
        toast({
          title: "Success!",
          description: data.message || "Company created successfully",
        });
        
        // Invalidate companies cache to refresh the companies list
        queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
        
        // Navigate to companies list
        setLocation("/companies");
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to create company",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      console.error("Error creating company:", error);
      setIsCreatingAccounts(false);
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (data: FormValues) => {
    createMutation.mutate(data);
  };
  
  return (
    <div className="container mx-auto py-10">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-lg">
            <CardTitle className="text-2xl">Create New Company</CardTitle>
            <CardDescription className="text-blue-100 mt-2">
              Complete company setup with chart of accounts
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Company Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name*</FormLabel>
                      <FormControl>
                        <Input placeholder="ACME Manufacturing" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Company Code */}
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Code*</FormLabel>
                      <FormControl>
                        <Input placeholder="ACME" {...field} />
                      </FormControl>
                      <p className="text-sm text-gray-500 mt-1">
                        A unique code that identifies this company (used in documents)
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Company Type */}
                <FormField
                  control={form.control}
                  name="companyType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Type*</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select company type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="manufacturer">Manufacturer</SelectItem>
                          <SelectItem value="plant">Plant</SelectItem>
                          <SelectItem value="distributor">Distributor</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Base Currency */}
                <FormField
                  control={form.control}
                  name="baseCurrency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base Currency</FormLabel>
                      <FormControl>
                        <Input placeholder="USD" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="pt-4">
                  {isCreatingAccounts && (
                    <div className="flex items-center justify-center py-4 bg-blue-50 rounded-md mb-4">
                      <div className="flex flex-col items-center">
                        <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-2" />
                        <p className="text-blue-700 font-medium">
                          Creating company and setting up chart of accounts...
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setLocation("/companies")}
                      disabled={createMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending}
                    >
                      {createMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Company"
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </CardContent>
          {!isCreatingAccounts && (
            <CardFooter className="bg-gray-50 rounded-b-lg px-6 py-4">
              <div className="text-sm text-gray-600">
                <p className="font-medium mb-1">This will create:</p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  <li>A new company with your specified details</li>
                  <li>A complete chart of accounts with standard accounts</li>
                  <li>All necessary accounts for AR/AP and financial reporting</li>
                </ul>
              </div>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}