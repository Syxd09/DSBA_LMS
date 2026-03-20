import { COAttainment } from '@/lib/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface COAttainmentChartProps {
  data: COAttainment[];
}

export function COAttainmentChart({ data }: COAttainmentChartProps) {
  const chartData = data.map(item => ({
    name: item.co,
    attainment: item.attainment,
    target: item.target,
    fill: item.attainment >= item.target ? 'hsl(var(--chart-3))' : 'hsl(var(--destructive))',
  }));

  if (!data || data.length === 0) {
    return (
      <div className="border border-border bg-card p-6 flex items-center justify-center h-64 text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col pt-2">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} width={45} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <ReferenceLine x={70} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" label={{ value: 'Target', position: 'top', fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
            <Bar dataKey="attainment" radius={0} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-chart-3" />
          <span className="text-muted-foreground">Above Target</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-destructive" />
          <span className="text-muted-foreground">Below Target</span>
        </div>
      </div>
    </div>
  );
}
