import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function DirectCompanyForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState("");
  const [formData, setFormData] = useState({
    name: "Test Company",
    code: "TEST",
    companyType: "manufacturer",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResponse("");

    try {
      console.log("Submitting data to direct endpoint:", formData);
      
      // Get the CSRF token if needed
      const csrfResponse = await fetch("/api/auth/me", {
        credentials: "include"
      });
      console.log("CSRF response status:", csrfResponse.status);
      
      const response = await fetch("/api/direct-create-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        credentials: "include"
      });

      const responseText = await response.text();
      setResponse(`Status: ${response.status}\nResponse: ${responseText}`);
      console.log("Response status:", response.status);
      console.log("Response text:", responseText);

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        result = { success: false, message: "Failed to parse response as JSON" };
      }

      if (!response.ok || !result.success) {
        toast({
          title: "Error creating company",
          description: result.message || "Server error",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success!",
        description: "Company created successfully",
      });

    } catch (error: any) {
      console.error("Error:", error);
      setResponse(`Error: ${error?.message || "An unexpected error occurred"}`);
      toast({
        title: "Error",
        description: error?.message || "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testEndpoints = async () => {
    setResponse("Testing endpoints...\n");
    setIsLoading(true);
    
    try {
      // Test /api/auth/me
      const authResponse = await fetch("/api/auth/me", {
        credentials: "include"
      });
      const authData = await authResponse.text();
      setResponse(prev => `${prev}\n/api/auth/me: ${authResponse.status}\n${authData}\n`);
      
      // Test session
      const activeCompanyResponse = await fetch("/api/active-company", {
        credentials: "include" 
      });
      const activeCompanyData = await activeCompanyResponse.text();
      setResponse(prev => `${prev}\n/api/active-company: ${activeCompanyResponse.status}\n${activeCompanyData}\n`);
      
    } catch (error: any) {
      setResponse(prev => `${prev}\nError: ${error?.message}\n`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-md mx-auto mb-6">
        <CardHeader>
          <CardTitle>Direct SQL Company Creation</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Company Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Company Code</Label>
              <Input
                id="code"
                name="code" 
                value={formData.code}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyType">Company Type</Label>
              <Select
                value={formData.companyType}
                onValueChange={(value) => handleSelectChange("companyType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select company type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manufacturer">Manufacturer</SelectItem>
                  <SelectItem value="plant">Plant</SelectItem>
                  <SelectItem value="distributor">Distributor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <CardFooter className="px-0 pt-3">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Company"
                )}
              </Button>
            </CardFooter>
          </form>
        </CardContent>
      </Card>

      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Test Auth Endpoints</CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            className="w-full mb-4" 
            variant="outline"
            onClick={testEndpoints}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              "Test Auth Endpoints"
            )}
          </Button>
          
          {response && (
            <div className="mt-4 p-4 bg-gray-100 rounded-md overflow-auto max-h-80">
              <pre className="whitespace-pre-wrap text-sm">{response}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}