import { useState } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useGradingRules, useFinalMarks, useCalculateGrades } from '@/hooks/useGrading';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, Award, Settings, Loader2, TrendingUp } from 'lucide-react';

export default function GradeManagement() {
  const [selectedCohort, setSelectedCohort] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  
  const { data: gradingRules, isLoading: rulesLoading } = useGradingRules();
  
  const { data: cohorts } = useQuery({
    queryKey: ['cohorts-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cohorts')
        .select('*, program:programs(name)')
        .order('year', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
  
  const { data: subjects } = useQuery({
    queryKey: ['subjects-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });
  
  const { data: finalMarks, isLoading: marksLoading, refetch: refetchMarks } = useFinalMarks({
    cohort_id: selectedCohort || undefined,
    subject_id: selectedSubject || undefined,
  });
  
  const { data: profiles } = useQuery({
    queryKey: ['student-profiles', finalMarks],
    queryFn: async () => {
      if (!finalMarks?.length) return [];
      const studentIds = [...new Set(finalMarks.map(m => m.student_id))];
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', studentIds);
      if (error) throw error;
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
    return profiles?.find(p => p.user_id === studentId)?.full_name || 'Unknown';
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
                      {cohorts?.map((cohort) => (
                        <SelectItem key={cohort.id} value={cohort.id}>
                          {cohort.name} ({cohort.program?.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects?.map((subject) => (
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
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {finalMarks.map((mark) => (
                          <TableRow key={mark.id}>
                            <TableCell className="font-medium">
                              {getStudentName(mark.student_id)}
                            </TableCell>
                            <TableCell className="text-right">{mark.internal_1}</TableCell>
                            <TableCell className="text-right">{mark.internal_2}</TableCell>
                            <TableCell className="text-right font-medium">{mark.best_internal}</TableCell>
                            <TableCell className="text-right">{mark.external_marks}</TableCell>
                            <TableCell className="text-right font-medium">{mark.total_marks}</TableCell>
                            <TableCell className="text-right">{mark.percentage}%</TableCell>
                            <TableCell className="text-center">
                              <Badge variant={getGradeBadgeVariant(mark.grade || 'F')}>
                                {mark.grade || 'F'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{mark.grade_point}</TableCell>
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
                      {gradingRules?.map((rule) => (
                        <TableRow key={rule.id}>
                          <TableCell>
                            <Badge variant={getGradeBadgeVariant(rule.grade)}>
                              {rule.grade}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {rule.min_percentage}% - {rule.max_percentage}%
                          </TableCell>
                          <TableCell>{rule.grade_point}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AuthenticatedLayout>
  );
}
