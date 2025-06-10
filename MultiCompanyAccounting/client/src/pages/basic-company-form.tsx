import React, { useState } from "react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function BasicCompanyForm() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  
  // Form state
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [companyType, setCompanyType] = useState("manufacturer");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  
  // Redirect if not logged in
  if (!user) {
    setLocation("/auth");
    return null;
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // Basic validation
    if (!name.trim()) {
      setError("Company name is required");
      return;
    }
    
    if (!code.trim()) {
      setError("Company code is required");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Super simple direct API call
      const response = await fetch("/api/basic-company", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim(),
          companyType
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to create company");
      }
      
      // Success!
      toast({
        title: "Success!",
        description: `Company "${name}" created successfully`,
      });
      
      // Invalidate companies cache
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      
      // Redirect to companies page
      setLocation("/companies");
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      toast({
        title: "Error",
        description: err.message || "Failed to create company",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="container mx-auto py-10">
      <div className="max-w-md mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-700 text-white">
            <CardTitle className="text-2xl">Create Basic Company</CardTitle>
            <CardDescription className="text-blue-100">
              Simplified company creation form
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 p-3 rounded-md text-red-700 text-sm mb-4">
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="name">Company Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ACME Corp"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="code">Company Code *</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="ACME"
                />
                <p className="text-xs text-gray-500">
                  Short unique code for your company (used in documents)
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="type">Company Type *</Label>
                <Select 
                  value={companyType} 
                  onValueChange={setCompanyType}
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select company type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manufacturer">Manufacturer</SelectItem>
                    <SelectItem value="plant">Plant</SelectItem>
                    <SelectItem value="distributor">Distributor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="pt-4 flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/companies")}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                
                <Button
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Company"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
          
          <CardFooter className="bg-gray-50 text-sm text-gray-600">
            <p>
              This is a simplified form for basic company creation.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}