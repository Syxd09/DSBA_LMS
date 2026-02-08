import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Brain, Target, Lightbulb, TrendingUp, Loader2 } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';
import { useMemo } from 'react';

export default function Performance() {
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['student-dashboard'],
    queryFn: () => dashboardApi.getStudentDashboard(),
  });

  const bloomPerformance = dashboardData?.bloom_performance || [];
  const results = dashboardData?.results || [];

  // Prepare radar data from real bloom performance
  const radarData = useMemo(() => {
    if (bloomPerformance.length > 0) {
      return bloomPerformance.map((b: any) => ({
        subject: b.level,
        A: b.percentage,
        fullMark: 100,
      }));
    }
    return [];
  }, [bloomPerformance]);

  // Progress data from results
  const progressData = useMemo(() => {
    if (results.length > 0) {
      return results.slice(-5).map((r: any) => ({
        exam: r.subject_code || 'Exam',
        score: r.percentage || 0,
      }));
    }
    return [];
  }, [results]);

  // Generate recommendations based on actual performance
  const recommendations = useMemo(() => {
    const recs: Array<{ title: string; message: string; type: 'warning' | 'success' }> = [];
    
    // Check bloom performance
    const lowBloom = bloomPerformance.filter((b: any) => b.percentage < 60);
    if (lowBloom.length > 0) {
      recs.push({
        title: 'Focus on Higher-Order Thinking',
        message: `Your performance in ${lowBloom.map((b: any) => b.level).join(', ')} levels needs improvement. Practice more analytical problems.`,
        type: 'warning'
      });
    }
    
    // Check results for low performers
    const lowResults = results.filter((r: any) => r.percentage && r.percentage < 50);
    if (lowResults.length > 0) {
      recs.push({
        title: 'Subjects Needing Attention',
        message: `Focus on improving ${lowResults.map((r: any) => r.subject_name).join(', ')}. Consider seeking extra help.`,
        type: 'warning'
      });
    }
    
    // Check for strong performance
    const highResults = results.filter((r: any) => r.percentage && r.percentage >= 80);
    if (highResults.length > 0) {
      recs.push({
        title: 'Excellent Performance!',
        message: `Great job in ${highResults.map((r: any) => r.subject_name).join(', ')}. Keep up the good work!`,
        type: 'success'
      });
    }
    
    if (recs.length === 0) {
      recs.push({
        title: 'Keep Learning!',
        message: 'Complete more exams to get personalized recommendations based on your performance.',
        type: 'success'
      });
    }
    
    return recs;
  }, [bloomPerformance, results]);

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
          <h2 className="text-2xl font-bold text-foreground">My Performance</h2>
          <p className="text-muted-foreground">Detailed analysis of your academic performance</p>
        </div>

        {/* Progress Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Performance Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {progressData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={progressData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="exam" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground">
                Performance trend will appear after exams are completed.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Bloom Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Brain className="w-4 h-4" />
                Bloom's Taxonomy Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {radarData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                      <Radar name="Performance" dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">
                  Bloom's taxonomy analysis will appear after exams are completed.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Target className="w-4 h-4" />
                Cognitive Level Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {bloomPerformance.length > 0 ? (
                bloomPerformance.map((bloom: any) => (
                  <div key={bloom.level} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{bloom.level}</span>
                      <span className="font-medium">{bloom.percentage}%</span>
                    </div>
                    <Progress value={bloom.percentage} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {bloom.questions_attempted} of {bloom.total_questions} questions
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-center py-8 text-muted-foreground">
                  Cognitive breakdown will appear after exams are completed.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Subject Performance Summary */}
        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Subject Performance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {results.slice(0, 5).map((result: any) => (
                  <div key={result.subject_id || result.subject_code} className="p-4 border border-border text-center rounded-lg">
                    <p className="text-2xl font-bold text-foreground">{result.percentage?.toFixed(0) || 0}%</p>
                    <p className="font-medium text-primary truncate">{result.subject_code}</p>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{result.subject_name}</p>
                    <Progress value={result.percentage || 0} className="h-1 mt-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-500" />
              Personalized Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.map((rec, index) => (
                <div 
                  key={index} 
                  className={`p-4 border rounded-lg ${
                    rec.type === 'success' 
                      ? 'bg-green-500/10 border-green-500/20' 
                      : 'bg-secondary/30 border-border'
                  }`}
                >
                  <p className={`font-medium text-sm mb-1 ${rec.type === 'success' ? 'text-green-700' : ''}`}>
                    {rec.title}
                  </p>
                  <p className="text-sm text-muted-foreground">{rec.message}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}
