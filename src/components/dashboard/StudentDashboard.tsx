import { StatsCard } from './StatsCard';
import { COAttainmentChart } from './COAttainmentChart';
import { TopicWeaknessHeatmap } from './TopicWeaknessHeatmap';
import { InternalExternalGapChart } from './InternalExternalGapChart';
import { InsightsCard } from './InsightsCard';
import { SemesterTrendChart } from './SemesterTrendChart';
import { GraduationCap, BookOpen, TrendingUp, Award, Brain, Target, AlertCircle, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi, roleAnalyticsApi, templatesApi } from '@/lib/api';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export function StudentDashboard() {
  // Primary dashboard data
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['student-dashboard'],
    queryFn: () => dashboardApi.getStudentDashboard(),
  });

  // Phase 3: Role-scoped analytics for detailed performance
  const { data: performanceData, isLoading: performanceLoading } = useQuery({
    queryKey: ['student-role-performance'],
    queryFn: () => roleAnalyticsApi.getStudentPerformance(),
    staleTime: 60000, // Cache for 1 minute
  });

  const overallAverage = dashboardData?.overall_average || 0;
  const sgpa = dashboardData?.sgpa || 0;
  const cgpa = dashboardData?.cgpa || 0;
  const subjectsEnrolled = dashboardData?.subjects_enrolled || 0;
  const results = dashboardData?.results || [];
  const bloomPerformance = dashboardData?.bloom_performance || [];
  const usn = dashboardData?.usn || '';

  const handleDownloadReport = async () => {
    if (!usn) return;
    try {
      const blob = await templatesApi.getStudentPerformanceReport(usn, 'pdf');
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Student_Report_${usn}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Failed to download report:", error);
      alert("Failed to generate report. Please try again.");
    }
  };

  // Phase 3 performance insights
  const rolePerformance = performanceData?.data || {};
  const passedCount = rolePerformance.passed_count || 0;
  const failedCount = rolePerformance.failed_count || 0;
  const warnings = performanceData?.warnings || [];

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Student Dashboard</h2>
          <p className="text-muted-foreground">Track your academic performance and progress</p>
        </div>
        <Button onClick={handleDownloadReport} disabled={!usn}>
          <Download className="w-4 h-4 mr-2" />
          Download Report
        </Button>
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

        {/* Topic Weakness Heatmap */}
        <TopicWeaknessHeatmap results={results} />
      </div>

      {/* New Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SemesterTrendChart usn={usn} />
        <InternalExternalGapChart usn={usn} />
        <InsightsCard usn={usn} />
      </div>

      {/* CO Attainment Row */}
      <div className="grid grid-cols-1 gap-6">
        <div className="col-span-1 lg:col-span-2">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5" />
              Course Outcome Attainment
            </h3>
            {results.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map((result: any, index: number) => (
                  result.offering_id ? (
                    <COAttainmentChart 
                      key={index} 
                      offeringId={result.offering_id} 
                      subjectName={result.subject_name} 
                    />
                  ) : null
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  CO Attainment data will appear after exams are evaluated.
                </CardContent>
              </Card>
            )}
        </div>
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
