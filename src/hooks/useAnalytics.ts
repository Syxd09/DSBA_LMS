import { useQuery } from '@tanstack/react-query';
import { analyticsApi, subjectsApi } from '@/lib/api';

export interface COAttainmentData {
  co_number: number;
  description: string;
  attainment: number;
  target: number;
}

export interface BloomDistribution {
  level: string;
  count: number;
  percentage: number;
}

export interface SubjectPerformance {
  subject_id: string;
  subject_name: string;
  subject_code: string;
  average: number;
  pass_rate: number;
  total_students: number;
}

export function useAnalytics() {
  const getCOAttainment = (subjectId: string) => {
    return useQuery({
      queryKey: ['co-attainment', subjectId],
      queryFn: () => analyticsApi.getCOAttainment(subjectId),
      enabled: !!subjectId,
    });
  };

  const getBloomDistribution = (examId: string) => {
    return useQuery({
      queryKey: ['bloom-distribution', examId],
      queryFn: () => analyticsApi.getBloomDistribution(examId),
      enabled: !!examId,
    });
  };

  const getSubjectPerformance = (cohortId: string) => {
    return useQuery({
      queryKey: ['subject-performance', cohortId],
      queryFn: () => analyticsApi.getSubjectPerformance(cohortId),
      enabled: !!cohortId,
    });
  };

  const getDepartmentStats = () => {
    return useQuery({
      queryKey: ['department-stats'],
      queryFn: () => analyticsApi.getDepartmentStats(),
    });
  };

  return {
    getCOAttainment,
    getBloomDistribution,
    getSubjectPerformance,
    getDepartmentStats,
  };
}

export function useCOAttainment(subjectId: string) {
  return useQuery({
    queryKey: ['co-attainment', subjectId],
    queryFn: () => analyticsApi.getCOAttainment(subjectId),
    enabled: !!subjectId,
  });
}

export function useBloomDistribution(examId: string) {
  return useQuery({
    queryKey: ['bloom-distribution', examId],
    queryFn: () => analyticsApi.getBloomDistribution(examId),
    enabled: !!examId,
  });
}

export function useSubjectPerformance(cohortId: string) {
  return useQuery({
    queryKey: ['subject-performance', cohortId],
    queryFn: () => analyticsApi.getSubjectPerformance(cohortId),
    enabled: !!cohortId,
  });
}
