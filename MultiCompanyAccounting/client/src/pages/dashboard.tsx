import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCompany } from "@/hooks/use-company";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatsCard from "@/components/dashboard/stats-card";
import RecentTransactions from "@/components/dashboard/recent-transactions";
import CashFlow from "@/components/dashboard/cash-flow";
import ProfitLoss from "@/components/dashboard/profit-loss";
import PendingActions from "@/components/dashboard/pending-actions";
import QuickActions from "@/components/dashboard/quick-actions";
import SalesOrdersSummary from "@/components/dashboard/sales-orders-summary";
import InvoiceReceiptSummary from "@/components/dashboard/invoice-receipt-summary";
import CompanyBalances from "@/components/dashboard/company-balances";
import TenantSummary from "@/components/dashboard/tenant-summary";
import IntercompanyBalances from "@/components/dashboard/intercompany-balances";
import { DebugDashboard } from "@/components/debug-dashboard";
import { Loader2 } from "lucide-react";
import { Link } from "wouter";

// Dashboard data types
export interface StatsData {
  revenue: { amount: number; change: number; changeType: 'increase' | 'decrease' | 'neutral' };
  expenses: { amount: number; change: number; changeType: 'increase' | 'decrease' | 'neutral' };
  receivables: { amount: number; count: number };
  payables: { amount: number; count: number };
}

export interface PLDataPoint {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface CashFlowDataPoint {
  date: string;
  inflow: number;
  outflow: number;
  balance: number;
}

export interface DashboardTransaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  type: string;
  status?: string;
}

export interface DashboardPendingAction {
  id: number;
  type: string;
  description: string;
  dueDate?: string;
  priority: string;
  title?: string;
  count?: number;
  icon?: string;
  iconBg?: string;
}

