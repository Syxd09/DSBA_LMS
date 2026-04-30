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
    <div className="space-y-8 pb-10 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <LayoutDashboard className="h-8 w-8 text-primary" />
            Specialized Oversight
          </h2>
          <p className="text-muted-foreground font-medium">Departmental academic health & faculty coordination</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2 font-bold shadow-sm">
             Department Console
          </Button>
          <Button className="gap-2 font-black shadow-lg shadow-primary/25">
            <Zap className="h-4 w-4 fill-current" />
            Export Audit
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Cohort"
          value={studentCount.toString()}
          subtitle="Direct enrollment"
          icon={GraduationCap}
          variant="primary"
        />
        <StatsCard
          title="Active Faculty"
          value={teacherCount.toString()}
          subtitle="Department staff"
          icon={Users}
        />
        <StatsCard
          title="Domain Health"
          value={`${avgAttainment}%`}
          subtitle="Avg attainment"
          icon={TrendingUp}
          variant="success"
        />
        <StatsCard
          title="Interventions"
          value={atRiskCount.toString()}
          subtitle="Pending actions"
          icon={AlertTriangle}
          variant="warning"
        />
      </div>

      {/* Main Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2">
          <AcademicPerformanceInsights 
            attainmentData={coAttainment} 
            trendData={[]} // No trend for HOD yet? Let's pass empty for now
          />
        </div>
        <div className="xl:col-span-1">
          <AtRiskStudentsWidget riskLevel="medium" maxDisplay={5} />
        </div>
      </div>

      {/* Subject Performance & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <Card className="lg:col-span-2 border-none shadow-xl bg-card/60 backdrop-blur-xl overflow-hidden">
          <CardHeader className="border-b border-border/50 bg-muted/20">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Curriculum Core
            </CardTitle>
            <CardDescription className="font-medium">Active subject attainment status</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-bold text-[10px] uppercase tracking-widest py-4 px-6 text-muted-foreground">Subject Identifier</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-widest py-4 px-6 text-muted-foreground">Code</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-widest py-4 px-6 text-muted-foreground text-center">Unit Weight</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-widest py-4 px-6 text-muted-foreground text-right">Cadence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.slice(0, 10).map((subject: any, index: number) => (
                    <TableRow key={subject.id} className="group transition-colors hover:bg-primary/5">
                      <TableCell className="font-bold py-4 px-6">{subject.name}</TableCell>
                      <TableCell className="font-mono text-xs px-6">
                        <Badge variant="secondary" className="font-mono">{subject.code}</Badge>
                      </TableCell>
                      <TableCell className="text-center font-bold px-6">{subject.credits} CR</TableCell>
                      <TableCell className="text-right px-6">
                        <div className="flex items-center justify-end gap-2 text-[10px] font-black text-green-600">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                          OPERATIONAL
                        </div>
                      </TableCell>
                    </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-8">
          <Card className="border-none shadow-xl bg-card/60 backdrop-blur-xl overflow-hidden">
            <CardHeader className="border-b border-border/50 bg-muted/20">
              <CardTitle className="text-lg font-bold">Recent Pulse</CardTitle>
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
