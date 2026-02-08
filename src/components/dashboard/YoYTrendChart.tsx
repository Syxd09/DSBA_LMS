import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { roleAnalyticsApi } from '@/lib/api';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Loader2, Calendar } from 'lucide-react';

interface TrendData {
  year: number;
  academic_year: string;
  avg_co_attainment: number;
  pass_rate: number;
  students_evaluated: number;
  status: string;
}

interface YoYTrendResponse {
  data: {
    trend: TrendData[];
    summary: {
      years_analyzed: number;
      years_with_data: number;
      overall_trend: 'IMPROVING' | 'STABLE' | 'DECLINING' | 'INSUFFICIENT_DATA';
      latest_pass_rate: number;
      latest_co_attainment: number;
    };
  };
}

export function YoYTrendChart() {
  const { data, isLoading, error } = useQuery<YoYTrendResponse>({
    queryKey: ['principal-yoy-trend'],
    queryFn: () => roleAnalyticsApi.getYearOnYearTrend(),
    staleTime: 300000, // 5 minutes
  });

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'IMPROVING':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'DECLINING':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTrendBadge = (trend: string) => {
    switch (trend) {
      case 'IMPROVING':
        return <Badge className="bg-green-500">Improving</Badge>;
      case 'DECLINING':
        return <Badge variant="destructive">Declining</Badge>;
      case 'STABLE':
        return <Badge variant="secondary">Stable</Badge>;
      default:
        return <Badge variant="outline">Insufficient Data</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Year-on-Year Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data?.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Year-on-Year Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center py-8 text-muted-foreground">
            Unable to load trend data.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { trend, summary } = data.data;
  const chartData = trend.filter(t => t.status === 'HAS_DATA').map(t => ({
    name: t.academic_year,
    'Pass Rate': t.pass_rate,
    'CO Attainment': t.avg_co_attainment,
    students: t.students_evaluated,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Year-on-Year Trend
          </CardTitle>
          <div className="flex items-center gap-2">
            {getTrendIcon(summary.overall_trend)}
            {getTrendBadge(summary.overall_trend)}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, '']}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="Pass Rate" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2} 
                  dot={{ fill: 'hsl(var(--primary))' }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="CO Attainment" 
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={2} 
                  dot={{ fill: 'hsl(var(--chart-2))' }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-center py-8 text-muted-foreground">
            No historical data available. Trends will appear after multiple academic years of data.
          </p>
        )}
        
        {summary.years_with_data > 0 && (
          <div className="mt-4 pt-4 border-t flex justify-between text-sm text-muted-foreground">
            <span>{summary.years_analyzed} years analyzed</span>
            <span>Latest: {summary.latest_pass_rate.toFixed(1)}% pass rate</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
