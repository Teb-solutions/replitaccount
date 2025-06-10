import { useAuth } from "@/hooks/use-auth";
import { useCompany } from "@/hooks/use-company";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertCircle, Bell, Building, Menu, Settings, User, LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

interface HeaderProps {
  toggleSidebar: () => void;
}

export default function Header({ toggleSidebar }: HeaderProps) {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { companies, activeCompany, setActiveCompany } = useCompany();
  const { toast } = useToast();
  
  const handleLogout = () => {
    try {
      logoutMutation.mutate();
      // Navigate to login page manually to ensure proper redirect
      setTimeout(() => {
        window.location.href = '/auth';
      }, 200);
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "There was an error logging out. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Get the page title from the current location
  const getPageTitle = () => {
    if (location === "/") return "Dashboard";
    if (location === "/chart-of-accounts") return "Chart of Accounts";
    if (location === "/journal-entries") return "Journal Entries";
    if (location === "/banking") return "Banking";
    if (location === "/sales-orders") return "Sales Orders";
    if (location === "/invoices") return "Invoices";
    if (location === "/delivery-notes") return "Delivery Notes";
    if (location === "/purchase-orders") return "Purchase Orders";
    if (location === "/bills") return "Bills";
    if (location === "/goods-receipts") return "Goods Receipts";
    if (location === "/reports") return "Financial Reports";
    if (location === "/companies") return "Companies";
    if (location === "/users") return "Users & Roles";
    if (location === "/settings") return "Settings";
    
    return "Page";
  };
  
  // Get breadcrumb based on the current location
  const getBreadcrumb = () => {
    const segments = location.split("/").filter(Boolean);
    if (segments.length === 0) {
      return (
        <div className="flex items-center text-xs text-gray-500 mt-0.5">
          <span>Home</span>
          <i className="ri-arrow-right-s-line mx-1"></i>
          <span>Dashboard</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center text-xs text-gray-500 mt-0.5">
        <span>Home</span>
        {segments.map((segment, index) => (
          <span key={segment}>
            <i className="ri-arrow-right-s-line mx-1"></i>
            <span className="capitalize">{segment.replace(/-/g, " ")}</span>
          </span>
        ))}
      </div>
    );
  };
  
  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };
  
  return (
    <header className="bg-white shadow-sm z-10">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="text-gray-500">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="ml-6">
            <h2 className="text-lg font-semibold text-gray-800">{getPageTitle()}</h2>
            {getBreadcrumb()}
          </div>
        </div>
        
        <div className="flex items-center">
          {/* Company Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="mr-4">
                <Building className="h-4 w-4 mr-2" />
                {activeCompany ? activeCompany.name : 'Select Company'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Switch Company</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {companies && companies.length > 0 ? (
                companies.map((company) => (
                  <DropdownMenuItem 
                    key={company.id}
                    className={activeCompany?.id === company.id ? "bg-primary/10" : ""}
                    onClick={() => setActiveCompany(company)}
                  >
                    <div className="flex items-center">
                      <span className="font-medium">{company.name}</span>
                    </div>
                  </DropdownMenuItem>
                ))
              ) : (
                <div className="px-2 py-1.5 text-sm text-gray-500">No companies available</div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-gray-500 hover:bg-gray-100 hover:text-gray-700 rounded-full">
                <Bell className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="py-4 text-center text-sm text-gray-500">
                <AlertCircle className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                <p>No new notifications</p>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button variant="ghost" size="icon" className="text-gray-500 hover:bg-gray-100 hover:text-gray-700 rounded-full mx-1">
            <Settings className="h-5 w-5" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="ml-3 flex items-center">
                <Avatar className="h-8 w-8 mr-2">
                  <AvatarFallback className="bg-primary-500 text-white">
                    {user ? getInitials(user.name) : "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="ml-1 text-sm font-medium text-gray-700 hidden md:block">
                  {user?.name}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="h-4 w-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
