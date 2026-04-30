import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, Printer, TrendingUp, BookOpen, Award, CheckCircle2, Activity, Target, ShieldCheck, Sparkles, Brain } from 'lucide-react';
import { useAcademicContext } from '@/contexts/AcademicContext';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';

// --- Utility for CSV Export ---
const downloadCSV = (data: any[], filename: string) => {
  if (!data || !data.length) return;
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(obj => 
    Object.values(obj).map(val => typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val).join(',')
  ).join('\n');
  const csvStr = `${headers}\n${rows}`;
  const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function Analytics() {
  const { departmentId, cohortId } = useAcademicContext();
  const [selectedSubject, setSelectedSubject] = useState('all');

  // 1. Fetch Subjects
  const { data: subjects = [] } = useQuery({
      queryKey: ['analytics-subjects', departmentId],
      queryFn: async () => {
          const { data } = await api.get('/subjects'); 
          return data;
      },
      enabled: !!departmentId
  });

  // 2. Fetch CO Attainment
  const { data: coAttainmentData = [], isLoading: loadingCO } = useQuery({
      queryKey: ['analytics-co-attainment', selectedSubject, cohortId],
      queryFn: async () => {
          if (selectedSubject === 'all') {
              if (subjects.length > 0) return api.get(`/analytics/co-attainment/${subjects[0].id}?cohortId=${cohortId || ''}`).then((r: any) => r.data);
              return [];
          }
          const { data } = await api.get(`/analytics/co-attainment/${selectedSubject}?cohortId=${cohortId || ''}`);
          return data;
      },
      enabled: subjects.length > 0
  });

  // 3. Fetch Bloom Distribution 
  const { data: bloomData = [], isLoading: loadingBloom } = useQuery({
      queryKey: ['analytics-bloom', selectedSubject],
      queryFn: async () => {
           if(selectedSubject === 'all') return [];
           const { data: exams } = await api.get(`/exams?subjectId=${selectedSubject}&status=PUBLISHED`);
           if(exams && exams.length > 0) {
               const latest = exams[0];
               const { data } = await api.get(`/analytics/bloom-distribution/${latest.id}`);
               return data;
           }
           return [];
      },
      enabled: selectedSubject !== 'all'
  });

  // 4. Fetch Subject Performance
  const { data: performanceData = [], isLoading: loadingPerf } = useQuery({
      queryKey: ['analytics-performance', cohortId],
      queryFn: async () => {
          if (!cohortId) return [];
          const { data } = await api.get(`/analytics/subject-performance/${cohortId}`);
          return data;
      },
      enabled: !!cohortId
  });

  // KPIs
  const totalSubjects = performanceData.length || 0;
  const overallAverage = totalSubjects > 0 ? (performanceData.reduce((acc: number, p: any) => acc + p.average, 0) / totalSubjects).toFixed(1) : '0';
  const overallPassRate = totalSubjects > 0 ? (performanceData.reduce((acc: number, p: any) => acc + p.passRate, 0) / totalSubjects).toFixed(1) : '0';
  const bestSubject = [...performanceData].sort((a, b) => b.average - a.average)[0]?.subjectCode || '-';

  return (
    <AuthenticatedLayout>
      <TooltipProvider>
        <div className="space-y-8 pb-10 animate-in fade-in duration-700">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-primary" />
              Intelligence Center
            </h2>
            <p className="text-muted-foreground font-medium">Advanced academic tracing and predictive analytics</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 print:hidden">
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="w-56 bg-white/50 backdrop-blur-sm shadow-sm border-border">
                <SelectValue placeholder="Domain Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="font-bold text-primary">Global Overview</SelectItem>
                {subjects.map((s: any) => (
                    <SelectItem key={s.id} value={s.id} className="font-medium">{s.name} ({s.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
                onClick={() => window.print()} 
                className="font-black gap-2 shadow-lg shadow-primary/20"
            >
              <Printer className="w-4 h-4" />
              Institutional Audit
            </Button>
          </div>
        </div>

        {/* Global KPI Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <Card className="border-none shadow-xl bg-card/60 backdrop-blur-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Operational Domains</p>
                    <h3 className="text-3xl font-black text-foreground">{totalSubjects}</h3>
                  </div>
                  <div className="p-3 bg-primary/10 text-primary rounded-xl">
                    <BookOpen className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl bg-card/60 backdrop-blur-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Institutional Mean</p>
                    <h3 className="text-3xl font-black text-foreground">{overallAverage}%</h3>
                  </div>
                  <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl bg-card/60 backdrop-blur-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Pass Velocity</p>
                    <h3 className="text-3xl font-black text-foreground">{overallPassRate}%</h3>
                  </div>
                  <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl bg-card/60 backdrop-blur-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Elite Performer</p>
                    <h3 className="text-3xl font-black text-foreground">{bestSubject}</h3>
                  </div>
                  <div className="p-3 bg-purple-500/10 text-purple-600 rounded-xl">
                    <Award className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
        </div>

        {/* Intelligence Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* CO Attainment Insights */}
          <Card className="border-none shadow-xl bg-card/60 backdrop-blur-xl overflow-hidden">
             <CardHeader className="border-b border-border/50 bg-muted/20 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                       <Activity className="h-5 w-5 text-primary" />
                       Course Outcome (CO) Ledger
                    </CardTitle>
                    <CardDescription>Quantifiable outcome attainment across domains</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {coAttainmentData.length > 0 && (
                      <Button variant="outline" size="sm" className="h-8 font-bold" onClick={() => downloadCSV(coAttainmentData, 'co_attainment_ledger')}>
                        <Download className="h-4 h-4 mr-2" />
                        Export
                      </Button>
                    )}
                  </div>
                </div>
             </CardHeader>
             <CardContent className="p-6 space-y-6">
                 {loadingCO ? <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-primary w-8 h-8" /></div> : 
                  coAttainmentData.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
                       <ShieldCheck className="h-10 w-10 mb-2 opacity-20" />
                       <p className="font-bold">No Data Points Synchronized</p>
                    </div>
                  ) : (
                    coAttainmentData.map((d: any, i: number) => (
                      <div key={d.co} className="space-y-2 animate-in slide-in-from-left-4" style={{ animationDelay: `${i * 100}ms` }}>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-black text-foreground uppercase tracking-tighter">Outcome Reference: {d.co}</span>
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] font-bold text-muted-foreground uppercase">Target: {d.target}%</span>
                             <Badge variant={d.attainment >= d.target ? "default" : "destructive"} className="font-black">
                               {d.attainment}%
                             </Badge>
                          </div>
                        </div>
                        <Progress value={d.attainment} className="h-2" indicatorClassName={d.attainment >= d.target ? "bg-primary" : "bg-destructive"} />
                      </div>
                    ))
                  )
                 }
             </CardContent>
          </Card>
          
          {/* Bloom's Cognitive Mapping */}
          <Card className="border-none shadow-xl bg-card/60 backdrop-blur-xl overflow-hidden">
              <CardHeader className="border-b border-border/50 bg-muted/20 pb-4">
                 <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                       <Brain className="h-5 w-5 text-primary" />
                       Cognitive DNA Profile
                    </CardTitle>
                    <CardDescription>Evaluation of pedagogical complexity levels</CardDescription>
                  </div>
                  <Badge variant="outline" className="font-black">BLOOM TAXONOMY</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                  {selectedSubject === 'all' ? 
                    <div className="h-64 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border/50 rounded-2xl bg-muted/5">
                       <Activity className="w-10 h-10 mb-3 opacity-20" />
                       <p className="font-bold">Domain Context Required</p>
                       <p className="text-sm">Select a specific subject to render its cognitive profile.</p>
                    </div> :
                    loadingBloom ? <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-primary w-8 h-8" /></div> :
                    bloomData.length === 0 ? (
                      <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
                         <Target className="h-10 w-10 mb-2 opacity-20" />
                         <p className="font-bold">No Bloom Mapping Found</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                         {bloomData.map((bd: any, i: number) => (
                           <div key={bd.level} className="space-y-2 animate-in slide-in-from-right-4" style={{ animationDelay: `${i * 100}ms` }}>
                             <div className="flex justify-between items-center text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                               <span>{bd.level}</span>
                               <span className="text-foreground">{bd.percentage}%</span>
                             </div>
                             <Progress value={bd.percentage} className="h-3" />
                           </div>
                         ))}
                      </div>
                    )
                  }
              </CardContent>
          </Card>
        </div>

        {/* Relative Performance Intelligence */}
        <Card className="border-none shadow-xl bg-card overflow-hidden">
          <CardHeader className="border-b border-border/50 bg-muted/20 pb-4">
             <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                   <Target className="h-5 w-5 text-primary" />
                   Domain Health Matrix
                </CardTitle>
                <CardDescription>Comparative analysis of academic performance vectors across the institutional cohort.</CardDescription>
             </div>
          </CardHeader>
          <CardContent className="p-6">
              {loadingPerf ? (
                 <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>
              ) : performanceData.length === 0 ? (
                 <div className="h-64 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border/50 rounded-2xl">
                    <p className="font-bold">Awaiting Academic Initialization</p>
                 </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                   {performanceData.map((p: any, i: number) => (
                      <div 
                        key={p.subjectCode} 
                        className="p-5 rounded-2xl bg-muted/20 border border-border/50 hover:bg-muted/40 transition-colors animate-in zoom-in-95 duration-500"
                        style={{ animationDelay: `${i * 100}ms` }}
                      >
                         <div className="flex justify-between items-start mb-4">
                            <div>
                               <h4 className="font-black text-foreground">{p.subjectCode}</h4>
                               <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">Semester {p.semester || 'N/A'}</p>
                            </div>
                            <Badge className="font-black">{p.passRate}% PASS</Badge>
                         </div>
                         <div className="grid grid-cols-2 gap-4 mt-2">
                            <div className="space-y-1">
                               <p className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">Avg Gain</p>
                               <p className="text-xl font-black text-primary">{p.average}%</p>
                            </div>
                            <div className="space-y-1 text-right">
                               <p className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">Peak Value</p>
                               <p className="text-xl font-black text-emerald-600">{p.highest}%</p>
                            </div>
                         </div>
                         <Progress value={p.average} className="h-1.5 mt-4" />
                      </div>
                   ))}
                </div>
              )}
          </CardContent>
        </Card>

      </div>
      </TooltipProvider>
    </AuthenticatedLayout>
  );
}
