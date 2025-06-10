import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './use-auth';
import { useTenant } from './use-tenant';

export interface Company {
  id: number;
  name: string;
  code?: string;
  type?: string;
  status?: string;
  tenantId?: number;
  description?: string;
}

interface TenantCompaniesContextType {
  companies: Company[];
  isLoading: boolean;
  error: Error | null;
  refreshCompanies: () => void;
}

const TenantCompaniesContext = createContext<TenantCompaniesContextType | null>(null);

export function TenantCompaniesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCompanies = async () => {
    if (!user?.tenantId) {
      console.log('No tenant ID available to fetch companies');
      setCompanies([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      console.log(`Fetching companies for tenant ID: ${user.tenantId}`);
      
      // Try to use our tenant-specific API first
      let response = await fetch(`/api/tenant-companies/${user.tenantId}`);
      
      // If that fails, use the default companies API
      if (!response.ok) {
        console.log('Tenant companies API failed, falling back to standard companies API');
        response = await fetch('/api/companies');
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch companies: ${response.status}`);
      }
      
      const data = await response.json();
      
      // If using standard API, filter by tenant ID
      let companiesList = Array.isArray(data) ? data : [];
      if (response.url.includes('/api/companies')) {
        companiesList = companiesList.filter(c => c.tenantId === user.tenantId);
      }
      
      console.log(`Found ${companiesList.length} companies for tenant ${user.tenantId}:`, companiesList);
      setCompanies(companiesList);
    } catch (err) {
      console.error('Error fetching tenant companies:', err);
      setError(err instanceof Error ? err : new Error('Unknown error fetching companies'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.tenantId) {
      fetchCompanies();
    }
  }, [user?.tenantId]);

  return (
    <TenantCompaniesContext.Provider
      value={{
        companies,
        isLoading,
        error,
        refreshCompanies: fetchCompanies
      }}
    >
      {children}
    </TenantCompaniesContext.Provider>
  );
}

export function useTenantCompanies() {
  const context = useContext(TenantCompaniesContext);
  if (!context) {
    throw new Error('useTenantCompanies must be used within a TenantCompaniesProvider');
  }
  return context;
}