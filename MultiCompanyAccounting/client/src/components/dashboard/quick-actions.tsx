import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function QuickActions() {
  const actions = [
    {
      name: "New Invoice",
      icon: "ri-file-add-line",
      path: "/invoices/new",
    },
    {
      name: "New Sales Order",
      icon: "ri-shopping-cart-line",
      path: "/sales-orders/new",
    },
    {
      name: "New Purchase",
      icon: "ri-shopping-bag-line",
      path: "/purchase-orders/new",
    },
    {
      name: "Run Reports",
      icon: "ri-file-chart-line",
      path: "/reports",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {actions.map((action, index) => (
        <Link 
          key={index} 
          href={action.path}
          className="flex flex-col items-center justify-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          <div className="h-10 w-10 rounded-full bg-primary-50 flex items-center justify-center text-primary-500 mb-2">
            <i className={`${action.icon} text-xl`}></i>
          </div>
          <span className="text-xs font-medium text-gray-700">{action.name}</span>
        </Link>
      ))}
    </div>
  );
}
