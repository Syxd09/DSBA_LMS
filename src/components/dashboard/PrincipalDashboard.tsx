import { StatsCard } from './StatsCard';
import { DepartmentTable } from './DepartmentTable';
import { RecentActivity } from './RecentActivity';
import { COAttainmentChart } from './COAttainmentChart';
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

  const studentCount = stats?.students || 0;
  const teacherCount = stats?.teachers || 0;
  const atRiskCount = 0; // TODO: Implement real risk analysis

  const departmentStats = departments.map((dept: any) => ({
    name: dept.name,
    passPercentage: 0, // No real data yet
    averageScore: 0,   // No real data yet
    totalStudents: dept._count?.users || 0,
    atRiskStudents: 0,
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
          {atRiskCount > 0 && (
            <div className="flex items-center justify-between p-3 bg-destructive/5 border border-destructive/20">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-destructive rounded-full" />
                <span className="text-sm">{atRiskCount} students identified as at-risk across all departments</span>
              </div>
              <Badge variant="destructive">Critical</Badge>
            </div>
          )}
          <div className="flex items-center justify-between p-3 bg-muted/50 border border-border">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full" />
              <span className="text-sm">CO attainment review pending for some departments</span>
            </div>
            <Badge variant="outline">Warning</Badge>
          </div>
          <div className="flex items-center justify-between p-3 bg-green-500/5 border border-green-500/20">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">{stats?.departments || 0} departments active with {stats?.subjects || 0} subjects</span>
            </div>
            <Badge className="bg-green-500">Active</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <COAttainmentChart data={[]} />
        <PerformanceTrendChart data={[]} />
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
