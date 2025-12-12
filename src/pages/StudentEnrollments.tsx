import { useState } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { enrollmentsApi, cohortsApi, usersApi } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Plus, Loader2, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function StudentEnrollments() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [cohortFilter, setCohortFilter] = useState('all');
  const [newEnrollment, setNewEnrollment] = useState({
    student_id: '',
    cohort_id: '',
    roll_number: '',
  });

  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ['enrollments', cohortFilter],
    queryFn: () => enrollmentsApi.list(cohortFilter !== 'all' ? { cohort_id: cohortFilter } : undefined),
  });

  const { data: cohorts = [] } = useQuery({
    queryKey: ['cohorts'],
    queryFn: () => cohortsApi.list(),
  });

  const { data: students = [] } = useQuery({
    queryKey: ['users', 'student'],
    queryFn: () => usersApi.list({ role: 'student' }),
  });

  const createMutation = useMutation({
    mutationFn: (data: { student_id: string; cohort_id: string; roll_number: string }) =>
      enrollmentsApi.create({ ...data, status: 'active' }),
    onSuccess: () => {
      toast({ title: 'Student enrolled successfully' });
      setIsDialogOpen(false);
      setNewEnrollment({ student_id: '', cohort_id: '', roll_number: '' });
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error enrolling student',
        description: error.response?.data?.detail || 'Failed to enroll student',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => enrollmentsApi.delete(id),
    onSuccess: () => {
      toast({ title: 'Enrollment removed' });
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to remove enrollment',
        variant: 'destructive',
      });
    },
  });

  const handleCreate = () => {
    if (!newEnrollment.student_id || !newEnrollment.cohort_id || !newEnrollment.roll_number) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all fields.',
        variant: 'destructive',
      });
      return;
    }
    createMutation.mutate(newEnrollment);
  };

  return (
    <AuthenticatedLayout allowedRoles={['principal', 'hod']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Student Enrollments</h2>
            <p className="text-muted-foreground">Manage student enrollments in cohorts</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Enroll Student
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Enroll Student</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Student</Label>
                  <Select
                    value={newEnrollment.student_id}
                    onValueChange={(v) => setNewEnrollment({ ...newEnrollment, student_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((s: any) => (
                        <SelectItem key={s.user_id} value={s.user_id}>
                          {s.full_name} ({s.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cohort</Label>
                  <Select
                    value={newEnrollment.cohort_id}
                    onValueChange={(v) => setNewEnrollment({ ...newEnrollment, cohort_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select cohort" />
                    </SelectTrigger>
                    <SelectContent>
                      {cohorts.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Roll Number</Label>
                  <Input
                    value={newEnrollment.roll_number}
                    onChange={(e) => setNewEnrollment({ ...newEnrollment, roll_number: e.target.value })}
                    placeholder="e.g., 2024BCA001"
                  />
                </div>
                <Button className="w-full" onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Enroll Student
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filter */}
        <Card>
          <CardContent className="pt-6">
            <Select value={cohortFilter} onValueChange={setCohortFilter}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Filter by cohort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cohorts</SelectItem>
                {cohorts.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Enrollments Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : enrollments.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No enrollments found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Roll Number</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Cohort</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrollments.map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.roll_number}</TableCell>
                      <TableCell>{e.student?.full_name || 'N/A'}</TableCell>
                      <TableCell>{e.cohort?.name || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={e.status === 'active' ? 'default' : 'outline'}>
                          {e.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(e.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
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
