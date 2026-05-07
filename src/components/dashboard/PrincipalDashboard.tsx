import { StatsCard } from './StatsCard';
import { DepartmentTable } from './DepartmentTable';
import { RecentActivity } from './RecentActivity';
import { AcademicPerformanceInsights } from './AcademicPerformanceInsights';
import { AtRiskStudentsWidget } from './AtRiskStudentsWidget';
import { Users, GraduationCap, BookOpen, AlertTriangle, CheckCircle, Search, Filter, Zap, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

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

  const departmentData = stats?.departmentStats || departments.map((dept: any) => ({
    id: dept.id,
    name: dept.name,
    code: dept.code,
    totalStudents: dept._count?.studentEnrollments || 0,
    totalFaculty: dept._count?.users || 0,
    atRiskStudents: 0,
    passPercentage: 0,
    averageScore: 0,
    trend: 'stable'
  }));

  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Institutional Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of departmental performance and administrative status.</p>
        </div>
        <div className="flex items-center gap-3">
          <Input 
            placeholder="Search..." 
            className="w-[250px] bg-background"
          />
          <Button variant="outline" size="icon">
             <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Enrollment"
          value={stats?.students?.toLocaleString() || '0'}
          subtitle="Enrolled students"
          icon={Users}
        />
        <StatsCard
          title="Total Faculty"
          value={stats?.teachers?.toLocaleString() || '0'}
          subtitle="Active teachers"
          icon={BookOpen}
        />
        <StatsCard
          title="At-Risk Students"
          value={stats?.alerts?.studentsAtRisk || '0'}
          subtitle="Needs attention"
          icon={AlertTriangle}
        />
        <StatsCard
          title="Data Integrity"
          value={`${stats?.dataIntegrity || '100'}%`}
          subtitle="Attainment mapping"
          icon={CheckCircle}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2">
          <AcademicPerformanceInsights attainmentData={globalAttainment} trendData={performanceTrend} />
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Pending Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats?.alerts?.pendingApprovals > 0 && (
              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30 group hover:bg-muted transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-amber-500 rounded-full" />
                  <span className="text-sm font-medium">{stats.alerts.pendingApprovals} Pending Reviews</span>
                </div>
                <ArrowRight className="h-4 w-4 opacity-50 group-hover:translate-x-1 transition-transform" />
              </div>
            )}
            {stats?.alerts?.incompleteAttainments > 0 && (
              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30 group hover:bg-muted transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-rose-500 rounded-full" />
                  <span className="text-sm font-medium">{stats.alerts.incompleteAttainments} Attainment Gaps</span>
                </div>
                <ArrowRight className="h-4 w-4 opacity-50 group-hover:translate-x-1 transition-transform" />
              </div>
            )}
            {!stats?.alerts?.pendingApprovals && !stats?.alerts?.incompleteAttainments && (
              <div className="py-10 text-center text-muted-foreground">
                <CheckCircle className="h-10 w-10 mx-auto opacity-20 mb-3" />
                <p className="text-sm">All systems nominal</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4">
           <AtRiskStudentsWidget riskLevel="high" maxDisplay={5} />
        </div>

        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
            <CardDescription>System-wide administrative logs</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <RecentActivity limit={5} />
          </CardContent>
        </Card>
      </div>

      <div>
        <DepartmentTable departments={departmentData} />
      </div>
    </div>
  );
}
