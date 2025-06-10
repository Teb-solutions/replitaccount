import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useTenant } from "@/hooks/use-tenant";
import { useCompany } from "@/hooks/use-company";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export default function Sidebar() {
  const [location] = useLocation();
  const { tenant, isLoading: isTenantLoading } = useTenant();
  const { companies, activeCompany, setActiveCompany, isLoading: isCompanyLoading } = useCompany();
  
  const handleCompanyChange = (companyId: string) => {
    const company = companies.find(c => c.id.toString() === companyId);
    if (company) {
      setActiveCompany(company);
    }
  };
  
  const isActive = (path: string) => {
    return location === path;
  };
  
  const menuItems = [
    {
      category: "Main",
      items: [
        { name: "Dashboard", icon: "ri-dashboard-line", path: "/" }
      ]
    },
    {
      category: "Inventory",
      items: [
        { name: "Products", icon: "ri-store-2-line", path: activeCompany ? `/company-products/${activeCompany.id}` : "/" },
        { name: "Products Dashboard", icon: "ri-dashboard-3-line", path: "/products-dashboard" },
        { name: "Tax Calculator", icon: "ri-percent-line", path: "/tax-calculator" }
      ]
    },
    {
      category: "Accounting",
      items: [
        { name: "Chart of Accounts", icon: "ri-book-open-line", path: "/chart-of-accounts" },
        { name: "Journal Entries", icon: "ri-file-list-3-line", path: "/journal-entries" },
        { name: "Banking", icon: "ri-bank-card-line", path: "/banking" }
      ]
    },
    {
      category: "Sales",
      items: [
        { name: "Sales Orders", icon: "ri-shopping-cart-line", path: "/sales-orders" },
        { name: "Invoices", icon: "ri-bill-line", path: "/invoices" },
        { name: "Credit Notes", icon: "ri-refund-2-line", path: "/credit-notes" },
        { name: "Delivery Notes", icon: "ri-truck-line", path: "/delivery-notes" }
      ]
    },
    {
      category: "Purchases",
      items: [
        { name: "Purchase Orders", icon: "ri-shopping-bag-line", path: "/purchase-orders" },
        { name: "Bills", icon: "ri-file-paper-2-line", path: "/bills" },
        { name: "Debit Notes", icon: "ri-refund-line", path: "/debit-notes" },
        { name: "Goods Receipts", icon: "ri-archive-line", path: "/goods-receipts" }
      ]
    },
    {
      category: "Intercompany",
      items: [
        { name: "Transactions", icon: "ri-exchange-line", path: "/intercompany-transactions" },
        { name: "Test Workflow", icon: "ri-test-tube-line", path: "/test-intercompany-workflow" }
      ]
    },
    {
      category: "Reports",
      items: [
        { name: "Financial Reports", icon: "ri-file-chart-line", path: "/financial-reports" }
      ]
    },
    {
      category: "Administration",
      items: [
        { name: "Companies", icon: "ri-building-line", path: "/companies" },
        { name: "Users & Roles", icon: "ri-user-settings-line", path: "/users" },
        { name: "Payment Terms", icon: "ri-calendar-check-line", path: "/payment-terms" },
        { name: "Settings", icon: "ri-settings-line", path: "/settings" }
      ]
    }
  ];
  
  return (
    <aside className="w-64 bg-white shadow-md h-full flex-shrink-0 overflow-y-auto z-20">
      <div className="px-4 py-5 border-b">
        <h1 className="text-lg font-semibold text-gray-800">AccountEdge</h1>
        <div className="flex items-center mt-1">
          {isTenantLoading ? (
            <Skeleton className="h-2 w-32" />
          ) : (
            <>
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              <span className="text-sm text-gray-500">
                Tenant: <span className="font-medium">{tenant?.name || "Unknown"}</span>
              </span>
            </>
          )}
        </div>
      </div>

      {/* Company Selector */}
      <div className="px-4 py-3 border-b">
        <label className="text-xs font-medium text-gray-500 block mb-1">Current Company</label>
        <div className="relative">
          {isCompanyLoading ? (
            <Skeleton className="h-9 w-full" />
          ) : (
            <Select 
              value={activeCompany?.id.toString()} 
              onValueChange={handleCompanyChange}
            >
              <SelectTrigger className="w-full rounded-md border-gray-300 bg-gray-100 py-2 px-3 text-sm font-medium">
                <SelectValue placeholder="Select a company" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id.toString()}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="mt-2">
        {menuItems.map((menuGroup, groupIndex) => (
          <div key={groupIndex}>
            <div className="px-3 py-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {menuGroup.category}
              </span>
            </div>
            
            {menuGroup.items.map((item, itemIndex) => (
              <Link 
                key={itemIndex} 
                href={item.path}
                className={`sidebar-item ${isActive(item.path) ? "active" : ""}`}
              >
                <i className={`${item.icon} sidebar-icon`}></i>
                <span>{item.name}</span>
              </Link>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
