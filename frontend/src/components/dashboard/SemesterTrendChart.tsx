import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { roleAnalyticsApi } from '@/lib/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface SemesterTrendChartProps {
  usn?: string;
}

export function SemesterTrendChart({ usn }: SemesterTrendChartProps) {
  const [selectedMetric, setSelectedMetric] = useState<'sgpa' | 'percentage'>('sgpa');

  const { data, isLoading } = useQuery({
    queryKey: ['student-semester-trend', usn],
    queryFn: () => roleAnalyticsApi.getStudentPerformance(),
    enabled: !!usn,
    staleTime: 60000,
  });

  if (!usn) return null;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Semester-wise Trend
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const perfData = data?.data || {};
  const semesterResults = perfData.semester_results || [];

  // Process semester data
  const trendData = semesterResults.map((sem: any) => ({
    semester: `Sem ${sem.semester}`,
    sgpa: sem.sgpa || 0,
    cgpa: sem.cgpa || 0,
    percentage: sem.percentage || 0,
    credits: sem.earned_credits || 0,
    status: sem.status || 'unknown',
  }));

  // Calculate trend
  const calculateTrend = () => {
    if (trendData.length < 2) return 'stable';
    const lastTwo = trendData.slice(-2);
    const diff = lastTwo[1][selectedMetric] - lastTwo[0][selectedMetric];
    if (diff > 0.2) return 'improving';
    if (diff < -0.2) return 'declining';
    return 'stable';
  };

  const trend = calculateTrend();
  const latestSgpa = trendData.length > 0 ? trendData[trendData.length - 1].sgpa : 0;
  const latestCgpa = trendData.length > 0 ? trendData[trendData.length - 1].cgpa : 0;

  const getTrendIcon = () => {
    switch (trend) {
      case 'improving': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'declining': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Minus className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getTrendBadge = () => {
    switch (trend) {
      case 'improving': return <Badge className="bg-green-500">Improving</Badge>;
      case 'declining': return <Badge variant="destructive">Declining</Badge>;
      default: return <Badge variant="secondary">Stable</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            {getTrendIcon()}
            Semester-wise Trend
          </CardTitle>
          <div className="flex items-center gap-2">
            {getTrendBadge()}
            <Select value={selectedMetric} onValueChange={(v: 'sgpa' | 'percentage') => setSelectedMetric(v)}>
              <SelectTrigger className="w-28 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sgpa">SGPA</SelectItem>
                <SelectItem value="percentage">Percentage</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {trendData.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            No semester results available yet.
          </p>
        ) : (
          <>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="semester" tick={{ fontSize: 11 }} />
                  <YAxis 
                    tick={{ fontSize: 11 }}
                    domain={selectedMetric === 'sgpa' ? [0, 10] : [0, 100]}
                    tickFormatter={(v) => selectedMetric === 'sgpa' ? (Number(v) || 0).toFixed(1) : `${v}%`}
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-background border rounded-lg p-3 shadow-lg">
                            <p className="font-medium">{label}</p>
                            <p className="text-sm text-muted-foreground">SGPA: {(Number(d.sgpa) || 0).toFixed(2)}</p>
                            <p className="text-sm text-muted-foreground">CGPA: {(Number(d.cgpa) || 0).toFixed(2)}</p>
                            <p className="text-sm text-muted-foreground">Credits: {d.credits}</p>
                            <Badge variant={d.status === 'pass' ? 'default' : 'destructive'} className="mt-1">
                              {d.status}
                            </Badge>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey={selectedMetric}
                    name={selectedMetric === 'sgpa' ? 'SGPA' : 'Percentage'}
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  {selectedMetric === 'sgpa' && (
                    <Line 
                      type="monotone" 
                      dataKey="cgpa"
                      name="CGPA"
                      stroke="hsl(var(--chart-2))" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ fill: 'hsl(var(--chart-2))', r: 3 }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-2 mt-4 text-center text-sm">
              <div className="p-2 bg-primary/10 rounded-lg">
                <p className="font-semibold">{(Number(latestSgpa) || 0).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Latest SGPA</p>
              </div>
              <div className="p-2 bg-secondary rounded-lg">
                <p className="font-semibold">{(Number(latestCgpa) || 0).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">CGPA</p>
              </div>
              <div className="p-2 bg-muted rounded-lg">
                <p className="font-semibold">{trendData.length}</p>
                <p className="text-xs text-muted-foreground">Semesters</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
