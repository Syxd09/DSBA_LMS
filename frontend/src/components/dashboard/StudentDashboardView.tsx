import { StatsCard } from './StatsCard';
import { COAttainmentChart } from './COAttainmentChart';
import { BloomTaxonomyChart } from './BloomTaxonomyChart';
import { TopicWeaknessHeatmap } from './TopicWeaknessHeatmap';
import { InternalExternalGapChart } from './InternalExternalGapChart';
import { InsightsCard } from './InsightsCard';
import { SemesterTrendChart } from './SemesterTrendChart';
import { GraduationCap, BookOpen, TrendingUp, Award, Target, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi, roleAnalyticsApi, templatesApi } from '@/lib/api';
import { RemedialTasksList } from '@/components/remedial/RemedialTasksList';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface StudentDashboardViewProps {
  studentId?: string; // If provided, fetches specific student (Staff View)
  isStaffView?: boolean;
}

export function StudentDashboardView({ studentId, isStaffView = false }: StudentDashboardViewProps) {
  // Semester filtering
  const [selectedSemester, setSelectedSemester] = useState<string>("all");

  // Primary dashboard data - Conditional based on view mode
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['student-dashboard', studentId, selectedSemester],
    queryFn: () => {
      const sem = selectedSemester !== "all" ? parseInt(selectedSemester) : undefined;
      return studentId 
        ? dashboardApi.getStudentDashboardById(studentId, sem)
        : dashboardApi.getStudentDashboard(sem);
    },
  });

  // Performance analytics (Note: backend for getStudentPerformance currently uses current_user, 
  // we might need a staff version of this too if we want full parity in 360 view)
  const { data: performanceData } = useQuery({
    queryKey: ['student-role-performance', studentId],
    queryFn: () => roleAnalyticsApi.getStudentPerformance(),
    enabled: !isStaffView, // Only for student's own view for now
    staleTime: 60000,
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
      const blob = await templatesApi.getStudentPerformanceReport(usn);
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

  const currentSemester = 8; 

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
          <h2 className="text-2xl font-bold text-foreground">
            {isStaffView ? `Student Profile: ${usn}` : 'Student Dashboard'}
          </h2>
          <p className="text-muted-foreground">
            {isStaffView ? `Comprehensive academic view for USN: ${usn}` : 'Track your academic performance and progress'}
          </p>
        </div>
        <div className="flex items-center gap-2">
            <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Semester" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Semesters</SelectItem>
                    {Array.from({length: currentSemester}, (_, i) => i + 1).map(sem => (
                        <SelectItem key={sem} value={sem.toString()}>Semester {sem}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Button onClick={handleDownloadReport} disabled={!usn}>
              <Download className="w-4 h-4 mr-2" />
              Report
            </Button>
        </div>
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

      {/* Remedial Tasks (Visible only if tasks exist/staff view doesn't explicitly hide) */}
      {usn && <RemedialTasksList usn={usn} />}

      {/* Results Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Subject Results</CardTitle>
        </CardHeader>
        <CardContent>
          {results.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((result: any, index: number) => (
                <div key={index} className="p-4 border rounded-lg bg-secondary/20 hover:border-primary/30 transition-colors">
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
              No exam results available for the selected period.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Learning Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BloomTaxonomyChart data={bloomPerformance} />
        <TopicWeaknessHeatmap results={results} />
      </div>

      {/* Insights Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SemesterTrendChart usn={usn} />
        <InternalExternalGapChart usn={usn} />
        <InsightsCard usn={usn} />
      </div>

      {/* CO Attainment Row */}
      <div className="grid grid-cols-1 gap-6">
        <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
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
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Learning Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {bloomPerformance
                .filter((b: any) => b.percentage < 70)
                .map((b: any, index: number) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-background border rounded-lg shadow-sm">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                    <span className="text-sm">
                      Focus on improving <strong>{b.level}</strong> skills (currently at {b.percentage.toFixed(1)}%)
                    </span>
                  </div>
                ))}
              {bloomPerformance.filter((b: any) => b.percentage < 70).length === 0 && (
                <p className="text-sm text-green-600 font-medium">
                  Excellent consistency! Performance across all Bloom's levels is on track.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
