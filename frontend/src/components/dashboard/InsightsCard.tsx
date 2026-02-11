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
    queryKey: ['student-insights-api', usn],
    queryFn: () => roleAnalyticsApi.getStudentInsights(),
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

  // Use server-side insights
  const insights: Insight[] = data?.data || [];

  // Fallback if no insights returned
  if (insights.length === 0) {
    insights.push({
      type: 'suggestion',
      title: 'No Trends Detected Yet',
      description: 'Complete more assessments to generate personalized insights.',
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
