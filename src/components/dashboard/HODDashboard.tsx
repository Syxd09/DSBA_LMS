import { StatsCard } from './StatsCard';
import { COAttainmentChart } from './COAttainmentChart';
import { BloomTaxonomyChart } from './BloomTaxonomyChart';
import { Users, GraduationCap, TrendingUp, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';

export function HODDashboard() {
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['hod-dashboard'],
    queryFn: () => dashboardApi.getHODDashboard(),
  });

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
        <COAttainmentChart data={coAttainment.length > 0 ? coAttainment.map((co: any) => ({
          co: `CO${co.co_number || co.co}`,
          attainment: co.attainment || 0,
          target: co.target || 70,
        })) : []} />
        <BloomTaxonomyChart data={bloomData} />
      </div>

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
                        <span className="font-medium">{subject.average?.toFixed(1)}%</span>
                        <Progress value={subject.average} className="w-16 h-2" />
                      </div>
                    </TableCell>
                    <TableCell>{subject.pass_rate?.toFixed(1)}%</TableCell>
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
    </div>
  );
}
