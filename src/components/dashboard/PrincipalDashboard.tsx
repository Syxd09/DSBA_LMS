import { StatsCard } from './StatsCard';
import { DepartmentTable } from './DepartmentTable';
import { RecentActivity } from './RecentActivity';
import { COAttainmentChart } from './COAttainmentChart';
import { AtRiskStudentsWidget } from './AtRiskStudentsWidget';
import { PerformanceTrendChart } from './PerformanceTrendChart';
// import { mockCOAttainment, coTrendData } from '@/lib/mock-data'; // REMOVED MOCK DATA
import { Users, GraduationCap, BookOpen, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export function PrincipalDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data } = await api.get('/audit-logs/dashboard-stats');
      return data;
    }
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data } = await api.get('/departments');
      return data;
    }
  });

  const { data: globalAttainment = [] } = useQuery({
    queryKey: ['global-attainment'],
    queryFn: async () => {
      const { data } = await api.get('/analytics/global-attainment');
      return data;
    }
  });

  const { data: performanceTrend = [] } = useQuery({
    queryKey: ['performance-trend'],
    queryFn: async () => {
      const { data } = await api.get('/analytics/performance-trend');
      return data;
    }
  });

  const studentCount = stats?.students || 0;
  const teacherCount = stats?.teachers || 0;
  const atRiskCount = stats?.alerts?.studentsAtRisk || 0;

  const departmentStats = departments.map((dept: any) => ({
    name: dept.name,
    passPercentage: 0, // Still need a per-dept pass rate if not in /departments
    averageScore: 0,   // Still need a per-dept average score
    totalStudents: dept._count?.users || 0,
    atRiskStudents: 0, // We could count this by filtering the at-risk list if needed
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Principal Dashboard</h2>
        <p className="text-muted-foreground">Institutional overview and academic performance</p>
      </div>

      {/* Recent Activity */}
      <div className="mb-6">
        <RecentActivity limit={3} />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Students"
          value={studentCount.toLocaleString()}
          subtitle="Across all departments"
          icon={GraduationCap}
          trend={{ value: 5.2, isPositive: true }}
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
          value={(stats?.subjects || 0).toString()}
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
          {/* Students At Risk Alert */}
          {stats?.alerts?.studentsAtRisk > 0 && (
            <div className="flex items-center justify-between p-3 bg-destructive/5 border border-destructive/20">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-destructive rounded-full" />
                <span className="text-sm">{stats.alerts.studentsAtRisk} students identified as at-risk across all departments</span>
              </div>
              <Badge variant="destructive">Critical</Badge>
            </div>
          )}

          {/* Pending Approvals Alert */}
          {stats?.alerts?.pendingApprovals > 0 && (
            <div className="flex items-center justify-between p-3 bg-blue-500/5 border border-blue-500/20">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span className="text-sm">{stats.alerts.pendingApprovals} pending approval{stats.alerts.pendingApprovals !== 1 ? 's' : ''} need review</span>
              </div>
              <Badge className="bg-blue-500">Action Required</Badge>
            </div>
          )}

          {/* Incomplete CO Attainments Alert */}
          {stats?.alerts?.incompleteAttainments > 0 && (
            <div className="flex items-center justify-between p-3 bg-muted/50 border border-border">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                <span className="text-sm">{stats.alerts.incompleteAttainments} subject{stats.alerts.incompleteAttainments !== 1 ? 's' : ''} without Course Outcomes defined</span>
              </div>
              <Badge variant="outline">Warning</Badge>
            </div>
          )}

          {/* Departments Without Subjects Alert */}
          {stats?.alerts?.departmentsWithoutSubjects > 0 && (
            <div className="flex items-center justify-between p-3 bg-muted/50 border border-border">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                <span className="text-sm">{stats.alerts.departmentsWithoutSubjects} department{stats.alerts.departmentsWithoutSubjects !== 1 ? 's' : ''} have no active subjects</span>
              </div>
              <Badge variant="outline">Warning</Badge>
            </div>
          )}

          {/* Success State - All Active */}
          {stats?.departments > 0 && stats?.subjects > 0 && (
            <div className="flex items-center justify-between p-3 bg-green-500/5 border border-green-500/20">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">{stats.departments} department{stats.departments !== 1 ? 's' : ''} active with {stats.subjects} subject{stats.subjects !== 1 ? 's' : ''}</span>
              </div>
              <Badge className="bg-green-500">Active</Badge>
            </div>
          )}

          {/* No Alerts State - All Clear */}
          {stats?.alerts && 
           stats.alerts.studentsAtRisk === 0 && 
           stats.alerts.pendingApprovals === 0 && 
           stats.alerts.incompleteAttainments === 0 && 
           stats.alerts.departmentsWithoutSubjects === 0 && (
            <div className="flex items-center justify-between p-3 bg-green-500/5 border border-green-500/20">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">No attention required - all systems running smoothly</span>
              </div>
              <Badge className="bg-green-500">All Clear</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AtRiskStudentsWidget riskLevel="medium" maxDisplay={5} />
        <COAttainmentChart data={globalAttainment} />
      </div>

      {/* Performance Trend */}
      <div>
        <PerformanceTrendChart data={performanceTrend} />
      </div>

      {/* Recent Activity & Departments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="lg:col-span-2">
            <DepartmentTable departments={departmentStats} />
          </div>
      </div>
    </div>
  );
}
