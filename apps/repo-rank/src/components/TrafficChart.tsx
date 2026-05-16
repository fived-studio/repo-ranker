import { format } from "date-fns";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface TrafficPoint {
  timestamp: string;
  count: number;
  uniques: number;
}

function formatTick(value: string): string {
  try {
    return format(new Date(value), "MMM d");
  } catch {
    return value;
  }
}

export function TrafficChart({
  data,
  primaryStroke,
  gradientId,
}: {
  data: TrafficPoint[];
  primaryStroke: string;
  gradientId: string;
}) {
  return (
    <div className="h-[200px] w-full bg-background/50 rounded-lg p-4 border">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={primaryStroke} stopOpacity={0.3} />
              <stop offset="95%" stopColor={primaryStroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={formatTick}
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              borderColor: "hsl(var(--border))",
              borderRadius: "8px",
            }}
            labelFormatter={formatTick}
          />
          <Area
            type="monotone"
            dataKey="count"
            name="Total"
            stroke={primaryStroke}
            fillOpacity={1}
            fill={`url(#${gradientId})`}
          />
          <Area
            type="monotone"
            dataKey="uniques"
            name="Unique"
            stroke="hsl(var(--muted-foreground))"
            fill="none"
            strokeDasharray="3 3"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
