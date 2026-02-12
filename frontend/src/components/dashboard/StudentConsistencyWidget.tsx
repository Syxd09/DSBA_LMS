
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { roleAnalyticsApi } from '@/services/analyticsService';
import { Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

interface StudentConsistencyWidgetProps {
  offeringId: string;
  studentId: string;
}

export function StudentConsistencyWidget({ offeringId, studentId }: StudentConsistencyWidgetProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['student-consistency', offeringId, studentId],
    queryFn: () => roleAnalyticsApi.getStudentConsistency(offeringId, studentId),
    enabled: !!offeringId && !!studentId,
  });

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-24">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const consistency = data?.data || {};
  const score = consistency.consistency_score ?? 0;
  const trend = consistency.trend || 'Unknown';
  
  let trendIcon = <Minus className="w-4 h-4" />;
  let trendColor = "text-muted-foreground";

  if (trend === 'Volatile') {
      trendIcon = <TrendingUp className="w-4 h-4" />; // High variance
      trendColor = "text-red-500";
  } else if (trend === 'Very Consistent') {
      trendIcon = <TrendingDown className="w-4 h-4" />; // Low variance
      trendColor = "text-green-500";
  }

  const chartData = (consistency.exam_scores || []).map((score: number, index: number) => ({
    name: `Exam ${index + 1}`,
    score: score
  }));

  return (
    <Card className="h-full border-none shadow-none">
      <CardHeader className="p-0 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Consistency Score</CardTitle>
          <Badge variant="outline" className={trendColor}>
             {trend}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex items-end justify-between">
            <div>
                <span className="text-2xl font-bold">{score}</span>
                <span className="text-xs text-muted-foreground ml-1">/ 100</span>
            </div>
            <div className="h-[40px] w-[80px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                        <Line type="monotone" dataKey="score" stroke="#8884d8" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
            Std Dev: {consistency.standard_deviation}%
        </p>
      </CardContent>
    </Card>
  );
}
