import { StatsCard } from './StatsCard';
import { RecentActivity } from './RecentActivity';
import { AcademicPerformanceInsights } from './AcademicPerformanceInsights';
import { AtRiskStudentsWidget } from './AtRiskStudentsWidget';
import { 
  Users, 
  AlertTriangle, 
  TrendingUp, 
  CheckCircle, 
  BookOpen, 
  LayoutDashboard,
  ArrowRight,
  Zap,
  GraduationCap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Activity } from 'lucide-react';

export function HODDashboard() {
  const { user } = useAuth();

  const { data: subjects = [] } = useQuery({
    queryKey: ['hod-subjects'],
    queryFn: async () => {
      const { data } = await api.get('/subjects');
      return data || [];
    }
  });

  const { data: studentEnrollments = [] } = useQuery({
    queryKey: ['hod-enrollments'],
    queryFn: async () => {
      const { data } = await api.get('/enrollments');
      return data || [];
    }
  });

  const { data: users = [] } = useQuery({
    queryKey: ['hod-users'],
    queryFn: async () => {
      const { data } = await api.get('/users');
      return data || [];
    }
  });

  const { data: atRiskData } = useQuery({
    queryKey: ['hod-at-risk'],
    queryFn: async () => {
      const { data } = await api.get('/attainment/students/at-risk?riskLevel=medium');
      return data || { count: 0, data: [] };
    }
  });

  const { data: coAttainment = [] } = useQuery({
    queryKey: ['hod-global-attainment'],
    queryFn: async () => {
      const { data } = await api.get('/analytics/global-attainment');
      return data || [];
    }
  });

  const studentCount = studentEnrollments.length;
  const teacherCount = users.filter((u: any) => u.role === 'TEACHER').length;
  const atRiskCount = atRiskData?.count || 0;
  
  const avgAttainment = coAttainment.length > 0 
    ? Math.round(coAttainment.reduce((sum: number, co: any) => sum + co.attainment, 0) / coAttainment.length)
    : 0;

  return (
    <div className="space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/40 pb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-2xl">
                <LayoutDashboard className="h-6 w-6" />
             </div>
             <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 uppercase">
               Departmental Command
             </h2>
          </div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em] opacity-60">
            Academic Integrity • Faculty Synchronization • Performance Audit
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" className="h-12 px-6 rounded-xl border-slate-900/10 hover:border-slate-900 hover:bg-slate-900 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-all duration-500">
             Protocol Settings
          </Button>
          <Button className="h-12 px-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-2xl shadow-slate-900/20 text-[10px] font-extrabold uppercase tracking-widest transition-all duration-500 gap-3 group">
            <Zap className="h-4 w-4 group-hover:scale-110 transition-transform" />
            Generate Audit
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Students"
          value={studentCount.toString()}
          subtitle="Validated Student IDs"
          icon={GraduationCap}
        />
        <StatsCard
          title="Faculty Members"
          value={teacherCount.toString()}
          subtitle="Active Department Staff"
          icon={Users}
        />
        <StatsCard
          title="Attainment Health"
          value={`${avgAttainment}%`}
          subtitle="Aggregated Performance"
          icon={TrendingUp}
        />
        <StatsCard
          title="System Alerts"
          value={atRiskCount.toString()}
          subtitle="Required Interventions"
          icon={AlertTriangle}
        />
      </div>

      {/* Main Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2">
          <AcademicPerformanceInsights 
            attainmentData={coAttainment} 
            trendData={[]} 
          />
        </div>
        <div className="xl:col-span-1">
          <AtRiskStudentsWidget riskLevel="medium" maxDisplay={5} />
        </div>
      </div>

      {/* Subject Performance & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <Card className="lg:col-span-2 border-border/40 shadow-2xl bg-card/30 backdrop-blur-md overflow-hidden h-full">
          <CardHeader className="border-b border-border/40 bg-slate-900/5 p-8">
            <CardTitle className="text-sm font-bold tracking-[0.2em] uppercase flex items-center gap-3 text-slate-900">
              <BookOpen className="h-4 w-4 opacity-50" />
              Department Curriculum
            </CardTitle>
            <CardDescription className="text-[11px] font-medium tracking-tight">Active subject attainment status and credits.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-900/5">
                <TableRow className="hover:bg-transparent border-border/40">
                  <TableHead className="font-bold text-[9px] uppercase tracking-[0.2em] text-muted-foreground py-6 px-8">Subject Name</TableHead>
                  <TableHead className="font-bold text-[9px] uppercase tracking-[0.2em] text-muted-foreground py-6 px-8">Subject Code</TableHead>
                  <TableHead className="font-bold text-[9px] uppercase tracking-[0.2em] text-muted-foreground py-6 px-8 text-center">Credits</TableHead>
                  <TableHead className="font-bold text-[9px] uppercase tracking-[0.2em] text-muted-foreground py-6 px-8 text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.slice(0, 10).map((subject: any, index: number) => (
                    <TableRow key={subject.id} className="group transition-all duration-500 hover:bg-slate-900 hover:text-white border-border/40">
                      <TableCell className="font-black text-xs py-6 px-8 tracking-tight uppercase">{subject.name}</TableCell>
                      <TableCell className="px-8">
                        <div className="inline-flex px-2.5 py-0.5 rounded bg-slate-900/5 group-hover:bg-white/10 text-[10px] font-black text-slate-900 group-hover:text-white transition-colors">
                           {subject.code}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-black text-xs px-8">{subject.credits} CR</TableCell>
                      <TableCell className="text-right px-8">
                        <div className="flex items-center justify-end gap-2 text-[9px] font-black tracking-widest text-slate-900 group-hover:text-white transition-colors">
                          <div className="w-1 h-1 bg-slate-900 group-hover:bg-white rounded-full animate-pulse shadow-xl" />
                          STABLE
                        </div>
                      </TableCell>
                    </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-8">
          <Card className="border-border/40 shadow-2xl bg-card/30 backdrop-blur-md overflow-hidden">
            <CardHeader className="border-b border-border/40 bg-slate-900/5 p-8">
              <CardTitle className="text-sm font-black tracking-[0.2em] uppercase flex items-center gap-3">
                <Activity className="h-4 w-4 opacity-50" />
                Department Pulse
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               <RecentActivity limit={5} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
