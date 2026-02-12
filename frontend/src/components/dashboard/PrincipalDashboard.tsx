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

export function PrincipalDashboard() {
  
  // 1. Institution Overview (Phase 3)
  const { data: institutionOverview, isLoading: loadingOverview } = useQuery({
    queryKey: ['principal-institution-overview'],
    queryFn: () => roleAnalyticsApi.getInstitutionOverview(),
    staleTime: 60000,
  });

  // 2. Department Comparison (Phase 3)
  const { data: deptComparison, isLoading: loadingComparison } = useQuery({
    queryKey: ['principal-dept-comparison'],
    queryFn: () => roleAnalyticsApi.getDepartmentComparison(),
    staleTime: 60000, 
  });

  // 3. Accreditation Readiness (Phase 3)
  const { data: accreditation, isLoading: loadingAccreditation } = useQuery({
    queryKey: ['principal-accreditation'],
    queryFn: () => roleAnalyticsApi.getAccreditationReadiness(),
    staleTime: 300000,
  });

  // Extract Data
  const summary = institutionOverview?.data?.institution_summary || {};
  const alerts = institutionOverview?.data?.alerts || {};
  const compData = deptComparison?.data?.comparison || [];

  // Stats for cards
  const studentCount = summary.total_students || 0;
  const teacherCount = summary.total_teachers || 0;
  const programCount = summary.total_programs || 0;
  const pendingApprovals = alerts.pending_approvals || 0;

  // Map Department Comparison for Table
  const tableData = compData.map((dept: any) => ({
    name: dept.department_name || "Unknown",
    totalStudents: dept.students || 0,
    passPercentage: Number(dept.pass_percentage || 0),
    averageScore: Number(dept.average_score || 0),
    atRiskStudents: dept.at_risk_students || 0,
    status: (dept.pass_percentage || 0) >= AcademicConfig.DEPARTMENT_HEALTH_THRESHOLD ? "Active" : "Review Needed", 
  }));


  if (loadingOverview || loadingComparison) {
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
          value={`${summary.total_departments || 0} / ${programCount}`}
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
          title="Pending Approvals"
          value={pendingApprovals.toString()}
          subtitle="Exams awaiting review"
          icon={AlertTriangle}
          variant={pendingApprovals > 0 ? "warning" : "default"}
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
             <CardTitle className="text-base font-semibold">Institutional Health</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-card border flex flex-col justify-between">
                   <h4 className="text-sm font-medium text-muted-foreground">Active Cohorts</h4>
                   <p className="text-2xl font-bold">{summary.active_cohorts || 0}</p>
                </div>
                <div className="p-4 rounded-lg bg-card border flex flex-col justify-between">
                   <h4 className="text-sm font-medium text-muted-foreground">Exams Conducted</h4>
                   <p className="text-2xl font-bold">{summary.total_exams || 0}</p>
                </div>
                <div className="p-4 rounded-lg bg-card border flex flex-col justify-between">
                   <h4 className="text-sm font-medium text-muted-foreground">Finalized Results</h4>
                   <p className="text-2xl font-bold">{summary.exams_locked || 0}</p>
                </div>
             </div>
          </CardContent>
        </Card>
      </div>

      {/* Department Comparison Table */}
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
