import { createContext, useContext, ReactNode } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult
} from "@tanstack/react-query";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { User, loginSchema, registerSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, RegisterData>;
};

type LoginData = {
  email: string;
  password: string;
};

type RegisterData = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: authResponse,
    error,
    isLoading,
  } = useQuery<any, Error>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" })
  });
  
  // Log the auth response to debug structure
  console.log('🔐 Auth response:', authResponse);
  
  // Extract user from auth response with detailed logging
  const user = authResponse && authResponse.user 
    ? authResponse.user 
    : (authResponse && !('user' in authResponse) && 'id' in authResponse 
        ? authResponse 
        : null);
  
  // Debug user extraction logic
  console.log('👤 User extraction logic:', {
    hasAuthResponse: !!authResponse,
    hasUserProperty: authResponse ? 'user' in authResponse : false,
    hasUserValue: authResponse && authResponse.user ? !!authResponse.user : false,
    hasIdProperty: authResponse ? 'id' in authResponse : false
  });
        
  console.log('👤 Extracted user:', user);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/auth/login", credentials);
      const data = await res.json();
      console.log("Login response:", data);
      return data.user;
    },
    onSuccess: (user: User) => {
      // Update the auth state with the user data in the format API/me returns
      queryClient.setQueryData(["/api/auth/me"], {
        authenticated: true,
        user: user
      });
      
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.name}!`,
      });
      
      // Force a refresh of the auth state to ensure the redirect happens
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterData) => {
      const res = await apiRequest("POST", "/api/auth/register", credentials);
      const data = await res.json();
      return data.user;
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/auth/me"], {
        authenticated: true,
        user: user
      });
      toast({
        title: "Registration successful",
        description: `Welcome, ${user.name}!`,
      });
      
      // Force a refresh of the auth state to ensure the redirect happens
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], null);
      toast({
        title: "Logout successful",
        description: "You have been logged out successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
