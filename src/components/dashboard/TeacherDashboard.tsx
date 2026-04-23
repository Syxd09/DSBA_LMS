import { StatsCard } from './StatsCard';
// import { examPerformanceData } from '@/lib/mock-data'; // REMOVED MOCK
import { Users, BookOpen, ClipboardList, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useAcademicContext } from '@/contexts/AcademicContext';

export function TeacherDashboard() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { setCohortId, setSemester, setDepartmentId } = useAcademicContext();

  const { data: teacherAssignments = [] } = useQuery({
    queryKey: ['teacher-my-assignments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await api.get('/assignments');
      return data.filter((a: any) => a.teacherId === user.id);
    },
    enabled: !!user?.id
  });

  const { data: exams = [] } = useQuery({
    queryKey: ['teacher-exams', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await api.get('/exams');
      return data;
    },
    enabled: !!user?.id
  });

  // Fetch enrollments for all assigned cohorts
  const { data: allEnrollments = [] } = useQuery({
    queryKey: ['teacher-students', teacherAssignments],
    queryFn: async () => {
      if (teacherAssignments.length === 0) return [];
      
      // Get unique cohort/semester combinations
      const contexts = teacherAssignments.map((a: any) => ({
        cohortId: a.cohortId,
        semester: a.semester
      }));
      
      // Fetch enrollments for each context
      const allData = await Promise.all(
        contexts.map(async (ctx) => {
          const params = new URLSearchParams();
          params.append('cohortId', ctx.cohortId);
          params.append('semester', String(ctx.semester));
          const { data } = await api.get(`/enrollments?${params.toString()}`);
          return data || [];
        })
      );
      
      // Flatten and deduplicate by student ID
      const uniqueStudents = new Map();
      allData.flat().forEach((enrollment: any) => {
        if (enrollment.studentId) {
          uniqueStudents.set(enrollment.studentId, enrollment);
        }
      });
      
      return Array.from(uniqueStudents.values());
    },
    enabled: teacherAssignments.length > 0
  });

  // Fetch marks for class average
  const { data: allMarks = [] } = useQuery({
    queryKey: ['teacher-marks', exams],
    queryFn: async () => {
      if (exams.length === 0) return [];
      
      const publishedExams = exams.filter((e: any) => e.status === 'PUBLISHED');
      if (publishedExams.length === 0) return [];
      
      const marksData = await Promise.all(
        publishedExams.map(async (exam: any) => {
          try {
            const { data } = await api.get(`/marks/${exam.id}`);
            return data || [];
          } catch {
            return [];
          }
        })
      );
      
      return marksData.flat();
    },
    enabled: exams.length > 0
  });

  // Map assignments directly to preserve studentCount
  const assignedSubjects = teacherAssignments.map((a: any) => ({
      ...a.subject,
      studentCount: a.studentCount,
      // Ensure we have the context for links if needed
      cohortId: a.cohortId,
      departmentId: a.departmentId
  })).filter((s: any) => s && s.id);
  
  const pendingExams = exams.filter((e: any) => e.status === 'DRAFT').length;
  const totalStudents = allEnrollments.length;
  
  // Calculate class average from all marks
  const classAverage = allMarks.length > 0 
    ? Math.round(allMarks.reduce((sum: number, mark: any) => sum + (mark.totalMarks || 0), 0) / allMarks.length)
    : 0;

  // Calculate chart data from all marks for performance overview
  const chartData = assignedSubjects.map(subject => {
    const subjectMarks = allMarks.filter((m: any) => m.exam?.subjectId === subject.id);
    const marks = subjectMarks.map((m: any) => {
        const marksObtained = Number(m.marks || 0);
        const maxMarks = m.sub_question?.maxMarks || 1;
        return (marksObtained / maxMarks) * 100;
    });
    
    return {
      subject: subject.code,
      highest: Math.round(marks.length > 0 ? Math.max(...marks) : 0),
      lowest: Math.round(marks.length > 0 ? Math.min(...marks) : 0),
      average: Math.round(marks.length > 0 ? marks.reduce((a, b) => a + b, 0) / marks.length : 0)
    };
  });

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
              const subjectExams = exams.filter((e: any) => e.subjectId === subject?.id);
              const int1Done = subjectExams.some((e: any) => e.examType === 'I1' && e.status === 'PUBLISHED');
              const int2Done = subjectExams.some((e: any) => e.examType === 'I2' && e.status === 'PUBLISHED');
              return (
                <div 
                  key={subject?.id} 
                  className="p-4 border border-border hover:border-primary/50 transition-colors cursor-pointer group"
                  onClick={() => {
                    if (subject.cohortId) setCohortId(subject.cohortId);
                    if (subject.semester) setSemester(subject.semester);
                    if (subject.departmentId) setDepartmentId(subject.departmentId);
                    navigate('/students');
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-foreground">{subject?.name}</h4>
                      <p className="text-sm text-muted-foreground">{subject?.code} • Semester {subject?.semester}</p>
                    </div>
                    <div className="flex gap-2">
                        <Badge variant="secondary">{subject?.studentCount || 0} Students</Badge>
                        <Badge variant="outline">{subject?.credits} Credits</Badge>
                    </div>
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

      {/* Performance Overview */}
      <Card className="md:col-span-4">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Class Performance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="subject" />
                <YAxis unit="%" />
                <Tooltip />
                <Legend />
                <Bar dataKey="average" name="Average" fill="hsl(var(--primary))" />
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
