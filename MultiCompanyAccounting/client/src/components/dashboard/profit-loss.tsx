import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface PLDataPoint {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

interface ProfitLossProps {
  data: PLDataPoint[];
}

export default function ProfitLoss({ data }: ProfitLossProps) {
  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-sm rounded-md">
          <p className="text-sm font-medium text-gray-700">{label}</p>
          <div className="mt-2 space-y-1">
            <p className="text-xs text-gray-500 flex items-center justify-between">
              <span className="mr-3">Revenue:</span>
              <span className="font-medium text-green-600">${Number(payload[0].value).toLocaleString()}</span>
            </p>
            <p className="text-xs text-gray-500 flex items-center justify-between">
              <span className="mr-3">Expenses:</span>
              <span className="font-medium text-red-600">${Number(payload[1].value).toLocaleString()}</span>
            </p>
            <p className="text-xs text-gray-500 flex items-center justify-between border-t border-gray-100 pt-1 mt-1">
              <span className="mr-3">Profit:</span>
              <span className="font-medium text-primary-600">${Number(payload[2].value).toLocaleString()}</span>
            </p>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="w-full h-full">
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-500">
          <div className="text-center">
            <i className="ri-bar-chart-grouped-line text-5xl text-gray-300 mb-2"></i>
            <p className="text-sm text-gray-400">No P&L data available</p>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 10,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={(value) => `$${value.toLocaleString()}`}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={70}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
              iconType="circle"
              iconSize={8}
            />
            <ReferenceLine y={0} stroke="#000" strokeDasharray="3 3" />
            <Bar
              dataKey="revenue"
              name="Revenue"
              fill="#10B981"
              radius={[4, 4, 0, 0]}
              barSize={20}
            />
            <Bar
              dataKey="expenses"
              name="Expenses"
              fill="#EF4444"
              radius={[4, 4, 0, 0]}
              barSize={20}
            />
            <Bar
              dataKey="profit"
              name="Profit"
              fill="#3B82F6"
              radius={[4, 4, 0, 0]}
              barSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
