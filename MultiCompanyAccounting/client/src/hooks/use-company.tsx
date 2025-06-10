import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Company } from "@shared/schema";
import { useAuth } from "./use-auth";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "./use-toast";

// Define a simplified company type for our temporary implementation
interface SimpleCompany {
  id: number;
  name: string;
  code: string;
  tenantId: number;
}

interface CompanyContextType {
  companies: SimpleCompany[];
  activeCompany: SimpleCompany | null;
  setActiveCompany: (company: SimpleCompany) => void;
  isLoading: boolean;
}

const CompanyContext = createContext<CompanyContextType | null>(null);

export const CompanyProvider = ({ children }: { children: ReactNode }) => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  
  // Log raw authentication data
  useEffect(() => {
    console.log('🔄 CompanyProvider - Raw auth data:', user);
    
    // Check if we have a properly structured user object
    const isValidUser = user && typeof user === 'object' && 'id' in user;
    console.log('🔍 CompanyProvider - Is valid user object:', isValidUser);
    
    if (isValidUser) {
      console.log('✅ CompanyProvider - Valid user data:', {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email
      });
    } else {
      console.log('❌ CompanyProvider - Invalid user data structure');
    }
  }, [user]);
  
  const [companies, setCompanies] = useState<SimpleCompany[]>([]);
  const [isCompaniesLoading, setIsCompaniesLoading] = useState<boolean>(false);
  const [activeCompany, setActiveCompanyState] = useState<SimpleCompany | null>(null);
  
  // Fetch companies from API when user logs in
  useEffect(() => {
    // Add clear console log to track execution
    console.log('🔄 use-company effect executed:', { 
      hasUser: !!user,
      userType: user ? typeof user : 'null',
      isObject: user && typeof user === 'object',
      keys: user && typeof user === 'object' ? Object.keys(user) : []
    });
    
    // Check if user is a response object from auth/me that contains nested user data
    const userData = user && typeof user === 'object' && 'user' in user ? user.user : user;
    
    console.log('🔍 Extracted user data:', userData);
    
    // Always fetch companies for demo, whether we have a user or not
    setIsCompaniesLoading(true);
    
    // Use direct API URL without query params for demo
    const apiUrl = `/api/companies`;
    console.log('🌐 Fetching from URL:', apiUrl);
    
    // Use simplified fetch approach for demo
    fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })
      .then(res => {
        console.log('🔑 Companies API response status:', res.status);
        if (!res.ok) {
          throw new Error(`API returned ${res.status}: ${res.statusText}`);
        }
        return res.json();
      })
      .then(data => {
        console.log('✅ Companies API response data:', data);
        if (Array.isArray(data)) {
          console.log('✅ Fetched companies:', data.length, 'items');
          
          // Format the data to match our SimpleCompany interface
          const formattedCompanies = data.map(company => ({
            id: company.id,
            name: company.name,
            code: company.code || company.name.substring(0, 5).toLowerCase(),
            tenantId: company.tenant_id || 2 // Default to tenant ID 2 if not provided
          }));
          
          setCompanies(formattedCompanies);
          
          // If we have an array but it's empty, show a toast
          if (data.length === 0) {
            console.warn('⚠️ No companies returned from API');
            toast({
              title: "Warning",
              description: "No companies available for your account.",
              variant: "destructive"
            });
          }
        } else {
          console.error('❌ Invalid companies data format:', data);
          toast({
            title: "Error",
            description: "Invalid companies data format received from server.",
            variant: "destructive"
          });
        }
        setIsCompaniesLoading(false);
      })
      .catch(err => {
        console.error('❌ Error fetching companies:', err);
        setIsCompaniesLoading(false);
        toast({
          title: "Error",
          description: "Failed to fetch companies. Please try again.",
          variant: "destructive"
        });
      });
  }, [user, toast]);
  
  // Set default company when user logs in
  useEffect(() => {
    // Check if user is a response object that contains nested user data
    const userData = user && typeof user === 'object' && 'user' in user ? user.user : user;
    
    console.log('Companies/activeCompany state changed:', { 
      userExists: !!userData, 
      companiesCount: companies.length, 
      activeCompanyExists: !!activeCompany 
    });
    
    if (userData && !activeCompany && companies.length > 0) {
      // Set first company as default
      const defaultCompany = companies[0];
      console.log('✅ Setting default company:', defaultCompany);
      setActiveCompanyState(defaultCompany);
    }
  }, [user, activeCompany, companies]);
  
  // Function to set active company
  const setActiveCompany = (company: SimpleCompany) => {
    setActiveCompanyState(company);
    
    // Invalidate all data queries that depend on the company
    queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
    queryClient.invalidateQueries({ queryKey: ["/api/journal-entries"] });
    queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
    queryClient.invalidateQueries({ queryKey: ["/api/invoices/summary"] });
    queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
    queryClient.invalidateQueries({ queryKey: ["/api/bills/summary"] });
    queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
    queryClient.invalidateQueries({ queryKey: ["/api/sales-orders"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["/api/receipts/summary"] });
    queryClient.invalidateQueries({ queryKey: ["/api/payments/summary"] });
    queryClient.invalidateQueries({ queryKey: ["/api/recent-transactions"] });
    
    toast({
      title: "Company Changed",
      description: `Active company set to ${company.name}`,
    });
  };
  
  const value = {
    companies,
    activeCompany,
    setActiveCompany,
    isLoading: isAuthLoading || isCompaniesLoading,
  };
  
  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
};

export const useCompany = () => {
  console.log('🏢 useCompany hook called');
  const context = useContext(CompanyContext);
  if (!context) {
    console.error('❌ useCompany: No CompanyContext found!');
    throw new Error("useCompany must be used within CompanyProvider");
  }
  
  // Log what this hook is returning
  console.log('🏢 useCompany returning:', {
    companiesCount: context.companies.length,
    hasActiveCompany: !!context.activeCompany,
    isLoading: context.isLoading
  });
  
  return context;
};
