import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { roleAnalyticsApi } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';

interface InternalExternalGapChartProps {
  usn?: string;
}

export function InternalExternalGapChart({ usn }: InternalExternalGapChartProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['student-gap-analysis', usn],
    queryFn: () => roleAnalyticsApi.getStudentPerformance(),
    enabled: !!usn,
    staleTime: 60000,
  });

  if (!usn) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Internal vs External Gap</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Extract subject performance from the API response
  const subjectPerformance = data?.data?.subject_performance || [];
  
  // Calculate gap data for each subject
  const gapData = subjectPerformance.map((subject: any) => {
    const internalPct = subject.internal_marks && subject.internal_max 
      ? (subject.internal_marks / subject.internal_max) * 100 
      : 0;
    const externalPct = subject.external_marks && subject.external_max 
      ? (subject.external_marks / subject.external_max) * 100 
      : 0;
    const gap = internalPct - externalPct;
    
    return {
      subject: subject.subject_code || 'Unknown',
      internal: Math.round(internalPct),
      external: Math.round(externalPct),
      gap: Math.round(gap),
    };
  }).filter((d: any) => d.internal > 0 || d.external > 0);

  // Calculate overall statistics
  const avgGap = gapData.length > 0 
    ? gapData.reduce((sum: number, d: any) => sum + d.gap, 0) / gapData.length 
    : 0;
  
  const consistentCount = gapData.filter((d: any) => Math.abs(d.gap) <= 10).length;
  const inconsistentCount = gapData.filter((d: any) => Math.abs(d.gap) > 20).length;

  const getTrendIcon = () => {
    if (avgGap > 10) return <TrendingUp className="w-4 h-4 text-yellow-500" />;
    if (avgGap < -10) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-green-500" />;
  };

  const getGapColor = (gap: number) => {
    if (Math.abs(gap) <= 10) return 'hsl(var(--chart-2))'; // Green - consistent
    if (gap > 10) return 'hsl(var(--chart-3))'; // Yellow - internal better
    return 'hsl(var(--destructive))'; // Red - external problem
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Internal vs External Gap Analysis</CardTitle>
          <div className="flex items-center gap-2">
            {getTrendIcon()}
            <Badge variant={Math.abs(avgGap) <= 10 ? 'default' : 'secondary'}>
              Avg Gap: {avgGap > 0 ? '+' : ''}{Math.round(avgGap)}%
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {gapData.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            No subject performance data available for gap analysis.
          </p>
        ) : (
          <>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gapData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="subject" tick={{ fontSize: 11 }} />
                  <YAxis 
                    tick={{ fontSize: 11 }} 
                    domain={[-50, 50]} 
                    tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}%`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${value > 0 ? '+' : ''}${value}%`, 'Gap']}
                    labelFormatter={(label) => `Subject: ${label}`}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background border rounded-lg p-3 shadow-lg">
                            <p className="font-medium">{label}</p>
                            <p className="text-sm text-muted-foreground">Internal: {data.internal}%</p>
                            <p className="text-sm text-muted-foreground">External: {data.external}%</p>
                            <p className="text-sm font-medium mt-1">
                              Gap: {data.gap > 0 ? '+' : ''}{data.gap}%
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                  <Bar dataKey="gap" radius={[4, 4, 0, 0]}>
                    {gapData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={getGapColor(entry.gap)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Insights */}
            <div className="grid grid-cols-3 gap-2 mt-4 text-center text-sm">
              <div className="p-2 bg-green-50 dark:bg-green-950 rounded-lg">
                <p className="font-semibold text-green-600">{consistentCount}</p>
                <p className="text-xs text-muted-foreground">Consistent</p>
              </div>
              <div className="p-2 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                <p className="font-semibold text-yellow-600">{gapData.length - consistentCount - inconsistentCount}</p>
                <p className="text-xs text-muted-foreground">Minor Gap</p>
              </div>
              <div className="p-2 bg-red-50 dark:bg-red-950 rounded-lg">
                <p className="font-semibold text-red-600">{inconsistentCount}</p>
                <p className="text-xs text-muted-foreground">Needs Focus</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
