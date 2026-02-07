import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams } from 'react-router-dom';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { ExamStructureBuilder } from '@/components/marks/ExamStructureBuilder';
import { MarksEntryGrid } from '@/components/marks/MarksEntryGrid';
import { useExams } from '@/hooks/useExams';
import { useCourseOutcomes } from '@/hooks/useCourseOutcomes';
import { examsApi, marksApi, enrollmentsApi } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function MarksEntry() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const examFromUrl = searchParams.get('exam');
  const [selectedExamId, setSelectedExamId] = useState<string | null>(examFromUrl);

  useEffect(() => {
    if (examFromUrl) {
      setSelectedExamId(examFromUrl);
    }
  }, [examFromUrl]);

  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'marks');

  useEffect(() => {
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  // Fetch exams
  const { exams, isLoading: examsLoading } = useExams();

  // Fetch exam details
  const { data: examDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['exam-details', selectedExamId],
    queryFn: () => examsApi.get(selectedExamId!),
    enabled: !!selectedExamId,
  });

  // Fetch students in cohort
  const { data: enrollments = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['enrollments', examDetails?.cohort_id],
    queryFn: () => enrollmentsApi.list({ cohort_id: examDetails?.cohort_id }),
    enabled: !!examDetails?.cohort_id,
  });

  // Fetch existing marks
  const { data: existingMarks = [], isLoading: marksLoading } = useQuery({
    queryKey: ['exam-marks', selectedExamId],
    queryFn: () => marksApi.getExamMarks(selectedExamId!),
    enabled: !!selectedExamId,
  });

  // Fetch course outcomes
  const { data: courseOutcomes = [] } = useCourseOutcomes(examDetails?.subject_id);

  // Save exam structure mutation
  const saveStructureMutation = useMutation({
    mutationFn: (sections: any[]) => examsApi.updateStructure(selectedExamId!, sections),
    onSuccess: () => {
      toast({ title: 'Exam structure saved' });
      queryClient.invalidateQueries({ queryKey: ['exam-details', selectedExamId] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error saving structure',
        description: error.response?.data?.detail || 'Failed to save structure',
        variant: 'destructive',
      });
    },
  });

  // Save marks mutation
  const saveMarksMutation = useMutation({
    mutationFn: (marks: Array<{ studentId: string; subQuestionId: string; marks: number }>) => {
      const formatted = marks.map(m => ({
        student_id: m.studentId,
        sub_question_id: m.subQuestionId,
        marks: m.marks,
      }));
      return marksApi.saveMarks(selectedExamId!, formatted);
    },
    onSuccess: () => {
      toast({ title: 'Marks saved successfully' });
      queryClient.invalidateQueries({ queryKey: ['exam-marks', selectedExamId] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error saving marks',
        description: error.response?.data?.detail || 'Failed to save marks',
        variant: 'destructive',
      });
    },
  });

  // Publish exam mutation
  const publishMutation = useMutation({
    mutationFn: () => examsApi.publish(selectedExamId!),
    onSuccess: () => {
      toast({ title: 'Exam published successfully' });
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      queryClient.invalidateQueries({ queryKey: ['exam-details', selectedExamId] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error publishing exam',
        description: error.response?.data?.detail || 'Failed to publish exam',
        variant: 'destructive',
      });
    },
  });

  const selectedExam = exams?.find((e: any) => e.id === selectedExamId);
  const sections = examDetails?.sections || [];
  const isLoading = examsLoading || detailsLoading;

  // Extract sub-questions from exam structure for the grid
  const subQuestions = useMemo(() => {
    const sqs: Array<{ id: string; label: string; maxMarks: number; questionId: string }> = [];
    sections.forEach((section: any, sIdx: number) => {
      section.questions?.forEach((question: any, qIdx: number) => {
        question.sub_questions?.forEach((sq: any) => {
          sqs.push({
            id: sq.id,
            label: `${sIdx + 1}.${qIdx + 1}${sq.label}`,
            maxMarks: sq.max_marks,
            questionId: question.id,
          });
        });
      });
    });
    return sqs;
  }, [sections]);

  // Transform enrollments to the format expected by MarksEntryGrid
  const students = useMemo(() => {
    return enrollments.map((e: any) => ({
      studentId: e.student_id,
      studentName: e.student?.full_name || 'Student',
      rollNumber: e.roll_number,
    }));
  }, [enrollments]);

  // Transform existing marks to the format expected by MarksEntryGrid
  const formattedMarks = useMemo(() => {
    return (existingMarks || []).map((m: any) => ({
      student_id: m.student_id,
      sub_question_id: m.sub_question_id,
      marks: m.marks,
    }));
  }, [existingMarks]);

  return (
    <AuthenticatedLayout allowedRoles={['principal', 'hod', 'teacher']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Marks Entry</h2>
            <p className="text-muted-foreground">Enter and manage examination marks</p>
          </div>
        </div>

        {/* Exam Selector */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <label className="font-medium">Select Exam:</label>
              <Select value={selectedExamId || ''} onValueChange={setSelectedExamId}>
                <SelectTrigger className="w-96">
                  <SelectValue placeholder="Select an exam" />
                </SelectTrigger>
                <SelectContent>
                  {exams?.map((exam: any) => (
                    <SelectItem key={exam.id} value={exam.id}>
                      {exam.subject?.code || 'Subject'} - {exam.exam_type} ({exam.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedExam && (
                <Badge variant={selectedExam.status === 'published' ? 'default' : 'outline'}>
                  {selectedExam.status}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {isLoading && selectedExamId ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : selectedExamId && examDetails ? (

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="marks">Enter Marks</TabsTrigger>
              <TabsTrigger value="structure">Exam Structure</TabsTrigger>
            </TabsList>

            <TabsContent value="marks" className="space-y-4">
              {sections.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground mb-4">
                      No exam structure defined yet.
                    </p>
                    <Button onClick={() => setActiveTab('structure')}>
                        Create Question Paper
                    </Button>
                  </CardContent>
                </Card>
              ) : studentsLoading || marksLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <MarksEntryGrid
                  students={students}
                  subQuestions={subQuestions}
                  existingMarks={formattedMarks}
                  onSave={async (data) => {
                    await saveMarksMutation.mutateAsync(data);
                  }}
                  onPublish={async () => {
                    await publishMutation.mutateAsync();
                  }}
                  isSaving={saveMarksMutation.isPending}
                  isPublished={selectedExam?.status === 'published'}
                />
              )}
            </TabsContent>

            <TabsContent value="structure">
              <ExamStructureBuilder
                courseOutcomes={courseOutcomes}
                initialSections={sections}
                onSave={async (sections) => {
                  await saveStructureMutation.mutateAsync(sections);
                }}
                isLoading={saveStructureMutation.isPending}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Select an exam to enter marks</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