export default function Dashboard() {
  const { activeCompany, isLoading: isCompanyLoading } = useCompany();
  
  // Use the defined types with appropriate default values
  const { data: stats, isLoading: isStatsLoading } = useQuery<StatsData, Error>({
    queryKey: ["/api/dashboard/stats", activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) throw new Error("No active company");
      const res = await fetch(`/api/dashboard/stats?companyId=${activeCompany.id}`);
      if (!res.ok) throw new Error("Failed to fetch dashboard stats");
      return res.json();
    },
    enabled: !!activeCompany,
  });
  
  const defaultStats: StatsData = {
    revenue: { amount: 0, change: 0, changeType: 'neutral' },
    expenses: { amount: 0, change: 0, changeType: 'neutral' },
    receivables: { amount: 0, count: 0 },
    payables: { amount: 0, count: 0 }
  };

  const { data: pendingActions, isLoading: isActionsLoading } = useQuery<DashboardPendingAction[], Error>({
    queryKey: ["/api/dashboard/pending-actions", activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return [];
      const res = await fetch(`/api/dashboard/pending-actions?companyId=${activeCompany.id}`);
      if (!res.ok) throw new Error("Failed to fetch pending actions");
      return res.json();
    },
    enabled: !!activeCompany,
  });
  
  const { data: plData, isLoading: isPLDataLoading } = useQuery<PLDataPoint[], Error>({
    queryKey: ["/api/dashboard/pl-monthly", activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return [];
      const res = await fetch(`/api/dashboard/pl-monthly?companyId=${activeCompany.id}`);
      if (!res.ok) throw new Error("Failed to fetch P&L data");
      return res.json();
    },
    enabled: !!activeCompany,
  });
  
  const { data: cashFlowData, isLoading: isCashFlowLoading } = useQuery<CashFlowDataPoint[], Error>({
    queryKey: ["/api/dashboard/cash-flow", activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return [];
      const res = await fetch(`/api/dashboard/cash-flow?companyId=${activeCompany.id}`);
      if (!res.ok) throw new Error("Failed to fetch cash flow data");
      const data = await res.json();
      // Convert object response to array format expected by component
      if (data && !Array.isArray(data)) {
        return []; // Return empty array if not array data
      }
      return data || [];
    },
    enabled: !!activeCompany,
  });
  
  const { data: recentTransactions, isLoading: isTransactionsLoading } = useQuery<DashboardTransaction[], Error>({
    queryKey: ["/api/dashboard/recent-transactions", activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return [];
      const res = await fetch(`/api/dashboard/recent-transactions?companyId=${activeCompany.id}`);
      if (!res.ok) throw new Error("Failed to fetch recent transactions");
      return res.json();
    },
    enabled: !!activeCompany,
  });
  
  // Only show loading state for a short period
  const [showLoading, setShowLoading] = useState(true);
  
  useEffect(() => {
    // Set a timer to stop showing the loading indicator after 3 seconds
    const timer = setTimeout(() => {
      setShowLoading(false);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);
  
  if ((isCompanyLoading || !activeCompany) && showLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-gray-500">Loading company data...</p>
        </div>
      </div>
    );
  }
  
  // If we're still loading after the timeout, show a message with instructions
  if (!activeCompany && !showLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold mb-2">No Active Company Selected</h2>
          <p className="text-gray-600 mb-4">
            Please select a company from the Companies page or create a new one to get started.
          </p>
          <Link href="/companies">
            <Button>Go to Companies Page</Button>
          </Link>
        </div>
      </div>
    );
  }
  
  const isLoading = isStatsLoading || isActionsLoading || isPLDataLoading || isCashFlowLoading || isTransactionsLoading;
  
  return (
    <div>
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <StatsCard
              title="Revenue (MTD)"
              value={(stats?.revenue?.amount ?? defaultStats.revenue.amount)}
              change={(stats?.revenue?.change ?? defaultStats.revenue.change)}
              changeType={(stats?.revenue?.changeType ?? defaultStats.revenue.changeType)}
              icon="ri-line-chart-line"
              iconBg="primary-50"
              iconColor="primary-500"
            />
            <StatsCard
              title="Expenses (MTD)"
              value={(stats?.expenses?.amount ?? defaultStats.expenses.amount)}
              change={(stats?.expenses?.change ?? defaultStats.expenses.change)}
              changeType={(stats?.expenses?.changeType ?? defaultStats.expenses.changeType)}
              icon="ri-shopping-bag-line"
              iconBg="red-50"
              iconColor="red-500"
            />
            <StatsCard
              title="Receivables"
              value={(stats?.receivables?.amount ?? defaultStats.receivables.amount)}
              subtitle={`${stats?.receivables?.count ?? defaultStats.receivables.count} invoices pending`}
              icon="ri-funds-line"
              iconBg="blue-50"
              iconColor="blue-500"
            />
            <StatsCard
              title="Payables"
              value={(stats?.payables?.amount ?? defaultStats.payables.amount)}
              subtitle={`${stats?.payables?.count ?? defaultStats.payables.count} bills pending`}
              icon="ri-wallet-3-line"
              iconBg="amber-50"
              iconColor="amber-500"
            />
          </div>

          {/* Tenant Summary - Shows all companies in the tenant */}
          <div className="mb-6">
            <TenantSummary />
          </div>
          
          {/* Intercompany Balances - Shows accurate receivables and payables */}
          {/* We'll add this back once the component is properly implemented */}
          {/* <div className="mb-6">
            <IntercompanyBalances />
          </div> */}
          
          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="col-span-2 space-y-6">
              {/* Profit & Loss Summary */}
              <Card className="shadow-sm">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800">Monthly P&L Summary</h3>
                  <div className="flex space-x-2">
                    <select className="text-sm border-gray-300 rounded">
                      <option>Last 6 Months</option>
                      <option>Year to Date</option>
                      <option>Last 12 Months</option>
                    </select>
                  </div>
                </div>
                <div className="p-5 h-80">
                  <ProfitLoss data={plData ?? []} />
                </div>
              </Card>

              {/* Sales Orders Summary */}
              <SalesOrdersSummary />
              
              {/* Invoice and Receipt Summary */}
              <InvoiceReceiptSummary />
              
              {/* Recent Transactions */}
              <Card className="shadow-sm">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800">Recent Transactions</h3>
                  <button className="text-primary-500 text-sm font-medium hover:underline focus:outline-none">
                    View All
                  </button>
                </div>
                <RecentTransactions transactions={recentTransactions ?? []} />
              </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Company Balances */}
              <CompanyBalances />
              
              {/* Intercompany Balances */}
              <IntercompanyBalances />
              
              {/* Cash Flow */}
              <Card className="shadow-sm">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800">Cash Flow</h3>
                  <select className="text-sm border-gray-300 rounded">
                    <option>Last 30 Days</option>
                    <option>Last Quarter</option>
                    <option>Year to Date</option>
                  </select>
                </div>
                <div className="p-5 h-60">
                  <CashFlow data={cashFlowData ?? []} />
                </div>
              </Card>

              {/* Pending Actions */}
              <Card className="shadow-sm">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-800">Pending Actions</h3>
                </div>
                <div className="p-5">
                  <PendingActions actions={pendingActions ?? []} />
                </div>
              </Card>

              {/* Quick Links */}
              <Card className="shadow-sm">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-800">Quick Actions</h3>
                </div>
                <div className="p-5">
                  <QuickActions />
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
      {/* Add Debug Dashboard */}
      <DebugDashboard />
    </div>
  );
}
