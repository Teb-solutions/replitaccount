import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./use-auth";

// Custom Tenant type that matches what we're using
interface Tenant {
  id: number;
  name: string;
  description: string;
  status: string;
}

interface TenantContextType {
  tenant: Tenant | null;
  isLoading: boolean;
}

const TenantContext = createContext<TenantContextType | null>(null);

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const { user, isLoading: isAuthLoading } = useAuth();
  
  // Extract tenant from session data
  console.log('🏢 Tenant provider - user data:', user);
  
  const tenant = user ? {
    id: user.tenantId || 2, // Default to tenant ID 2 for tebs
    name: "tebs", // Use hardcoded tenant name for now
    description: "TEBS Corporation",
    status: "active"
  } : null;
  
  console.log('🏢 Tenant provider - created tenant object:', tenant);
  
  const value = {
    tenant,
    isLoading: isAuthLoading,
  };
  
  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error("useTenant must be used within TenantProvider");
  }
  return context;
};
