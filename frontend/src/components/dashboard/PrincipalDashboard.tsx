import { StatsCard } from './StatsCard';
import { DepartmentTable } from './DepartmentTable';
import { PerformanceTrendChart } from './PerformanceTrendChart';
import { BloomTaxonomyChart } from './BloomTaxonomyChart';
import { AccreditationReadinessCard } from './AccreditationReadinessCard';
import { Users, GraduationCap, BookOpen, AlertTriangle, CheckCircle, Building2, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi, departmentsApi, analyticsApi, roleAnalyticsApi } from '@/lib/api';
import { AcademicConfig } from '@/config/academicConfig';
import { DashboardFilterBar } from './DashboardFilterBar';
import { useState } from 'react';

export function PrincipalDashboard() {
  const [filters, setFilters] = useState<{ department_id?: string; cohort_id?: string; semester?: number }>({});
  
  // 1. Principal Dashboard Data (Refactored to use Filter-aware API)
  const { data: dashboardData, isLoading: loadingDashboard } = useQuery({
    queryKey: ['principal-dashboard', filters],
    queryFn: () => dashboardApi.getPrincipalDashboard(filters),
    staleTime: 60000,
  });

  // Keep Accreditation Readiness (Phase 3)
  const { data: accreditation, isLoading: loadingAccreditation } = useQuery({
    queryKey: ['principal-accreditation'],
    queryFn: () => roleAnalyticsApi.getAccreditationReadiness(),
    staleTime: 300000,
  });

  // Extract Data from new Dashboard API
  const studentCount = dashboardData?.total_students || 0;
  const teacherCount = dashboardData?.total_teachers || 0;
  const programCount = dashboardData?.total_programs || 0;
  const deptCount = dashboardData?.total_departments || 0;
  const atRiskCount = dashboardData?.at_risk_students || 0;
  const avgPassRate = dashboardData?.avg_pass_rate || 0;
  
  // Map Department Comparison for Table (now part of dashboardData)
  const compData = dashboardData?.department_stats || [];

  // Map Department Comparison for Table
  const tableData = compData.map((dept: any) => ({
    name: dept.department_name || "Unknown",
    totalStudents: dept.students || 0,
    passPercentage: Number(dept.pass_percentage || 0),
    averageScore: Number(dept.average_score || 0),
    atRiskStudents: dept.at_risk_students || 0,
    status: (dept.pass_percentage || 0) >= AcademicConfig.DEPARTMENT_HEALTH_THRESHOLD ? "Active" : "Review Needed", 
  }));


  if (loadingDashboard) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Principal Dashboard</h2>
        <p className="text-muted-foreground">Institutional overview, compliance, and department performance</p>
      </div>

      {/* Global Filter Bar */}
      <DashboardFilterBar 
        role="principal" 
        onFilterChange={setFilters} 
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Students"
          value={studentCount.toLocaleString()}
          subtitle="Active enrollments"
          icon={GraduationCap}
          variant="primary"
        />
        <StatsCard
          title="Departments & Programs"
          value={`${deptCount} / ${programCount}`}
          subtitle="Academic structure"
          icon={Building2}
        />
        <StatsCard
          title="Teaching Faculty"
          value={teacherCount.toString()}
          subtitle="Active across departments"
          icon={Users}
        />
        <StatsCard
          title="Avg Pass Rate"
          value={`${avgPassRate}%`}
          subtitle="Selected period"
          icon={TrendingUp}
          variant={avgPassRate >= 70 ? "success" : "warning"}
        />
        <StatsCard
          title="At-Risk Students"
          value={atRiskCount.toString()}
          subtitle="Immediate attention"
          icon={AlertTriangle}
          variant={atRiskCount > 0 ? "danger" : "default"}
        />
      </div>

      {/* Accreditation & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Readiness Card */}
        <div className="lg:col-span-1">
            <AccreditationReadinessCard />
        </div>

        {/* Department Comparison Chart (Using Bar Chart logic potentially, utilizing PerformanceTrendChart as a placeholder for now or create a new one?) 
            Actually, let's use the DepartmentTable for detailed comparison and maybe a simple aggregate chart later.
            For now, let's show alerts.
        */}
         <Card className="lg:col-span-2">
          <CardHeader>
             <CardTitle className="text-base font-semibold border-b pb-2">Institutional Health Metrics</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-card border flex flex-col justify-between hover:border-primary transition-colors">
                   <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Subjects</h4>
                   <p className="text-3xl font-bold text-primary">{dashboardData?.total_subjects || 0}</p>
                </div>
                <div className="p-4 rounded-lg bg-card border flex flex-col justify-between hover:border-primary transition-colors">
                   <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Pass Rate Index</h4>
                   <p className="text-3xl font-bold text-success">{avgPassRate}%</p>
                </div>
             </div>
          </CardContent>
        </Card>
      </div>

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
      <Card>
        <CardHeader>
          <CardTitle>Department Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <DepartmentTable departments={tableData} />
        </CardContent>
      </Card>
    </div>
  );
}
