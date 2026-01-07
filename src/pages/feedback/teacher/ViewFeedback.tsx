import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useFeedback } from '@/contexts/FeedbackContext';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { FeedbackForm } from '@/components/feedback/FeedbackForm';
import { TeacherStudentFeedback } from '@/types/feedback.types';
import { Loader2 } from 'lucide-react';

export default function ViewFeedback() {
  const { feedbackId } = useParams<{ feedbackId: string }>();
  const navigate = useNavigate();
  const { getFeedbackById } = useFeedback();
  const [feedback, setFeedback] = useState<TeacherStudentFeedback | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!feedbackId) {
      navigate('/feedback/teacher/assigned');
      return;
    }

    const loadFeedback = async () => {
      setIsLoading(true);
      const data = await getFeedbackById(feedbackId);
      if (data) {
        setFeedback(data);
      } else {
        navigate('/feedback/teacher/assigned');
      }
      setIsLoading(false);
    };

    loadFeedback();
  }, [feedbackId, getFeedbackById, navigate]);

  if (isLoading) {
    return (
      <AuthenticatedLayout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AuthenticatedLayout>
    );
  }

  if (!feedback) {
    return null;
  }

  return (
    <AuthenticatedLayout>
      <div className="max-w-4xl mx-auto">
        <FeedbackForm mode="view" feedback={feedback} />
      </div>
    </AuthenticatedLayout>
  );
}
