import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAcademicContext } from '@/contexts/AcademicContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, Users, Award, BookOpen, 
  ChevronRight, ArrowUpRight, ArrowDownRight, Info,
  PieChart as PieChartIcon, Activity, Zap, Target, BarChart3
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

export default function Analytics() {
  const { departmentId, isContextComplete } = useAcademicContext();

  // Real data fetching from global-attainment
  const { data: globalAttainment, isLoading: isAttainmentLoading } = useQuery({
    queryKey: ['global-attainment', departmentId],
    queryFn: async () => {
      const { data } = await api.get(`/analytics/global-attainment?departmentId=${departmentId}`);
      return data || [];
    },
    enabled: !!departmentId
  });

  // Real data fetching from performance-trend
  const { data: performanceTrend, isLoading: isTrendLoading } = useQuery({
    queryKey: ['performance-trend', departmentId],
    queryFn: async () => {
      const { data } = await api.get(`/analytics/performance-trend?departmentId=${departmentId}`);
      return data || [];
    },
    enabled: !!departmentId
  });

  // Real data fetching from department-stats
  const { data: departmentStats, isLoading: isDeptLoading } = useQuery({
    queryKey: ['department-stats'],
    queryFn: async () => {
      const { data } = await api.get('/analytics/department-stats');
      return data || [];
    },
  });

  const COLORS = ['#0f172a', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1'];

  // Calculate some aggregate stats
  const avgAttainment = globalAttainment?.length 
    ? Math.round(globalAttainment.reduce((acc: number, curr: any) => acc + curr.attainment, 0) / globalAttainment.length)
    : 0;


  return (
    <AuthenticatedLayout allowedRoles={['admin', 'principal', 'hod']}>
      <div className="p-6 space-y-6 bg-[#f8fafc] min-h-screen pb-20 font-inter">
        {/* Header Section */}
        <div className="flex justify-between items-end border-b border-slate-200 pb-6 mb-2">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Institutional Pulse</span>
            </div>
            <h1 className="text-3xl font-black text-[#1e293b] tracking-tighter">Academic Intelligence</h1>
            <p className="text-sm text-slate-500 mt-1 font-medium italic">"Data-driven decision making for institutional excellence."</p>
          </div>
          <div className="flex gap-3">
             <div className="text-right pr-4 border-r border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase">System Integrity</p>
                <p className="text-sm font-black text-emerald-600">99.9% Sync</p>
             </div>
             <Button className="bg-[#1e293b] hover:bg-black text-white font-bold px-6 shadow-xl shadow-slate-200 transition-all hover:-translate-y-0.5">
               <ArrowUpRight className="w-4 h-4 mr-2" /> Comprehensive Audit
             </Button>
          </div>
        </div>

        {!departmentId ? (
          <Card className="border-slate-200 shadow-2xl shadow-slate-100 bg-white overflow-hidden rounded-xl">
            <CardContent className="flex flex-col items-center justify-center py-32 space-y-6">
              <div className="relative">
                 <div className="absolute inset-0 bg-slate-100 rounded-full animate-ping opacity-20" />
                 <div className="relative p-6 bg-slate-50 rounded-full border border-slate-100 shadow-inner">
                   <BarChart3 className="w-12 h-12 text-slate-300" />
                 </div>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Select Analytical Context</h3>
                <p className="text-sm text-slate-500 max-w-sm mx-auto mt-2 leading-relaxed">Please select a Department from the sidebar to initialize the real-time attainment processing engine.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Avg Attainment', value: `${avgAttainment}%`, icon: Target, trend: '+2.4%', color: 'text-blue-600', sub: 'Institutional Goal' },
                { label: 'Departments', value: departmentStats?.length || '0', icon: Users, trend: 'Stable', color: 'text-slate-900', sub: 'Total Nodes' },
                { label: 'Programs', value: departmentStats?.reduce((acc: number, curr: any) => acc + curr.programs, 0) || '0', icon: BookOpen, trend: '+1', color: 'text-emerald-600', sub: 'Active Curriculum' },
                { label: 'Excellence Index', value: '4.8/5', icon: Award, trend: '+0.2', color: 'text-indigo-600', sub: 'Quality Score' },
              ].map((stat, i) => (
                <Card key={i} className="border-slate-200 shadow-sm bg-white overflow-hidden group hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 group-hover:scale-110 transition-transform">
                        <stat.icon className={cn("w-6 h-6", stat.color)} />
                      </div>
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold text-[10px] rounded-md px-2">
                        {stat.trend}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                      <h3 className="text-3xl font-black text-[#1e293b] mt-1 tracking-tighter">{stat.value}</h3>
                      <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tighter italic opacity-0 group-hover:opacity-100 transition-opacity">{stat.sub}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 border-slate-200 shadow-sm bg-white overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6 flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg font-black text-[#1e293b] tracking-tight">Attainment Dynamics</CardTitle>
                    <CardDescription className="text-xs font-medium">Outcome achievements mapped across academic milestones</CardDescription>
                  </div>
                  <div className="flex gap-2">
                     <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-slate-900" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Primary</span>
                     </div>
                     <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-slate-300" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Secondary</span>
                     </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8 h-[450px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={performanceTrend || []}>
                      <defs>
                        <linearGradient id="colorMain" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0f172a" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#0f172a" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="semester" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white p-4 border border-slate-200 shadow-2xl rounded-xl">
                                <p className="text-xs font-black text-slate-400 uppercase mb-2">{payload[0].payload.semester}</p>
                                <div className="space-y-1.5">
                                   <div className="flex items-center justify-between gap-8">
                                      <span className="text-xs font-bold text-slate-600">Attainment:</span>
                                      <span className="text-sm font-black text-slate-900">{payload[0].value}%</span>
                                   </div>
                                   <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                      <div className="h-full bg-slate-900" style={{ width: `${payload[0].value}%` }} />
                                   </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="CO1" 
                        stroke="#1e293b" 
                        fillOpacity={1} 
                        fill="url(#colorMain)" 
                        strokeWidth={4} 
                        activeDot={{ r: 6, strokeWidth: 0, fill: '#0f172a' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="CO2" 
                        stroke="#cbd5e1" 
                        fill="transparent" 
                        strokeWidth={2} 
                        strokeDasharray="6 6" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6">
                  <CardTitle className="text-lg font-black text-[#1e293b] tracking-tight">Hub Density</CardTitle>
                  <CardDescription className="text-xs font-medium">Global student distribution by department</CardDescription>
                </CardHeader>
                <CardContent className="p-8 h-[450px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={departmentStats || []}
                        innerRadius={80}
                        outerRadius={110}
                        paddingAngle={10}
                        dataKey="students"
                        nameKey="name"
                        stroke="none"
                      >
                        {(departmentStats || []).map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="hover:opacity-80 cursor-pointer transition-opacity" />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: '30px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-6 px-8 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-black text-[#1e293b] tracking-tighter">Global Matrix Performance</CardTitle>
                  <CardDescription className="text-xs font-medium">Cross-institutional attainment scores against NAAC thresholds</CardDescription>
                </div>
                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-slate-900" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Passed Threshold</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-slate-300" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Underperform</span>
                   </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-y divide-slate-100">
                  {globalAttainment?.length ? globalAttainment.map((item: any, i: number) => (
                    <div key={i} className="p-8 flex items-center justify-between hover:bg-slate-50/80 transition-all group relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-slate-900 scale-y-0 group-hover:scale-y-100 transition-transform origin-top" />
                      <div className="flex items-center gap-6">
                        <div className="relative">
                           <div className={cn(
                             "w-12 h-12 rounded-xl flex items-center justify-center border font-black text-sm transition-all group-hover:rotate-6",
                             item.attainment >= item.target ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-400 border-slate-200"
                           )}>
                             {item.co}
                           </div>
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 text-base tracking-tight">Outcome Attainment Level</h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Target: {item.target}% institutional avg</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="text-right">
                          <div className="flex items-center gap-4">
                            <div className="w-48 h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner border border-slate-200/50">
                              <div 
                                className={cn(
                                  "h-full transition-all duration-1000 ease-out",
                                  item.attainment >= item.target ? "bg-slate-900" : "bg-slate-300"
                                )} 
                                style={{ width: `${item.attainment}%` }} 
                              />
                            </div>
                            <span className="text-lg font-black text-[#1e293b] w-12 tracking-tighter">{item.attainment}%</span>
                          </div>
                        </div>
                        <div className="p-2 rounded-lg bg-white border border-slate-200 text-slate-300 group-hover:text-slate-900 group-hover:border-slate-900 transition-all">
                           <ChevronRight className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="col-span-2 p-24 text-center text-slate-400">
                      <Zap className="w-12 h-12 mx-auto mb-4 opacity-10" />
                      <p className="text-xs font-black uppercase tracking-[0.3em] opacity-40">Matrix Under Construction</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
