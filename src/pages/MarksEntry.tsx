import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams } from 'react-router-dom';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { MarksEntryGrid } from '@/components/marks/MarksEntryGrid';
import { ExamStructureBuilder as ExamStructureBuilderOld } from '@/components/marks/ExamStructureBuilder';
import { ExamStructureBuilderNew as ExamStructureBuilder } from '@/components/marks/ExamStructureBuilderNew';
import { CSVUploadDialog } from '@/components/marks/CSVUploadDialog';
import { 
  useTeacherExams, 
  useExamDetails, 
  useExamStudents, 
  useStudentMarks,
  useSaveMarks,
  usePublishExam,
  useUnlockExam,
  useCreateExamStructure
} from '@/hooks/useExams';
import { useCourseOutcomes } from '@/hooks/useCourseOutcomes';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Upload } from 'lucide-react';

export default function MarksEntry() {
  const { role } = useAuth();
  const [searchParams] = useSearchParams();
  const examFromUrl = searchParams.get('exam');
  const [selectedExamId, setSelectedExamId] = useState<string | null>(examFromUrl);
  const [isCSVDialogOpen, setIsCSVDialogOpen] = useState(false);

  useEffect(() => {
    if (examFromUrl) {
      setSelectedExamId(examFromUrl);
    }
  }, [examFromUrl]);

  const { data: exams, isLoading: examsLoading } = useTeacherExams();
  const { data: examDetails, isLoading: detailsLoading } = useExamDetails(selectedExamId);
  const { data: students, isLoading: studentsLoading } = useExamStudents(examDetails?.exam?.cohortId ?? null);
  const { data: existingMarks, isLoading: marksLoading } = useStudentMarks(selectedExamId);
  const { outcomes: courseOutcomes, isLoading: cosLoading } = useCourseOutcomes(examDetails?.exam?.subjectId ?? null);

  const saveMarksMutation = useSaveMarks();
  const publishExamMutation = usePublishExam();
  const unlockExamMutation = useUnlockExam();
  const createStructureMutation = useCreateExamStructure();

  const selectedExam = exams?.find(e => e.id === selectedExamId);

  // Transform sub-questions for the grid
  const subQuestionsForGrid = useMemo(() => {
    if (!examDetails?.subQuestions || !examDetails?.questions || !examDetails?.sections) return [];
    
    // Sort sections by sequence
    const sortedSections = [...examDetails.sections].sort((a, b) => a.sequence - b.sequence);
    
    let globalQuestionNumber = 1;
    const sectionQuestionNumbers = new Map<string, number>();
    
    // Build question number mapping
    sortedSections.forEach(section => {
      const sectionQuestions = examDetails.questions
        .filter(q => q.section_id === section.id)
        .sort((a, b) => a.sequence - b.sequence);
      
      sectionQuestions.forEach(question => {
        sectionQuestionNumbers.set(question.id, globalQuestionNumber);
        globalQuestionNumber++;
      });
    });
    
    return examDetails.subQuestions.map(sq => {
      const questionNumber = sectionQuestionNumbers.get(sq.question_id) || 0;
      const calculatedLabel = `${questionNumber}${sq.label}`;
      console.log(`[DEBUG] SubQ ${sq.id.substring(0,8)}: Q#${questionNumber} + "${sq.label}" = "${calculatedLabel}"`);
      
      return {
        id: sq.id,
        label: calculatedLabel, // e.g., "1a", "1b", "2a"
        maxMarks: sq.max_marks,
        questionId: sq.question_id,
      };
    });
  }, [examDetails]);

  // Transform existing structure for the builder
  const initialSections = useMemo(() => {
    if (!examDetails?.sections) return undefined;
    
    return examDetails.sections.map(section => ({
      id: section.id,
      name: section.name,
      sequence: section.sequence,
      maxMarks: section.max_marks,
      requiredQuestions: section.required_questions,
      selectionMode: section.selection_mode as 'FIRST_N' | 'BEST_N',
      questions: examDetails.questions
        .filter(q => q.section_id === section.id)
        .map(question => ({
          id: question.id,
          sequence: question.sequence,
          maxMarks: question.max_marks,
          bloomLevel: question.bloom_level,
          coId: question.co_id,
          isOptional: question.is_optional,
          subQuestions: examDetails.subQuestions
            .filter(sq => sq.question_id === question.id)
            .map(sq => ({
              id: sq.id,
              label: sq.label,
              maxMarks: sq.max_marks,
              bloomLevel: sq.bloom_level,
              coId: sq.co_id,
            })),
        })),
    }));
  }, [examDetails]);

  const handleSaveMarks = async (marks: Array<{ studentId: string; subQuestionId: string; marks: number }>) => {
    if (!selectedExamId) return;
    await saveMarksMutation.mutateAsync({ examId: selectedExamId, marks });
  };

  const handlePublish = async () => {
    if (!selectedExamId) return;
    await publishExamMutation.mutateAsync(selectedExamId);
  };

  const handleUnlock = async () => {
    if (!selectedExamId) return;
    await unlockExamMutation.mutateAsync(selectedExamId);
  };

  const handleSaveStructure = async (sections: any[]) => {
    if (!selectedExamId) return;
    
    const transformedSections = sections.map((section, idx) => ({
      name: section.name,
      sequence: idx + 1,
      maxMarks: section.questions.reduce((sum: number, q: any) => 
        sum + q.subQuestions.reduce((sqSum: number, sq: any) => sqSum + sq.maxMarks, 0), 0
      ),
      selectionMode: section.selectionMode,
      requiredQuestions: section.requiredQuestions,
      questions: section.questions.map((q: any, qIdx: number) => ({
        sequence: qIdx + 1,
        maxMarks: q.subQuestions.reduce((sum: number, sq: any) => sum + sq.maxMarks, 0),
        bloomLevel: q.bloomLevel,
        coId: q.coId,
        isOptional: q.isOptional,
        subQuestions: q.subQuestions.map((sq: any) => ({
          label: sq.label,
          maxMarks: sq.maxMarks,
          bloomLevel: sq.bloomLevel,
          coId: sq.coId,
        })),
      })),
    }));

    await createStructureMutation.mutateAsync({ 
      examId: selectedExamId, 
      sections: transformedSections 
    });
  };

  const isLoading = examsLoading || detailsLoading || studentsLoading || marksLoading || cosLoading;
  const isPublished = examDetails?.exam?.status === 'PUBLISHED';

  return (
    <AuthenticatedLayout allowedRoles={['teacher', 'hod', 'principal']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Marks Entry</h2>
            <p className="text-muted-foreground">Create exam structure and enter student marks</p>
          </div>
          <div className="flex items-center gap-3">
            <Select 
              value={selectedExamId || ''} 
              onValueChange={(value) => setSelectedExamId(value || null)}
            >
              <SelectTrigger className="w-80">
                <SelectValue placeholder="Select an exam" />
              </SelectTrigger>
              <SelectContent>
                {exams?.map(exam => (
                  <SelectItem key={exam.id} value={exam.id}>
                    {exam.subject?.code} - {exam.subject?.name} ({exam.exam_type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!selectedExamId ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              {examsLoading ? 'Loading exams...' : 
               exams?.length === 0 ? 'No exams assigned to you. Create an exam first.' :
               'Select an exam to start entering marks.'}
            </p>
          </Card>
        ) : isLoading ? (
          <Card className="p-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground mt-2">Loading exam details...</p>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {selectedExam?.subject?.name} ({selectedExam?.subject?.code})
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{selectedExam?.cohort?.name}</Badge>
                    <Badge variant={isPublished ? 'default' : 'secondary'}>
                      {selectedExam?.exam_type}
                    </Badge>
                    <Badge variant={isPublished ? 'default' : 'outline'}>
                      {isPublished ? 'Published' : 'Draft'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total Students</p>
                    <p className="font-semibold">{students?.length || 0}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Max Marks</p>
                    <p className="font-semibold">
                      {examDetails?.sections?.reduce((sum, section) => sum + (section.max_marks || 0), 0) || selectedExam?.max_marks || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Sections</p>
                    <p className="font-semibold">{examDetails?.sections?.length || 0}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Questions</p>
                    <p className="font-semibold">{examDetails?.questions?.length || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="structure" className="w-full">
              <TabsList>
                <TabsTrigger value="structure">Exam Structure</TabsTrigger>
                <TabsTrigger value="marks" disabled={subQuestionsForGrid.length === 0}>
                  Marks Entry
                </TabsTrigger>
              </TabsList>
              <TabsContent value="structure" className="mt-6">
                <ExamStructureBuilder
                  courseOutcomes={courseOutcomes || []}
                  initialSections={initialSections}
                  onSave={handleSaveStructure}
                  isLoading={detailsLoading || cosLoading}
                />
              </TabsContent>
              <TabsContent value="marks" className="mt-6">
                <div className="flex justify-end mb-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsCSVDialogOpen(true)}
                    disabled={subQuestionsForGrid.length === 0}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Bulk Upload CSV
                  </Button>
                </div>
                <MarksEntryGrid
                  students={students || []}
                  subQuestions={subQuestionsForGrid}
                  existingMarks={existingMarks || []}
                  onSave={handleSaveMarks}
                  onPublish={handlePublish}
                  onUnlock={handleUnlock}
                  isPublished={isPublished}
                  isSaving={saveMarksMutation.isPending}
                />
              </TabsContent>
            </Tabs>

            <CSVUploadDialog
              open={isCSVDialogOpen}
              onOpenChange={setIsCSVDialogOpen}
              examId={selectedExamId || ''}
              subQuestions={subQuestionsForGrid}
              onUploadComplete={() => {
                // Data refresh handled by CSVUploadDialog via queryClient
              }}
            />
          </>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
