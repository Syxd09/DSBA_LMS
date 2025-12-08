import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  teacher_id: string | null;
  subjects?: {
    name: string;
    code: string;
  };
  cohorts?: {
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
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newExam, setNewExam] = useState({
    subject_id: '',
    cohort_id: '',
    exam_type: 'internal1',
    max_marks: 30,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      let examsQuery = supabase
        .from('exams')
        .select('*, subjects(name, code), cohorts(name, year)')
        .order('created_at', { ascending: false });

      // Teachers only see their own exams
      if (role === 'teacher' && user) {
        examsQuery = examsQuery.eq('teacher_id', user.id);
      }

      const [examsRes, subjectsRes, cohortsRes] = await Promise.all([
        examsQuery,
        supabase.from('subjects').select('*').order('code'),
        supabase.from('cohorts').select('*').order('year', { ascending: false }),
      ]);

      if (examsRes.error) throw examsRes.error;
      if (subjectsRes.error) throw subjectsRes.error;
      if (cohortsRes.error) throw cohortsRes.error;

      setExams(examsRes.data || []);
      setSubjects(subjectsRes.data || []);
      setCohorts(cohortsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch exams.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateExam = async () => {
    if (!newExam.subject_id || !newExam.cohort_id) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('exams').insert({
        subject_id: newExam.subject_id,
        cohort_id: newExam.cohort_id,
        exam_type: newExam.exam_type,
        max_marks: newExam.max_marks,
        teacher_id: user?.id,
        status: 'draft',
      });

      if (error) throw error;

      toast({
        title: 'Exam created',
        description: 'Exam has been created successfully.',
      });

      setIsDialogOpen(false);
      setNewExam({ subject_id: '', cohort_id: '', exam_type: 'internal1', max_marks: 30 });
      fetchData();
    } catch (error: any) {
      console.error('Error creating exam:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create exam.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
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

  const filteredExams = exams.filter(exam =>
    exam.subjects?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exam.subjects?.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exam.cohorts?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AuthenticatedLayout allowedRoles={['teacher', 'hod', 'principal']}>
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
                    value={newExam.subject_id}
                    onValueChange={(value) => setNewExam({ ...newExam, subject_id: value })}
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
                    value={newExam.cohort_id}
                    onValueChange={(value) => setNewExam({ ...newExam, cohort_id: value })}
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
                      value={newExam.exam_type}
                      onValueChange={(value) => setNewExam({ ...newExam, exam_type: value })}
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
                      value={newExam.max_marks}
                      onChange={(e) => setNewExam({ ...newExam, max_marks: parseInt(e.target.value) || 30 })}
                      min={10}
                      max={100}
                    />
                  </div>
                </div>
                <Button className="w-full" onClick={handleCreateExam} disabled={isSubmitting}>
                  {isSubmitting ? (
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
                {filteredExams.map((exam) => (
                  <TableRow key={exam.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{exam.subjects?.name || '—'}</p>
                        <p className="text-sm text-muted-foreground">{exam.subjects?.code}</p>
                      </div>
                    </TableCell>
                    <TableCell>{exam.cohorts?.name || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {exam.exam_type.replace('internal', 'Internal ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{exam.max_marks}</TableCell>
                    <TableCell>{getStatusBadge(exam.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {exam.status === 'draft' ? (
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/marks-entry?exam=${exam.id}`)}>
                            <FileEdit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
