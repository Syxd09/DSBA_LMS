import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { roleAnalyticsApi } from '@/lib/api';
import { Activity, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface SubjectHealthCardProps {
  offeringId: string;
  subjectName: string;
}

export function SubjectHealthCard({ offeringId, subjectName }: SubjectHealthCardProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['subject-health', offeringId],
    queryFn: () => roleAnalyticsApi.getSubjectHealth(offeringId),
    enabled: !!offeringId,
    staleTime: 60000,
  });

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Subject Health: {subjectName}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const health = data?.data || {};
  const status = health.health_status || 'UNKNOWN';

  const getStatusColor = (s: string) => {
    if (s === 'GOOD') return 'text-green-500';
    if (s === 'NEEDS_ATTENTION') return 'text-yellow-500';
    return 'text-muted-foreground';
  };

  const statusVariant = status === 'GOOD' ? 'default' : status === 'NEEDS_ATTENTION' ? 'destructive' : 'secondary';

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Subject Health
          </CardTitle>
          <Badge variant={statusVariant}>{status.replace('_', ' ')}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Metric */}
        <div className="text-center py-4">
           <span className="text-3xl font-bold">{(Number(health.average_attainment) || 0).toFixed(1)}%</span>
           <p className="text-sm text-muted-foreground">Average CO Attainment</p>
        </div>

        {/* Breakdown */}
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>COs Attained</span>
              <span className="font-medium">{health.cos_attained} / {health.total_cos}</span>
            </div>
            <Progress value={(health.cos_attained / (health.total_cos || 1)) * 100} className="h-2" />
          </div>
        </div>

        {/* Insight */}
        <div className={`p-3 rounded-lg flex items-start gap-2 text-sm ${
           status === 'GOOD' ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300' : 
           'bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300'
        }`}>
           {status === 'GOOD' ? <CheckCircle className="w-4 h-4 mt-0.5" /> : <AlertTriangle className="w-4 h-4 mt-0.5" />}
           <p>
             {status === 'GOOD' 
               ? "Great job! Most Course Outcomes are being met by the students." 
               : "Attention needed. CO attainment is below expected thresholds."}
           </p>
        </div>
      </CardContent>
    </Card>
  );
}
