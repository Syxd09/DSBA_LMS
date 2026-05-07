import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Target, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PerformanceInsightProps {
  attainmentData: any[];
  trendData: any[];
}

export function AcademicPerformanceInsights({ attainmentData, trendData }: PerformanceInsightProps) {
  // Extract key insights from data
  const belowTargetCOs = attainmentData.filter(co => co.attainment < co.target);
  const aboveTargetCOs = attainmentData.filter(co => co.attainment >= co.target);
  
  const latestTrend = trendData[trendData.length - 1] || {};
  const previousTrend = trendData[trendData.length - 2] || {};
  
  const calculateAverage = (obj: any) => {
    const values = Object.keys(obj)
      .filter(key => key.startsWith('CO'))
      .map(key => obj[key]);
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  };

  const currentAvg = calculateAverage(latestTrend);
  const prevAvg = calculateAverage(previousTrend);
  const trendDiff = currentAvg - prevAvg;

  if (!attainmentData || attainmentData.length === 0) {
    return (
      <Card className="h-full flex items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">Insufficient data for health analysis</p>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Academic Performance Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg border bg-muted/20">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Performance Index</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{currentAvg.toFixed(1)}%</span>
              <span className={cn(
                "text-xs font-medium",
                trendDiff >= 0 ? "text-emerald-600" : "text-rose-600"
              )}>
                {trendDiff >= 0 ? '+' : ''}{trendDiff.toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="p-4 rounded-lg border bg-muted/20">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Compliance</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {attainmentData.length > 0 ? ((aboveTargetCOs.length / attainmentData.length) * 100).toFixed(0) : 0}%
              </span>
              <span className="text-xs text-muted-foreground">Target met</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {belowTargetCOs.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-rose-600">Critical Gaps</p>
              <div className="flex flex-wrap gap-2">
                {belowTargetCOs.map(co => (
                  <Badge key={co.co} variant="destructive">
                    {co.co}: {co.attainment}%
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {aboveTargetCOs.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stable Outcomes</p>
              <div className="flex flex-wrap gap-2">
                {aboveTargetCOs.map(co => (
                  <Badge key={co.co} variant="secondary">
                    {co.co}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 rounded-lg bg-muted border border-border/50">
          <p className="text-sm italic text-muted-foreground">
            Analysis shows attention is needed for {belowTargetCOs.map(c => c.co).join(', ')}. 
            Overall performance is {trendDiff >= 0 ? 'improving' : 'declining'} compared to last period.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
