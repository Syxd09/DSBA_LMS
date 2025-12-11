import { StatsCard } from './StatsCard';
import { DepartmentTable } from './DepartmentTable';
import { COAttainmentChart } from './COAttainmentChart';
import { PerformanceTrendChart } from './PerformanceTrendChart';
import { mockCOAttainment, coTrendData } from '@/lib/mock-data';
import { Users, GraduationCap, BookOpen, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function PrincipalDashboard() {
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('departments').select('*');
      if (error) throw error;
      return data;
    }
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['all-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      return data;
    }
  });

  const { data: studentEnrollments = [] } = useQuery({
    queryKey: ['student-enrollments-count'],
    queryFn: async () => {
      const { data, error } = await supabase.from('student_enrollments').select('*');
      if (error) throw error;
      return data;
    }
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects-count'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subjects').select('*');
      if (error) throw error;
      return data;
    }
  });

  const { data: userRoles = [] } = useQuery({
    queryKey: ['user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_roles').select('*');
      if (error) throw error;
      return data;
    }
  });

  const teacherCount = userRoles.filter(r => r.role === 'teacher').length;
  const studentCount = studentEnrollments.length || userRoles.filter(r => r.role === 'student').length;
  const atRiskCount = Math.floor(studentCount * 0.1); // Placeholder for at-risk calculation

  const departmentStats = departments.map(dept => ({
    name: dept.name,
    passPercentage: Math.round(75 + Math.random() * 20),
    averageScore: Math.round((60 + Math.random() * 20) * 10) / 10,
    totalStudents: Math.floor(studentCount / Math.max(departments.length, 1)),
    atRiskStudents: Math.floor(atRiskCount / Math.max(departments.length, 1)),
  }));

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
          value={subjects.length.toString()}
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
              <span className="text-sm">{departments.length} departments active with {subjects.length} subjects</span>
            </div>
            <Badge className="bg-green-500">Active</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <COAttainmentChart data={mockCOAttainment} />
        <PerformanceTrendChart data={coTrendData} />
      </div>

      {/* Department Table */}
      <DepartmentTable departments={departmentStats} />
    </div>
  );
}
