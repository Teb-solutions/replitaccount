import React, { useState } from "react";
import { useLocation } from "wouter";
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

export default function SuperBasicCompany() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  
  // Form state
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [companyType, setCompanyType] = useState("manufacturer");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  
  // Redirect if not logged in
  if (!user) {
    setLocation("/auth");
    return null;
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLogs([]);
    
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
    setLogs(prev => [...prev, "Starting company creation process..."]);
    
    try {
      // Direct API call with no validation
      const response = await fetch("/api/super-basic-company", {
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
      
      // Add logs from response
      if (data.logs && Array.isArray(data.logs)) {
        setLogs(prev => [...prev, ...data.logs]);
      }
      
      // Success!
      toast({
        title: "Success!",
        description: `Company "${name}" created successfully`,
      });
      
      // Redirect to companies page after 3 seconds to show logs
      setTimeout(() => {
        setLocation("/companies");
      }, 3000);
      
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
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-700 text-white">
            <CardTitle className="text-2xl">Emergency Company Creation</CardTitle>
            <CardDescription className="text-purple-100">
              Direct database company creation (for emergencies only)
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 p-3 rounded-md text-red-700 text-sm mb-4 border border-red-200">
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
              
              {logs.length > 0 && (
                <div className="mt-6 bg-gray-50 p-4 rounded-md border border-gray-200">
                  <p className="font-medium text-gray-700 mb-2">Process Log:</p>
                  <div className="bg-black text-green-400 p-3 rounded font-mono text-xs overflow-auto max-h-40">
                    {logs.map((log, i) => (
                      <div key={i} className="mb-1">
                        {`> ${log}`}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
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
          
          <CardFooter className="bg-gray-50 text-sm text-gray-600 flex-col items-start">
            <p className="text-orange-600 font-medium mb-1">Emergency Use Only</p>
            <p>
              This form bypasses all validation and directly creates a company in the database.
              Use only if other company creation methods fail.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}