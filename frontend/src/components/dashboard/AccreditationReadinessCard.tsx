
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { roleAnalyticsApi } from '@/services/analyticsService';
import { ShieldCheck, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

export function AccreditationReadinessCard() {
  const { data, isLoading } = useQuery({
    queryKey: ['accreditation-readiness'],
    queryFn: () => roleAnalyticsApi.getAccreditationReadiness(),
  });

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const readiness = data?.data || {};
  const score = readiness.readiness_score || 0;
  const status = readiness.status || 'UNKNOWN';
  const components = readiness.components || {};
  const recommendations = (readiness.recommendations || []).filter(Boolean);

  let statusColor = "bg-green-500";
  let statusIcon = <CheckCircle className="w-5 h-5 text-green-500" />;
  
  if (status === 'NOT READY') {
      statusColor = "bg-red-500";
      statusIcon = <AlertTriangle className="w-5 h-5 text-red-500" />;
  } else if (status === 'NEEDS ACTION') {
      statusColor = "bg-yellow-500";
      statusIcon = <AlertTriangle className="w-5 h-5 text-yellow-500" />;
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <div>
                    <CardTitle className="text-base font-semibold">Accreditation Readiness</CardTitle>
                    <CardDescription>NBA / NAAC Compliance</CardDescription>
                </div>
            </div>
            <Badge variant={status === 'READY' ? 'default' : 'secondary'}>
                {status.replace('_', ' ')}
            </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Main Score */ }
        <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 flex items-center justify-center rounded-full border-4 border-muted">
                 <span className="text-xl font-bold">{score.toFixed(0)}%</span>
                 <svg className="absolute top-[-4px] left-[-4px] w-[88px] h-[88px] transform -rotate-90">
                     <circle
                         cx="44" cy="44" r="40"
                         fill="transparent"
                         stroke="currentColor"
                         strokeWidth="4"
                         strokeDasharray={`${2 * Math.PI * 40}`}
                         strokeDashoffset={`${2 * Math.PI * 40 * (1 - score / 100)}`}
                         className={status === 'READY' ? 'text-green-500' : status === 'NOT READY' ? 'text-red-500' : 'text-yellow-500'}
                     />
                 </svg>
            </div>
            <div className="flex-1 space-y-2">
                <div className="flex justify-between text-sm">
                    <span>CO Definitions</span>
                    <span className="font-medium">{components.co_definition}%</span>
                </div>
                <Progress value={components.co_definition} className="h-1.5" />
                
                <div className="flex justify-between text-sm">
                    <span>CO-PO Mapping</span>
                    <span className="font-medium">{components.co_mapping}%</span>
                </div>
                 <Progress value={components.co_mapping} className="h-1.5" />

                <div className="flex justify-between text-sm">
                    <span>Assessment Data</span>
                    <span className="font-medium">{components.assessment_data}%</span>
                </div>
                 <Progress value={components.assessment_data} className="h-1.5" />
            </div>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 ? (
            <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action Items</h4>
                <ul className="space-y-1 text-sm">
                    {recommendations.map((rec: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-950/30 p-2 rounded">
                            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>{rec}</span>
                        </li>
                    ))}
                </ul>
            </div>
        ) : (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 rounded text-sm">
                <CheckCircle className="w-4 h-4" />
                <span>All systems go! Ready for audit.</span>
            </div>
        )}

      </CardContent>
    </Card>
  );
}
