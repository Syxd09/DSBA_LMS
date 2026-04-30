import { StatsCard } from './StatsCard';
import { 
  Users, 
  BookOpen, 
  ClipboardList, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  Settings, 
  Plus, 
  Activity,
  ArrowRight,
  Target,
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useAcademicContext } from '@/contexts/AcademicContext';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

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

  const { data: allEnrollments = [] } = useQuery({
    queryKey: ['teacher-students', teacherAssignments],
    queryFn: async () => {
      if (teacherAssignments.length === 0) return [];
      const contexts = teacherAssignments.map((a: any) => ({
        cohortId: a.cohortId,
        semester: a.semester
      }));
      const allData = await Promise.all(
        contexts.map(async (ctx) => {
          const params = new URLSearchParams();
          params.append('cohortId', ctx.cohortId);
          params.append('semester', String(ctx.semester));
          const { data } = await api.get(`/enrollments?${params.toString()}`);
          return data || [];
        })
      );
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

  const { data: allMarks = [] } = useQuery({
    queryKey: ['teacher-marks', exams],
    queryFn: async () => {
      if (exams.length === 0) return [];
      const relevantExams = exams.filter((e: any) => ['PUBLISHED', 'COMPLETED', 'LOCKED'].includes(e.status));
      if (relevantExams.length === 0) return [];
      const marksData = await Promise.all(
        relevantExams.map(async (exam: any) => {
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

  const assignedSubjects = teacherAssignments.map((a: any) => ({
      ...a.subject,
      studentCount: a.studentCount,
      cohortId: a.cohortId,
      departmentId: a.departmentId
  })).filter((s: any) => s && s.id);
  
  const pendingExams = exams.filter((e: any) => 
    ['DRAFT', 'PENDING_APPROVAL'].includes(e.status?.toUpperCase())
  ).length;
  const totalStudents = allEnrollments.length;
  
  const classAverage = allMarks.length > 0 
    ? Math.round(allMarks.reduce((sum: number, mark: any) => sum + (mark.totalMarks || 0), 0) / allMarks.length)
    : 0;

  const subjectMetrics = assignedSubjects.map(subject => {
    const subjectMarks = allMarks.filter((m: any) => m.exam?.subjectId === subject.id);
    const marks = subjectMarks.map((m: any) => {
        const marksObtained = Number(m.marks || 0);
        const maxMarks = m.sub_question?.maxMarks || 1;
        return (marksObtained / maxMarks) * 100;
    });
    
    return {
      name: subject.name,
      code: subject.code,
      average: Math.round(marks.length > 0 ? marks.reduce((a, b) => a + b, 0) / marks.length : 0),
      count: subject.studentCount || 0
    };
  });

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            Instructional Hub
          </h2>
          <p className="text-muted-foreground font-medium">Monitoring academic delivery for {profile?.full_name}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => navigate('/exams')} className="gap-2 font-black shadow-lg shadow-primary/25">
            <Plus className="h-4 w-4" />
            New Assessment
          </Button>
          <Button variant="outline" className="gap-2 font-bold shadow-sm">
            <Settings className="h-4 w-4" />
            Config
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Assigned Domain"
          value={assignedSubjects.length.toString()}
          subtitle="Core subjects"
          icon={BookOpen}
          variant="primary"
        />
        <StatsCard
          title="Student Cohort"
          value={totalStudents.toString()}
          subtitle="Direct supervisees"
          icon={Users}
        />
        <StatsCard
          title="Open Graded"
          value={pendingExams.toString()}
          subtitle="Pending reviews"
          icon={ClipboardList}
          variant="warning"
        />
        <StatsCard
          title="Cohort Merit"
          value={`${classAverage}%`}
          subtitle="Avg attainment"
          icon={TrendingUp}
          trend={{ value: 6, isPositive: true }}
          variant="success"
        />
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left: Subject Management */}
        <div className="xl:col-span-2 space-y-6 text-foreground">
          <Card className="border-none shadow-xl bg-card/60 backdrop-blur-xl overflow-hidden">
            <CardHeader className="border-b border-border/50 bg-muted/20">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Pedagogical Delivery
              </CardTitle>
              <CardDescription>Live tracking of assigned subject progression</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {assignedSubjects.length === 0 ? (
                <div className="text-center text-muted-foreground py-20 bg-muted/10 rounded-2xl border-2 border-dashed border-border">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p className="font-bold">No Operational Domains</p>
                  <p className="text-sm">Contact administration for domain assignment.</p>
                </div>
              ) : (
                assignedSubjects.map((subject: any, index) => {
                  const subjectExams = exams.filter((e: any) => e.subjectId === subject?.id);
                  const int1Done = subjectExams.some((e: any) => (e.examType === 'INTERNAL_1' || e.examType === 'I1') && ['PUBLISHED', 'COMPLETED', 'LOCKED'].includes(e.status?.toUpperCase()));
                  const int2Done = subjectExams.some((e: any) => (e.examType === 'INTERNAL_2' || e.examType === 'I2') && ['PUBLISHED', 'COMPLETED', 'LOCKED'].includes(e.status?.toUpperCase()));
                  
                  return (
                    <div 
                      key={subject?.id} 
                      className="group p-5 rounded-2xl border border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer animate-in fade-in slide-in-from-left-4"
                      style={{ animationDelay: `${index * 100}ms` }}
                      onClick={() => {
                        if (subject.cohortId) setCohortId(subject.cohortId);
                        if (subject.semester) setSemester(subject.semester);
                        if (subject.departmentId) setDepartmentId(subject.departmentId);
                        navigate('/students');
                      }}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="text-lg font-black leading-none group-hover:text-primary transition-colors">{subject?.name}</h4>
                          <p className="text-xs font-bold text-muted-foreground mt-1.5 uppercase tracking-widest">{subject?.code} • SEMESTER {subject?.semester}</p>
                        </div>
                        <div className="flex gap-2">
                            <Badge variant="secondary" className="font-black px-2.5">{subject?.studentCount || 0} SEATS</Badge>
                            <Badge variant="outline" className="font-bold">{subject?.credits} CR</Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter">Milestone I1</p>
                          <div className="flex items-center gap-2">
                            {int1Done ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Clock className="h-4 w-4 text-amber-500" />}
                            <span className={cn("text-sm font-bold", int1Done ? "text-green-600" : "text-amber-600")}>
                                {int1Done ? "SYNCED" : "PENDING"}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2 text-right">
                          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter">Milestone I2</p>
                          <div className="flex items-center justify-end gap-2">
                            {int2Done ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Clock className="h-4 w-4 text-amber-500" />}
                            <span className={cn("text-sm font-bold", int2Done ? "text-green-600" : "text-amber-600")}>
                                {int2Done ? "SYNCED" : "PENDING"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Operational Insights */}
        <div className="xl:col-span-1 space-y-8">
           <Card className="border-none shadow-xl bg-card border-l-4 border-l-primary overflow-hidden">
             <CardHeader>
               <CardTitle className="text-base font-bold flex items-center gap-2 uppercase tracking-tighter">
                 <Target className="h-5 w-5 text-primary" />
                 Merit Distribution
               </CardTitle>
             </CardHeader>
             <CardContent className="space-y-6">
                {subjectMetrics.map((sm, i) => (
                  <div key={sm.code} className="space-y-2 animate-in zoom-in-95 duration-500" style={{ animationDelay: `${i * 150}ms` }}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-muted-foreground">{sm.code}</span>
                      <span className="text-sm font-black text-foreground">{sm.average}%</span>
                    </div>
                    <Progress value={sm.average} className="h-2 bg-muted" indicatorClassName="bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                  </div>
                ))}
             </CardContent>
           </Card>

           <Card className="border-none shadow-xl bg-card/60 backdrop-blur-xl">
             <CardHeader>
               <CardTitle className="text-base font-bold">Quick Protocols</CardTitle>
             </CardHeader>
             <CardContent className="space-y-3">
                <Button onClick={() => navigate('/marks-entry')} className="w-full justify-between font-bold group bg-primary/10 text-primary hover:bg-primary hover:text-white" variant="ghost">
                  <span>Batch Sync Marks</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
                <Button onClick={() => navigate('/co-po-analytics')} className="w-full justify-between font-bold group" variant="ghost">
                  <span>Traceability Ledger</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
             </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
