import { useEffect, useRef } from "react";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface CashFlowDataPoint {
  date: string;
  inflow: number;
  outflow: number;
  balance: number;
}

interface CashFlowProps {
  data: CashFlowDataPoint[];
}

export default function CashFlow({ data }: CashFlowProps) {
  // Format the data for recharts
  const formattedData = data.map((point) => ({
    date: new Date(point.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    inflow: point.inflow,
    outflow: point.outflow,
    balance: point.balance,
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-sm rounded-md">
          <p className="text-xs font-medium text-gray-600">{label}</p>
          <div className="mt-2 space-y-1">
            {payload[0] && payload[0].value > 0 && (
              <p className="text-xs text-gray-500 flex items-center justify-between">
                <span className="mr-3">Inflow:</span>
                <span className="font-medium text-green-600">${Number(payload[0].value).toLocaleString()}</span>
              </p>
            )}
            {payload[1] && payload[1].value > 0 && (
              <p className="text-xs text-gray-500 flex items-center justify-between">
                <span className="mr-3">Outflow:</span>
                <span className="font-medium text-red-600">${Number(payload[1].value).toLocaleString()}</span>
              </p>
            )}
            <p className="text-xs text-gray-500 flex items-center justify-between border-t border-gray-100 pt-1 mt-1">
              <span className="mr-3">Balance:</span>
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
            <i className="ri-line-chart-line text-5xl text-gray-300 mb-2"></i>
            <p className="text-sm text-gray-400">No cash flow data available</p>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={formattedData}
            margin={{
              top: 10,
              right: 10,
              left: 5,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={(value) => `$${value.toLocaleString()}`}
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
              iconType="circle"
              iconSize={8}
            />
            <Bar 
              dataKey="inflow" 
              name="Cash In" 
              fill="#10B981" 
              radius={[4, 4, 0, 0]} 
              barSize={8} 
              stackId="a"
            />
            <Bar 
              dataKey="outflow" 
              name="Cash Out" 
              fill="#EF4444" 
              radius={[4, 4, 0, 0]} 
              barSize={8} 
              stackId="a"
            />
            <Line
              type="monotone"
              dataKey="balance"
              name="Balance"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={{ r: 4, stroke: "#3B82F6", strokeWidth: 1, fill: "#fff" }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
