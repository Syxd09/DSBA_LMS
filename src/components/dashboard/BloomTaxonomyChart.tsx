import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface BloomTaxonomyChartProps {
  data: Array<{ name: string; value: number; color: string }>;
}

export function BloomTaxonomyChart({ data }: BloomTaxonomyChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="border border-border bg-card p-6 flex items-center justify-center h-64 text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <div className="border border-border bg-card p-6">
      <div className="mb-6">
        <h3 className="font-semibold text-foreground">Bloom's Taxonomy Distribution</h3>
        <p className="text-sm text-muted-foreground">Question distribution by cognitive level</p>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
