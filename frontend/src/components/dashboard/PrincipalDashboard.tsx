import { StatsCard } from './StatsCard';
import { DepartmentTable } from './DepartmentTable';
import { PerformanceTrendChart } from './PerformanceTrendChart';
import { BloomTaxonomyChart } from './BloomTaxonomyChart'; 
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
  const readiness = accreditation?.data || {};

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

  // Accreditation logic
  const readinessScore = Number(readiness.overall_readiness_score || 0);
  const readinessStatus = readiness.status || "UNKNOWN";
  const recommendations = readiness.recommendations || [];

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
        <Card className="lg:col-span-1 border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />
                NBA/NAAC Readiness
              </span>
              <Badge variant={readinessStatus === "READY" ? "default" : "destructive"}>
                {readinessScore}%
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
               <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Overall Compliance</span>
                    <span className="font-medium">{readinessScore}%</span>
                  </div>
                  <div className="h-2 w-full bg-background rounded-full overflow-hidden border">
                    <div 
                      className={`h-full ${readinessScore >= AcademicConfig.ACCREDITATION_READINESS_THRESHOLD ? 'bg-green-500' : 'bg-yellow-500'}`} 
                      style={{ width: `${readinessScore}%` }} 
                    />
                  </div>
               </div>
               {recommendations.length > 0 && (
                 <div className="space-y-2">
                   {recommendations.slice(0, 2).map((rec: any, idx: number) => (
                     <div key={idx} className="text-xs flex items-start gap-2 text-muted-foreground bg-background/50 p-2 rounded">
                       <AlertTriangle className="w-3 h-3 mt-0.5 text-yellow-600 shrink-0" />
                       <span>{rec.action}</span>
                     </div>
                   ))}
                 </div>
               )}
            </div>
          </CardContent>
        </Card>

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
