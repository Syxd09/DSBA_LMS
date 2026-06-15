import { useState, useMemo, useEffect } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAcademicContext } from '@/contexts/AcademicContext';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
  PieChart, Pie, Sector
} from 'recharts';
import { 
  TrendingUp, Award, Target, BookOpen, ChevronRight, Info, Activity, Zap, 
  CheckCircle2, Brain, BarChart3, Filter, MessageSquare, Lightbulb, AlertTriangle, ArrowUpRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { useAvailableSemesters } from '@/hooks/useAvailableSemesters';

export default function COPOAnalytics() {
  const { departmentId, cohortId } = useAcademicContext();
  const [selectedDept, setSelectedDept] = useState<string>(departmentId || '');
  const [selectedCohort, setSelectedCohort] = useState<string>(cohortId || '');
  const availableSemesters = useAvailableSemesters(selectedCohort, selectedDept);
  const [selectedSemester, setSelectedSemester] = useState<string>('1');
  const [selectedSubject, setSelectedSubject] = useState<string>('');

  // Fetch Departments
  const { data: departments } = useQuery({
    queryKey: ['departments-list'],
    queryFn: async () => {
      const { data } = await api.get('/departments');
      return data || [];
    },
  });

  // Fetch Cohorts filtered by Dept
  const { data: cohorts } = useQuery({
    queryKey: ['cohorts-list', selectedDept],
    queryFn: async () => {
      const { data } = await api.get('/cohorts');
      return selectedDept ? data.filter((c: any) => c.program?.departmentId === selectedDept) : data;
    },
  });

  // Fetch Subjects filtered by Cohort/Semester
  const { data: subjects } = useQuery({
    queryKey: ['subjects-list', selectedCohort, selectedSemester],
    queryFn: async () => {
      const { data } = await api.get('/subjects');
      return data || [];
    },
  });

  // Fetch Comprehensive Traceability Data
  const { data: traceability, isLoading: matrixLoading } = useQuery({
    queryKey: ['co-po-traceability', selectedSubject, selectedCohort, selectedSemester],
    queryFn: async () => {
      if (!selectedSubject || !selectedCohort) return null;
      const { data } = await api.get(`/analytics/co-po-traceability/${selectedSubject}/${selectedCohort}/${selectedSemester}`);
      return data;
    },
    enabled: !!selectedSubject && !!selectedCohort,
  });

  // Fetch Bloom Distribution
  const { data: bloomDist } = useQuery({
    queryKey: ['subject-bloom-dist', selectedSubject],
    queryFn: async () => {
      if (!selectedSubject) return null;
      const { data } = await api.get(`/analytics/subject-bloom-distribution/${selectedSubject}`);
      return data;
    },
    enabled: !!selectedSubject,
  });

  const bloomColors: Record<string, string> = {
    'REMEMBER': '#3b82f6',
    'UNDERSTAND': '#10b981',
    'APPLY': '#f59e0b',
    'ANALYZE': '#f97316',
    'EVALUATE': '#8b5cf6',
    'CREATE': '#ec4899',
  };

  const stats = useMemo(() => {
    if (!traceability) return null;
    const coAttainments = traceability.coAttainments || [];
    const poAttainments = traceability.poAttainments || [];
    
    const avgCO = coAttainments.length 
      ? coAttainments.reduce((acc: number, curr: any) => acc + curr.achievedPercent, 0) / coAttainments.length 
      : 0;
    
    const avgPO = poAttainments.length 
      ? poAttainments.reduce((acc: number, curr: any) => acc + curr.achievedPercent, 0) / poAttainments.length 
      : 0;

    const belowTarget = coAttainments.filter((co: any) => co.achievedPercent < co.targetPercent).length;

    return { avgCO, avgPO, belowTarget, poCount: poAttainments.length };
  }, [traceability]);

  const insights = useMemo(() => {
    if (!traceability || !bloomDist) return [];
    const messages = [];
    
    // Attainment gaps
    const weakCOs = (traceability.coAttainments || []).filter((co: any) => co.achievedPercent < co.targetPercent);
    if (weakCOs.length > 0) {
      messages.push({
        type: 'warning',
        text: `${weakCOs.length} Course Outcomes are below institutional threshold. Prioritize remedial sessions for ${weakCOs.map((c:any) => `CO${c.co.coNumber}`).join(', ')}.`
      });
    }

    // Bloom Analysis
    const highOrder = (bloomDist || []).filter((b: any) => ['ANALYZE', 'EVALUATE', 'CREATE'].includes(b.level.toUpperCase()));
    const highOrderSum = highOrder.reduce((acc: number, b: any) => acc + b.percentage, 0);
    
    if (highOrderSum < 20) {
      messages.push({
        type: 'info',
        text: "Curriculum is skewed towards lower-order thinking. Consider introducing more analytical assessments to improve Bloom's diversity."
      });
    } else if (highOrderSum > 50) {
      messages.push({
        type: 'success',
        text: "Excellent curriculum depth. Over 50% of assessments target higher-order cognitive skills (Analyze/Create)."
      });
    }

    return messages;
  }, [traceability, bloomDist]);

  return (
    <AuthenticatedLayout allowedRoles={['admin', 'principal', 'hod', 'teacher']}>
      <div className="p-6 space-y-6 bg-[#f8fafc] min-h-screen pb-20 font-inter">
        {/* Header Section */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-[#1e293b]">CO-PO Analytics Engine</h1>
            <p className="text-sm text-slate-500 mt-1">View detailed outcome attainment and institutional mapping matrix</p>
          </div>
          <div className="flex gap-2">
             <Button variant="outline" className="bg-white border-slate-200 text-slate-700 font-semibold" onClick={() => window.print()}>
               <Info className="w-4 h-4 mr-2" /> Methodology
             </Button>
             <Button className="bg-[#1e293b] hover:bg-[#0f172a] text-white font-semibold">
               <ArrowUpRight className="w-4 h-4 mr-2" /> Export Report
             </Button>
          </div>
        </div>

        {/* Select Context Card - Exact match to Reports.tsx */}
        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6">
            <div className="flex items-center gap-2 text-slate-700">
               <Filter className="w-4 h-4" />
               <span className="text-sm font-bold uppercase tracking-wider">Select Context</span>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-tight">Department</label>
                <Select value={selectedDept} onValueChange={setSelectedDept}>
                  <SelectTrigger className="h-10 bg-white border-slate-200 text-sm">
                    <SelectValue placeholder="Select Dept" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments?.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-tight">Cohort</label>
                <Select value={selectedCohort} onValueChange={setSelectedCohort}>
                  <SelectTrigger className="h-10 bg-white border-slate-200 text-sm">
                    <SelectValue placeholder="Select Cohort" />
                  </SelectTrigger>
                  <SelectContent>
                    {cohorts?.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-tight">Semester</label>
                <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                  <SelectTrigger className="h-10 bg-white border-slate-200 text-sm">
                    <SelectValue placeholder="Select Sem" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSemesters.map(s => <SelectItem key={s} value={s.toString()}>Semester {s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-tight">Subject</label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger className="h-10 bg-white border-slate-200 text-sm">
                    <SelectValue placeholder="Select Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects?.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Avg Attainment', value: `${Math.round(stats?.avgCO || 0)}%`, icon: Target, color: 'text-blue-600' },
            { label: 'PO Coverage', value: `${stats?.poCount || 0} POs`, icon: Award, color: 'text-emerald-600' },
            { label: 'Dominant Bloom', value: bloomDist?.length ? bloomDist.sort((a:any, b:any) => b.count - a.count)[0].level : 'N/A', icon: Brain, color: 'text-indigo-600' },
            { label: 'Identified Gaps', value: stats?.belowTarget || '0', icon: AlertTriangle, color: stats?.belowTarget ? 'text-rose-600' : 'text-slate-400' },
          ].map((stat, i) => (
            <Card key={i} className="border-slate-200 shadow-sm bg-white">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <stat.icon className={cn("w-6 h-6", stat.color)} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                  <h4 className="text-2xl font-bold text-[#1e293b]">{stat.value}</h4>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-slate-200 shadow-sm bg-white">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg font-bold text-[#1e293b]">Attainment vs Targets</CardTitle>
              <CardDescription>Course-wise achievement metrics across institutional thresholds</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px] pt-8">
              {matrixLoading ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">Processing data...</div>
              ) : traceability?.coAttainments?.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={traceability.coAttainments.map((c: any) => ({
                    name: `CO${c.co.coNumber}`,
                    achieved: c.achievedPercent,
                    target: c.targetPercent
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 600 }} />
                    <Bar dataKey="achieved" name="Achieved %" fill="#1e293b" radius={[4, 4, 0, 0]} barSize={32} />
                    <Bar dataKey="target" name="Target %" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2">
                  <BarChart3 className="w-12 h-12 opacity-10" />
                  <p className="text-sm font-bold uppercase tracking-widest">Select context to view trends</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg font-bold text-[#1e293b]">Bloom's Taxonomy</CardTitle>
              <CardDescription>Cognitive distribution of assessments</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px] pt-8">
              {bloomDist?.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={bloomDist}
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="percentage"
                      nameKey="level"
                    >
                      {bloomDist.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={bloomColors[entry.level.toUpperCase()] || '#e2e8f0'} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2">
                  <Brain className="w-12 h-12 opacity-10" />
                  <p className="text-sm font-bold uppercase tracking-widest">No cognitive data</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-slate-200 shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
              <CardTitle className="text-lg font-bold text-[#1e293b]">Traceability Matrix</CardTitle>
              <CardDescription>Outcome correlation mapping vs attainment levels</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-slate-50/80 text-slate-500 uppercase text-[10px] font-bold tracking-widest border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Course Outcome</th>
                      <th className="px-6 py-4">Achieved</th>
                      {traceability?.poAttainments?.map((po: any) => (
                        <th key={po.id} className="px-4 py-4 text-center border-l border-slate-100">PO{po.po.poNumber}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {traceability?.coAttainments?.map((co: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 text-xs">CO{co.co.coNumber}</span>
                            <span className="text-[10px] text-slate-400 font-medium truncate max-w-[250px]">{co.co.description}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                             <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                               <div className="h-full bg-slate-900" style={{ width: `${co.achievedPercent}%` }} />
                             </div>
                             <span className="text-xs font-bold text-slate-900">{co.achievedPercent}%</span>
                          </div>
                        </td>
                        {traceability.poAttainments.map((po: any) => {
                          const mapping = co.poMappings.find((m: any) => m.po.id === po.po.id);
                          const level = mapping?.correlationLevel || 0;
                          return (
                            <td key={po.id} className="px-4 py-4 text-center border-l border-slate-100">
                               <span className={cn(
                                 "w-7 h-7 inline-flex items-center justify-center rounded-md text-xs font-bold",
                                 level === 3 ? "bg-slate-900 text-white" : 
                                 level === 2 ? "bg-slate-200 text-slate-700" :
                                 level === 1 ? "bg-slate-100 text-slate-500" : "text-slate-50"
                               )}>
                                 {level || '-'}
                               </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {!traceability && (
                      <tr><td colSpan={10} className="px-6 py-20 text-center text-slate-400 text-sm font-bold uppercase tracking-widest italic">Please select context to generate traceability matrix</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-[#1e293b]">
                   <Zap className="w-4 h-4 fill-amber-500 text-amber-500" />
                   Smart Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {insights.length > 0 ? insights.map((msg: any, idx: number) => (
                  <div key={idx} className="flex gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="mt-0.5">
                      {msg.type === 'warning' ? <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> : 
                       msg.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : 
                       <Info className="w-3.5 h-3.5 text-blue-500" />}
                    </div>
                    <p className="text-[11px] font-medium text-slate-600 leading-relaxed">{msg.text}</p>
                  </div>
                )) : (
                  <div className="text-center py-10">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-tighter italic">No insights available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
                <CardTitle className="text-lg font-bold text-[#1e293b]">Program Impact (PO)</CardTitle>
              </CardHeader>
              <CardContent className="h-[250px] p-0">
                {traceability?.poAttainments?.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={traceability.poAttainments.map((p: any) => ({
                      name: `PO${p.po.poNumber}`,
                      attainment: p.achievedPercent
                    }))}>
                      <PolarGrid stroke="#f1f5f9" />
                      <PolarAngleAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                      <Radar
                        name="PO Attainment"
                        dataKey="attainment"
                        stroke="#1e293b"
                        fill="#1e293b"
                        fillOpacity={0.05}
                        strokeWidth={2}
                      />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                   <div className="h-full flex items-center justify-center text-slate-300 font-bold uppercase text-[10px] tracking-widest italic">No PO mapping data</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

