import { useState, useMemo, useEffect } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { cn } from '@/lib/utils';
import { useAcademicContext } from '@/contexts/AcademicContext';
import { 
  useGradingRules, useFinalMarks, useCalculateGrades, 
  useCreateGradingRule, useUpdateGradingRule, useDeleteGradingRule 
} from '@/hooks/useGrading';
import api from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Calculator, Award, Settings, Loader2, Save, 
  Download, Eye, Lock, TrendingUp, Users, CheckCircle2,
  ChevronRight, Info, Search, RefreshCw, Zap, Sparkles, Brain, Layers, ShieldCheck, Activity, Plus, Trash2, Edit2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import * as XLSX from 'xlsx';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

export default function GradeManagement() {
  const { departmentId, cohortId } = useAcademicContext();
  const [selectedCohort, setSelectedCohort] = useState<string>(cohortId || '');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [filterText, setFilterText] = useState('');
  const [internalMethod, setInternalMethod] = useState<'best' | 'avg' | 'latest'>('best');
  
  // Rule Management State
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleForm, setRuleForm] = useState({
    grade: '',
    minPercentage: 0,
    maxPercentage: 100,
    gradePoint: 0,
    departmentId: departmentId || null
  });
  
  const { user } = useAuth();
  const { toast } = useToast();
  
  const calculateGrades = useCalculateGrades();
  const createRule = useCreateGradingRule();
  const updateRule = useUpdateGradingRule();
  const deleteRule = useDeleteGradingRule();
  
  useEffect(() => {
    if (cohortId) setSelectedCohort(cohortId);
  }, [cohortId]);
  
  const { data: gradingRules, refetch: refetchRules } = useGradingRules(departmentId);
  
  const { data: rawCohorts } = useQuery({
    queryKey: ['cohorts-list'],
    queryFn: async () => {
      const { data } = await api.get('/cohorts');
      return data || [];
    },
  });

  const cohorts = departmentId 
    ? (rawCohorts || []).filter((c: any) => c.program?.departmentId === departmentId)
    : (rawCohorts || []);
  
  const { data: subjects } = useQuery({
    queryKey: ['subjects-list'],
    queryFn: async () => {
      const { data } = await api.get('/subjects');
      return data || [];
    },
  });
  
  const { data: finalMarks, isLoading: marksLoading, refetch: refetchMarks } = useFinalMarks({
    cohort_id: selectedCohort || undefined,
    subject_id: selectedSubject || undefined,
  });

  const analytics = useMemo(() => {
    if (!finalMarks?.length) return null;
    const count = finalMarks.length;
    const passCount = finalMarks.filter((m: any) => m.grade !== 'F').length;
    const passRate = (passCount / count) * 100;
    const dist: Record<string, number> = {};
    finalMarks.forEach((m: any) => {
      dist[m.grade] = (dist[m.grade] || 0) + 1;
    });
    const chartData = Object.entries(dist).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.name.localeCompare(a.name));
    return { passRate, chartData, count };
  }, [finalMarks]);

  const stats = useMemo(() => {
    if (!finalMarks?.length) return null;
    const percentages = finalMarks.map((m: any) => m.percentage);
    const mean = percentages.reduce((a, b) => a + b, 0) / percentages.length;
    const min = Math.min(...percentages);
    const max = Math.max(...percentages);
    return { mean, min, max };
  }, [finalMarks]);

  const handleCalculateGrades = async () => {
    if (!selectedCohort || !selectedSubject) return;
    try {
      await calculateGrades.mutateAsync({
        cohort_id: selectedCohort,
        subject_id: selectedSubject,
        internal_method: internalMethod,
      });
      refetchMarks();
    } catch (error) {}
  };

  const handleExportExcel = () => {
    if (!finalMarks?.length) return;

    const exportData = finalMarks.map((m: any) => ({
      'Registration Number': m.student?.registrationNumber,
      'Full Name': m.student?.fullName,
      'Internal 1': m.internal1,
      'Internal 2': m.internal2,
      'Best Internal': m.bestInternal,
      'External Marks': m.externalMarks,
      'Total Marks': m.totalMarks,
      'Percentage': `${m.percentage.toFixed(2)}%`,
      'Grade': m.grade,
      'Grade Point': m.gradePoint,
      'Status': m.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Grade Ledger');

    // Add some styling (column widths)
    const wscols = [
      { wch: 20 }, { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 15 },
      { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 12 }
    ];
    worksheet['!cols'] = wscols;

    const cohortName = cohorts.find(c => c.id === selectedCohort)?.name || 'Unknown_Cohort';
    const subjectName = subjects.find(s => s.id === selectedSubject)?.name || 'Unknown_Subject';

    XLSX.writeFile(workbook, `Grade_Report_${cohortName}_${subjectName}.xlsx`);

    toast({
      title: "Export Successful",
      description: "The grade ledger has been downloaded as an Excel file.",
    });
  };

  const handleBulkStatusUpdate = async (status: 'PUBLISHED' | 'LOCKED') => {
    if (!selectedCohort || !selectedSubject) return;
    try {
      await api.post('/grading/bulk-update-status', {
        cohortId: selectedCohort,
        subjectId: selectedSubject,
        status
      });
      toast({ title: `Grades ${status === 'PUBLISHED' ? 'Published' : 'Locked'} successfully` });
      refetchMarks();
    } catch (error: any) {
      toast({ 
        title: 'Update failed', 
        description: error.response?.data?.message || 'Unauthorized', 
        variant: 'destructive' 
      });
    }
  };

  const handleOpenAddDialog = () => {
    setEditingRuleId(null);
    setRuleForm({ grade: '', minPercentage: 0, maxPercentage: 100, gradePoint: 0, departmentId: departmentId || null });
    setIsRuleDialogOpen(true);
  };

  const handleOpenEditDialog = (rule: any) => {
    setEditingRuleId(rule.id);
    setRuleForm({
      grade: rule.grade,
      minPercentage: rule.minPercentage,
      maxPercentage: rule.maxPercentage,
      gradePoint: rule.gradePoint,
      departmentId: rule.departmentId
    });
    setIsRuleDialogOpen(true);
  };

  const handleSaveRule = async () => {
    try {
      if (editingRuleId) {
        await updateRule.mutateAsync({
          id: editingRuleId,
          ...ruleForm
        } as any);
      } else {
        await createRule.mutateAsync({
          ...ruleForm,
          departmentId: departmentId || null
        } as any);
      }
      setIsRuleDialogOpen(false);
      refetchRules();
    } catch (error) {}
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this grading rule?')) return;
    try {
      await deleteRule.mutateAsync(id);
      refetchRules();
    } catch (error) {}
  };

  const COLORS = ['#0f172a', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1'];

  return (
    <AuthenticatedLayout allowedRoles={['admin', 'principal', 'hod', 'teacher']}>
      <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Grade Management</h1>
            <p className="text-slate-500 mt-2">Compute SGPA, process final grades, and manage assessment records.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="border-slate-200" onClick={() => handleBulkStatusUpdate('PUBLISHED')}>
              <Eye className="w-4 h-4 mr-2" /> Publish Results
            </Button>
            <Button className="bg-slate-900 hover:bg-slate-800 text-white" onClick={() => handleBulkStatusUpdate('LOCKED')}>
              <Lock className="w-4 h-4 mr-2" /> Lock Grades
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Students', value: analytics?.count || '0', icon: Users, color: 'text-slate-600' },
            { label: 'Pass Rate', value: `${analytics?.passRate.toFixed(1) || 0}%`, icon: CheckCircle2, color: 'text-emerald-600' },
            { label: 'Average Score', value: `${stats?.mean.toFixed(1) || 0}%`, icon: TrendingUp, color: 'text-blue-600' },
            { label: 'Subject Range', value: `${stats?.min.toFixed(0) || 0}-${stats?.max.toFixed(0) || 0}%`, icon: Layers, color: 'text-indigo-600' },
          ].map((stat, i) => (
            <Card key={i} className="border-slate-200 shadow-sm">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 rounded-lg bg-slate-100">
                  <stat.icon className={cn("w-5 h-5", stat.color)} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                  <h4 className="text-xl font-bold text-slate-900">{stat.value}</h4>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="calculate" className="space-y-6">
          <TabsList className="bg-slate-100 p-1 border border-slate-200 h-12">
            <TabsTrigger value="calculate" className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-8 font-semibold">
              <Calculator className="w-4 h-4 mr-2" /> Grading Cycle
            </TabsTrigger>
            <TabsTrigger value="rules" className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-8 font-semibold">
              <Settings className="w-4 h-4 mr-2" /> Grading Rules
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calculate" className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              <Card className="lg:col-span-1 border-slate-200 shadow-sm h-fit">
                <CardHeader className="border-b border-slate-100">
                  <CardTitle className="text-lg font-semibold">Configuration</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Cohort</Label>
                    <Select value={selectedCohort} onValueChange={setSelectedCohort}>
                      <SelectTrigger className="border-slate-200">
                        <SelectValue placeholder="Select Cohort" />
                      </SelectTrigger>
                      <SelectContent>
                        {cohorts?.map((cohort: any) => (
                          <SelectItem key={cohort.id} value={cohort.id}>{cohort.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Subject</Label>
                    <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                      <SelectTrigger className="border-slate-200">
                        <SelectValue placeholder="Select Subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects?.map((subject: any) => (
                          <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Method</Label>
                    <Select value={internalMethod} onValueChange={(v: any) => setInternalMethod(v)}>
                      <SelectTrigger className="border-slate-200">
                        <SelectValue placeholder="Calculation Method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="best">Best of Internals</SelectItem>
                        <SelectItem value="avg">Weighted Average</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    className="w-full bg-slate-900 text-white hover:bg-slate-800"
                    onClick={handleCalculateGrades}
                    disabled={!selectedCohort || !selectedSubject || calculateGrades.isPending}
                  >
                    {calculateGrades.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : <Zap className="w-4 h-4 mr-2" />}
                    Run Grading Cycle
                  </Button>
                </CardContent>
              </Card>

              <div className="lg:col-span-3 space-y-6">
                <Card className="border-slate-200 shadow-sm overflow-hidden">
                  <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold">Student Marks Ledger</CardTitle>
                      <CardDescription>Consolidated results for the selected context</CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-slate-200 h-10 px-4 font-semibold text-slate-700 hover:bg-slate-50"
                        onClick={handleExportExcel}
                        disabled={!finalMarks?.length}
                      >
                        <Download className="w-4 h-4 mr-2" /> Export to Excel
                      </Button>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          placeholder="Search student..."
                          className="h-10 bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-slate-200 transition-all w-64"
                          value={filterText}
                          onChange={(e) => setFilterText(e.target.value)}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow className="border-none">
                          <TableHead className="font-bold text-slate-900 pl-6">Student</TableHead>
                          <TableHead className="font-bold text-slate-900 text-center">Internals</TableHead>
                          <TableHead className="font-bold text-slate-900 text-center">External</TableHead>
                          <TableHead className="font-bold text-slate-900 text-center">Total</TableHead>
                          <TableHead className="font-bold text-slate-900 text-center">Grade</TableHead>
                          <TableHead className="pr-6"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {marksLoading ? (
                          <TableRow><TableCell colSpan={6} className="h-32 text-center text-slate-500">Loading records...</TableCell></TableRow>
                        ) : finalMarks?.filter((m: any) => m.student?.fullName?.toLowerCase().includes(filterText.toLowerCase())).map((mark: any) => (
                          <TableRow key={mark.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                            <TableCell className="pl-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-xs border border-slate-200">
                                  {mark.student?.fullName?.split(' ').map((n: string) => n[0]).join('')}
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-900">{mark.student?.fullName}</p>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase">{mark.student?.registrationNumber}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="text-xs font-semibold text-slate-500">
                                {mark.internal1} / {mark.internal2} (Best: <span className="text-slate-900">{mark.bestInternal}</span>)
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-bold text-slate-900">{mark.externalMarks}</TableCell>
                            <TableCell className="text-center">
                              <p className="font-bold text-slate-900">{mark.totalMarks}</p>
                              <p className="text-[10px] text-slate-400 font-bold">{mark.percentage.toFixed(1)}%</p>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={cn(
                                "rounded-lg px-3 py-1 border font-bold",
                                mark.grade === 'F' ? "bg-red-50 text-red-700 border-red-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"
                              )}>
                                {mark.grade}
                              </Badge>
                            </TableCell>
                            <TableCell className="pr-6 text-right">
                              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-900">
                                <ChevronRight className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="rules" className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Grading Protocol</h3>
                <p className="text-sm text-slate-500">Rules for converting percentages to letter grades</p>
              </div>
              <Button className="bg-slate-900 text-white hover:bg-slate-800" onClick={handleOpenAddDialog}>
                <Plus className="w-4 h-4 mr-2" /> Add Grading Rule
              </Button>
            </div>

            <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
              <DialogContent className="bg-white">
                <DialogHeader>
                  <DialogTitle>{editingRuleId ? 'Edit Grading Rule' : 'Add New Grading Rule'}</DialogTitle>
                  <DialogDescription>Define the percentage range and associated letter grade.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="grade" className="text-right font-bold">Grade</Label>
                    <Input 
                      id="grade" 
                      value={ruleForm.grade} 
                      onChange={(e) => setRuleForm({...ruleForm, grade: e.target.value})}
                      placeholder="e.g. A+" 
                      className="col-span-3 border-slate-200"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="min" className="text-right font-bold">Min %</Label>
                    <Input 
                      id="min" 
                      type="number"
                      value={ruleForm.minPercentage} 
                      onChange={(e) => setRuleForm({...ruleForm, minPercentage: parseFloat(e.target.value)})}
                      className="col-span-3 border-slate-200"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="max" className="text-right font-bold">Max %</Label>
                    <Input 
                      id="max" 
                      type="number"
                      value={ruleForm.maxPercentage} 
                      onChange={(e) => setRuleForm({...ruleForm, maxPercentage: parseFloat(e.target.value)})}
                      className="col-span-3 border-slate-200"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="point" className="text-right font-bold">Points</Label>
                    <Input 
                      id="point" 
                      type="number"
                      step="0.1"
                      value={ruleForm.gradePoint} 
                      onChange={(e) => setRuleForm({...ruleForm, gradePoint: parseFloat(e.target.value)})}
                      className="col-span-3 border-slate-200"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsRuleDialogOpen(false)}>Cancel</Button>
                  <Button 
                    className="bg-slate-900 text-white" 
                    onClick={handleSaveRule}
                    disabled={createRule.isPending || updateRule.isPending}
                  >
                    {createRule.isPending || updateRule.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : "Save Rule"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow className="border-none">
                      <TableHead className="font-bold text-slate-900 pl-6">Grade</TableHead>
                      <TableHead className="font-bold text-slate-900">Percentage Range</TableHead>
                      <TableHead className="font-bold text-slate-900">Points</TableHead>
                      <TableHead className="pr-6 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gradingRules?.map((rule: any) => (
                      <TableRow key={rule.id} className="border-b border-slate-100 group">
                        <TableCell className="pl-6 py-4 font-bold text-slate-900">{rule.grade}</TableCell>
                        <TableCell className="text-slate-600 font-medium">{rule.minPercentage}% to {rule.maxPercentage}%</TableCell>
                        <TableCell className="font-bold text-slate-900">{rule.gradePoint.toFixed(1)}</TableCell>
                        <TableCell className="pr-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                             <Badge variant="outline" className="text-[10px] uppercase font-bold text-slate-400">
                               {rule.departmentId ? 'Dept Rule' : 'Standard Rule'}
                             </Badge>
                             <Button 
                               variant="ghost" 
                               size="icon" 
                               className="text-slate-400 hover:text-slate-900 transition-all"
                               onClick={() => handleOpenEditDialog(rule)}
                             >
                               <Edit2 className="w-4 h-4" />
                             </Button>
                             <Button 
                               variant="ghost" 
                               size="icon" 
                               className="text-slate-400 hover:text-red-600 transition-all"
                               onClick={() => handleDeleteRule(rule.id)}
                               disabled={deleteRule.isPending}
                             >
                               <Trash2 className="w-4 h-4" />
                             </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AuthenticatedLayout>
  );
}
