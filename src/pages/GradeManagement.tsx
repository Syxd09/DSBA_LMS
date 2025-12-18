import { useState, useEffect } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useAcademicContext } from '@/contexts/AcademicContext';
import { useGradingRules, useFinalMarks, useCalculateGrades } from '@/hooks/useGrading';
import api from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Calculator, Award, Settings, Loader2, MessageSquare, Save } from 'lucide-react';

export default function GradeManagement() {
  const { departmentId, cohortId } = useAcademicContext();
  const [selectedCohort, setSelectedCohort] = useState<string>(cohortId || '');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  
  // Sync local state with context when context changes
  useEffect(() => {
    if (cohortId) setSelectedCohort(cohortId);
  }, [cohortId]);

  const { data: gradingRules, isLoading: rulesLoading } = useGradingRules();
  
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
  
  const { data: users } = useQuery({
    queryKey: ['student-users', finalMarks],
    queryFn: async () => {
      if (!finalMarks?.length) return [];
      const { data } = await api.get('/users');
      return data || [];
    },
    enabled: !!finalMarks?.length,
  });
  
  const calculateGrades = useCalculateGrades();
  
  const handleCalculateGrades = async () => {
    if (!selectedCohort || !selectedSubject) return;
    
    await calculateGrades.mutateAsync({
      cohort_id: selectedCohort,
      subject_id: selectedSubject,
    });
    
    refetchMarks();
  };
  
  const getGradeBadgeVariant = (grade: string) => {
    if (['A+', 'A'].includes(grade)) return 'default';
    if (['B+', 'B'].includes(grade)) return 'secondary';
    if (['C+', 'C', 'D'].includes(grade)) return 'outline';
    return 'destructive';
  };
  
  const getStudentName = (studentId: string) => {
    const user = users?.find((u: any) => u.id === studentId);
    return user?.fullName || 'Unknown';
  };

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [selectedMark, setSelectedMark] = useState<any>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);

  const openFeedbackDialog = (mark: any) => {
    setSelectedMark(mark);
    setFeedbackText(mark.feedback || '');
    setFeedbackOpen(true);
  };

  const handleSaveFeedback = async () => {
    if (!selectedMark) return;
    setIsSavingFeedback(true);
    try {
      await api.put(`/grading/final-marks/${selectedMark.id}/feedback`, {
        feedback: feedbackText
      });
      setFeedbackOpen(false);
      refetchMarks();
    } catch (error) {
      console.error('Failed to save feedback', error);
    } finally {
      setIsSavingFeedback(false);
    }
  };

  return (
    <AuthenticatedLayout allowedRoles={['principal', 'hod', 'teacher']}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Grade Management</h2>
          <p className="text-muted-foreground">Calculate and manage student grades</p>
        </div>

        <Tabs defaultValue="calculate" className="space-y-6">
          <TabsList>
            <TabsTrigger value="calculate">
              <Calculator className="w-4 h-4 mr-2" />
              Calculate Grades
            </TabsTrigger>
            <TabsTrigger value="rules">
              <Settings className="w-4 h-4 mr-2" />
              Grading Rules
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calculate" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Select Subject & Cohort</CardTitle>
                <CardDescription>Choose the subject and cohort to calculate grades for</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Select value={selectedCohort} onValueChange={setSelectedCohort}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Select cohort" />
                    </SelectTrigger>
                    <SelectContent>
                      {cohorts?.map((cohort: any) => (
                        <SelectItem key={cohort.id} value={cohort.id}>
                          {cohort.name} ({cohort.program?.name || cohort.program?.code || 'N/A'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger className="w-64">
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
                  
                  <Button 
                    onClick={handleCalculateGrades}
                    disabled={!selectedCohort || !selectedSubject || calculateGrades.isPending}
                  >
                    {calculateGrades.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    <Calculator className="w-4 h-4 mr-2" />
                    Calculate Grades
                  </Button>
                </div>
              </CardContent>
            </Card>

            {selectedCohort && selectedSubject && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    Grade Results
                    <Badge variant="secondary" className="ml-2">
                      {finalMarks?.length || 0} students
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {marksLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : !finalMarks?.length ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No grades calculated yet. Click "Calculate Grades" to compute.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead className="text-right">Internal 1</TableHead>
                          <TableHead className="text-right">Internal 2</TableHead>
                          <TableHead className="text-right">Best Internal</TableHead>
                          <TableHead className="text-right">External</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">%</TableHead>
                          <TableHead className="text-center">Grade</TableHead>
                          <TableHead className="text-right">Points</TableHead>
                          <TableHead className="text-center">Feedback</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {finalMarks.map((mark: any) => (
                          <TableRow key={mark.id}>
                            <TableCell className="font-medium">
                              {getStudentName(mark.studentId || mark.student_id)}
                            </TableCell>
                            <TableCell className="text-right">{mark.internal1 || mark.internal_1}</TableCell>
                            <TableCell className="text-right">{mark.internal2 || mark.internal_2}</TableCell>
                            <TableCell className="text-right font-medium">{mark.bestInternal || mark.best_internal}</TableCell>
                            <TableCell className="text-right">{mark.externalMarks || mark.external_marks}</TableCell>
                            <TableCell className="text-right font-medium">{mark.totalMarks || mark.total_marks}</TableCell>
                            <TableCell className="text-right">{mark.percentage}%</TableCell>
                            <TableCell className="text-center">
                              <Badge variant={getGradeBadgeVariant(mark.grade || 'F')}>
                                {mark.grade || 'F'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{mark.gradePoint || mark.grade_point}</TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openFeedbackDialog(mark)}
                                title={mark.feedback ? "Edit Feedback" : "Add Feedback"}
                              >
                                <MessageSquare className={`w-4 h-4 ${mark.feedback ? 'text-primary fill-primary/20' : 'text-muted-foreground'}`} />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="rules" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Grading Scale</CardTitle>
                <CardDescription>Default grading rules applied to all departments</CardDescription>
              </CardHeader>
              <CardContent>
                {rulesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Grade</TableHead>
                        <TableHead>Percentage Range</TableHead>
                        <TableHead>Grade Points</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gradingRules?.map((rule: any) => (
                        <TableRow key={rule.id}>
                          <TableCell>
                            <Badge variant={getGradeBadgeVariant(rule.grade)}>
                              {rule.grade}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {rule.minPercentage || rule.min_percentage}% - {rule.maxPercentage || rule.max_percentage}%
                          </TableCell>
                          <TableCell>{rule.gradePoint || rule.grade_point}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Student Feedback</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm font-medium mb-2">
                Remarks for {getStudentName(selectedMark?.studentId || selectedMark?.student_id)}
              </p>
              <Textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Enter performance feedback, strengths, and areas for improvement..."
                className="h-32"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFeedbackOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveFeedback} disabled={isSavingFeedback}>
                {isSavingFeedback && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Save className="w-4 h-4 mr-2" />
                Save Feedback
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthenticatedLayout>
  );
}
