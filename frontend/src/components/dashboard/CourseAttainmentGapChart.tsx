
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { roleAnalyticsApi } from '@/services/analyticsService';
import { Loader2, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';

interface CourseAttainmentGapChartProps {
  offeringId: string;
  subjectName?: string;
}

export function CourseAttainmentGapChart({ offeringId, subjectName }: CourseAttainmentGapChartProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['course-gap', offeringId],
    queryFn: () => roleAnalyticsApi.getCourseAttainmentGap(offeringId),
    enabled: !!offeringId,
  });

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-60">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const gapData = data?.data || {};
  const chartData = gapData.co_gaps || [];
  const avgGap = gapData.average_gap || 0;
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-3 text-sm shadow-md">
          <p className="font-semibold">{label}</p>
          <p className="text-muted-foreground">Target: {payload[0].value}%</p>
          <p className={`font-medium ${payload[1].value < payload[0].value ? 'text-red-500' : 'text-green-500'}`}>
             Actual: {payload[1].value}%
          </p>
          <p className="text-xs mt-1">
             Gap: {(Number(payload[0].value) - Number(payload[1].value)).toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="h-full col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
            <div>
                <CardTitle className="text-base font-semibold">Attainment Gap Analysis</CardTitle>
                <CardDescription>{subjectName}</CardDescription>
            </div>
             <div className="text-right">
                <div className="text-2xl font-bold text-red-500">-{avgGap}%</div>
                <div className="text-xs text-muted-foreground">Avg Miss</div>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="co_code" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="target" name="Target" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="actual" name="Actual Attainment" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    <ReferenceLine y={60} stroke="red" strokeDasharray="3 3" label="Threshold" />
                </BarChart>
            </ResponsiveContainer>
        </div>
        
        {gapData.critical_cos?.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/30 rounded-md text-sm text-red-700 dark:text-red-300">
                <strong>Critical Attention Needed: </strong>
                COs {gapData.critical_cos.join(', ')} are significantly below target.
            </div>
        )}
      </CardContent>
    </Card>
  );
}
