import { StatsCard } from './StatsCard';
import { DepartmentTable } from './DepartmentTable';
import { COAttainmentChart } from './COAttainmentChart';
import { PerformanceTrendChart } from './PerformanceTrendChart';
import { mockDepartmentStats, mockCOAttainment, coTrendData } from '@/lib/mock-data';
import { Users, GraduationCap, BookOpen, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function PrincipalDashboard() {
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
          value="1,000"
          subtitle="Across all departments"
          icon={GraduationCap}
          trend={{ value: 5.2, isPositive: true }}
          variant="primary"
        />
        <StatsCard
          title="Teaching Faculty"
          value="86"
          subtitle="Active this semester"
          icon={Users}
        />
        <StatsCard
          title="Active Subjects"
          value="48"
          subtitle="Current semester"
          icon={BookOpen}
        />
        <StatsCard
          title="At-Risk Students"
          value="101"
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
          <div className="flex items-center justify-between p-3 bg-destructive/5 border border-destructive/20">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-destructive rounded-full" />
              <span className="text-sm">Mechanical Dept has 32 at-risk students - highest in college</span>
            </div>
            <Badge variant="destructive">Critical</Badge>
          </div>
          <div className="flex items-center justify-between p-3 bg-muted/50 border border-border">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full" />
              <span className="text-sm">CO2 attainment below target in 3 departments</span>
            </div>
            <Badge variant="outline">Warning</Badge>
          </div>
          <div className="flex items-center justify-between p-3 bg-green-500/5 border border-green-500/20">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">Business Admin achieves 91% pass rate - highest performance</span>
            </div>
            <Badge className="bg-green-500">Success</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <COAttainmentChart data={mockCOAttainment} />
        <PerformanceTrendChart data={coTrendData} />
      </div>

      {/* Department Table */}
      <DepartmentTable departments={mockDepartmentStats} />
    </div>
  );
}
