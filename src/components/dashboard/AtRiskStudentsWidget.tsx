import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  Loader2, 
  User, 
  TrendingDown, 
  MessageSquare, 
  ChevronRight,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import api from '@/lib/api';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface AtRiskStudent {
  studentId: string;
  studentName: string;
  email: string;
  registrationNumber: string;
  cohort: string;
  department: string;
  currentPercentage: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  examsCompleted: number;
}

const getRiskConfig = (risk: string) => {
  switch (risk) {
    case 'critical': 
      return { 
        color: 'text-red-500', 
        bg: 'bg-red-500/10', 
        border: 'border-red-500/20',
        badge: 'bg-red-500 text-white',
        pulse: true 
      };
    case 'high': 
      return { 
        color: 'text-orange-500', 
        bg: 'bg-orange-500/10', 
        border: 'border-orange-500/20',
        badge: 'bg-orange-500 text-white',
        pulse: false 
      };
    case 'medium': 
      return { 
        color: 'text-yellow-600', 
        bg: 'bg-yellow-500/10', 
        border: 'border-yellow-500/20',
        badge: 'bg-yellow-500 text-white',
        pulse: false 
      };
    case 'low': 
      return { 
        color: 'text-blue-500', 
        bg: 'bg-blue-500/10', 
        border: 'border-blue-500/20',
        badge: 'bg-blue-500 text-white',
        pulse: false 
      };
    default: 
      return { 
        color: 'text-muted-foreground', 
        bg: 'bg-muted', 
        border: 'border-border',
        badge: 'bg-muted text-muted-foreground',
        pulse: false 
      };
  }
};

interface AtRiskStudentsWidgetProps {
  cohortId?: string;
  departmentId?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  maxDisplay?: number;
}

export function AtRiskStudentsWidget({ 
  cohortId, 
  departmentId, 
  riskLevel = 'medium',
  maxDisplay = 5 
}: AtRiskStudentsWidgetProps) {
  const { data, isLoading, error } = useQuery<{ success: boolean; count: number; data: AtRiskStudent[] }>({
    queryKey: ['at-risk-students', cohortId, departmentId, riskLevel],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (cohortId) params.append('cohortId', cohortId);
      if (departmentId) params.append('departmentId', departmentId);
      params.append('riskLevel', riskLevel);
      
      const { data } = await api.get(`/attainment/students/at-risk?${params.toString()}`);
      return data;
    },
    refetchInterval: 60000,
    enabled: true,
  });

  const students = data?.data || [];
  const totalAtRisk = data?.count || 0;

  return (
    <Card className="border-none shadow-xl bg-card/60 backdrop-blur-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
      <CardHeader className="border-b border-border/50 bg-muted/20 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <ShieldAlert className="h-5 w-5 text-orange-500" />
            </div>
            <span>Critical Student Focus</span>
          </CardTitle>
          {totalAtRisk > 0 && (
            <Badge variant="destructive" className="px-2.5 py-0.5 font-bold animate-pulse">
              {totalAtRisk} Total
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
            <p className="text-sm text-muted-foreground animate-pulse font-medium">Analyzing student data...</p>
          </div>
        )}

        {error && (
          <div className="p-6">
            <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="font-medium">
                Internal synchronization error. Our team is investigating.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {!isLoading && !error && students.length === 0 && (
          <div className="text-center py-20 px-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4 animate-in zoom-in duration-500">
              <User className="h-8 w-8 text-green-500" />
            </div>
            <h4 className="text-base font-semibold text-foreground">Operational Excellence</h4>
            <p className="text-sm text-muted-foreground mt-1 max-w-[240px] mx-auto">
              All students are currently meeting the established attainment benchmarks.
            </p>
          </div>
        )}

        {!isLoading && !error && students.length > 0 && (
          <div className="divide-y divide-border/40">
            {students.slice(0, maxDisplay).map((student, index) => {
              const config = getRiskConfig(student.riskLevel);
              return (
                <div 
                  key={`${student.studentId}-${index}`}
                  className="group relative flex items-center gap-4 p-4 hover:bg-muted/30 transition-all duration-300 animate-in fade-in slide-in-from-right-4"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="relative">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300 shadow-inner",
                      config.bg
                    )}>
                      <TrendingDown className={cn("h-6 w-6", config.color)} />
                    </div>
                    {config.pulse && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-white"></span>
                      </span>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                       <p className="font-bold text-foreground truncate group-hover:text-primary transition-colors">
                        {student.studentName}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 px-1.5 py-0.5 rounded bg-muted">
                        {student.registrationNumber}
                      </span>
                      <span className="text-xs font-medium text-muted-foreground">
                        {student.cohort}
                      </span>
                    </div>
                  </div>

                  <div className="flex-shrink-0 text-right pr-2">
                    <p className={cn("font-black text-lg tracking-tighter", config.color)}>
                      {student.currentPercentage.toFixed(1)}%
                    </p>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                      Attainment
                    </p>
                  </div>

                  <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-2 group-hover:translate-x-0">
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-primary/5 hover:bg-primary hover:text-white transition-all shadow-sm" asChild>
                      <Link to={`/messages?userId=${student.studentId}`}>
                        <MessageSquare className="h-5 w-5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}

            <div className="p-4 bg-muted/10">
              <Button variant="ghost" className="w-full justify-between text-sm font-semibold hover:bg-primary/5 group" asChild>
                <Link to="/student-analytics">
                  <span>View Comprehensive Analytics Report</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
