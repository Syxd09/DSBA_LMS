import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from './useAuth';

export interface Exam {
  id: string;
  subjectId: string;
  cohortId: string;
  examType: string;
  maxMarks: number;
  status: string;
  semester: number;
  teacherId: string | null;
  createdAt: string;
  publishedAt: string | null;
  customTypeName?: string;
  examDate?: string;
  duration?: number;
  subject?: {
    id: string;
    name: string;
    code: string;
  };
  cohort?: {
    id: string;
    name: string;
    year?: number;
  };
}

// ... Interfaces for Section, Question etc. can remain if they match response shape
// Or we might need to adjust them if Prisma response is CamelCase but frontend expects snake_case.
// Prisma defaults to camelCase for fields usually, but our DB schema uses camelCase for models but fields? 
// In schema.prisma: `subjectId`, `examType`.
// In frontend types (legacy): `subject_id`, `exam_type`.
// Backend returns standard JSON from Prisma object.
// We need to map or update interfaces.
// Let's type carefully.

export function useTeacherExams() {
  const { user } = useAuth();

  return useQuery<Exam[]>({
    queryKey: ['teacher-exams', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await api.get('/exams');
      return data;
    },
    enabled: !!user?.id,
  });
}

export function useExamDetails(examId: string | null) {
  return useQuery({
    queryKey: ['exam-details', examId],
    queryFn: async () => {
      if (!examId) return null;
      const { data } = await api.get(`/exams/${examId}`);
      return {
        exam: data,
        sections: data.sections || [],
        questions: data.sections?.flatMap((s: any) => s.questions) || [],
        subQuestions: data.sections?.flatMap((s: any) => s.questions.flatMap((q: any) => q.subQuestions)) || []
      };
      // Note: The previous hook returned flat arrays. Our backend structure is nested.
      // We might need to flatten it here to match component expectation OR refactor component.
      // Component MarksEntry.tsx uses `examDetails.subQuestions`.
      // The backend `getExamDetails` returns nested structure (exam -> sections -> questions -> subQuestions).
      // So I am flattening it here to preserve component compatibility.
    },
    enabled: !!examId,
  });
}

export function useExamStudents(examId: string | null) {
  return useQuery({
    queryKey: ['exam-students', examId],
    queryFn: async () => {
      if (!examId) return [];
      const { data } = await api.get(`/exams/${examId}/students`);
      return data;
    },
    enabled: !!examId
  });
}

export function useStudentMarks(examId: string | null) {
  return useQuery({
    queryKey: ['student-marks', examId],
    queryFn: async () => {
      if (!examId) return [];
      const { data } = await api.get(`/marks/${examId}`);
      return data;
    },
    enabled: !!examId,
  });
}

export function useSaveMarks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      examId,
      marks
    }: {
      examId: string;
      marks: Array<{ studentId: string; subQuestionId: string; marks: number }>
    }) => {
      await api.post('/marks/save', { examId, marks });
    },
    onSuccess: (_, { examId }) => {
      queryClient.invalidateQueries({ queryKey: ['student-marks', examId] });
    },
  });
}

export function usePublishExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (examId: string) => {
      const { data } = await api.post(`/exams/${examId}/publish`);
      return data;
    },
    onSuccess: (_, examId) => {
      queryClient.invalidateQueries({ queryKey: ['exam-details', examId] });
      queryClient.invalidateQueries({ queryKey: ['teacher-exams'] });
    },
  });
}

export function useUnlockExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (examId: string) => {
      const { data } = await api.post(`/exams/${examId}/unlock`);
      return data;
    },
    onSuccess: (_, examId) => {
      queryClient.invalidateQueries({ queryKey: ['exam-details', examId] });
      queryClient.invalidateQueries({ queryKey: ['teacher-exams'] });
    },
  });
}

export function useCreateExamStructure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ examId, sections }: { examId: string, sections: any[] }) => {
      await api.post(`/exams/${examId}/structure`, { sections });
    },
    onSuccess: (_, { examId }) => {
      queryClient.invalidateQueries({ queryKey: ['exam-details', examId] });
    }
  });
}

export function useCreateExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const { data: result } = await api.post('/exams', data);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-exams'] });
    },
  });
}
