import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Award, BookOpen, TrendingUp, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi, gradingApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

export default function Results() {
  const { profile } = useAuth();
  
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['student-dashboard'],
    queryFn: () => dashboardApi.getStudentDashboard(),
    enabled: !!profile,
  });

  const results = dashboardData?.results || [];
  const sgpa = dashboardData?.sgpa || 0;
  const cgpa = dashboardData?.cgpa || 0;
  const overallAverage = dashboardData?.overall_average || 0;

  if (isLoading) {
    return (
      <AuthenticatedLayout allowedRoles={['student']}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout allowedRoles={['student']}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">My Results</h2>
          <p className="text-muted-foreground">View your examination results and grades</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Award className="w-4 h-4" />
                Current SGPA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">{(Number(sgpa) || 0).toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">This semester</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                CGPA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{(Number(cgpa) || 0).toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">Cumulative</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Overall Average
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">{(Number(overallAverage) || 0).toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground mt-1">All subjects</p>
            </CardContent>
          </Card>
        </div>

        {/* Subject Results */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Subject-wise Results</CardTitle>
          </CardHeader>
          <CardContent>
            {results.length > 0 ? (
              <div className="space-y-4">
                {results.map((result: any, index: number) => (
                  <div key={index} className="p-4 border border-border rounded-lg hover:bg-secondary/20 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium text-lg">{result.subject_name}</p>
                        <p className="text-sm text-muted-foreground">{result.subject_code}</p>
                      </div>
                      <Badge 
                        variant={result.grade && result.grade !== 'F' ? 'default' : 'destructive'}
                        className="text-lg px-3 py-1"
                      >
                        {result.grade || 'Pending'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Internal 1</p>
                        <p className="font-medium">{result.internal_1 || '-'} / 30</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Internal 2</p>
                        <p className="font-medium">{result.internal_2 || '-'} / 30</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Best Internal</p>
                        <p className="font-medium">{result.best_internal || '-'} / 30</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Percentage</p>
                        <p className="font-medium">{(Number(result.percentage) || 0).toFixed(1)}%</p>
                      </div>
                    </div>
                    {result.percentage && (
                      <Progress value={result.percentage} className="h-2 mt-3" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No results available yet</p>
                <p className="text-sm mt-1">Results will appear here once your exams are graded</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}
