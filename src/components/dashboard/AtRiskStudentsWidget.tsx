import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import api from '@/lib/api';

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
        color: 'text-rose-600', 
        bg: 'bg-rose-500/10', 
        border: 'border-rose-500/20',
        badge: 'bg-rose-600 text-white',
        pulse: true 
      };
    case 'high': 
      return { 
        color: 'text-orange-600', 
        bg: 'bg-orange-500/10', 
        border: 'border-orange-500/20',
        badge: 'bg-orange-600 text-white',
        pulse: false 
      };
    case 'medium': 
      return { 
        color: 'text-slate-900', 
        bg: 'bg-slate-900/10', 
        border: 'border-slate-900/20',
        badge: 'bg-slate-900 text-white',
        pulse: false 
      };
    case 'low': 
      return { 
        color: 'text-slate-500', 
        bg: 'bg-slate-500/10', 
        border: 'border-slate-500/20',
        badge: 'bg-slate-500 text-white',
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
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-destructive" />
          Critical Students
        </CardTitle>
        <CardDescription>Students requiring immediate academic intervention.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Loader2 className="h-6 w-6 animate-spin opacity-20" />
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Loading...</p>
          </div>
        )}

        {error && (
          <div className="p-6">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>Failed to fetch risk data.</AlertDescription>
            </Alert>
          </div>
        )}

        {!isLoading && !error && students.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <User className="h-10 w-10 mx-auto opacity-10 mb-2" />
            <p className="text-sm">No critical students identified.</p>
          </div>
        )}

        {!isLoading && !error && students.length > 0 && (
          <div className="divide-y">
            {students.slice(0, maxDisplay).map((student, index) => (
              <div 
                key={`${student.studentId}-${index}`}
                className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{student.studentName}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{student.registrationNumber} • {student.cohort}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-sm font-bold text-destructive">
                    {student.currentPercentage.toFixed(1)}%
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Attainment</p>
                </div>
              </div>
            ))}

            <div className="p-4 bg-muted/20">
              <Button variant="ghost" className="w-full text-xs font-semibold justify-between group" asChild>
                <Link to="/student-analytics">
                  View Full Report
                  <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
