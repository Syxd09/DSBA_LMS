import { StatsCard } from './StatsCard';
import { Award, TrendingUp, BookOpen, Target, Brain, Lightbulb, Sparkles, ShieldCheck, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function StudentDashboard() {
  const { user, profile } = useAuth();

  const { data: enrollment } = useQuery({
    queryKey: ['student-enrollment', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await api.get('/enrollments');
      const myEnrollment = data.find((e: any) => e.studentId === user.id);
      return myEnrollment || null;
    },
    enabled: !!user?.id
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['student-subjects'],
    queryFn: async () => {
      const { data } = await api.get('/subjects');
      return data;
    }
  });

  const overallAverage = 0;
  const sgpa = 0;
  const cgpa = 0;

  const programName = enrollment?.cohort?.program?.name || 'Academic Domain';
  const semester = enrollment?.cohort?.currentSemester || 1;

  const cognitiveLevels = [
    { level: 'K1 - REMEMBER', score: 85, color: 'bg-blue-500' },
    { level: 'K2 - UNDERSTAND', score: 78, color: 'bg-emerald-500' },
    { level: 'K3 - APPLY', score: 65, color: 'bg-amber-500' },
    { level: 'K4 - ANALYZE', score: 55, color: 'bg-rose-500' },
    { level: 'K5 - EVALUATE', score: 40, color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            Personal Merit Portfolio
          </h2>
          <p className="text-muted-foreground font-medium flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            {profile?.full_name || 'Academic Identity'} • {enrollment?.registrationNumber || 'ID UNASSIGNED'} • {programName} (SEM {semester})
          </p>
        </div>
        <div className="flex items-center gap-3">
           <Button className="font-black gap-2 shadow-lg shadow-primary/25">
             <Zap className="h-4 w-4 fill-current" />
             Merit Export
           </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Merit Mean"
          value={`${overallAverage}%`}
          subtitle="Semester average"
          icon={Award}
          variant="primary"
        />
        <StatsCard
          title="Semester Merit"
          value={sgpa.toFixed(2)}
          subtitle="Current term index"
          icon={TrendingUp}
        />
        <StatsCard
          title="Cumulative Merit"
          value={cgpa.toFixed(2)}
          subtitle="Program integrity"
          icon={ShieldCheck}
        />
        <StatsCard
          title="Active Domains"
          value={subjects.length.toString()}
          subtitle="Enrolled subjects"
          icon={BookOpen}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cognitive Profiler */}
        <Card className="lg:col-span-2 border-none shadow-xl bg-card/60 backdrop-blur-xl overflow-hidden">
          <CardHeader className="border-b border-border/50 bg-muted/20">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  Cognitive Proficiency Matrix
                </CardTitle>
                <CardDescription>Performance across Bloom's cognitive taxonomy levels</CardDescription>
              </div>
              <Badge variant="outline" className="font-black tracking-tighter">LIVE METRICS</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
             {cognitiveLevels.map((cl, i) => (
                <div key={cl.level} className="space-y-2 animate-in slide-in-from-right-4" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className="flex justify-between items-center text-[10px] font-black tracking-widest text-muted-foreground">
                    <span>{cl.level}</span>
                    <span className="text-foreground">{cl.score}%</span>
                  </div>
                  <Progress 
                    value={cl.score} 
                    className="h-3 bg-muted" 
                  />
                </div>
             ))}
             {!cognitiveLevels.length && (
               <div className="text-center py-20 bg-muted/5 rounded-2xl border-2 border-dashed border-border/50">
                 <p className="font-bold opacity-50">Awaiting Assessment Cycle Completion</p>
               </div>
             )}
          </CardContent>
        </Card>

        {/* Intelligence Actions */}
        <div className="space-y-8">
           <Card className="border-none shadow-xl bg-primary text-primary-foreground overflow-hidden">
             <CardHeader className="pb-2">
               <CardTitle className="text-lg font-black flex items-center gap-2">
                 <Lightbulb className="h-5 w-5 fill-current" />
                 Strategic Growth
               </CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
                <div className="p-4 bg-white/10 rounded-xl backdrop-blur-md border border-white/5 space-y-1">
                  <p className="text-xs font-black uppercase tracking-tighter opacity-70">Focus Objective</p>
                  <p className="text-sm font-bold">Strengthen Bloom Level K4 (Analysis)</p>
                  <p className="text-[10px] leading-relaxed opacity-80">Synthesize information from multiple domains into case-study applications.</p>
                </div>
                <div className="p-4 bg-white/10 rounded-xl backdrop-blur-md border border-white/5 space-y-1">
                   <p className="text-xs font-black uppercase tracking-tighter opacity-70">Domain Protocol</p>
                   <p className="text-sm font-bold">Review CO Attainment Logs</p>
                   <p className="text-[10px] leading-relaxed opacity-80">Cross-reference subject-specific outcomes with your performance benchmarks.</p>
                </div>
                <Button className="w-full bg-white text-primary font-black hover:bg-white/90">
                  Full Analytics Portal
                </Button>
             </CardContent>
           </Card>

           <Card className="border-none shadow-xl bg-card border-t-4 border-t-green-500 overflow-hidden">
             <CardContent className="p-6">
                <div className="flex items-center gap-3">
                   <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                      <Target className="h-6 w-6" />
                   </div>
                   <div>
                      <p className="text-sm font-black text-foreground">Operational Excellence</p>
                      <p className="text-xs font-bold text-muted-foreground leading-tight">You are currently tracking 12% above cohort mean in K1/K2 levels.</p>
                   </div>
                </div>
             </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
