import { StatsCard } from './StatsCard';
import { DepartmentTable } from './DepartmentTable';
import { COAttainmentChart } from './COAttainmentChart';
import { PerformanceTrendChart } from './PerformanceTrendChart';
import { Users, GraduationCap, BookOpen, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi, departmentsApi, analyticsApi } from '@/lib/api';

export function PrincipalDashboard() {
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['principal-dashboard'],
    queryFn: () => dashboardApi.getPrincipalDashboard(),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsApi.list(),
  });

  const { data: deptStats } = useQuery({
    queryKey: ['department-stats'],
    queryFn: () => analyticsApi.getDepartmentStats(),
  });

  const studentCount = dashboardData?.total_students || 0;
  const teacherCount = dashboardData?.total_teachers || 0;
  const subjectsCount = dashboardData?.total_subjects || 0;
  const atRiskCount = dashboardData?.at_risk_students || 0;
  const coAttainment = dashboardData?.co_attainment || [];
  const performanceTrend = dashboardData?.performance_trend || [];

  // Use real department stats from API
  const departmentStats = deptStats?.departments || [];
  const tableData = departmentStats.map((dept: any) => ({
    name: dept.name,
    passPercentage: dept.pass_percentage || 0,
    averageScore: dept.average_score || 0,
    totalStudents: dept.total_students || 0,
    atRiskStudents: dept.at_risk_students || 0,
  }));

  // Performance trend from real data
  const trendData = performanceTrend.length > 0 ? performanceTrend.map((p: any) => ({
    name: p.period || p.name,
    avgAttainment: p.average || p.avgAttainment,
  })) : [];

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
        <h2 className="text-2xl font-bold text-foreground">Principal Dashboard</h2>
        <p className="text-muted-foreground">Institutional overview and academic performance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Students"
          value={studentCount.toLocaleString()}
          subtitle="Across all departments"
          icon={GraduationCap}
          variant="primary"
        />
        <StatsCard
          title="Teaching Faculty"
          value={teacherCount.toString()}
          subtitle="Active this semester"
          icon={Users}
        />
        <StatsCard
          title="Active Subjects"
          value={subjectsCount.toString()}
          subtitle="Current semester"
          icon={BookOpen}
        />
        <StatsCard
          title="At-Risk Students"
          value={atRiskCount.toString()}
          subtitle="Need attention"
          icon={AlertTriangle}
          variant="danger"
        />
      </div>

      {/* Alerts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            Attention Required
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {atRiskCount > 0 && (
            <div className="flex items-center justify-between p-3 bg-destructive/5 border border-destructive/20">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-destructive rounded-full" />
                <span className="text-sm">{atRiskCount} students identified as at-risk across all departments</span>
              </div>
              <Badge variant="destructive">Critical</Badge>
            </div>
          )}
          {coAttainment.some((co: any) => (co.attainment || 0) < 70) && (
            <div className="flex items-center justify-between p-3 bg-muted/50 border border-border">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                <span className="text-sm">Some course outcomes below 70% threshold</span>
              </div>
              <Badge variant="outline">Warning</Badge>
            </div>
          )}
          <div className="flex items-center justify-between p-3 bg-green-500/5 border border-green-500/20">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">{departments.length} departments active with {subjectsCount} subjects</span>
            </div>
            <Badge className="bg-green-500">Active</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <COAttainmentChart data={coAttainment.length > 0 ? coAttainment.map((co: any) => ({
          co: `CO${co.co_number || co.co}`,
          attainment: co.attainment || 0,
          target: co.target || 70,
        })) : []} />
        <PerformanceTrendChart data={trendData} />
      </div>

      {/* Department Table */}
      {tableData.length > 0 ? (
        <DepartmentTable departments={tableData} />
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No department statistics available yet. Data will appear once exams are conducted.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
