import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";

export default function EmergencyCompanyPage() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setLogs(["Starting company creation process..."]);
    setError("");
    
    try {
      if (!name || !code || !companyType) {
        setError("All fields are required");
        setIsSubmitting(false);
        return;
      }
      
      // Get tenant ID from user
      const tenantId = user?.tenantId;
      
      if (!tenantId) {
        setError("Unable to determine tenant ID. Please make sure you're logged in.");
        setIsSubmitting(false);
        return;
      }
      
      setLogs(prev => [...prev, `Using tenant ID: ${tenantId}`]);
      setLogs(prev => [...prev, `Company Name: ${name}`]);
      setLogs(prev => [...prev, `Company Code: ${code}`]);
      setLogs(prev => [...prev, `Company Type: ${companyType}`]);
      setLogs(prev => [...prev, "Sending request to server..."]);
      
      const response = await fetch('/api/mega-simple-company', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          code,
          companyType,
          tenantId
        }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setLogs(prev => [...prev, "Request successful!"]);
        
        if (result.company) {
          setLogs(prev => [...prev, `Company created with ID: ${result.company.id}`]);
        }
        
        setSuccess(true);
        
        // Auto-redirect after successful creation
        setTimeout(() => {
          window.location.href = "/companies";
        }, 3000);
      } else {
        setLogs(prev => [...prev, "Request failed with error."]);
        setError(result.message || "Failed to create company");
      }
    } catch (err: any) {
      setLogs(prev => [...prev, `Error: ${err.message || "Unknown error"}`]);
      setError(`Error: ${err.message || "Unknown error occurred"}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const resetForm = () => {
    setName("");
    setCode("");
    setCompanyType("");
    setError("");
    setSuccess(false);
    setLogs([]);
  };

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Emergency Company Creation</CardTitle>
          <CardDescription>
            Create a company with minimal validation checks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Emergency Use Only</AlertTitle>
            <AlertDescription>
              This form bypasses normal validation and security checks. Use only when the standard company creation form doesn't work.
            </AlertDescription>
          </Alert>
          
          {success ? (
            <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
              <h3 className="text-green-800 font-medium">Company Created Successfully!</h3>
              <p className="text-green-700 mt-1">You will be redirected to the companies page in a few seconds.</p>
              <Button 
                variant="default" 
                className="mt-4" 
                onClick={() => window.location.href = "/companies"}
              >
                Go to Companies
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name</Label>
                <Input 
                  id="name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="ACME Corp" 
                  disabled={isSubmitting}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="code">Company Code</Label>
                <Input 
                  id="code" 
                  value={code} 
                  onChange={(e) => setCode(e.target.value)} 
                  placeholder="ACME" 
                  disabled={isSubmitting}
                  required
                />
                <p className="text-sm text-muted-foreground">Short unique code used in documents</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="companyType">Company Type</Label>
                <Select 
                  value={companyType} 
                  onValueChange={setCompanyType}
                  disabled={isSubmitting}
                  required
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
              
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-red-800">{error}</p>
                </div>
              )}
              
              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={resetForm}
                  disabled={isSubmitting}
                >
                  Reset
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create Company'}
                </Button>
              </div>
            </form>
          )}
          
          {logs.length > 0 && (
            <div className="mt-6">
              <h3 className="font-medium mb-2">Process Log</h3>
              <div className="bg-gray-900 text-gray-300 rounded-md p-4 font-mono text-sm overflow-auto max-h-60">
                {logs.map((log, i) => (
                  <div key={i} className="py-0.5">
                    &gt; {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}