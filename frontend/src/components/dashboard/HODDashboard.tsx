import { StatsCard } from './StatsCard';
import { DashboardCOChart } from './DashboardCOChart';
import { BloomTaxonomyChart } from './BloomTaxonomyChart';
import { FacultyComparisonTable } from './FacultyComparisonTable';
import { BacklogRootCauseAnalysis } from './BacklogRootCauseAnalysis';
import { Users, GraduationCap, TrendingUp, AlertTriangle, Building2, Download } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi, roleAnalyticsApi, templatesApi } from '@/lib/api';
import { CourseAttainmentGapChart } from './CourseAttainmentGapChart';
import { DashboardFilterBar } from './DashboardFilterBar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useEffect } from 'react';

export function HODDashboard() {
  const [selectedGapOffering, setSelectedGapOffering] = useState<string>('');
  const [filters, setFilters] = useState<{ cohort_id?: string; semester?: number }>({});

  // Primary dashboard data - Filter aware
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['hod-dashboard', filters],
    queryFn: () => dashboardApi.getHODDashboard(filters),
  });

  // Phase 3: Role-scoped department analytics
  const { data: deptHealth } = useQuery({
    queryKey: ['hod-department-health', filters],
    queryFn: () => roleAnalyticsApi.getDepartmentHealth(filters),
    staleTime: 60000,
  });

  // Merge Phase 3 insights
  const healthData = deptHealth?.data || {};
  const healthStatus = healthData.health_status || 'LOADING';
  const subjectStats = healthData.subject_stats || [];

  // Set default offering for gap analysis
  useEffect(() => {
    if (subjectStats.length > 0 && !selectedGapOffering) {
        // Find first offering with valid ID
        const first = subjectStats.find((s: any) => s.offering_id);
        if (first) setSelectedGapOffering(first.offering_id);
    }
  }, [subjectStats, selectedGapOffering]);

  const deptStudents = dashboardData?.department_students || 0;
  const deptTeachers = dashboardData?.department_teachers || 0;
  const passRate = dashboardData?.pass_rate || 0;
  const atRiskCount = dashboardData?.at_risk_students || 0;
  const subjectPerformance = dashboardData?.subject_performance || [];
  const coAttainment = dashboardData?.co_attainment || [];
  const bloomData = dashboardData?.bloom_distribution || [];

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
        <h2 className="text-2xl font-bold text-foreground">HOD Dashboard</h2>
        <p className="text-muted-foreground">Department overview and academic performance</p>
      </div>

      {/* Global Filter Bar */}
      <DashboardFilterBar 
        role="hod" 
        onFilterChange={(newFilters) => {
          setFilters({
            cohort_id: newFilters.cohort_id,
            semester: newFilters.semester
          });
        }} 
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Department Students"
          value={deptStudents.toLocaleString()}
          subtitle="Active enrollments"
          icon={GraduationCap}
          variant="primary"
        />
        <StatsCard
          title="Department Faculty"
          value={deptTeachers.toString()}
          subtitle="Teaching staff"
          icon={Users}
        />
        <StatsCard
          title="Pass Rate"
          value={`${passRate}%`}
          subtitle="Current semester"
          icon={TrendingUp}
          variant="success"
        />
        <StatsCard
          title="At-Risk Students"
          value={atRiskCount.toString()}
          subtitle="Need attention"
          icon={AlertTriangle}
          variant="danger"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCOChart data={coAttainment.length > 0 ? coAttainment.map((co: any) => ({
          co: `CO${co.co_number || co.co}`,
          attainment: co.attainment || 0,
          target: co.target || 70,
        })) : []} title="Department CO Attainment" />
        <BloomTaxonomyChart data={bloomData} />
      </div>

      {/* Gap Analysis Section */}
      {subjectStats.length > 0 && (
          <div className="grid grid-cols-1 gap-6">
              <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Curriculum Gap Analysis</h3>
                  <Select value={selectedGapOffering} onValueChange={setSelectedGapOffering}>
                      <SelectTrigger className="w-[250px]">
                          <SelectValue placeholder="Select Subject" />
                      </SelectTrigger>
                      <SelectContent>
                          {subjectStats.filter((s: any) => s.offering_id).map((s: any) => (
                              <SelectItem key={s.offering_id} value={s.offering_id}>
                                  {s.subject_code} - {s.subject_name}
                              </SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
              </div>
              {selectedGapOffering && (
                   <CourseAttainmentGapChart 
                        offeringId={selectedGapOffering} 
                        subjectName={subjectStats.find((s: any) => s.offering_id === selectedGapOffering)?.subject_name}
                   />
              )}
          </div>
      )}


      {/* Subject Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Subject Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {subjectPerformance.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Average</TableHead>
                  <TableHead>Pass Rate</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjectPerformance.map((subject: any) => (
                  <TableRow key={subject.subject_code || subject.subject_id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{subject.subject_name}</p>
                        <p className="text-xs text-muted-foreground">{subject.subject_code}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{(Number(subject.average) || 0).toFixed(1)}%</span>
                        <Progress value={Number(subject.average) || 0} className="w-16 h-2" />
                      </div>
                    </TableCell>
                    <TableCell>{(Number(subject.pass_rate) || 0).toFixed(1)}%</TableCell>
                    <TableCell>{subject.total_students}</TableCell>
                    <TableCell>
                      <Badge variant={subject.pass_rate >= 70 ? 'default' : 'destructive'}>
                        {subject.pass_rate >= 70 ? 'On Track' : 'Needs Attention'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              No subject performance data available yet. Data will appear after exams are graded.
            </p>
          )}
        </CardContent>
      </Card>

      {/* At-Risk Alert */}
      {atRiskCount > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-4 h-4" />
              At-Risk Students Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              {atRiskCount} students in your department have been identified as at-risk based on their current performance.
            </p>
            <Badge variant="destructive">Immediate Action Required</Badge>
          </CardContent>
        </Card>
      )}

      {/* Student Performance Lists (Drill-down) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardData?.top_students && dashboardData.top_students.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.top_students.map((student: any) => (
                  <div key={student.student_id} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg border border-transparent hover:border-primary/30 transition-all cursor-pointer group"
                       onClick={() => window.location.href = `/student-360/${student.student_id}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                        #{student.rank}
                      </div>
                      <div>
                        <p className="font-medium group-hover:text-primary transition-colors">{student.student_name}</p>
                        <p className="text-xs text-muted-foreground">{student.usn}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">{student.average_percentage}%</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Average</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground">No data available</p>
            )}
          </CardContent>
        </Card>

        {/* At-Risk Students */}
        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              At-Risk Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardData?.at_risk_list && dashboardData.at_risk_list.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.at_risk_list.map((student: any) => (
                  <div key={student.student_id} className="flex items-center justify-between p-3 bg-destructive/5 rounded-lg border border-transparent hover:border-destructive/30 transition-all cursor-pointer group"
                       onClick={() => window.location.href = `/student-360/${student.student_id}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium group-hover:text-destructive transition-colors">{student.student_name}</p>
                        <p className="text-xs text-muted-foreground">{student.roll_number}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-destructive">{student.average_percentage}%</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Warning</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground">No students at risk in this period</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Faculty Comparison (P3-12 Requirement) */}
      <FacultyComparisonTable filters={filters} />
      {/* Program Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Program Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {dashboardData?.programs && dashboardData.programs.length > 0 ? (
            <div className="space-y-3">
              {dashboardData.programs.map((prog: any) => (
                <div key={prog.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Building2 className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{prog.name}</p>
                      <p className="text-xs text-muted-foreground">{prog.code}</p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={async () => {
                      try {
                        const blob = await templatesApi.getPOMatrixReport(prog.id, '2023-24', 'pdf');
                        const url = window.URL.createObjectURL(new Blob([blob]));
                        const link = document.createElement('a');
                        link.href = url;
                        link.setAttribute('download', `PO_Matrix_${prog.code}.pdf`);
                        document.body.appendChild(link);
                        link.click();
                        link.remove();
                      } catch (err) {
                        console.error("Download failed", err);
                        alert("Failed to download PO Matrix");
                      }
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PO Matrix
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-4 text-muted-foreground">
              No programs found required for report generation.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Backlog Root Cause Analysis */}
      <BacklogRootCauseAnalysis 
        departmentId={dashboardData?.department_id} 
        filters={filters}
      />
    </div>
  );
}
