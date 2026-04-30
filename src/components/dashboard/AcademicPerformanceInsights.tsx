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
      <Card className="border-none shadow-xl bg-card/60 backdrop-blur-xl overflow-hidden h-full flex items-center justify-center">
        <p className="text-muted-foreground">Insufficient data for health analysis</p>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-xl bg-card/60 backdrop-blur-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 h-full">
      <CardHeader className="border-b border-border/50 bg-muted/20 pb-4">
        <CardTitle className="text-lg font-bold tracking-tight flex items-center gap-2.5">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <span>Academic Health Insights</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Overall Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent border border-primary/10">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Performance Index</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-foreground">{currentAvg.toFixed(1)}%</span>
              <div className={cn(
                "flex items-center text-xs font-bold",
                trendDiff >= 0 ? "text-green-500" : "text-destructive"
              )}>
                {trendDiff >= 0 ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                {Math.abs(trendDiff).toFixed(1)}%
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Average attainment across all sectors</p>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500/5 to-transparent border border-orange-500/10">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Target Adherence</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-foreground">
                {attainmentData.length > 0 ? ((aboveTargetCOs.length / attainmentData.length) * 100).toFixed(0) : 0}%
              </span>
              <span className="text-xs font-bold text-muted-foreground">Compliance</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{aboveTargetCOs.length} of {attainmentData.length} outcomes meeting goals</p>
          </div>
        </div>

        {/* Detailed Insights */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
             <BarChart3 className="h-4 w-4 text-muted-foreground" />
             <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Functional Analysis</h4>
          </div>

          <div className="space-y-3 font-medium">
            {/* Critical Areas */}
            {belowTargetCOs.length > 0 && (
              <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-bold text-destructive">Observation Required</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {belowTargetCOs.map(co => (
                    <Badge key={co.co} variant="outline" className="bg-white/50 border-destructive/30 text-destructive font-bold text-[10px]">
                      {co.co}: {co.attainment}% (Target {co.target}%)
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Immediate action advised for these specific learning outcomes.</p>
              </div>
            )}

            {/* Stable Areas */}
            {aboveTargetCOs.length > 0 && (
              <div className="p-4 rounded-xl border border-green-500/20 bg-green-500/5 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-bold text-green-600">Standard Met</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {aboveTargetCOs.map(co => (
                    <Badge key={co.co} variant="outline" className="bg-white/50 border-green-500/30 text-green-600 font-bold text-[10px]">
                      {co.co} • Optimized
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">These sectors are consistently performing above the established baseline.</p>
              </div>
            )}
          </div>
        </div>

        {/* Recommendations */}
        <div className="pt-2">
          <div className="p-4 rounded-2xl bg-secondary/50 border border-border/50">
            <p className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-2 uppercase tracking-tighter">
              Executive Recommendation
            </p>
            <p className="text-sm text-foreground italic leading-relaxed">
              "Focus and re-evaluate pedagogical approaches for <span className="font-bold text-destructive">{belowTargetCOs.map(c => c.co).join(', ')}</span>. 
              The current trend indicates a {trendDiff >= 0 ? 'steady incline' : 'marginal decline'} which warrants review from department heads."
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
