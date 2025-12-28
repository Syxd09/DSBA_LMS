import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useTeacherExams, useCreateExam } from '@/hooks/useExams';
import { useQuery } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, ClipboardList, Loader2, FileEdit, Eye, BarChart } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { FeedbackStats } from '@/components/FeedbackStats';

interface Exam {
  id: string;
  examType: string;
  maxMarks: number;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  subjectId: string;
  cohortId: string;
  teacherId: string | null;
  subject?: {
    name: string;
    code: string;
  };
  cohort?: {
    name: string;
    year: number;
  };
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
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewFeedback, setViewFeedback] = useState<string | null>(null);
  const [newExam, setNewExam] = useState({
    subjectId: '',
    cohortId: '',
    examType: 'internal1',
    maxMarks: 30,
  });
  
  const { data: exams, isLoading } = useTeacherExams();
  const createExam = useCreateExam();

  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ['subjects-list'],
    queryFn: async () => {
      const { data } = await api.get('/subjects'); // Assuming /subjects endpoint exists, reused from assignments
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

  const handleCreateExam = async () => {
    if (!newExam.subjectId || !newExam.cohortId) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createExam.mutateAsync({
        subjectId: newExam.subjectId,
        cohortId: newExam.cohortId,
        examType: newExam.examType,
        maxMarks: newExam.maxMarks,
        teacherId: user?.id,
        status: 'draft',
      });

      toast({
        title: 'Exam created',
        description: 'Exam has been created successfully.',
      });

      setIsDialogOpen(false);
      setNewExam({ subjectId: '', cohortId: '', examType: 'internal1', maxMarks: 30 });
    } catch (error: any) {
      console.error('Error creating exam:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create exam.',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'published':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Published</Badge>;
      case 'locked':
        return <Badge variant="secondary">Locked</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredExams = exams?.filter((exam: any) =>
    exam.subject?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exam.subject?.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exam.cohort?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <AuthenticatedLayout allowedRoles={['admin', 'principal', 'hod', 'teacher']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Exams</h2>
            <p className="text-muted-foreground">Manage exams and evaluations</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Exam
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Exam</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select
                    value={newExam.subjectId}
                    onValueChange={(value) => setNewExam({ ...newExam, subjectId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.code} - {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cohort</Label>
                  <Select
                    value={newExam.cohortId}
                    onValueChange={(value) => setNewExam({ ...newExam, cohortId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select cohort" />
                    </SelectTrigger>
                    <SelectContent>
                      {cohorts.map((cohort) => (
                        <SelectItem key={cohort.id} value={cohort.id}>
                          {cohort.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Exam Type</Label>
                    <Select
                      value={newExam.examType}
                      onValueChange={(value) => setNewExam({ ...newExam, examType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="internal1">Internal 1</SelectItem>
                        <SelectItem value="internal2">Internal 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Max Marks</Label>
                    <Input
                      type="number"
                      value={newExam.maxMarks}
                      onChange={(e) => setNewExam({ ...newExam, maxMarks: parseInt(e.target.value) || 30 })}
                      min={10}
                      max={100}
                    />
                  </div>
                </div>
                <Button className="w-full" onClick={handleCreateExam} disabled={createExam.isPending}>
                  {createExam.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Exam'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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

        <div className="border border-border bg-card">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredExams.length === 0 ? (
            <div className="py-12 text-center">
              <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No exams found</h3>
              <p className="text-muted-foreground">Create your first exam to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Cohort</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Max Marks</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExams.map((exam: any) => (
                  <TableRow key={exam.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{exam.subject?.name || '—'}</p>
                        <p className="text-sm text-muted-foreground">{exam.subject?.code}</p>
                      </div>
                    </TableCell>
                    <TableCell>{exam.cohort?.name || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {exam.examType?.replace('internal', 'Internal ') || exam.examType}
                      </Badge>
                    </TableCell>
                    <TableCell>{exam.maxMarks}</TableCell>
                    <TableCell>{getStatusBadge(exam.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {exam.status === 'draft' ? (
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/marks-entry?exam=${exam.id}`)}>
                            <FileEdit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                        ) : (
                          <div className="flex gap-2">
                             <Button variant="ghost" size="sm">
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setViewFeedback(exam.id)}>
                                <BarChart className="w-4 h-4 mr-1" />
                                Feedback
                              </Button>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

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
