import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { FeedbackForm } from '@/components/feedback/FeedbackForm';
import { Loader2 } from 'lucide-react';

interface Student {
  id: string;
  fullName: string;
}

interface Subject {
  id: string;
  name: string;
  semester: number;
}

export default function CreateFeedback() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();

  // Fetch student details
  const { data: student, isLoading: studentLoading } = useQuery<Student>({
    queryKey: ['student', studentId],
    queryFn: async () => {
      const { data } = await api.get(`/users/${studentId}`);
      return data;
    },
    enabled: !!studentId,
  });

  // Fetch teacher's subjects
  const { data: subjects = [], isLoading: subjectsLoading } = useQuery<Subject[]>({
    queryKey: ['teacher-subjects'],
    queryFn: async () => {
      const { data } = await api.get('/subjects');
      return data || [];
    },
  });

  if (!studentId) {
    navigate('/feedback/teacher/assigned');
    return null;
  }

  if (studentLoading || subjectsLoading) {
    return (
      <AuthenticatedLayout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AuthenticatedLayout>
    );
  }

  // For simplicity, use first subject and its semester/cohort
  // In production, this would be a form selection
  const defaultSubject = subjects[0];

  return (
    <AuthenticatedLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Create Feedback</h1>
          {student && (
            <p className="text-muted-foreground">For student: {student.fullName}</p>
          )}
        </div>
        <FeedbackForm
          mode="create"
          studentId={studentId}
          subjectId={defaultSubject?.id}
          semester={defaultSubject?.semester}
          cohortId={undefined} // Would come from enrollment
        />
      </div>
    </AuthenticatedLayout>
  );
}
