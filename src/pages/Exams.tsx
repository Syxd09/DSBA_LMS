import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { examsApi, subjectsApi, cohortsApi } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, ClipboardList, Loader2, FileEdit, Eye, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface Exam {
  id: string;
  exam_type: string;
  max_marks: number;
  status: string;
  published_at: string | null;
  created_at: string;
  subject_id: string;
  cohort_id: string;
  subject?: { name: string; code: string };
  cohort?: { name: string; year: number };
}

export default function Exams() {
  const { profile, role } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newExam, setNewExam] = useState({
    subject_id: '',
    cohort_id: '',
    exam_type: 'internal1',
    max_marks: 30,
  });

  const { data: exams = [], isLoading: examsLoading } = useQuery({
    queryKey: ['exams'],
    queryFn: () => examsApi.list(),
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => subjectsApi.list(),
  });

  const { data: cohorts = [] } = useQuery({
    queryKey: ['cohorts'],
    queryFn: () => cohortsApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: { subject_id: string; cohort_id: string; exam_type: string; max_marks: number }) =>
      examsApi.create(data),
    onSuccess: () => {
      toast({ title: 'Exam created successfully' });
      setIsDialogOpen(false);
      setNewExam({ subject_id: '', cohort_id: '', exam_type: 'internal1', max_marks: 30 });
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

  const publishMutation = useMutation({
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

  const handleCreateExam = () => {
    if (!newExam.subject_id || !newExam.cohort_id) {
      toast({
        title: 'Validation Error',
        description: 'Please select a subject and cohort.',
        variant: 'destructive',
      });
      return;
    }
    createMutation.mutate(newExam);
  };

  const filteredExams = exams.filter((exam: Exam) =>
    exam.subject?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exam.subject?.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exam.exam_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-500">Published</Badge>;
      case 'locked':
        return <Badge className="bg-blue-500">Locked</Badge>;
      default:
        return <Badge variant="outline">Draft</Badge>;
    }
  };

  const getExamTypeBadge = (type: string) => {
    switch (type) {
      case 'internal1':
        return <Badge variant="outline">Internal 1</Badge>;
      case 'internal2':
        return <Badge variant="outline">Internal 2</Badge>;
      case 'external':
        return <Badge>External</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <AuthenticatedLayout allowedRoles={['principal', 'hod', 'teacher']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Exams</h2>
            <p className="text-muted-foreground">Create and manage examinations</p>
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
                    value={newExam.subject_id}
                    onValueChange={(value) => setNewExam({ ...newExam, subject_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject: any) => (
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
                    value={newExam.cohort_id}
                    onValueChange={(value) => setNewExam({ ...newExam, cohort_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select cohort" />
                    </SelectTrigger>
                    <SelectContent>
                      {cohorts.map((cohort: any) => (
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
                      value={newExam.exam_type}
                      onValueChange={(value) => setNewExam({ ...newExam, exam_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="internal1">Internal 1</SelectItem>
                        <SelectItem value="internal2">Internal 2</SelectItem>
                        <SelectItem value="external">External</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Max Marks</Label>
                    <Input
                      type="number"
                      value={newExam.max_marks}
                      onChange={(e) => setNewExam({ ...newExam, max_marks: parseInt(e.target.value) || 30 })}
                    />
                  </div>
                </div>
                <Button className="w-full" onClick={handleCreateExam} disabled={createMutation.isPending}>
                  {createMutation.isPending ? (
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

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search exams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Exams Table */}
        <Card>
          <CardContent className="p-0">
            {examsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredExams.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No exams found</p>
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
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExams.map((exam: Exam) => (
                    <TableRow key={exam.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{exam.subject?.name || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground">{exam.subject?.code}</p>
                        </div>
                      </TableCell>
                      <TableCell>{exam.cohort?.name || 'N/A'}</TableCell>
                      <TableCell>{getExamTypeBadge(exam.exam_type)}</TableCell>
                      <TableCell>{exam.max_marks}</TableCell>
                      <TableCell>{getStatusBadge(exam.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/marks-entry?exam=${exam.id}`)}
                          >
                            <FileEdit className="w-4 h-4" />
                          </Button>
                          {exam.status === 'draft' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => publishMutation.mutate(exam.id)}
                              disabled={publishMutation.isPending}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}
