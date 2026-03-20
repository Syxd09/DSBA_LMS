import { useState, useMemo, useEffect } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useAcademicContext } from '@/contexts/AcademicContext';
import { useGradingRules, useFinalMarks, useCalculateGrades, useCreateGradingRule, useDeleteGradingRule } from '@/hooks/useGrading';
import api from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Calculator, Award, Settings, Loader2, MessageSquare, Save, 
  Download, Eye, Lock, TrendingUp, Users, CheckCircle2 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

export default function GradeManagement() {
  const { departmentId, cohortId } = useAcademicContext();
  const [selectedCohort, setSelectedCohort] = useState<string>(cohortId || '');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [filterText, setFilterText] = useState('');
  
  // Rule generation state
  const [addRuleOpen, setAddRuleOpen] = useState(false);
  const [newRule, setNewRule] = useState({ grade: '', minPercentage: '', maxPercentage: '', gradePoint: '' });
  
  const { user } = useAuth();
  const { toast } = useToast();
  
  const createRuleMutation = useCreateGradingRule();
  const deleteRuleMutation = useDeleteGradingRule();
  
  useEffect(() => {
    if (cohortId) setSelectedCohort(cohortId);
  }, [cohortId]);
  
  const { data: gradingRules, isLoading: rulesLoading } = useGradingRules(departmentId);
  
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
  
  const calculateGrades = useCalculateGrades();
  
  // Analytics Calculations
  const analytics = useMemo(() => {
    if (!finalMarks?.length) return null;
    
    const count = finalMarks.length;
    const scores = finalMarks.map((m: any) => m.percentage);
    const avg = scores.reduce((a: number, b: number) => a + b, 0) / count;
    const passCount = finalMarks.filter((m: any) => m.grade !== 'F').length;
    const passRate = (passCount / count) * 100;
    
    // Grade distribution for chart
    const dist: Record<string, number> = {};
    finalMarks.forEach((m: any) => {
      dist[m.grade] = (dist[m.grade] || 0) + 1;
    });
    
    const chartData = Object.entries(dist).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.name.localeCompare(a.name));

    return { avg, passRate, chartData, count };
  }, [finalMarks]);

  const handleCalculateGrades = async () => {
    if (!selectedCohort || !selectedSubject) return;
    try {
      await calculateGrades.mutateAsync({
        cohort_id: selectedCohort,
        subject_id: selectedSubject,
      });
      refetchMarks();
      toast({ title: 'Grades calculated successfully' });
    } catch (error) {}
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

  const handleBulkSGPA = async () => {
    if (!selectedCohort) return;
    try {
      await api.post('/grading/bulk-calculate-sgpa', {
        cohortId: selectedCohort,
        semester: finalMarks?.[0]?.semester || 1
      });
      toast({ title: 'SGPA/CGPA computed for entire class' });
    } catch (error: any) {
      toast({ 
        title: 'Computation failed', 
        description: error.response?.data?.message || 'Check if all subjects are graded', 
        variant: 'destructive' 
      });
    }
  };

  const exportCSV = () => {
    if (!finalMarks?.length) return;
    const headers = ['Student', 'Email', 'Internal 1', 'Internal 2', 'Best Internal', 'External', 'Total', 'Percentage', 'Grade', 'Points'];
    const rows = finalMarks.map((m: any) => [
      m.student?.fullName || 'N/A',
      m.student?.email || 'N/A',
      m.internal1,
      m.internal2,
      m.bestInternal,
      m.externalMarks,
      m.totalMarks,
      `${m.percentage}%`,
      m.grade,
      m.gradePoint
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Grades_${selectedCohort}_${selectedSubject}.csv`;
    a.click();
  };

  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [selectedMark, setSelectedMark] = useState<any>(null);
  const [feedbackText, setFeedbackText] = useState('');

  return (
    <AuthenticatedLayout allowedRoles={['admin', 'principal', 'hod', 'teacher']}>
      <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Grade Analytics & Management</h2>
            <p className="text-muted-foreground mt-1">High-fidelity grading engine with NAAC-compliant data auditing</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCSV} disabled={!finalMarks?.length}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button 
                variant="outline" 
                className="text-indigo-600 border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100" 
                onClick={handleBulkSGPA} 
                disabled={!finalMarks?.length}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Compute SGPA
            </Button>
            <Button variant="outline" className="text-blue-600 border-blue-200 bg-blue-50/50 hover:bg-blue-100" onClick={() => handleBulkStatusUpdate('PUBLISHED')} disabled={!finalMarks?.length}>
              <Eye className="w-4 h-4 mr-2" />
              Publish All
            </Button>
            <Button variant="default" className="bg-slate-900" onClick={() => handleBulkStatusUpdate('LOCKED')} disabled={!finalMarks?.length}>
              <Lock className="w-4 h-4 mr-2" />
              Lock Permanently
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-100 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                <Users className="w-4 h-4" /> Class Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.count || 0} Students</div>
              <p className="text-xs text-muted-foreground mt-1">Total enrollments for cohort</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Pass Percentage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{analytics?.passRate.toFixed(1) || 0}%</div>
              <div className="w-full bg-slate-100 h-1.5 mt-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${analytics?.passRate || 0}%` }} />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Average Marks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{analytics?.avg.toFixed(1) || 0}%</div>
              <p className="text-xs text-muted-foreground mt-1">Median class performance</p>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-sm border-slate-200">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-medium text-slate-500">Grading Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Badge variant={finalMarks?.[0]?.status === 'LOCKED' ? 'default' : 'secondary'} className="capitalize">
                  {finalMarks?.[0]?.status || 'Draft'}
                </Badge>
                <span className="text-xs text-muted-foreground">Subject specific state</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="calculate" className="space-y-6">
          <TabsList className="bg-slate-100 p-1">
            <TabsTrigger value="calculate" className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-6">
              <Calculator className="w-4 h-4 mr-2" />
              Grading Engine
            </TabsTrigger>
            <TabsTrigger value="rules" className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-6">
              <Settings className="w-4 h-4 mr-2" />
              Grading Rules
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calculate" className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-1 shadow-sm border-slate-200 h-fit">
                <CardHeader>
                  <CardTitle className="text-lg">Execution Context</CardTitle>
                  <CardDescription>Target cohort and subject for computation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Academic Cohort</label>
                    <Select value={selectedCohort} onValueChange={setSelectedCohort}>
                      <SelectTrigger className="w-full bg-slate-50/50">
                        <SelectValue placeholder="Select cohort" />
                      </SelectTrigger>
                      <SelectContent>
                        {cohorts?.map((cohort: any) => (
                          <SelectItem key={cohort.id} value={cohort.id}>
                            {cohort.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Subject Code</label>
                    <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                      <SelectTrigger className="w-full bg-slate-50/50">
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects?.map((subject: any) => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.name} ({subject.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button 
                    variant="default"
                    className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all active:scale-95"
                    onClick={handleCalculateGrades}
                    disabled={!selectedCohort || !selectedSubject || calculateGrades.isPending}
                  >
                    {calculateGrades.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Calculator className="w-4 h-4 mr-2" />}
                    Calculate Grades
                  </Button>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2 shadow-sm border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg">Grade Distribution</CardTitle>
                  <CardDescription>Frequency analysis of student performance</CardDescription>
                </CardHeader>
                <CardContent className="h-[250px] pt-0">
                  {analytics?.chartData.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                        <Tooltip 
                          cursor={{ fill: '#f8fafc' }}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                          {analytics.chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                       <TrendingUp className="w-12 h-12 mb-2 opacity-20" />
                       <p className="text-sm">Compute grades to see visual analytics</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {selectedCohort && selectedSubject && (
              <Card className="shadow-lg border-slate-200 overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-xl font-bold">Students List</CardTitle>
                      <CardDescription>Detailed breakdown of raw marks and computed grades</CardDescription>
                    </div>
                    <div className="relative">
                      <input 
                        className="bg-white border text-sm rounded-lg px-3 py-2 w-64 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                        placeholder="Search student or email..."
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {marksLoading ? (
                    <div className="flex items-center justify-center py-20">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                        <p className="text-sm text-slate-500 font-medium">Crunching academic data...</p>
                      </div>
                    </div>
                  ) : !finalMarks?.length ? (
                    <div className="text-center py-20 bg-slate-50/20">
                      <Award className="w-12 h-12 mx-auto text-slate-200 mb-4" />
                      <h3 className="text-lg font-semibold text-slate-900">No Grades Computed</h3>
                      <p className="text-slate-500 max-w-[300px] mx-auto mt-2">Specify filters and click calculate to generate the grading sheet for this semester segment.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-slate-50/80">
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="w-[200px] font-bold text-slate-700">Student Identity</TableHead>
                            <TableHead className="text-center font-bold text-slate-700">Internal 1</TableHead>
                            <TableHead className="text-center font-bold text-slate-700">Internal 2</TableHead>
                            <TableHead className="text-center font-bold text-indigo-700 bg-indigo-50/30">BEST INT</TableHead>
                            <TableHead className="text-center font-bold text-slate-700">External</TableHead>
                            <TableHead className="text-center font-bold text-slate-700">Total</TableHead>
                            <TableHead className="text-center font-bold text-slate-700">%</TableHead>
                            <TableHead className="text-center font-bold text-slate-700">Grade</TableHead>
                            <TableHead className="text-center font-bold text-slate-700">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {finalMarks
                            .filter((m: any) => 
                              m.student?.fullName?.toLowerCase().includes(filterText.toLowerCase()) || 
                              m.student?.email?.toLowerCase().includes(filterText.toLowerCase())
                            )
                            .map((mark: any) => (
                            <TableRow key={mark.id} className="group hover:bg-slate-50/80 transition-colors">
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-900">{mark.student?.fullName || 'Unknown Student'}</span>
                                  <span className="text-xs text-slate-500 font-mono tracking-tighter">{mark.student?.email}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center font-medium">{mark.internal1}</TableCell>
                              <TableCell className="text-center font-medium">{mark.internal2}</TableCell>
                              <TableCell className="text-center font-extrabold text-indigo-600 bg-indigo-50/20">{mark.bestInternal}</TableCell>
                              <TableCell className="text-center font-medium">{mark.externalMarks}</TableCell>
                              <TableCell className="text-center font-bold text-slate-900">{mark.totalMarks}</TableCell>
                              <TableCell className="text-center font-medium text-slate-600">{mark.percentage}%</TableCell>
                              <TableCell className="text-center">
                                <Badge 
                                  className={`shadow-none px-3 py-1 font-bold ${
                                    mark.grade === 'F' ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-50' : 
                                    ['A+', 'A'].includes(mark.grade) ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                    'bg-indigo-50 text-indigo-600 border-indigo-100'
                                  }`} 
                                  variant="outline"
                                >
                                  {mark.grade}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setSelectedMark(mark);
                                    setFeedbackText(mark.feedback || '');
                                    setFeedbackOpen(true);
                                  }}
                                  className="group/btn"
                                >
                                  <MessageSquare className={`w-4 h-4 transition-transform group-hover/btn:scale-125 ${mark.feedback ? 'text-indigo-500 fill-indigo-50' : 'text-slate-300'}`} />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="rules" className="space-y-6">
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="border-b bg-slate-50/30 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Institutional Grading Scale</CardTitle>
                  <CardDescription>Rules defining percentage-to-grade mappings for the current department</CardDescription>
                </div>
                {['ADMIN', 'PRINCIPAL', 'HOD'].includes(user?.role || '') && (
                  <Button onClick={() => setAddRuleOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
                    Add Rule
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {rulesLoading ? (
                   <div className="flex items-center justify-center py-20">
                     <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
                   </div>
                ) : (
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow>
                        <TableHead className="font-bold">Grade</TableHead>
                        <TableHead className="font-bold">Score Range (%)</TableHead>
                        <TableHead className="font-bold">Grade Points</TableHead>
                        <TableHead className="font-bold">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gradingRules?.map((rule: any) => (
                        <TableRow key={rule.id}>
                          <TableCell>
                            <Badge className="font-extrabold px-3 py-0.5" variant={rule.grade === 'F' ? 'destructive' : 'default'}>
                              {rule.grade}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium text-slate-600">
                             {rule.minPercentage}% - {rule.maxPercentage}%
                          </TableCell>
                          <TableCell className="font-bold">{rule.gradePoint.toFixed(1)}</TableCell>
                          <TableCell>
                            {['ADMIN', 'PRINCIPAL', 'HOD'].includes(user?.role || '') ? (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => {
                                  if (confirm('Are you sure you want to delete this rule?')) {
                                    deleteRuleMutation.mutate(rule.id);
                                  }
                                }}
                              >
                                Delete
                              </Button>
                            ) : (
                              <span className="text-xs text-slate-400 font-medium italic">Active System Rule</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add Rule Dialog */}
        <Dialog open={addRuleOpen} onOpenChange={setAddRuleOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Grading Rule</DialogTitle>
              <DialogDescription>
                Define a new grade mapping for the {departmentId ? 'department' : 'institution'}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="grade" className="text-right">Grade</Label>
                <Input id="grade" placeholder="e.g. A+" className="col-span-3" value={newRule.grade} onChange={(e) => setNewRule({...newRule, grade: e.target.value})} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="minPercentage" className="text-right">Min %</Label>
                <Input id="minPercentage" type="number" placeholder="e.g. 90" className="col-span-3" value={newRule.minPercentage} onChange={(e) => setNewRule({...newRule, minPercentage: e.target.value})} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="maxPercentage" className="text-right">Max %</Label>
                <Input id="maxPercentage" type="number" placeholder="e.g. 100" className="col-span-3" value={newRule.maxPercentage} onChange={(e) => setNewRule({...newRule, maxPercentage: e.target.value})} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="gradePoint" className="text-right">Points</Label>
                <Input id="gradePoint" type="number" step="0.1" placeholder="e.g. 10.0" className="col-span-3" value={newRule.gradePoint} onChange={(e) => setNewRule({...newRule, gradePoint: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddRuleOpen(false)}>Cancel</Button>
              <Button 
                className="bg-indigo-600 hover:bg-indigo-700"
                disabled={createRuleMutation.isPending || !newRule.grade || !newRule.minPercentage || !newRule.maxPercentage || !newRule.gradePoint}
                onClick={() => {
                  createRuleMutation.mutate({
                    ...newRule,
                    minPercentage: parseFloat(newRule.minPercentage),
                    maxPercentage: parseFloat(newRule.maxPercentage),
                    gradePoint: parseFloat(newRule.gradePoint),
                    departmentId: departmentId || null
                  }, {
                    onSuccess: () => {
                      setAddRuleOpen(false);
                      setNewRule({ grade: '', minPercentage: '', maxPercentage: '', gradePoint: '' });
                    }
                  });
                }}
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-xl">Student Remarks</DialogTitle>
              <DialogDescription>Performance feedback will be visible on student's final report card.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                 <div className="bg-indigo-100 p-2 rounded-full"><Users className="w-4 h-4 text-indigo-600" /></div>
                 <div>
                    <p className="text-sm font-bold text-slate-900">{selectedMark?.student?.fullName}</p>
                    <p className="text-xs text-slate-500">{selectedMark?.student?.email}</p>
                 </div>
              </div>
              <Textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Share descriptive feedback on student performance, areas for growth, or notable achievements..."
                className="h-40 bg-slate-50/50 focus:bg-white transition-colors text-sm"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setFeedbackOpen(false)}>Cancel</Button>
              <Button 
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={async () => {
                  try {
                    await api.put(`/grading/final-marks/${selectedMark.id}/feedback`, { feedback: feedbackText });
                    setFeedbackOpen(false);
                    refetchMarks();
                    toast({ title: 'Feedback saved successfully' });
                  } catch (e) {
                    toast({ title: 'Failed to save feedback', variant: 'destructive' });
                  }
                }}
              >
                <Save className="w-4 h-4 mr-2" />
                Publish Feedback
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthenticatedLayout>
  );
}
