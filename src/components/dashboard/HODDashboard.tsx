import { StatsCard } from './StatsCard';
import { COAttainmentChart } from './COAttainmentChart';
import { BloomTaxonomyChart } from './BloomTaxonomyChart';
import { mockCOAttainment, bloomDistributionData } from '@/lib/mock-data';
import { Users, BookOpen, AlertTriangle, TrendingUp, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function HODDashboard() {
  const { user } = useAuth();

  const { data: subjects = [] } = useQuery({
    queryKey: ['hod-subjects'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subjects').select('*');
      if (error) throw error;
      return data;
    }
  });

  const { data: teacherAssignments = [] } = useQuery({
    queryKey: ['hod-teacher-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('teacher_assignments').select(`
        *,
        subjects(name, code),
        cohorts(name),
        profiles:teacher_id(full_name)
      `);
      if (error) throw error;
      return data;
    }
  });

  const { data: studentEnrollments = [] } = useQuery({
    queryKey: ['hod-enrollments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('student_enrollments').select('*');
      if (error) throw error;
      return data;
    }
  });

  const { data: userRoles = [] } = useQuery({
    queryKey: ['hod-user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_roles').select('*').eq('role', 'teacher');
      if (error) throw error;
      return data;
    }
  });

  const studentCount = studentEnrollments.length;
  const teacherCount = userRoles.length;
  const atRiskCount = Math.floor(studentCount * 0.08);
  const passRate = 87;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Department Dashboard</h2>
        <p className="text-muted-foreground">Department Overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Department Students"
          value={studentCount.toString()}
          subtitle="Active enrollment"
          icon={Users}
          variant="primary"
        />
        <StatsCard
          title="Faculty Members"
          value={teacherCount.toString()}
          subtitle="Teaching this semester"
          icon={Users}
        />
        <StatsCard
          title="Pass Rate"
          value={`${passRate}%`}
          subtitle="Current semester"
          icon={TrendingUp}
          trend={{ value: 3.2, isPositive: true }}
          variant="success"
        />
        <StatsCard
          title="At-Risk Students"
          value={atRiskCount.toString()}
          subtitle="Need intervention"
          icon={AlertTriangle}
          variant="warning"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <COAttainmentChart data={mockCOAttainment} />
        <BloomTaxonomyChart data={bloomDistributionData} />
      </div>

      {/* Subject Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Subject Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>Pass Rate</TableHead>
                <TableHead>Avg Score</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjects.slice(0, 5).map((subject) => {
                const passRate = 70 + Math.random() * 25;
                const avgScore = 55 + Math.random() * 25;
                return (
                  <TableRow key={subject.id}>
                    <TableCell className="font-medium">{subject.name}</TableCell>
                    <TableCell className="font-mono text-sm">{subject.code}</TableCell>
                    <TableCell>{subject.credits}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={passRate} className="w-16 h-2" />
                        <span className="text-sm">{passRate.toFixed(0)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>{avgScore.toFixed(1)}</TableCell>
                    <TableCell>
                      <Badge variant={passRate >= 80 ? 'default' : passRate >= 70 ? 'secondary' : 'destructive'}>
                        {passRate >= 80 ? 'Excellent' : passRate >= 70 ? 'Good' : 'Review'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
              {subjects.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No subjects found. Add subjects to see performance data.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* At-Risk Students */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            At-Risk Students
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {atRiskCount === 0 ? (
              <div className="flex items-center gap-2 p-4 bg-green-500/5 border border-green-500/20">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm">No students at immediate risk based on current internal scores</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-4 bg-destructive/5 border border-destructive/20">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <span className="text-sm">{atRiskCount} students identified as at-risk. Review their performance in the Analytics section.</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
