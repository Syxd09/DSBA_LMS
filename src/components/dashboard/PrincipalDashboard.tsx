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
    passPercentage: 0,
    averageScore: 0,
    totalStudents: dept._count?.users || 0,
    atRiskStudents: 0,
  }));

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-foreground">Institution Overview</h2>
          <p className="text-muted-foreground font-medium">Real-time academic oversight & departmental performance</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Students"
          value={studentCount.toLocaleString()}
          subtitle="Enrolled population"
          icon={GraduationCap}
          trend={{ value: 5.2, isPositive: true }}
          variant="primary"
        />
        <StatsCard
          title="Academic Faculty"
          value={teacherCount.toString()}
          subtitle="Directing pedagogy"
          icon={Users}
        />
        <StatsCard
          title="Operational Subjects"
          value={(stats?.subjects || 0).toString()}
          subtitle="Live curriculum"
          icon={BookOpen}
        />
        <StatsCard
          title="Critical Alerts"
          value={atRiskCount.toString()}
          subtitle="Requiring attention"
          icon={AlertTriangle}
          variant="danger"
        />
      </div>

      {/* Main Intelligence Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left: Insights (Replaces Graphs) */}
        <div className="xl:col-span-2 h-full">
          <AcademicPerformanceInsights 
            attainmentData={globalAttainment} 
            trendData={performanceTrend} 
          />
        </div>

        {/* Right: At-Risk Students */}
        <div className="xl:col-span-1 h-full">
          <AtRiskStudentsWidget riskLevel="medium" maxDisplay={6} />
        </div>
      </div>

      {/* Tertiary Row: Activity & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         {/* System Alerts */}
         <Card className="lg:col-span-4 border-none shadow-lg bg-card/40 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              Operational Continuity
            </CardTitle>
            <CardDescription>Real-time system health alerts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-4">
            {stats?.alerts?.pendingApprovals > 0 && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 group hover:bg-blue-500/15 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  <span className="text-xs font-bold">{stats.alerts.pendingApprovals} Pending Reviews</span>
                </div>
                <ArrowRight className="h-3 w-3 text-blue-500 transition-transform group-hover:translate-x-1" />
              </div>
            )}
            {stats?.alerts?.incompleteAttainments > 0 && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 group hover:bg-orange-500/15 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                  <span className="text-xs font-bold">{stats.alerts.incompleteAttainments} CO Gaps</span>
                </div>
                <ArrowRight className="h-3 w-3 text-orange-500 transition-transform group-hover:translate-x-1" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-8 border-none shadow-lg bg-card/40 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold">Protocol Ledger</CardTitle>
            <CardDescription>Latest instructional and administrative activities</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <RecentActivity limit={5} />
          </CardContent>
        </Card>
      </div>

      {/* Department Performance */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
        <DepartmentTable departments={departmentStats} />
      </div>
    </div>
  );
}
