import { useState } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { backlogsApi, cohortsApi } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Plus, Loader2, Search, RefreshCw, RotateCcw, CheckCircle, XCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface BacklogAttempt {
  id: string;
  student_usn: string;
  offering_id: string;
  attempt_number: number;
  exam_type: string;
  semester_attempted: number;
  academic_year?: string;
  external_marks?: number;
  internal_marks_carried?: number;
  total_marks?: number;
  result?: string;
  grade?: string;
  is_cleared: boolean;
  created_at: string;
  offering?: { subject?: { name: string; code: string } };
  student?: { name: string };
}

export default function BacklogManagement() {
  const queryClient = useQueryClient();
  const [isRecordDialogOpen, setIsRecordDialogOpen] = useState(false);
  const [cohortFilter, setCohortFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');
  const [searchUsn, setSearchUsn] = useState('');
  const [formData, setFormData] = useState({
    student_usn: '',
    offering_id: '',
    exam_type: 'supplementary',
    semester_attempted: 1,
    academic_year: '2025-26',
    external_marks: undefined as number | undefined,
    internal_marks_carried: undefined as number | undefined,
  });

  const { data: cohorts = [] } = useQuery({
    queryKey: ['cohorts'],
    queryFn: () => cohortsApi.list(),
  });

  const { data: backlogs = [], isLoading, refetch } = useQuery({
    queryKey: ['backlogs', cohortFilter, resultFilter, searchUsn],
    queryFn: () => backlogsApi.list({
      cohort_id: cohortFilter !== 'all' ? cohortFilter : undefined,
      result: resultFilter !== 'all' ? resultFilter : undefined,
      usn: searchUsn || undefined,
      limit: 100,
    }),
    enabled: true,
  });

  const recordMutation = useMutation({
    mutationFn: (data: typeof formData) => backlogsApi.record({
      ...data,
      external_marks: data.external_marks,
      internal_marks_carried: data.internal_marks_carried,
    }),
    onSuccess: () => {
      toast({ title: 'Backlog attempt recorded successfully' });
      setIsRecordDialogOpen(false);
      setFormData({
        student_usn: '',
        offering_id: '',
        exam_type: 'supplementary',
        semester_attempted: 1,
        academic_year: '2025-26',
        external_marks: undefined,
        internal_marks_carried: undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['backlogs'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error recording backlog',
        description: error.response?.data?.detail || 'Failed to record backlog attempt',
        variant: 'destructive',
      });
    },
  });

  const handleRecord = () => {
    if (!formData.student_usn || !formData.offering_id) {
      toast({ title: 'Please fill in required fields', variant: 'destructive' });
      return;
    }
    recordMutation.mutate(formData);
  };

  const getResultBadge = (result?: string, isCleared?: boolean) => {
    if (isCleared) return <Badge className="bg-green-500">Cleared</Badge>;
    if (result === 'pass') return <Badge className="bg-green-500">Pass</Badge>;
    if (result === 'fail') return <Badge variant="destructive">Fail</Badge>;
    if (result === 'absent') return <Badge variant="secondary">Absent</Badge>;
    return <Badge variant="outline">Pending</Badge>;
  };

  return (
    <AuthenticatedLayout allowedRoles={['principal', 'hod']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Backlog Management</h2>
            <p className="text-muted-foreground">Track and manage student backlog attempts and results</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Dialog open={isRecordDialogOpen} onOpenChange={setIsRecordDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Record Attempt
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Record Backlog Attempt</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Student USN *</Label>
                      <Input
                        value={formData.student_usn}
                        onChange={(e) => setFormData({ ...formData, student_usn: e.target.value })}
                        placeholder="e.g., 1SI22CS001"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Subject Offering ID *</Label>
                      <Input
                        value={formData.offering_id}
                        onChange={(e) => setFormData({ ...formData, offering_id: e.target.value })}
                        placeholder="UUID of offering"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Exam Type</Label>
                      <Select
                        value={formData.exam_type}
                        onValueChange={(v) => setFormData({ ...formData, exam_type: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="supplementary">Supplementary</SelectItem>
                          <SelectItem value="arrear">Arrear</SelectItem>
                          <SelectItem value="improvement">Improvement</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Semester Attempted</Label>
                      <Input
                        type="number"
                        value={formData.semester_attempted}
                        onChange={(e) => setFormData({ ...formData, semester_attempted: parseInt(e.target.value) || 1 })}
                        min={1}
                        max={8}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Academic Year</Label>
                    <Input
                      value={formData.academic_year}
                      onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                      placeholder="e.g., 2025-26"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>External Marks</Label>
                      <Input
                        type="number"
                        value={formData.external_marks ?? ''}
                        onChange={(e) => setFormData({ ...formData, external_marks: e.target.value ? parseFloat(e.target.value) : undefined })}
                        placeholder="0-60"
                        min={0}
                        max={60}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Internal Marks Carried</Label>
                      <Input
                        type="number"
                        value={formData.internal_marks_carried ?? ''}
                        onChange={(e) => setFormData({ ...formData, internal_marks_carried: e.target.value ? parseFloat(e.target.value) : undefined })}
                        placeholder="0-40"
                        min={0}
                        max={40}
                      />
                    </div>
                  </div>
                  <Button className="w-full" onClick={handleRecord} disabled={recordMutation.isPending}>
                    {recordMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Record Attempt
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4 items-end">
              <div className="space-y-2 flex-1">
                <Label>Search by USN</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    className="pl-10"
                    placeholder="Enter USN..."
                    value={searchUsn}
                    onChange={(e) => setSearchUsn(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2 w-48">
                <Label>Cohort</Label>
                <Select value={cohortFilter} onValueChange={setCohortFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Cohorts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cohorts</SelectItem>
                    {cohorts.map((cohort: any) => (
                      <SelectItem key={cohort.id} value={cohort.id}>
                        {cohort.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 w-40">
                <Label>Result</Label>
                <Select value={resultFilter} onValueChange={setResultFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Results" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Results</SelectItem>
                    <SelectItem value="pass">Pass</SelectItem>
                    <SelectItem value="fail">Fail</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Backlogs Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : backlogs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No backlog records found</h3>
              <p className="text-muted-foreground mb-4">
                Record backlog attempts when students appear for supplementary exams.
              </p>
              <Button onClick={() => setIsRecordDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Record First Attempt
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Backlog Attempts</CardTitle>
              <CardDescription>
                Showing {backlogs.length} backlog records
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>USN</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Attempt #</TableHead>
                    <TableHead>Exam Type</TableHead>
                    <TableHead>Semester</TableHead>
                    <TableHead>External</TableHead>
                    <TableHead>Internal</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backlogs.map((backlog: BacklogAttempt) => (
                    <TableRow key={backlog.id}>
                      <TableCell className="font-mono">{backlog.student_usn}</TableCell>
                      <TableCell>
                        {backlog.offering?.subject?.code || '-'}
                        <span className="text-muted-foreground text-xs block">
                          {backlog.offering?.subject?.name || 'Unknown'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">#{backlog.attempt_number}</Badge>
                      </TableCell>
                      <TableCell className="capitalize">{backlog.exam_type}</TableCell>
                      <TableCell>Sem {backlog.semester_attempted}</TableCell>
                      <TableCell>{backlog.external_marks ?? '-'}</TableCell>
                      <TableCell>{backlog.internal_marks_carried ?? '-'}</TableCell>
                      <TableCell>{backlog.total_marks ?? '-'}</TableCell>
                      <TableCell>{getResultBadge(backlog.result, backlog.is_cleared)}</TableCell>
                      <TableCell>
                        {backlog.is_cleared ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
