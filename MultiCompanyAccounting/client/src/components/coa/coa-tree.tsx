import { useState } from "react";
import { ChevronRight, Edit, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Account } from "@shared/schema";

interface CoaTreeProps {
  accounts: Account[];
  onEditAccount: (account: Account) => void;
  onViewAccount?: (account: Account) => void;
}

export default function CoaTree({ accounts, onEditAccount, onViewAccount }: CoaTreeProps) {
  const [expandedAccounts, setExpandedAccounts] = useState<Record<number, boolean>>({});
  
  console.log("CoaTree received accounts:", JSON.stringify(accounts, null, 2));
  
  // Log sample account data for debugging
  if (accounts && accounts.length > 0) {
    console.log("Sample account format:", {
      id: accounts[0].id,
      code: accounts[0].code,
      name: accounts[0].name,
      balance: accounts[0].balance,
      balanceType: typeof accounts[0].balance
    });
  }
  
  // Group accounts by level and parent
  const accountsByParent: Record<string, Account[]> = {};
  
  // First, get all root accounts (level 1, no parent or level not specified)
  const rootAccounts = accounts.filter((account) => !account.parentId || account.level === 1);
  
  // Then group the rest by parent ID
  accounts.forEach((account) => {
    if (account.parentId) {
      const parentKey = account.parentId.toString();
      if (!accountsByParent[parentKey]) {
        accountsByParent[parentKey] = [];
      }
      accountsByParent[parentKey].push(account);
    }
  });
  
  // Sort children by code
  Object.keys(accountsByParent).forEach((parentId) => {
    accountsByParent[parentId].sort((a, b) => a.code.localeCompare(b.code));
  });
  
  const toggleExpand = (accountId: number) => {
    setExpandedAccounts((prev) => ({
      ...prev,
      [accountId]: !prev[accountId],
    }));
  };
  
  const renderAccount = (account: Account) => {
    const hasChildren = accountsByParent[account.id.toString()]?.length > 0;
    const isExpanded = expandedAccounts[account.id] ?? true; // Default to expanded
    
    return (
      <div key={account.id} className="mb-1">
        <div className={`flex items-center text-sm py-1.5 px-3 hover:bg-gray-100 rounded group ${account.level === 1 ? 'bg-gray-100 font-semibold py-2' : ''}`}>
          {hasChildren ? (
            <button 
              className="mr-2 focus:outline-none"
              onClick={() => toggleExpand(account.id)}
            >
              <ChevronRight 
                className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} 
              />
            </button>
          ) : (
            <span className="w-4 mr-2"></span>
          )}
          
          <span className="flex-1">{account.code} - {account.name}</span>
          
          <span className={`mr-4 font-medium ${
            // Handle both string and number types for balance
            (typeof account.balance === 'string' ? parseFloat(account.balance) : account.balance) !== 0 ? 
            (typeof account.balance === 'string' ? parseFloat(account.balance) : account.balance) > 0 ? 
              'text-green-600' : 'text-red-600'
            : 'text-gray-500'}`}>
            {formatCurrency(
              typeof account.balance === 'string' ? parseFloat(account.balance) : 
              typeof account.balance === 'number' ? account.balance : 0, 
              'USD'
            )}
          </span>
          
          <div className="flex space-x-1">
            {onViewAccount && (
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onViewAccount(account)}
              >
                <FileText className="h-3.5 w-3.5 text-gray-500" />
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onEditAccount(account)}
            >
              <Edit className="h-3.5 w-3.5 text-gray-500" />
            </Button>
          </div>
        </div>
        
        {hasChildren && isExpanded && (
          <ul className="ml-6 mt-1">
            {accountsByParent[account.id.toString()]?.map((childAccount) => (
              <li key={childAccount.id}>{renderAccount(childAccount)}</li>
            ))}
          </ul>
        )}
      </div>
    );
  };
  
  return (
    <div className="tree-view">
      {rootAccounts.length === 0 ? (
        <div className="text-center py-4 text-gray-500">
          <p>No accounts found.</p>
        </div>
      ) : (
        rootAccounts
          .sort((a, b) => (a.code || '').localeCompare(b.code || ''))
          .map(renderAccount)
      )}
    </div>
  );
}
