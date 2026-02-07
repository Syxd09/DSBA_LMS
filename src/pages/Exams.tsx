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
import { Search, Plus, ClipboardList, Loader2, FileEdit, Eye, CheckCircle, Send, Lock, Unlock, ShieldCheck } from 'lucide-react';
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

  // PHASE 1: Submit exam for approval (Faculty)
  const submitMutation = useMutation({
    mutationFn: (examId: string) => examsApi.submit(examId),
    onSuccess: () => {
      toast({ title: 'Exam submitted for approval', description: 'Awaiting HOD approval' });
      queryClient.invalidateQueries({ queryKey: ['exams'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error submitting exam',
        description: error.response?.data?.detail || 'Failed to submit exam',
        variant: 'destructive',
      });
    },
  });

  // PHASE 1: Approve exam (HOD/Principal)
  const approveMutation = useMutation({
    mutationFn: (examId: string) => examsApi.approve(examId),
    onSuccess: () => {
      toast({ title: 'Exam approved', description: 'Marks entry is now allowed' });
      queryClient.invalidateQueries({ queryKey: ['exams'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error approving exam',
        description: error.response?.data?.detail || 'Failed to approve exam',
        variant: 'destructive',
      });
    },
  });

  // PHASE 1: Lock exam (HOD/Principal)
  const lockMutation = useMutation({
    mutationFn: (examId: string) => examsApi.lock(examId),
    onSuccess: () => {
      toast({ title: 'Exam locked', description: 'Marks are now finalized' });
      queryClient.invalidateQueries({ queryKey: ['exams'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error locking exam',
        description: error.response?.data?.detail || 'Failed to lock exam',
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
      case 'locked':
        return <Badge className="bg-purple-600">Locked</Badge>;
      case 'approved':
        return <Badge className="bg-green-500">Approved</Badge>;
      case 'submitted':
        return <Badge className="bg-yellow-500 text-black">Pending Approval</Badge>;
      case 'published':
        return <Badge className="bg-blue-500">Published</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500">Rejected</Badge>;
      default:
        return <Badge variant="outline">Draft</Badge>;
    }
  };

  // Check if user can approve/lock (HOD/Principal)
  const canApprove = role === 'hod' || role === 'principal';

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
                          {/* Marks entry - only for approved exams */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/marks-entry?exam=${exam.id}`)}
                            disabled={exam.status !== 'approved'}
                            title={exam.status === 'approved' ? 'Enter marks' : 'Exam must be approved first'}
                          >
                            <FileEdit className="w-4 h-4" />
                          </Button>

                          {/* Design Structure - draft/submitted only */}
                          {(exam.status === 'draft' || exam.status === 'submitted') && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/marks-entry?exam=${exam.id}&tab=structure`)}
                                title="Design Question Paper"
                            >
                                <ClipboardList className="w-4 h-4 text-blue-600" />
                            </Button>
                          )}
                          
                          {/* Submit for approval - draft only, faculty */}
                          {exam.status === 'draft' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => submitMutation.mutate(exam.id)}
                              disabled={submitMutation.isPending}
                              title="Submit for HOD approval"
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                          )}
                          
                          {/* Approve - submitted only, HOD/Principal */}
                          {exam.status === 'submitted' && canApprove && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600 hover:text-green-700"
                              onClick={() => approveMutation.mutate(exam.id)}
                              disabled={approveMutation.isPending}
                              title="Approve exam"
                            >
                              <ShieldCheck className="w-4 h-4" />
                            </Button>
                          )}
                          
                          {/* Lock - approved only, HOD/Principal */}
                          {exam.status === 'approved' && canApprove && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-purple-600 hover:text-purple-700"
                              onClick={() => lockMutation.mutate(exam.id)}
                              disabled={lockMutation.isPending}
                              title="Lock exam (finalize marks)"
                            >
                              <Lock className="w-4 h-4" />
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
