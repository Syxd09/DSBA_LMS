import React, { useState, useEffect } from 'react';
import { useAcademic } from '../contexts/AcademicContext';
import { 
    FileText, 
    Download, 
    TrendingUp, 
    Award, 
    BarChart3,
    Printer,
    Search,
    ChevronRight,
    Loader2
} from 'lucide-react';
import api from '../services/api';

interface AttainmentReport {
    institution: string;
    reportGeneratedAt: string;
    cohort: { name: string; year: number; program: string };
    subject: { name: string; code: string };
    attainment: {
        co: any[];
        po: any[];
    }
}

const Reports: React.FC = () => {
    const { 
        subjects, 
        subjectId, 
        setSubjectId,
        cohortId 
    } = useAcademic();

    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState<AttainmentReport | null>(null);

    const fetchReport = async () => {
        if (!cohortId || !subjectId) return;
        setLoading(true);
        try {
            const response = await api.get(`/reports/attainment/${cohortId}/${subjectId}`);
            setReport(response.data);
        } catch (error) {
            console.error('Error fetching report:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, [cohortId, subjectId]);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4 no-print">
                <div>
                    <h1 className="text-3xl font-bold font-display text-slate-900 flex items-center gap-3">
                        <FileText className="w-8 h-8 text-primary" />
                        Academic Analytics & Reports
                    </h1>
                    <p className="text-slate-500 mt-1">Institutional performance and accreditation attainment tracking</p>
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={handlePrint}
                        disabled={!report}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50 active:scale-95 shadow-sm"
                    >
                        <Printer className="w-4 h-4" />
                        Print PDF
                    </button>
                    <button 
                        disabled={!report}
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-all disabled:opacity-50 active:scale-95 shadow-lg shadow-primary/20"
                    >
                        <Download className="w-4 h-4" />
                        Export Data
                    </button>
                </div>
            </div>

            {/* Selection Controls - No Print */}
            <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm mb-8 no-print flex flex-wrap gap-2">
                <div className="flex-1 min-w-[200px]">
                    <select 
                        className="w-full border-none focus:ring-0 font-semibold text-slate-600 rounded-xl"
                        value={subjectId}
                        onChange={(e) => setSubjectId(e.target.value)}
                    >
                        <option value="">Select Subject for Analysis</option>
                        {subjects.map(s => (
                            <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
                    <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                    <p className="text-slate-500 font-medium animate-pulse">Computing attainment metrics...</p>
                </div>
            ) : report ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Header Card (Internal Design) */}
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-[2rem] text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <TrendingUp className="w-40 h-40" />
                        </div>
                        
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-primary-light font-bold tracking-widest uppercase text-xs mb-2">Internal Quality Assurance (IQAC)</h3>
                                    <h2 className="text-4xl font-extrabold mb-1">Attainment Summary</h2>
                                    <p className="text-slate-400 font-medium">LMS Continuous Assessment & Accreditation Report</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-semibold opacity-60">Batch: {report.cohort.year}</p>
                                    <p className="text-sm font-semibold opacity-60">Generated: {new Date(report.reportGeneratedAt).toLocaleDateString()}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 border-t border-white/10 pt-8">
                                <div>
                                    <p className="text-primary-light/60 text-xs font-bold uppercase mb-2">Academic Entity</p>
                                    <p className="text-lg font-bold">{report.cohort.program}</p>
                                    <p className="text-slate-400">{report.cohort.name}</p>
                                </div>
                                <div>
                                    <p className="text-primary-light/60 text-xs font-bold uppercase mb-2">Subject Details</p>
                                    <p className="text-lg font-bold">{report.subject.name}</p>
                                    <p className="text-slate-400">{report.subject.code}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* CO Metrics */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm h-full">
                                <div className="flex items-center justify-between mb-8">
                                    <h4 className="font-bold text-slate-800 flex items-center gap-2 italic">
                                        <Award className="w-5 h-5 text-amber-500" />
                                        Course Outcomes (CO) Attainment
                                    </h4>
                                    <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold ring-1 ring-emerald-100">
                                        {report.attainment.co.length} Mapped COs
                                    </span>
                                </div>

                                <div className="space-y-6">
                                    {report.attainment.co.length > 0 ? (
                                        report.attainment.co.map((co, idx) => (
                                            <div key={co.id} className="group">
                                                <div className="flex justify-between items-end mb-2">
                                                    <div>
                                                        <span className="text-xs font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-md mb-1 inline-block">CO-{idx+1}</span>
                                                        <p className="text-sm font-semibold text-slate-700">{co.co.description}</p>
                                                    </div>
                                                    <span className="text-lg font-display font-black text-slate-900">{co.achievedPercent}%</span>
                                                </div>
                                                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                                                    <div 
                                                        className={`h-full transition-all duration-1000 ${co.achievedPercent > 60 ? 'bg-primary' : 'bg-rose-500'}`}
                                                        style={{ width: `${co.achievedPercent}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-2xl">
                                            <p className="text-slate-400 italic text-sm">No CO Attainment data calculated yet for this subject.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* PO Summary */}
                        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                            <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-8 italic">
                                <BarChart3 className="w-5 h-5 text-indigo-500" />
                                Program Outcomes (PO)
                            </h4>
                            <div className="space-y-4">
                                {report.attainment.po.length > 0 ? (
                                    report.attainment.po.map((po, idx) => (
                                        <div key={po.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-primary/20 transition-all cursor-default">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center font-bold text-slate-600 text-sm">
                                                    PO{idx+1}
                                                </div>
                                                <span className="text-sm font-semibold text-slate-600">Calculated Value</span>
                                            </div>
                                            <span className="font-bold text-primary text-lg">{po.achievedPercent}%</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-6">
                                        <p className="text-slate-400 italic text-sm">Waiting for CO computation...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Search className="w-10 h-10 text-slate-300" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Select to Visualize</h2>
                    <p className="text-slate-500 max-w-sm mx-auto">Choose a subject from your academic context to view its attainment analytics and performance benchmarks.</p>
                </div>
            )}
        </div>
    );
};

export default Reports;
