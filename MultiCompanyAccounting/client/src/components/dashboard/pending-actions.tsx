import { Link } from "wouter";

interface PendingAction {
  id: number;
  title: string;
  count: number;
  description: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  link: string;
}

interface PendingActionsProps {
  actions: PendingAction[];
}

export default function PendingActions({ actions }: PendingActionsProps) {
  // Handle cases where actions is not an array
  const actionsArray = Array.isArray(actions) ? actions : [];
  
  if (actionsArray.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        <i className="ri-checkbox-circle-line text-4xl text-gray-300 mb-2"></i>
        <p className="text-sm">No pending actions</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-100">
      {actions.map((action) => (
        <li key={action.id} className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`h-9 w-9 rounded-full bg-${action.iconBg} flex items-center justify-center text-${action.iconColor}`}>
                <i className={action.icon}></i>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-800">{action.title}</p>
                <p className="text-xs text-gray-500">{action.description}</p>
              </div>
            </div>
            <Link href={action.link} className="text-xs text-primary-500 font-medium hover:underline">
              View
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
