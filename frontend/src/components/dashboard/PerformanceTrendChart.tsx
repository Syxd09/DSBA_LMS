import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface PerformanceTrendChartProps {
  data: Array<{ semester: string; CO1: number; CO2: number; CO3: number; CO4: number; CO5: number }>;
}

export function PerformanceTrendChart({ data }: PerformanceTrendChartProps) {
  return (
    <div className="border border-border bg-card p-6">
      <div className="mb-6">
        <h3 className="font-semibold text-foreground">CO Attainment Trend</h3>
        <p className="text-sm text-muted-foreground">Course outcome progression over semesters</p>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="semester" stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[60, 90]} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0',
              }}
            />
            <Legend />
            <Line type="monotone" dataKey="CO1" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ fill: 'hsl(var(--chart-1))' }} />
            <Line type="monotone" dataKey="CO2" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ fill: 'hsl(var(--chart-2))' }} />
            <Line type="monotone" dataKey="CO3" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={{ fill: 'hsl(var(--chart-3))' }} />
            <Line type="monotone" dataKey="CO4" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={{ fill: 'hsl(var(--chart-4))' }} />
            <Line type="monotone" dataKey="CO5" stroke="hsl(var(--chart-5))" strokeWidth={2} dot={{ fill: 'hsl(var(--chart-5))' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
