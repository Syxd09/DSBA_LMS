import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { COAttainmentChart } from '@/components/dashboard/COAttainmentChart';
import { BloomTaxonomyChart } from '@/components/dashboard/BloomTaxonomyChart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, Printer, TrendingUp, Users, BookOpen, Award, CheckCircle2 } from 'lucide-react';
import { useAcademicContext } from '@/contexts/AcademicContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

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
              if (subjects.length > 0) return api.get(`/analytics/co-attainment/${subjects[0].id}?cohortId=${cohortId || ''}`).then(r => r.data);
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

  // Chart Formatting
  const internalComparisonData = useMemo(() => {
    return performanceData.map((p: any) => ({
      Subject: p.subjectCode,
      Average: p.average,
      Highest: p.highest,
      PassRate: p.passRate
    }));
  }, [performanceData]);

  const formattedCOData = useMemo(() => {
    return coAttainmentData.map((d:any) => ({
      co: d.co,
      attainment: d.attainment,
      target: d.target
    }));
  }, [coAttainmentData]);

  // KPIs
  const totalSubjects = performanceData.length || 0;
  const overallAverage = totalSubjects > 0 ? (performanceData.reduce((acc: number, p: any) => acc + p.average, 0) / totalSubjects).toFixed(1) : '0';
  const overallPassRate = totalSubjects > 0 ? (performanceData.reduce((acc: number, p: any) => acc + p.passRate, 0) / totalSubjects).toFixed(1) : '0';
  const bestSubject = [...performanceData].sort((a, b) => b.average - a.average)[0]?.subjectCode || '-';

  return (
    <AuthenticatedLayout>
      <TooltipProvider>
        <div className="space-y-8 pb-10 print:bg-white print:text-black print:pb-0">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Academic Command Center</h2>
            <p className="text-slate-500 font-medium mt-1">Institutional insights, attainment tracing, and performance analysis</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 print:hidden">
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="w-56 bg-white shadow-sm border-slate-200">
                <SelectValue placeholder="Filter by Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="font-semibold text-indigo-600">All Subjects (Overview)</SelectItem>
                {subjects.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
                onClick={() => window.print()} 
                className="bg-slate-900 hover:bg-slate-800 text-white shadow-md transition-all"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print Full Report
            </Button>
          </div>
        </div>

        {/* Global KPI Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <Card className="shadow-sm border-slate-200 bg-gradient-to-br from-white to-slate-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Active Subjects</p>
                    <h3 className="text-3xl font-extrabold text-slate-900">{totalSubjects}</h3>
                  </div>
                  <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                    <BookOpen className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200 bg-gradient-to-br from-white to-slate-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Cohort Average</p>
                    <h3 className="text-3xl font-extrabold text-slate-900">{overallAverage}%</h3>
                  </div>
                  <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200 bg-gradient-to-br from-white to-slate-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Pass Rate</p>
                    <h3 className="text-3xl font-extrabold text-slate-900">{overallPassRate}%</h3>
                  </div>
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200 bg-gradient-to-br from-white to-slate-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Top Subject</p>
                    <h3 className="text-3xl font-extrabold text-slate-900">{bestSubject}</h3>
                  </div>
                  <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
                    <Award className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* CO Attainment */}
          <Card className="shadow border-slate-200">
             <CardHeader className="flex flex-row items-start justify-between bg-slate-50/50 border-b pb-4">
                <div>
                   <CardTitle className="text-lg">Course Outcome (CO) Attainment</CardTitle>
                   <CardDescription className="mt-1">Tracking student gap to target outcomes</CardDescription>
                </div>
                {formattedCOData.length > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" className="print:hidden h-8 w-8" onClick={() => downloadCSV(formattedCOData, 'co_attainment_report')}>
                        <Download className="h-4 w-4 text-slate-500" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Download CSV</TooltipContent>
                  </Tooltip>
                )}
             </CardHeader>
             <CardContent className="pt-6 h-[350px]">
                 {selectedSubject === 'all' && <div className="absolute top-2 right-2"><Badge variant="secondary">Global Overview</Badge></div>}
                 {loadingCO ? <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500 w-8 h-8" /></div> : 
                    <COAttainmentChart data={formattedCOData} />
                 }
             </CardContent>
          </Card>
          
          {/* Bloom's Taxonomy */}
          <Card className="shadow border-slate-200">
              <CardHeader className="flex flex-row items-start justify-between bg-slate-50/50 border-b pb-4">
                 <div>
                    <CardTitle className="text-lg">Cognitive Mapping (Bloom's Taxonomy)</CardTitle>
                    <CardDescription className="mt-1">Evaluation of exam questions complexity</CardDescription>
                 </div>
                 {bloomData.length > 0 && (
                   <Tooltip>
                     <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" className="print:hidden h-8 w-8" onClick={() => downloadCSV(bloomData, 'blooms_distribution_report')}>
                        <Download className="h-4 w-4 text-slate-500" />
                      </Button>
                     </TooltipTrigger>
                     <TooltipContent>Download CSV</TooltipContent>
                   </Tooltip>
                 )}
              </CardHeader>
              <CardContent className="pt-6 h-[350px]">
                  {selectedSubject === 'all' ? 
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-50/50 rounded-lg border border-dashed">
                       <BookOpen className="w-10 h-10 mb-3 text-slate-300" />
                       <p className="font-medium text-slate-500">Subject Context Required</p>
                       <p className="text-sm mt-1">Select a specific subject to render its latest exam taxonomy.</p>
                    </div> :
                    loadingBloom ? <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500 w-8 h-8" /></div> :
                    <BloomTaxonomyChart data={bloomData} />
                  }
              </CardContent>
          </Card>
        </div>

        {/* Full Span: Subject Performance Analysis */}
        <Card className="shadow border-slate-200">
          <CardHeader className="flex flex-row items-start justify-between bg-slate-50/50 border-b pb-4">
             <div>
                <CardTitle className="text-lg">Relative Subject Performance</CardTitle>
                <CardDescription className="mt-1">Comparative academic performance highlighting strengths and weaknesses across the cohort.</CardDescription>
             </div>
             {internalComparisonData.length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="print:hidden h-8 w-8" onClick={() => downloadCSV(internalComparisonData, 'subject_performance_report')}>
                      <Download className="h-4 w-4 text-slate-500" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Download Full CSV</TooltipContent>
                </Tooltip>
             )}
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[400px]">
              {loadingPerf ? (
                 <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500 w-8 h-8" /></div>
              ) : internalComparisonData.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <p className="font-medium text-slate-500">No performance data yet</p>
                 </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={internalComparisonData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="Subject" stroke="#64748b" fontSize={13} axisLine={false} tickLine={false} dy={10} />
                    <YAxis stroke="#64748b" fontSize={13} axisLine={false} tickLine={false} dx={-10} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                      itemStyle={{ fontWeight: 600 }}
                      cursor={{fill: '#f8fafc'}}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="Average" name="Average %" fill="#818cf8" radius={[4, 4, 0, 0]} maxBarSize={60} />
                    <Bar dataKey="Highest" name="Highest %" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={60} />
                    <Bar dataKey="PassRate" name="Pass Rate %" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={60} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

      </div>
      
      {/* Global Print Styles to ensure charts render well when downloaded */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .recharts-responsive-container { width: 100% !important; height: 350px !important; }
          .shadow { box-shadow: none !important; border: 1px solid #e2e8f0 !important; }
        }
      `}} />
      </TooltipProvider>
    </AuthenticatedLayout>
  );
}
