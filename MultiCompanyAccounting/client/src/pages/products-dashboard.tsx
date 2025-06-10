import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ExternalLink, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/layout";
import { apiRequest } from "@/lib/queryClient";
import { useCompany } from "@/hooks/use-company";

export default function ProductsDashboard() {
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const { activeCompany, companies } = useCompany();

  const { data: companies_data, isLoading: isLoadingCompanies } = useQuery({
    queryKey: ['/api/v2/companies'],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/v2/companies`);
      return await response.json();
    },
    enabled: true
  });

  // Helper function to get the type label
  const getCompanyTypeLabel = (type: string) => {
    switch (type) {
      case 'manufacturer':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Manufacturer</Badge>;
      case 'distributor':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Distributor</Badge>;
      case 'plant':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Plant</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  if (isLoadingCompanies) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!companies_data || companies_data.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No Companies Found</AlertTitle>
            <AlertDescription>
              You need to create companies before managing products.
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Product Management</h1>
            <p className="text-muted-foreground">
              Manage products for all your companies
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies_data.map((company: any) => (
            <Card key={company.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{company.name}</CardTitle>
                    <CardDescription>Code: {company.code}</CardDescription>
                  </div>
                  {getCompanyTypeLabel(company.type)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Company Type:</span>
                    <span className="font-medium">{company.type}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="font-medium capitalize">{company.status}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/company-products/${company.id}`} className="flex items-center">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Manage Products
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}