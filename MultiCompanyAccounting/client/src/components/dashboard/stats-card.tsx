import { formatCurrency } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: number;
  change?: number;
  changeType?: "increase" | "decrease";
  subtitle?: string;
  icon: string;
  iconBg: string;
  iconColor: string;
}

export default function StatsCard({
  title,
  value,
  change,
  changeType,
  subtitle,
  icon,
  iconBg,
  iconColor,
}: StatsCardProps) {
  return (
    <div className="stats-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-semibold mt-1">{formatCurrency(value, 'USD')}</p>
          {change !== undefined ? (
            <div className="flex items-center mt-2">
              <span
                className={`text-xs font-medium flex items-center ${
                  changeType === "increase" ? "text-green-500" : "text-red-500"
                }`}
              >
                <i
                  className={`ri-arrow-${
                    changeType === "increase" ? "up" : "down"
                  }-line mr-0.5`}
                ></i>{" "}
                {Math.abs(change).toFixed(1)}%
              </span>
              <span className="text-xs text-gray-500 ml-1">vs last month</span>
            </div>
          ) : subtitle ? (
            <div className="flex items-center mt-2">
              <span className="text-xs font-medium text-gray-500 flex items-center">
                {subtitle}
              </span>
            </div>
          ) : null}
        </div>
        <div className={`h-12 w-12 rounded-full bg-${iconBg} flex items-center justify-center`}>
          <i className={`${icon} text-xl text-${iconColor}`}></i>
        </div>
      </div>
    </div>
  );
}
