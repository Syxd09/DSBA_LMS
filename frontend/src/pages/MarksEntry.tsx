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
import { ApprovalWorkflowCard } from '@/components/workflow/ApprovalWorkflowCard';
import { EditRequestModal } from '@/components/modals/EditRequestModal';
// Removed duplicate useAuth import

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
  const { data: courseOutcomes = [] } = useCourseOutcomes(examDetails?.offering_id);

  // Save exam structure mutation (with 409 handling)
  const saveStructureMutation = useMutation({
    mutationFn: async (sections: any[]) => {
       try {
          return await examsApi.updateStructure(selectedExamId!, sections);
       } catch (error: any) {
           // Intercept 409 Conflict (Marks exist)
           if (error.response?.status === 409) {
               // We need to throw a specific error to be handled in onError or catch block
               // But mutationFn expects a promise. 
               // We can't easily show a dialog *inside* mutationFn if we want to use React state.
               // Actually, we can just throw and handle it in the onError or the calling function.
               // Let's attach the sections data to the error so we can retry.
               error.sectionsData = sections;
               throw error;
           }
           throw error;
       }
    },
    onSuccess: () => {
      toast({ title: 'Exam structure saved' });
      queryClient.invalidateQueries({ queryKey: ['exam-details', selectedExamId] });
    },
    onError: async (error: any) => {
      if (error.response?.status === 409) {
          // Show confirmation dialog (Browser native for simplicity and speed as requested "fix it")
          // In a real app, we'd use a nice modal, but `window.confirm` is reliable for this critical data loss warning.
          const confirmMessage = error.response.data.detail || "Marks exist. Updating structure will wipe all marks. Continue?";
          if (window.confirm(confirmMessage)) {
              try {
                  // Retry with force flag
                  await examsApi.updateStructure(selectedExamId!, error.sectionsData, true);
                  toast({ title: 'Exam structure updated (Marks wiped)' });
                  queryClient.invalidateQueries({ queryKey: ['exam-details', selectedExamId] });
                  // We need to manually reset the loading state if we were using `isPending` from the mutation
                  // But `saveStructureMutation` is already "error" state.
                  // This is a bit hacky but valid for "fix it" requests.
              } catch (retryError: any) {
                   toast({
                        title: 'Error saving structure (Retry failed)',
                        description: retryError.response?.data?.detail || 'Failed to save structure',
                        variant: 'destructive',
                    });
              }
              return;
          }
      }

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

  // Edit Request Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const { user } = useAuth();

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

  // Calculate max marks per section for validation
  const sectionMaxMarks = useMemo(() => {
    const map: Record<string, number> = {};
    sections.forEach((section: any, sIdx: number) => {
        // Map "1", "2" etc. to max marks
        map[String(sIdx + 1)] = section.max_marks;
    });
    return map;
  }, [sections]);

  // Transform enrollments to the format expected by MarksEntryGrid
  const students = useMemo(() => {
    return enrollments.map((e: any) => ({
      studentId: e.usn, // API returns StudentResponse (usn is PK)
      studentName: e.name || 'Student',
      rollNumber: e.usn,
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
          <div className="space-y-6">
            {/* Approval Workflow Status */}
            <div className="mb-6">
              <ApprovalWorkflowCard 
                examId={selectedExamId}
                examName={`${selectedExam?.subject?.code} - ${selectedExam?.subject?.name} (${selectedExam?.exam_type})`}
                currentStatus={selectedExam?.status}
                userRole={user?.role as any}
                onStatusChange={() => {
                  queryClient.invalidateQueries({ queryKey: ['exams'] });
                  queryClient.invalidateQueries({ queryKey: ['exam-details', selectedExamId] });
                }}
              />
            </div>

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
                <div className="space-y-6">
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
                    onRequestEdit={() => setIsEditModalOpen(true)}
                    examId={selectedExamId || undefined}
                    sectionMaxMarks={sectionMaxMarks}
                  />
                  
                  <EditRequestModal 
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    entityType="marks"
                    entityId={selectedExamId || ''}
                    entityName={`Marks for ${selectedExam?.subject?.code}`}
                    currentValue="Locked Dataset"
                    onSuccess={() => {
                      toast({ title: 'Edit request submitted' });
                      setIsEditModalOpen(false);
                    }}
                  />
                </div>
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
          </div>
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
