import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Loader2, User, TrendingDown } from 'lucide-react';
import api from '@/lib/api';
import { Link } from 'react-router-dom';

interface AtRiskStudent {
  studentId: string;
  studentName: string;
  email: string;
  rollNumber: string;
  cohort: string;
  department: string;
  currentPercentage: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  examsCompleted: number;
}

const getRiskColor = (risk: string) => {
  switch (risk) {
    case 'critical': return 'bg-red-600 hover:bg-red-700';
    case 'high': return 'bg-orange-500 hover:bg-orange-600';
    case 'medium': return 'bg-yellow-500 hover:bg-yellow-600';
    case 'low': return 'bg-blue-500 hover:bg-blue-600';
    default: return 'bg-gray-500';
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
    refetchInterval: 60000, // Refresh every minute
    // Temporarily disabled until endpoint is implemented
    enabled: false,
  });

  // Use mock data until API endpoint is ready
  const students = [];
  const totalAtRisk = data?.count || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Students At Risk
          {totalAtRisk > 0 && (
            <Badge variant="destructive" className="ml-auto">
              {totalAtRisk}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load at-risk students
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && !error && students.length === 0 && (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-3">
              <User className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-sm text-muted-foreground">No students at risk</p>
            <p className="text-xs text-muted-foreground mt-1">All students performing well</p>
          </div>
        )}

        {!isLoading && !error && students.length > 0 && (
          <div className="space-y-3">
            {students.map((student) => (
              <div 
                key={student.studentId}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-shrink-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${getRiskColor(student.riskLevel)}`}>
                    <TrendingDown className="h-5 w-5" />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{student.studentName}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{student.rollNumber}</span>
                    <span>•</span>
                    <span>{student.cohort}</span>
                  </div>
                </div>

                <div className="flex-shrink-0 text-right">
                  <p className="font-semibold text-sm">
                    {student.currentPercentage.toFixed(1)}%
                  </p>
                  <Badge 
                    variant="outline"
                    className={`text-xs ${getRiskColor(student.riskLevel)} text-white border-none`}
                  >
                    {student.riskLevel}
                  </Badge>
                </div>
              </div>
            ))}

            {totalAtRisk > maxDisplay && (
              <div className="pt-2 text-center">
                <Link 
                  to="/student-analytics" 
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                >
                  View all {totalAtRisk} at-risk students →
                </Link>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
