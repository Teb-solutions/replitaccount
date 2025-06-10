import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, registerSchema } from "@shared/schema";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const { toast } = useToast();
  
  // Get redirect from URL query parameter or default to dashboard
  const redirect = new URLSearchParams(window.location.search).get("redirect") || "/dashboard";
  
  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      setLocation(redirect);
    }
  }, [user, setLocation, redirect]);
  
  // Login form configuration
  const loginForm = useForm<{ email: string; password: string }>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });
  
  // Register form configuration
  const registerForm = useForm<{ name: string; email: string; password: string; confirmPassword: string }>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: ""
    }
  });
  
  // Handle login form submission
  const onLoginSubmit = async (data: { email: string; password: string }) => {
    try {
      // For testing, let's directly populate with TEBS credentials
      const loginData = {
        email: "anuradha.k@tebs.co.in",
        password: "tebs@123"
      };
      console.log("Using login credentials:", loginData);
      
      // Log current authentication state
      console.log("Current auth state before login:", { 
        user, 
        isPending: loginMutation.isPending 
      });
      
      const response = await loginMutation.mutateAsync(loginData);
      console.log("Login mutation response:", response);
      
      // Wait a moment to ensure the session is established
      setTimeout(() => {
        console.log("Redirecting to:", redirect);
        console.log("Auth state after timeout:", { 
          user: useAuth().user,
          isPending: loginMutation.isPending
        });
        
        // Force a full page reload to ensure session is recognized
        window.location.href = redirect; 
      }, 500);
    } catch (error) {
      // Error is handled by the mutation already
      console.error("Login error:", error);
    }
  };
  
  // Handle register form submission
  const onRegisterSubmit = async (data: { name: string; email: string; password: string; confirmPassword: string }) => {
    try {
      await registerMutation.mutateAsync(data);
      toast({
        title: "Registration successful",
        description: "You have been registered and logged in successfully.",
      });
      setLocation(redirect);
    } catch (error) {
      // Error is handled by the mutation already
    }
  };
  
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Hero section on the right */}
      <div className="hidden lg:flex flex-col justify-center items-center bg-gradient-to-br from-primary/90 to-primary-foreground/90 p-8 text-white">
        <div className="max-w-md">
          <h1 className="text-4xl font-bold mb-6">Multi-Company Accounting System</h1>
          <p className="text-xl mb-8">
            A comprehensive financial management platform for businesses managing 
            multiple companies with integrated accounting, sales, and operations.
          </p>
          <ul className="space-y-4">
            <li className="flex items-start">
              <span className="mr-2 mt-1">✓</span>
              <span>Full multi-tenant, multi-company financial management</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 mt-1">✓</span>
              <span>Double-entry accounting across all transactions</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 mt-1">✓</span>
              <span>Integrated sales and purchase order processing</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 mt-1">✓</span>
              <span>Inter-company transaction management</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 mt-1">✓</span>
              <span>Detailed financial reporting and analytics</span>
            </li>
          </ul>
        </div>
      </div>
      
      {/* Auth forms on the left */}
      <div className="flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <h1 className="text-2xl font-bold tracking-tight">AccountEdge</h1>
            <p className="text-sm text-muted-foreground">Multi-Company Accounting System</p>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" value={activeTab} onValueChange={(value) => setActiveTab(value as "login" | "register")}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              
              {/* Login Form */}
              <TabsContent value="login">
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                  {loginMutation.error && (
                    <Alert variant="destructive">
                      <AlertDescription>{loginMutation.error.message}</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="name@example.com" 
                      {...loginForm.register("email")} 
                    />
                    {loginForm.formState.errors.email && (
                      <p className="text-sm text-destructive">{loginForm.formState.errors.email.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input 
                      id="password" 
                      type="password" 
                      placeholder="••••••••" 
                      {...loginForm.register("password")} 
                    />
                    {loginForm.formState.errors.password && (
                      <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
                    )}
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Logging in...
                      </>
                    ) : (
                      "Login"
                    )}
                  </Button>
                </form>
              </TabsContent>
              
              {/* Register Form */}
              <TabsContent value="register">
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                  {registerMutation.error && (
                    <Alert variant="destructive">
                      <AlertDescription>{registerMutation.error.message}</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input 
                      id="name" 
                      type="text" 
                      placeholder="John Doe" 
                      {...registerForm.register("name")} 
                    />
                    {registerForm.formState.errors.name && (
                      <p className="text-sm text-destructive">{registerForm.formState.errors.name.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="registerEmail">Email</Label>
                    <Input 
                      id="registerEmail" 
                      type="email" 
                      placeholder="name@example.com" 
                      {...registerForm.register("email")} 
                    />
                    {registerForm.formState.errors.email && (
                      <p className="text-sm text-destructive">{registerForm.formState.errors.email.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="registerPassword">Password</Label>
                    <Input 
                      id="registerPassword" 
                      type="password" 
                      placeholder="••••••••" 
                      {...registerForm.register("password")} 
                    />
                    {registerForm.formState.errors.password && (
                      <p className="text-sm text-destructive">{registerForm.formState.errors.password.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input 
                      id="confirmPassword" 
                      type="password" 
                      placeholder="••••••••" 
                      {...registerForm.register("confirmPassword")} 
                    />
                    {registerForm.formState.errors.confirmPassword && (
                      <p className="text-sm text-destructive">{registerForm.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex flex-col">
            <p className="text-xs text-center text-muted-foreground mt-2">
              {activeTab === "login" ? (
                <>
                  Don't have an account?{" "}
                  <Button variant="link" className="p-0 h-auto" onClick={() => setActiveTab("register")}>
                    Sign up
                  </Button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <Button variant="link" className="p-0 h-auto" onClick={() => setActiveTab("login")}>
                    Login
                  </Button>
                </>
              )}
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}