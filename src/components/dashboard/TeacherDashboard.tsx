import { StatsCard } from './StatsCard';
import { examPerformanceData } from '@/lib/mock-data';
import { Users, BookOpen, ClipboardList, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function TeacherDashboard() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const { data: teacherAssignments = [] } = useQuery({
    queryKey: ['teacher-my-assignments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from('teacher_assignments').select(`
        *,
        subjects(id, name, code, credits, semester),
        cohorts(name)
      `).eq('teacher_id', user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const { data: exams = [] } = useQuery({
    queryKey: ['teacher-exams', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from('exams').select(`
        *,
        subjects(name, code)
      `).eq('teacher_id', user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const assignedSubjects = teacherAssignments.map(a => a.subjects).filter(Boolean);
  const pendingExams = exams.filter(e => e.status === 'draft').length;
  const totalStudents = teacherAssignments.length * 60; // Approximate
  const classAverage = 71;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Teacher Dashboard</h2>
        <p className="text-muted-foreground">Welcome back, {profile?.full_name || 'Teacher'}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Assigned Subjects"
          value={assignedSubjects.length.toString()}
          subtitle="This semester"
          icon={BookOpen}
          variant="primary"
        />
        <StatsCard
          title="Total Students"
          value={totalStudents.toString()}
          subtitle="Across all subjects"
          icon={Users}
        />
        <StatsCard
          title="Pending Evaluations"
          value={pendingExams.toString()}
          subtitle="Exams pending"
          icon={ClipboardList}
          variant="warning"
        />
        <StatsCard
          title="Class Average"
          value={`${classAverage}%`}
          subtitle="All subjects"
          icon={TrendingUp}
          trend={{ value: 6, isPositive: true }}
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigate('/marks-entry')}>
              <ClipboardList className="w-4 h-4 mr-2" />
              Enter Marks
            </Button>
            <Button variant="outline" onClick={() => navigate('/exams')}>
              <BookOpen className="w-4 h-4 mr-2" />
              Create Exam Structure
            </Button>
            <Button variant="outline" onClick={() => navigate('/co-po-analytics')}>
              <TrendingUp className="w-4 h-4 mr-2" />
              View Analytics
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* My Subjects */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">My Subjects</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {assignedSubjects.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No subjects assigned yet. Contact your HOD for subject assignments.
            </div>
          ) : (
            assignedSubjects.map((subject: any) => {
              const subjectExams = exams.filter(e => e.subject_id === subject.id);
              const int1Done = subjectExams.some(e => e.exam_type === 'I1' && e.status === 'published');
              const int2Done = subjectExams.some(e => e.exam_type === 'I2' && e.status === 'published');
              return (
                <div key={subject.id} className="p-4 border border-border">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-foreground">{subject.name}</h4>
                      <p className="text-sm text-muted-foreground">{subject.code} • Semester {subject.semester}</p>
                    </div>
                    <Badge variant="outline">{subject.credits} Credits</Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Internal 1</span>
                      <div className="flex items-center gap-2">
                        {int1Done ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-sm text-green-500">Published</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-4 h-4 text-yellow-500" />
                            <span className="text-sm text-yellow-500">Pending</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Internal 2</span>
                      <div className="flex items-center gap-2">
                        {int2Done ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-sm text-green-500">Published</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-4 h-4 text-yellow-500" />
                            <span className="text-sm text-yellow-500">Pending</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Performance Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Internal 1 vs Internal 2 Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={examPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0',
                  }}
                />
                <Legend />
                <Bar dataKey="average" name="Class Average" fill="hsl(var(--chart-2))" />
                <Bar dataKey="highest" name="Highest" fill="hsl(var(--chart-3))" />
                <Bar dataKey="lowest" name="Lowest" fill="hsl(var(--chart-5))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
