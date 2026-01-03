import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useTeacherExams, useCreateExam } from '@/hooks/useExams';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, ClipboardList, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { ExamTabs } from '@/components/exams/ExamTabs';
import { ExamCard } from '@/components/exams/ExamCard';
import { ExamWizard } from '@/components/exams/ExamWizard';
import { FeedbackStats } from '@/components/FeedbackStats';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TabsContent } from '@/components/ui/tabs';

interface Exam {
  id: string;
  examType: string;
  customTypeName?: string;
  maxMarks: number;
  passingMarks?: number;
  examDate?: string;
  duration?: number;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  subject?: { name: string; code: string };
  cohort?: { name: string; year: number };
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface Cohort {
  id: string;
  name: string;
  year: number;
}

export default function Exams() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('drafts');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [viewFeedback, setViewFeedback] = useState<string | null>(null);

  const { data: exams = [], isLoading, refetch } = useTeacherExams();
  const createExam = useCreateExam();

  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ['subjects-list'],
    queryFn: async () => {
      const { data } = await api.get('/subjects');
      return data || [];
    },
  });

  const { data: cohorts = [] } = useQuery<Cohort[]>({
    queryKey: ['cohorts-list'],
    queryFn: async () => {
      const { data } = await api.get('/cohorts');
      return data || [];
    },
  });

  const handleCreateExam = async (formData: any) => {
    try {
      await createExam.mutateAsync({
        ...formData,
        teacherId: user?.id,
      });

      toast({
        title: 'Exam created',
        description: 'Exam has been created successfully.',
      });

      setIsWizardOpen(false);
      refetch();
    } catch (error: any) {
      console.error('Error creating exam:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create exam.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Filter and organize exams by status
  const examsByStatus = {
    drafts: exams?.filter((e: Exam) => e.status === 'DRAFT') || [],
    scheduled: exams?.filter((e: Exam) => e.status === 'SCHEDULED') || [],
    published: exams?.filter((e: Exam) => e.status === 'PUBLISHED') || [],
    completed: exams?.filter((e: Exam) => e.status === 'COMPLETED') || []
  };

  // Apply search filter
  const filterExams = (examList: Exam[]) => {
    if (!searchQuery) return examList;
    return examList.filter((exam: Exam) =>
      exam.subject?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.subject?.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.cohort?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.examType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.customTypeName?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const currentExams = filterExams(examsByStatus[activeTab as keyof typeof examsByStatus]);

  const counts = {
    drafts: examsByStatus.drafts.length,
    scheduled: examsByStatus.scheduled.length,
    published: examsByStatus.published.length,
    completed: examsByStatus.completed.length
  };

  return (
    <AuthenticatedLayout allowedRoles={['admin', 'principal', 'hod', 'teacher']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Exams</h2>
            <p className="text-muted-foreground">Manage exams and evaluations</p>
          </div>
          <Button onClick={() => setIsWizardOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Exam
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search exams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <ExamTabs activeTab={activeTab} onTabChange={setActiveTab} counts={counts} />

        <div className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : currentExams.length === 0 ? (
            <div className="py-12 text-center border border-border rounded-lg bg-muted/20">
              <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {searchQuery ? 'No exams found' : `No ${activeTab} exams`}
              </h3>
              <p className="text-muted-foreground">
                {searchQuery ? 'Try adjusting your search' : 'Create your first exam to get started.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentExams.map((exam: Exam) => (
                <ExamCard
                  key={exam.id}
                  exam={exam}
                  onEdit={(id) => navigate(`/marks-entry?exam=${id}`)}
                  onView={(id) => navigate(`/marks-entry?exam=${id}`)}
                  onViewFeedback={setViewFeedback}
                />
              ))}
            </div>
          )}
        </div>

        <ExamWizard
          open={isWizardOpen}
          onOpenChange={setIsWizardOpen}
          subjects={subjects}
          cohorts={cohorts}
          onSubmit={handleCreateExam}
          isSubmitting={createExam.isPending}
        />

        <Dialog open={!!viewFeedback} onOpenChange={(open) => !open && setViewFeedback(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Feedback Statistics</DialogTitle>
            </DialogHeader>
            <FeedbackStats examId={viewFeedback} />
          </DialogContent>
        </Dialog>
      </div>
    </AuthenticatedLayout>
  );
}
