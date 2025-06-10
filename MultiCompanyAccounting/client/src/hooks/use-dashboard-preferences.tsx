import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useCompany } from "@/hooks/use-company";
import { apiRequest } from "@/lib/queryClient";

export interface DashboardWidget {
  id: string;
  name: string;
  type: string;
  order: number;
  size: 'small' | 'medium' | 'large';
  enabled: boolean;
  settings?: Record<string, any>;
}

export interface DashboardLayout {
  leftColumn: string[];
  rightColumn: string[];
}

interface DashboardPreferences {
  widgets: DashboardWidget[];
  layout: DashboardLayout;
}

const defaultWidgets: DashboardWidget[] = [
  { id: 'stats', name: 'Key Metrics', type: 'stats', order: 1, size: 'large', enabled: true },
  { id: 'pl-summary', name: 'P&L Summary', type: 'chart', order: 2, size: 'large', enabled: true },
  { id: 'sales-orders', name: 'Sales Orders', type: 'table', order: 3, size: 'large', enabled: true },
  { id: 'recent-transactions', name: 'Recent Transactions', type: 'table', order: 4, size: 'large', enabled: true },
  { id: 'cash-flow', name: 'Cash Flow', type: 'chart', order: 5, size: 'medium', enabled: true },
  { id: 'pending-actions', name: 'Pending Actions', type: 'list', order: 6, size: 'medium', enabled: true },
  { id: 'quick-actions', name: 'Quick Actions', type: 'buttons', order: 7, size: 'medium', enabled: true },
  { id: 'purchase-orders', name: 'Purchase Orders', type: 'table', order: 8, size: 'large', enabled: false },
  { id: 'receivables-summary', name: 'Receivables Summary', type: 'chart', order: 9, size: 'medium', enabled: false },
  { id: 'payables-summary', name: 'Payables Summary', type: 'chart', order: 10, size: 'medium', enabled: false },
  { id: 'intercompany-due', name: 'Intercompany Due', type: 'table', order: 11, size: 'medium', enabled: false },
];

const defaultLayout: DashboardLayout = {
  leftColumn: ['stats', 'pl-summary', 'sales-orders', 'recent-transactions'],
  rightColumn: ['cash-flow', 'pending-actions', 'quick-actions'],
};

interface DashboardPreferencesContextType {
  widgets: DashboardWidget[];
  enabledWidgets: DashboardWidget[];
  layout: DashboardLayout;
  isLoading: boolean;
  toggleWidget: (widgetId: string) => void;
  reorderWidgets: (widgetIds: string[], column: 'leftColumn' | 'rightColumn') => void;
  resetToDefaults: () => void;
  savePreferences: () => Promise<void>;
}

const DashboardPreferencesContext = createContext<DashboardPreferencesContextType | undefined>(undefined);

export function DashboardPreferencesProvider({ children }: { children: ReactNode }) {
  const { activeCompany } = useCompany();
  const [isLoading, setIsLoading] = useState(true);
  const [preferences, setPreferences] = useState<DashboardPreferences>({
    widgets: [...defaultWidgets],
    layout: { ...defaultLayout },
  });

  // Load preferences from API or localStorage
  useEffect(() => {
    if (!activeCompany) return;
    
    const loadPreferences = async () => {
      setIsLoading(true);
      try {
        const response = await apiRequest(
          "GET",
          `/api/dashboard/preferences`
        );
        
        if (response.ok) {
          const data = await response.json();
          setPreferences(data);
        } else {
          // If we can't get from the API, try from localStorage
          const saved = localStorage.getItem(`dashboard-prefs-${activeCompany.id}`);
          if (saved) {
            setPreferences(JSON.parse(saved));
          }
        }
      } catch (error) {
        console.error("Failed to load dashboard preferences:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPreferences();
  }, [activeCompany]);

  // Get only enabled widgets
  const enabledWidgets = preferences.widgets.filter(widget => widget.enabled);
  
  // Toggle a widget on/off
  const toggleWidget = (widgetId: string) => {
    setPreferences(prev => {
      const newWidgets = prev.widgets.map(widget => {
        if (widget.id === widgetId) {
          return { ...widget, enabled: !widget.enabled };
        }
        return widget;
      });
      
      // Update the layout
      const newLayout = { ...prev.layout };
      
      // If enabling, add to appropriate column based on size
      const widget = newWidgets.find(w => w.id === widgetId);
      if (widget?.enabled) {
        if (widget.size === 'large') {
          if (!newLayout.leftColumn.includes(widgetId)) {
            newLayout.leftColumn.push(widgetId);
          }
        } else {
          if (!newLayout.rightColumn.includes(widgetId)) {
            newLayout.rightColumn.push(widgetId);
          }
        }
      } else {
        // If disabling, remove from columns
        newLayout.leftColumn = newLayout.leftColumn.filter(id => id !== widgetId);
        newLayout.rightColumn = newLayout.rightColumn.filter(id => id !== widgetId);
      }
      
      // Save to localStorage
      if (activeCompany) {
        localStorage.setItem(
          `dashboard-prefs-${activeCompany.id}`,
          JSON.stringify({ widgets: newWidgets, layout: newLayout })
        );
      }
      
      return { widgets: newWidgets, layout: newLayout };
    });
  };
  
  // Reorder widgets in a column
  const reorderWidgets = (widgetIds: string[], column: 'leftColumn' | 'rightColumn') => {
    setPreferences(prev => {
      const newLayout = { ...prev.layout, [column]: widgetIds };
      
      // Save to localStorage
      if (activeCompany) {
        localStorage.setItem(
          `dashboard-prefs-${activeCompany.id}`,
          JSON.stringify({ widgets: prev.widgets, layout: newLayout })
        );
      }
      
      return { widgets: prev.widgets, layout: newLayout };
    });
  };
  
  // Reset to defaults
  const resetToDefaults = () => {
    const newPreferences = {
      widgets: [...defaultWidgets],
      layout: { ...defaultLayout },
    };
    setPreferences(newPreferences);
    
    // Save to localStorage
    if (activeCompany) {
      localStorage.setItem(
        `dashboard-prefs-${activeCompany.id}`,
        JSON.stringify(newPreferences)
      );
    }
  };
  
  // Save preferences to API
  const savePreferences = async () => {
    if (!activeCompany) return Promise.reject("No active company");
    
    try {
      const response = await apiRequest(
        "POST",
        `/api/dashboard/preferences`,
        preferences
      );
      
      if (!response.ok) {
        throw new Error("Failed to save dashboard preferences");
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error("Error saving dashboard preferences:", error);
      return Promise.reject(error);
    }
  };
  
  return (
    <DashboardPreferencesContext.Provider
      value={{
        widgets: preferences.widgets,
        enabledWidgets,
        layout: preferences.layout,
        isLoading,
        toggleWidget,
        reorderWidgets,
        resetToDefaults,
        savePreferences,
      }}
    >
      {children}
    </DashboardPreferencesContext.Provider>
  );
}

export function useDashboardPreferences() {
  const context = useContext(DashboardPreferencesContext);
  if (context === undefined) {
    throw new Error("useDashboardPreferences must be used within a DashboardPreferencesProvider");
  }
  return context;
}