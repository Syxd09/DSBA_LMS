import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { roleAnalyticsApi } from '@/lib/api';
import { Lightbulb, AlertTriangle, TrendingUp, TrendingDown, Brain, Target, Loader2 } from 'lucide-react';

interface InsightsCardProps {
  usn?: string;
}

interface Insight {
  type: 'strength' | 'weakness' | 'warning' | 'suggestion';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export function InsightsCard({ usn }: InsightsCardProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['student-insights', usn],
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
            <Lightbulb className="w-4 h-4" />
            Personalized Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Generate rule-based insights from performance data
  const perfData = data?.data || {};
  const insights: Insight[] = [];

  // Insight 1: Overall performance
  const avgScore = perfData.overall_percentage || 0;
  if (avgScore >= 75) {
    insights.push({
      type: 'strength',
      title: 'Strong Overall Performance',
      description: `You're performing at ${Math.round(avgScore)}% average, above the 70% threshold.`,
      priority: 'low',
    });
  } else if (avgScore < 50) {
    insights.push({
      type: 'warning',
      title: 'Performance Below Expectations',
      description: `Your average of ${Math.round(avgScore)}% needs improvement across subjects.`,
      priority: 'high',
    });
  }

  // Insight 2: Bloom analysis
  const bloomPerformance = perfData.bloom_performance || [];
  const lowBloomLevels = bloomPerformance.filter((b: any) => b.percentage < 50);
  const highBloomLevels = bloomPerformance.filter((b: any) => b.percentage >= 70);
  
  if (lowBloomLevels.length > 0) {
    const weakLevels = lowBloomLevels.map((b: any) => b.level).join(', ');
    insights.push({
      type: 'weakness',
      title: 'Cognitive Skill Gap Detected',
      description: `Weak in ${weakLevels}. Focus on higher-order thinking skills.`,
      priority: 'medium',
    });
  }

  if (highBloomLevels.length >= 3) {
    insights.push({
      type: 'strength',
      title: 'Strong Cognitive Balance',
      description: 'You demonstrate good performance across multiple Bloom levels.',
      priority: 'low',
    });
  }

  // Insight 3: Internal vs External consistency
  const subjectPerf = perfData.subject_performance || [];
  const gapSubjects = subjectPerf.filter((s: any) => {
    if (!s.internal_max || !s.external_max) return false;
    const intPct = (s.internal_marks / s.internal_max) * 100;
    const extPct = (s.external_marks / s.external_max) * 100;
    return Math.abs(intPct - extPct) > 20;
  });

  if (gapSubjects.length > 2) {
    insights.push({
      type: 'warning',
      title: 'Internal vs External Inconsistency',
      description: `${gapSubjects.length} subjects show >20% gap. Consider exam preparation strategies.`,
      priority: 'high',
    });
  }

  // Insight 4: Subject-specific recommendations
  const failedSubjects = subjectPerf.filter((s: any) => s.grade === 'F' || s.percentage < 40);
  if (failedSubjects.length > 0) {
    insights.push({
      type: 'warning',
      title: 'Subjects At Risk',
      description: `${failedSubjects.length} subject(s) below passing threshold. Prioritize these.`,
      priority: 'high',
    });
  }

  // Default suggestion if no major issues
  if (insights.length === 0) {
    insights.push({
      type: 'suggestion',
      title: 'Keep Up the Good Work!',
      description: 'Your performance is on track. Continue maintaining consistency.',
      priority: 'low',
    });
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'strength': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'weakness': return <TrendingDown className="w-4 h-4 text-yellow-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <Lightbulb className="w-4 h-4 text-blue-500" />;
    }
  };

  const getBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive' as const;
      case 'medium': return 'secondary' as const;
      default: return 'outline' as const;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Brain className="w-4 h-4" />
          Personalized Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {insights.slice(0, 4).map((insight, index) => (
            <div 
              key={index} 
              className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
            >
              <div className="mt-0.5">{getIcon(insight.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-sm">{insight.title}</p>
                  <Badge variant={getBadgeVariant(insight.priority)} className="text-xs">
                    {insight.priority}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{insight.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
