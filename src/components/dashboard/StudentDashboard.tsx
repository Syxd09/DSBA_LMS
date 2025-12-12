import { StatsCard } from './StatsCard';
import { GraduationCap, BookOpen, TrendingUp, Award, Brain, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export function StudentDashboard() {
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['student-dashboard'],
    queryFn: () => dashboardApi.getStudentDashboard(),
  });

  const overallAverage = dashboardData?.overall_average || 0;
  const sgpa = dashboardData?.sgpa || 0;
  const cgpa = dashboardData?.cgpa || 0;
  const subjectsEnrolled = dashboardData?.subjects_enrolled || 0;
  const results = dashboardData?.results || [];
  const bloomPerformance = dashboardData?.bloom_performance || [];

  // Prepare radar chart data from real bloom performance
  const radarData = bloomPerformance.length > 0
    ? bloomPerformance.map((b: any) => ({
        subject: b.level,
        A: b.percentage,
        fullMark: 100,
      }))
    : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Student Dashboard</h2>
        <p className="text-muted-foreground">Track your academic performance and progress</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Overall Average"
          value={`${overallAverage.toFixed(1)}%`}
          subtitle="Across all subjects"
          icon={TrendingUp}
          variant="primary"
        />
        <StatsCard
          title="Current SGPA"
          value={sgpa.toFixed(2)}
          subtitle="This semester"
          icon={Award}
        />
        <StatsCard
          title="CGPA"
          value={cgpa.toFixed(2)}
          subtitle="Cumulative"
          icon={GraduationCap}
          variant="success"
        />
        <StatsCard
          title="Subjects Enrolled"
          value={subjectsEnrolled.toString()}
          subtitle="Current semester"
          icon={BookOpen}
        />
      </div>

      {/* Results Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Subject Results</CardTitle>
        </CardHeader>
        <CardContent>
          {results.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((result: any, index: number) => (
                <div key={index} className="p-4 border rounded-lg bg-secondary/20">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">{result.subject_name}</p>
                    <Badge variant={result.grade && result.grade !== 'F' ? 'default' : 'destructive'}>
                      {result.grade || 'Pending'}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">
                    Marks: {result.total_marks}/{result.max_marks}
                  </div>
                  <Progress value={(result.total_marks / result.max_marks) * 100} className="h-2" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              No exam results available yet. Results will appear after exams are graded.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Learning Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bloom's Taxonomy Performance */}
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
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                    <Radar name="Performance" dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.5} />
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

        {/* CO Attainment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Target className="w-4 h-4" />
              Course Outcome Attainment
            </CardTitle>
          </CardHeader>
          <CardContent>
            {results.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={results.slice(0, 6).map((r: any, i: number) => ({
                    name: r.subject_code || `S${i + 1}`,
                    score: ((r.total_marks / r.max_marks) * 100) || 0,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                      }}
                    />
                    <Bar dataKey="score" fill="hsl(var(--primary))" name="Score %" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground">
                Performance chart will appear after exams are completed.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      {bloomPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Learning Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {bloomPerformance
                .filter((b: any) => b.percentage < 70)
                .map((b: any, index: number) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                    <span className="text-sm">
                      Focus on improving <strong>{b.level}</strong> skills (currently at {b.percentage}%)
                    </span>
                  </div>
                ))}
              {bloomPerformance.filter((b: any) => b.percentage < 70).length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Great job! Your performance across all Bloom's taxonomy levels is above 70%.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
