import React, { useState, useEffect } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useAcademicContext } from '../contexts/AcademicContext';
import { 
    FileText, Download, TrendingUp, Award, BarChart3, Printer, 
    Search, Loader2, Users, BookOpen, UserCheck, ShieldCheck,
    PieChart as PieChartIcon, Filter
} from 'lucide-react';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    Cell, PieChart, Pie, Legend
} from 'recharts';
import { downloadCSV } from '../utils/report-utils';
import { useAuth } from '../hooks/useAuth';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

const Reports: React.FC = () => {
    const { departmentId, cohortId } = useAcademicContext();
    const { role } = useAuth();
    
    const [activeTab, setActiveTab] = useState('distribution');
    const [loading, setLoading] = useState(false);
    
    // Distribution Data
    const [distributionData, setDistributionData] = useState<any[]>([]);
    const [workloadData, setWorkloadData] = useState<any[]>([]);
    const [academicSummary, setAcademicSummary] = useState<any[]>([]);

    const fetchDistribution = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/reports/distribution', { params: { departmentId } });
            setDistributionData(data);
        } catch (error) {
            console.error('Error fetching distribution:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchWorkload = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/reports/faculty-workload', { params: { departmentId } });
            setWorkloadData(data);
        } catch (error) {
            console.error('Error fetching workload:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAcademicSummary = async () => {
        if (!cohortId) return;
        setLoading(true);
        try {
            const { data } = await api.get('/reports/academic-summary', { params: { cohortId } });
            setAcademicSummary(data);
        } catch (error) {
            console.error('Error fetching academic summary:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'distribution') fetchDistribution();
        if (activeTab === 'workload') fetchWorkload();
        if (activeTab === 'summary') fetchAcademicSummary();
    }, [activeTab, departmentId, cohortId]);

    const handlePrint = () => {
        window.print();
    };

    const exportToExcel = () => {
        if (activeTab === 'distribution') {
            const exportData = distributionData.map(d => ({
                'Cohort Name': d.cohortName,
                'Program': d.program,
                'Total Students': d.stats.total,
                'Above 80%': d.stats.above80,
                '60% - 80%': d.stats.between60And80,
                'Below 60%': d.stats.below60
            }));
            downloadCSV(exportData, `Performance_Distribution_${new Date().toLocaleDateString()}`);
        } else if (activeTab === 'workload') {
            const exportData = workloadData.map(w => ({
                'Faculty Name': w.teacher.fullName,
                'Email': w.teacher.email,
                'Subject': w.subject.name,
                'Code': w.subject.code,
                'Semester': w.subject.semester,
                'Cohort': w.cohort.name,
                'Students Enrolled': w.metrics?.studentCount || 0,
                'Avg Performance (%)': w.metrics?.averagePercentage?.toFixed(2) || '0.00',
                'Academic Year': w.academicYear
            }));
            downloadCSV(exportData, `Faculty_Workload_${new Date().toLocaleDateString()}`);
        } else if (activeTab === 'summary') {
            const exportData = academicSummary.map(s => ({
                'Reg Number': s.registrationNumber,
                'Name': s.name,
                'Email': s.email,
                'Cohort': s.cohort,
                'Average %': s.overallAvg.toFixed(2)
            }));
            downloadCSV(exportData, `Academic_Summary_${new Date().toLocaleDateString()}`);
        }
    };

    return (
        <AuthenticatedLayout allowedRoles={['admin', 'principal', 'hod', 'teacher']}>
            <div className="max-w-[1600px] mx-auto px-6 py-8 pb-20 space-y-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-600 rounded-xl">
                                <FileText className="w-6 h-6 text-white" />
                            </div>
                            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Institutional Reports</h1>
                        </div>
                        <p className="text-slate-500 font-medium">Advanced academic intelligence and faculty auditing suite</p>
                    </div>

                    <div className="flex gap-3">
                        <Button variant="outline" size="lg" className="bg-white border-slate-200 shadow-sm" onClick={handlePrint}>
                            <Printer className="w-4 h-4 mr-2" />
                            Print Structured PDF
                        </Button>
                        <Button size="lg" className="bg-slate-900 hover:bg-slate-800 shadow-md" onClick={exportToExcel}>
                            <Download className="w-4 h-4 mr-2" />
                            Export Excel (CSV)
                        </Button>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                    <TabsList className="bg-slate-100/80 p-1 no-print h-auto flex-wrap gap-1">
                        <TabsTrigger value="distribution" className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-6 py-2.5 rounded-lg">
                            <BarChart3 className="w-4 h-4 mr-2" />
                            Performance Distribution
                        </TabsTrigger>
                        <TabsTrigger value="workload" className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-6 py-2.5 rounded-lg">
                            <Users className="w-4 h-4 mr-2" />
                            Faculty Workload
                        </TabsTrigger>
                        <TabsTrigger value="summary" className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-6 py-2.5 rounded-lg">
                            <BookOpen className="w-4 h-4 mr-2" />
                            Academic Summary
                        </TabsTrigger>
                    </TabsList>

                    {/* Performance Distribution Tab */}
                    <TabsContent value="distribution" className="animate-in fade-in duration-500 space-y-8">
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                            <div className="xl:col-span-2 space-y-8">
                                {distributionData.map((cohort) => (
                                    <Card key={cohort.cohortId} className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                        <CardHeader className="bg-slate-50/50 border-b">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <CardTitle className="text-xl font-bold text-slate-900">{cohort.cohortName}</CardTitle>
                                                    <CardDescription>{cohort.program}</CardDescription>
                                                </div>
                                                <Badge variant="outline" className="bg-white px-3 py-1 text-xs font-bold text-slate-600">
                                                    {cohort.stats.total} Expected Returns
                                                </Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="pt-8">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                                <div className="h-[250px]">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart 
                                                            layout="vertical"
                                                            data={[
                                                                { name: 'Above 80%', value: cohort.stats.above80, color: '#10b981' },
                                                                { name: '60% - 80%', value: cohort.stats.between60And80, color: '#3b82f6' },
                                                                { name: 'Below 60%', value: cohort.stats.below60, color: '#ef4444' }
                                                            ]}
                                                            margin={{ left: 50 }}
                                                        >
                                                            <XAxis type="number" hide />
                                                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600 }} />
                                                            <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                                                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                                                {[0, 1, 2].map((i) => (
                                                                    <Cell key={i} fill={['#10b981', '#3b82f6', '#ef4444'][i]} />
                                                                ))}
                                                            </Bar>
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                                                        <p className="text-emerald-700 text-xs font-bold uppercase tracking-wider mb-1">Distinction Plus</p>
                                                        <h4 className="text-2xl font-black text-emerald-900">{cohort.stats.above80}</h4>
                                                        <p className="text-emerald-600/60 text-[10px] font-bold">ATTAINED {cohort.stats.above80Percent.toFixed(1)}%</p>
                                                    </div>
                                                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                                                        <p className="text-blue-700 text-xs font-bold uppercase tracking-wider mb-1">Standard Merit</p>
                                                        <h4 className="text-2xl font-black text-blue-900">{cohort.stats.between60And80}</h4>
                                                        <p className="text-blue-600/60 text-[10px] font-bold">ATTAINED {cohort.stats.between60And80Percent.toFixed(1)}%</p>
                                                    </div>
                                                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl">
                                                        <p className="text-rose-700 text-xs font-bold uppercase tracking-wider mb-1">Need Support</p>
                                                        <h4 className="text-2xl font-black text-rose-900">{cohort.stats.below60}</h4>
                                                        <p className="text-rose-600/60 text-[10px] font-bold">CRITICAL {cohort.stats.below60Percent.toFixed(1)}%</p>
                                                    </div>
                                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                                        <p className="text-slate-700 text-xs font-bold uppercase tracking-wider mb-1">Total Count</p>
                                                        <h4 className="text-2xl font-black text-slate-900">{cohort.stats.total}</h4>
                                                        <p className="text-slate-600/60 text-[10px] font-bold">FULL ENROLLMENT</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                            
                            <div className="xl:col-span-1 space-y-6">
                                <Card className="bg-indigo-600 text-white border-none shadow-xl">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <ShieldCheck className="w-5 h-5" /> Reporting Parameters
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4 text-sm text-indigo-100">
                                        <p>This report is generated based on real-time examination data. Student performance is calculated using the following bands:</p>
                                        <ul className="list-disc pl-5 space-y-2">
                                            <li><strong>High Performers:</strong> &gt;80% overall average. Candidates for institutional awards.</li>
                                            <li><strong>Standard Cohort:</strong> 60% to 80% average. Regular academic progress.</li>
                                            <li><strong>At Risk:</strong> Below 60% average. Mandatory remedial counseling recommended.</li>
                                        </ul>
                                        <div className="pt-4 border-t border-white/10 flex items-center justify-between font-bold text-white">
                                            <span>Institutional Compliance</span>
                                            <Badge className="bg-white/20 text-white border-white/30">NAAC v4.2</Badge>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>

                    {/* Faculty Workload Tab */}
                    <TabsContent value="workload" className="animate-in fade-in duration-500">
                        <Card className="border-slate-200 shadow-sm overflow-hidden">
                            <CardHeader className="bg-slate-50/50 border-b flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Teacher Assignments Registry</CardTitle>
                                    <CardDescription>Comprehensive audit of faculty subject mappings and semester workload</CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-400">STATUS:</span>
                                    <Badge className="bg-emerald-500 text-white border-none">ACTIVE CYCLE</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-slate-50 border-b">
                                            <tr>
                                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Faculty Member</th>
                                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Academic Subject</th>
                                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Cohort Assignment</th>
                                                <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center">Students</th>
                                                <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center">Avg. Perf. (%)</th>
                                                <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center">Semester</th>
                                                <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center">Credits</th>
                                                <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {workloadData.map((assign, idx) => (
                                                <tr key={idx} className="group hover:bg-indigo-50/30 transition-colors">
                                                    <td className="p-4">
                                                        <p className="font-bold text-slate-900">{assign.teacher.fullName}</p>
                                                        <p className="text-xs text-slate-400">{assign.teacher.email}</p>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-2">
                                                           <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-[10px] font-black text-indigo-600 border border-indigo-100">
                                                               {assign.subject.code}
                                                           </div>
                                                           <p className="text-sm font-semibold text-slate-700">{assign.subject.name}</p>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <p className="text-sm font-medium text-slate-600">{assign.cohort.name}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold tracking-tighter uppercase">{assign.academicYear}</p>
                                                    </td>
                                                    <td className="p-4 text-center font-bold text-indigo-600">
                                                        {assign.metrics?.studentCount || 0}
                                                    </td>
                                                    <td className="p-4 text-center font-bold">
                                                        <span className={assign.metrics?.averagePercentage >= 60 ? 'text-emerald-600' : 'text-rose-600'}>
                                                            {assign.metrics?.averagePercentage?.toFixed(1) || '0.0'}%
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <Badge variant="secondary" className="font-mono">{assign.subject.semester}</Badge>
                                                    </td>
                                                    <td className="p-4 text-center font-bold text-slate-700">
                                                        {assign.subject.credits}
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <div className="flex justify-center">
                                                            <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)] ${
                                                                (assign.metrics?.studentCount > 0) ? 'bg-emerald-500' : 'bg-slate-300'
                                                            }`} />
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {loading && workloadData.length === 0 && (
                                        <div className="py-20 flex flex-col items-center justify-center gap-3">
                                            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                                            <p className="text-sm text-slate-400 font-medium italic">Synchronizing workload registry...</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Academic Summary Tab */}
                    <TabsContent value="summary" className="animate-in fade-in duration-500 space-y-6">
                        {!cohortId ? (
                             <Card className="border-2 border-dashed bg-slate-50/50 py-20 text-center">
                                <Search className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                                <h3 className="text-xl font-bold text-slate-900">Context Required</h3>
                                <p className="text-slate-500 max-w-sm mx-auto mt-2">Please select an academic cohort from the sidebar or settings to generate the comprehensive master sheet.</p>
                             </Card>
                        ) : (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 no-print">
                                    <Card className="bg-white shadow-sm border-slate-200">
                                        <CardContent className="pt-6">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Total Students</p>
                                            <h4 className="text-2xl font-black text-slate-900">{academicSummary.length}</h4>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-white shadow-sm border-slate-200">
                                        <CardContent className="pt-6">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Mean Academic Score</p>
                                            <h4 className="text-2xl font-black text-indigo-600">
                                                {academicSummary.length > 0 
                                                    ? (academicSummary.reduce((a, b) => a + b.overallAvg, 0) / academicSummary.length).toFixed(1) 
                                                    : 0}%
                                            </h4>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-white shadow-sm border-slate-200">
                                        <CardContent className="pt-6">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Report Type</p>
                                            <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2 mt-2">
                                                <ShieldCheck className="w-4 h-4 text-emerald-500" /> MASTER_ACADEMIC_LEDGER
                                            </h4>
                                        </CardContent>
                                    </Card>
                                </div>

                                <Card className="border-slate-200 shadow-sm">
                                    <CardContent className="p-0">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse text-sm">
                                                <thead className="bg-slate-50 border-b">
                                                    <tr>
                                                        <th className="p-4 font-bold text-slate-700">Reg Number</th>
                                                        <th className="p-4 font-bold text-slate-700">Student Identity</th>
                                                        <th className="p-4 font-bold text-slate-700">Academic Program</th>
                                                        <th className="p-4 font-bold text-slate-700 text-center">Subjects Evaluated</th>
                                                        <th className="p-4 font-bold text-slate-700 text-center">Aggregate Result</th>
                                                        <th className="p-4 font-bold text-slate-700 text-center">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    {academicSummary.map((student, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-50/50">
                                                            <td className="p-4 font-mono font-medium text-slate-500 italic">
                                                                {student.registrationNumber}
                                                            </td>
                                                            <td className="p-4">
                                                                <p className="font-bold text-slate-900">{student.name}</p>
                                                                <p className="text-[11px] text-slate-400">{student.email}</p>
                                                            </td>
                                                            <td className="p-4 font-medium text-slate-600">
                                                                {student.program}
                                                                <p className="text-[10px] opacity-50 uppercase">{student.cohort}</p>
                                                            </td>
                                                            <td className="p-4 text-center">
                                                                <Badge variant="outline" className="font-bold border-slate-200">{student.subjects.length} Subjects</Badge>
                                                            </td>
                                                            <td className="p-4 text-center">
                                                                <span className={`text-lg font-black ${student.overallAvg >= 60 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                                    {student.overallAvg.toFixed(1)}%
                                                                </span>
                                                            </td>
                                                            <td className="p-4 text-center">
                                                                <Badge className={student.overallAvg >= 40 ? 'bg-emerald-50 text-emerald-600 border-none' : 'bg-rose-50 text-rose-600 border-none'}>
                                                                    {student.overallAvg >= 40 ? 'PASSED' : 'REMEDIAL'}
                                                                </Badge>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
            
            {/* Print Styling */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; font-size: 12px; }
                    .card { border: none !important; box-shadow: none !important; }
                    .max-w-7xl, .max-w-\[1600px\] { max-width: 100% !important; padding: 0 !important; margin: 0 !important; }
                    table { page-break-inside: auto; }
                    tr { page-break-inside: avoid; page-break-after: auto; }
                    thead { display: table-header-group; }
                    @page { margin: 2cm; }
                }
            ` }} />
        </AuthenticatedLayout>
    );
};

export default Reports;
