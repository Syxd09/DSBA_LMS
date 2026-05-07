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
      const enrollmentMap = new Map();
      allData.flat().forEach((enrollment: any) => {
        if (enrollment.studentId) {
          // Use studentId + semester as key to treat enrollments in different semesters as distinct
          const key = `${enrollment.studentId}-${enrollment.semester}`;
          enrollmentMap.set(key, enrollment);
        }
      });
      return Array.from(enrollmentMap.values());
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
    <div className="space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/40 pb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-2xl">
                <Target className="h-6 w-6" />
             </div>
             <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 uppercase">
               Instructional Command
             </h2>
          </div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em] opacity-60">
            Pedagogical Ledger • {profile?.full_name} • Operational Delivery
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" className="h-12 px-6 rounded-xl border-slate-900/10 hover:border-slate-900 hover:bg-slate-900 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-all duration-500" onClick={() => navigate('/settings')}>
             Config
          </Button>
          <Button className="h-12 px-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-2xl shadow-slate-900/20 text-[10px] font-extrabold uppercase tracking-widest transition-all duration-500 gap-3 group" onClick={() => navigate('/exams')}>
            <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform duration-500" />
            New Assessment
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Assigned Domain"
          value={assignedSubjects.length.toString()}
          subtitle="Core Curricular Units"
          icon={BookOpen}
        />
        <StatsCard
          title="Direct Cohort"
          value={totalStudents.toString()}
          subtitle="Validated Student IDs"
          icon={Users}
        />
        <StatsCard
          title="Open Graded"
          value={pendingExams.toString()}
          subtitle="Pending Audit Reviews"
          icon={ClipboardList}
        />
        <StatsCard
          title="Merit Index"
          value={`${classAverage}%`}
          subtitle="Aggregated Attainment"
          icon={TrendingUp}
        />
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left: Subject Management */}
        <div className="xl:col-span-2 space-y-6">
          <Card className="border-border/40 shadow-2xl bg-card/30 backdrop-blur-md overflow-hidden h-full">
            <CardHeader className="border-b border-border/40 bg-slate-900/5 p-8">
              <CardTitle className="text-sm font-extrabold tracking-[0.2em] uppercase flex items-center gap-3 text-slate-900">
                <Activity className="h-4 w-4 opacity-50" />
                Pedagogical Delivery
              </CardTitle>
              <CardDescription className="text-[11px] font-medium tracking-tight">Real-time status of academic progression milestones.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-4">
              {assignedSubjects.length === 0 ? (
                <div className="text-center py-20 bg-slate-900/5 rounded-3xl border border-dashed border-border/60">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p className="text-[10px] font-extrabold uppercase tracking-widest opacity-40">No Assigned Subjects</p>
                  <p className="text-[10px] font-medium uppercase tracking-tight mt-1">Contact administration for subject assignment.</p>
                </div>
              ) : (
                assignedSubjects.map((subject: any, index) => {
                  const subjectExams = exams.filter((e: any) => e.subjectId === subject?.id);
                  const int1Done = subjectExams.some((e: any) => (e.examType === 'INTERNAL_1' || e.examType === 'I1') && ['PUBLISHED', 'COMPLETED', 'LOCKED'].includes(e.status?.toUpperCase()));
                  const int2Done = subjectExams.some((e: any) => (e.examType === 'INTERNAL_2' || e.examType === 'I2') && ['PUBLISHED', 'COMPLETED', 'LOCKED'].includes(e.status?.toUpperCase()));
                  
                  return (
                    <div 
                      key={subject?.id} 
                      className="group p-6 rounded-2xl border border-border/60 hover:border-slate-900 hover:bg-slate-900 transition-all duration-500 cursor-pointer"
                      style={{ animationDelay: `${index * 100}ms` }}
                      onClick={() => {
                        if (subject.cohortId) setCohortId(subject.cohortId);
                        if (subject.semester) setSemester(subject.semester);
                        if (subject.departmentId) setDepartmentId(subject.departmentId);
                        navigate('/students');
                      }}
                    >
                      <div className="flex items-start justify-between mb-6">
                        <div className="space-y-1">
                          <h4 className="text-lg font-extrabold tracking-tight group-hover:text-white transition-colors uppercase">{subject?.name}</h4>
                          <p className="text-[9px] font-bold text-muted-foreground group-hover:text-white/60 uppercase tracking-[0.2em]">{subject?.code} • SEMESTER {subject?.semester}</p>
                        </div>
                        <div className="flex gap-2">
                            <div className="px-3 py-1 rounded-lg bg-slate-900/5 group-hover:bg-white/10 text-[9px] font-bold text-slate-900 group-hover:text-white tracking-widest uppercase border border-border/40 group-hover:border-white/20 transition-all">
                               {subject?.studentCount || 0} SEATS
                            </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-8 pt-4 border-t border-border/40 group-hover:border-white/10">
                        <div className="space-y-1.5">
                          <p className="text-[9px] font-bold uppercase text-muted-foreground group-hover:text-white/40 tracking-widest">Milestone I1</p>
                          <div className="flex items-center gap-2">
                            <div className={cn("w-1.5 h-1.5 rounded-full shadow-sm", int1Done ? "bg-emerald-500 shadow-emerald-500/50" : "bg-slate-900/20 group-hover:bg-white/20")} />
                            <span className={cn("text-[10px] font-bold tracking-widest", int1Done ? "text-emerald-600 group-hover:text-emerald-400" : "text-muted-foreground group-hover:text-white/40")}>
                                {int1Done ? "VALIDATED" : "PENDING"}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-1.5 text-right">
                          <p className="text-[9px] font-bold uppercase text-muted-foreground group-hover:text-white/40 tracking-widest">Milestone I2</p>
                          <div className="flex items-center justify-end gap-2">
                            <span className={cn("text-[10px] font-bold tracking-widest", int2Done ? "text-emerald-600 group-hover:text-emerald-400" : "text-muted-foreground group-hover:text-white/40")}>
                                {int2Done ? "VALIDATED" : "PENDING"}
                            </span>
                            <div className={cn("w-1.5 h-1.5 rounded-full shadow-sm", int2Done ? "bg-emerald-500 shadow-emerald-500/50" : "bg-slate-900/20 group-hover:bg-white/20")} />
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
           <Card className="border-border/40 shadow-2xl bg-card/30 backdrop-blur-md overflow-hidden">
             <CardHeader className="border-b border-border/40 bg-slate-900/5 p-8">
               <CardTitle className="text-sm font-extrabold tracking-[0.2em] uppercase flex items-center gap-3">
                 <Activity className="h-4 w-4 opacity-50" />
                 Merit Distribution
               </CardTitle>
             </CardHeader>
             <CardContent className="p-8 space-y-8">
                {subjectMetrics.map((sm, i) => (
                  <div key={sm.code} className="space-y-3 animate-in zoom-in-95 duration-500" style={{ animationDelay: `${i * 150}ms` }}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground">{sm.code}</span>
                      <span className="text-lg font-extrabold tracking-tighter text-slate-900">{sm.average}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-900/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-slate-900 transition-all duration-1000" 
                        style={{ width: `${sm.average}%` }} 
                      />
                    </div>
                  </div>
                ))}
             </CardContent>
           </Card>

           <Card className="border-border/40 shadow-2xl bg-card/30 backdrop-blur-md overflow-hidden">
             <CardHeader className="border-b border-border/40 bg-slate-900/5 p-8">
               <CardTitle className="text-sm font-extrabold tracking-[0.2em] uppercase">Quick Protocols</CardTitle>
             </CardHeader>
             <CardContent className="p-6 space-y-3">
                <Button onClick={() => navigate('/marks-entry')} className="w-full justify-between h-12 px-6 rounded-xl border-slate-900/10 hover:border-slate-900 hover:bg-slate-900 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-all duration-500 group" variant="ghost">
                  <span>Batch Sync Marks</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-2" />
                </Button>
                <Button onClick={() => navigate('/co-po-analytics')} className="w-full justify-between h-12 px-6 rounded-xl border-slate-900/10 hover:border-slate-900 hover:bg-slate-900 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-all duration-500 group" variant="ghost">
                  <span>Traceability Ledger</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-2" />
                </Button>
             </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
