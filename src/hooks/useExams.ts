import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { examsApi, marksApi } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

export interface Exam {
  id: string;
  subject_id: string;
  cohort_id: string;
  exam_type: string;
  max_marks: number;
  status: string;
  created_at: string;
  created_by: string;
  subject?: { name: string; code: string };
  cohort?: { name: string };
}

export interface ExamSection {
  id: string;
  section_name: string;
  required_questions: number;
  total_questions: number;
  questions: ExamQuestion[];
}

export interface ExamQuestion {
  id: string;
  question_number: string;
  max_marks: number;
  sub_questions: SubQuestion[];
}

export interface SubQuestion {
  id: string;
  sub_question_label: string;
  max_marks: number;
  co_id?: string;
  bloom_level?: string;
}

export function useExams(params?: { subject_id?: string; cohort_id?: string; status_filter?: string }) {
  const queryClient = useQueryClient();

  const { data: exams = [], isLoading, error } = useQuery({
    queryKey: ['exams', params],
    queryFn: () => examsApi.list(params),
  });

  const createExamMutation = useMutation({
    mutationFn: (data: { subject_id: string; cohort_id: string; exam_type: string; max_marks: number }) =>
      examsApi.create(data),
    onSuccess: () => {
      toast({ title: 'Exam created successfully' });
      queryClient.invalidateQueries({ queryKey: ['exams'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating exam',
        description: error.response?.data?.detail || 'Failed to create exam',
        variant: 'destructive',
      });
    },
  });

  const updateStructureMutation = useMutation({
    mutationFn: ({ examId, sections }: { examId: string; sections: any[] }) =>
      examsApi.updateStructure(examId, sections),
    onSuccess: () => {
      toast({ title: 'Exam structure saved' });
      queryClient.invalidateQueries({ queryKey: ['exams'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error saving structure',
        description: error.response?.data?.detail || 'Failed to save exam structure',
        variant: 'destructive',
      });
    },
  });

  const publishExamMutation = useMutation({
    mutationFn: (examId: string) => examsApi.publish(examId),
    onSuccess: () => {
      toast({ title: 'Exam published successfully' });
      queryClient.invalidateQueries({ queryKey: ['exams'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error publishing exam',
        description: error.response?.data?.detail || 'Failed to publish exam',
        variant: 'destructive',
      });
    },
  });

  const saveMarksMutation = useMutation({
    mutationFn: ({ examId, marks }: { examId: string; marks: Array<{ student_id: string; sub_question_id: string; marks: number }> }) =>
      marksApi.saveMarks(examId, marks),
    onSuccess: () => {
      toast({ title: 'Marks saved successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error saving marks',
        description: error.response?.data?.detail || 'Failed to save marks',
        variant: 'destructive',
      });
    },
  });

  const computeMarksMutation = useMutation({
    mutationFn: (examId: string) => marksApi.computeMarks(examId),
    onSuccess: () => {
      toast({ title: 'Marks computed successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error computing marks',
        description: error.response?.data?.detail || 'Failed to compute marks',
        variant: 'destructive',
      });
    },
  });

  return {
    exams,
    isLoading,
    error,
    createExam: createExamMutation.mutate,
    isCreating: createExamMutation.isPending,
    updateStructure: updateStructureMutation.mutate,
    isSavingStructure: updateStructureMutation.isPending,
    publishExam: publishExamMutation.mutate,
    isPublishing: publishExamMutation.isPending,
    saveMarks: saveMarksMutation.mutate,
    isSavingMarks: saveMarksMutation.isPending,
    computeMarks: computeMarksMutation.mutate,
    isComputing: computeMarksMutation.isPending,
    getExam: (id: string) => examsApi.get(id),
    getExamMarks: (examId: string) => marksApi.getExamMarks(examId),
  };
}
