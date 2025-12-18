import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface COAttainmentData {
  co: string;
  attainment: number;
  target: number;
  description?: string;
}

export interface BloomDistribution {
  level: string;
  count: number;
  percentage: number;
}

export interface SubjectPerformance {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  average: number;
  highest: number;
  lowest: number;
  passRate: number;
  totalStudents: number;
}

export function useCOAttainment(subjectId: string | null) {
  return useQuery({
    queryKey: ['co-attainment', subjectId],
    queryFn: async () => {
      if (!subjectId) return [];
      const { data } = await api.get(`/analytics/co-attainment/${subjectId}`);
      return data;
    },
    enabled: !!subjectId,
  });
}

export function useBloomDistribution(examId: string | null) {
  return useQuery({
    queryKey: ['bloom-distribution', examId],
    queryFn: async () => {
      if (!examId) return [];
      const { data } = await api.get(`/analytics/bloom-distribution/${examId}`);
      return data;
    },
    enabled: !!examId,
  });
}

export function useSubjectPerformance(cohortId: string | null) {
  return useQuery({
    queryKey: ['subject-performance', cohortId],
    queryFn: async () => {
      if (!cohortId) return [];
      const { data } = await api.get(`/analytics/subject-performance/${cohortId}`);
      return data;
    },
    enabled: !!cohortId,
  });
}

export function useDepartmentStats() {
  return useQuery({
    queryKey: ['department-stats'],
    queryFn: async () => {
      const { data } = await api.get('/analytics/department-stats');
      return data;
    },
  });
}
