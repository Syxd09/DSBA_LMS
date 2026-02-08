import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { Target, AlertCircle } from 'lucide-react';

interface COData {
  co: string;
  attainment: number;
  target: number;
}

interface DashboardCOChartProps {
  data: COData[];
  title?: string;
}

/**
 * Simple CO Attainment chart for dashboard views that accept pre-fetched data.
 * Unlike COAttainmentChart which fetches data internally, this accepts data prop.
 */
export function DashboardCOChart({ data, title = 'CO Attainment' }: DashboardCOChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent className="h-[250px] flex flex-col items-center justify-center text-muted-foreground text-sm">
          <AlertCircle className="w-8 h-8 mb-2 opacity-20" />
          <p>No CO data available</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((co) => ({
    name: co.co,
    attainment: co.attainment,
    target: co.target,
  }));

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>{title}</span>
          <Target className="w-4 h-4 text-muted-foreground" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip 
                cursor={{ fill: 'transparent' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <ReferenceLine y={60} stroke="hsl(var(--destructive))" strokeDasharray="3 3" label={{ value: 'Target 60%', position: 'right', fontSize: 10 }} />
              <Bar dataKey="attainment" name="Attainment %" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
