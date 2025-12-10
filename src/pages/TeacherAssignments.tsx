import { useState } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useTeacherAssignments, useTeachers, useCreateTeacherAssignment, useDeleteTeacherAssignment } from '@/hooks/useTeacherAssignments';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { UserPlus, Trash2, Loader2, BookOpen } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function TeacherAssignments() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedCohort, setSelectedCohort] = useState('');
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear().toString());
  
  const { data: assignments, isLoading } = useTeacherAssignments();
  const { data: teachers } = useTeachers();
  
  const { data: subjects } = useQuery({
    queryKey: ['subjects-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });
  
  const { data: cohorts } = useQuery({
    queryKey: ['cohorts-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cohorts')
        .select('*, program:programs(name)')
        .order('year', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
  
  const createAssignment = useCreateTeacherAssignment();
  const deleteAssignment = useDeleteTeacherAssignment();
  
  const handleCreate = async () => {
    if (!selectedTeacher || !selectedSubject || !selectedCohort || !academicYear) {
      toast({ title: 'Error', description: 'Please fill all fields', variant: 'destructive' });
      return;
    }
    
    await createAssignment.mutateAsync({
      teacher_id: selectedTeacher,
      subject_id: selectedSubject,
      cohort_id: selectedCohort,
      academic_year: academicYear,
    });
    
    setIsDialogOpen(false);
    setSelectedTeacher('');
    setSelectedSubject('');
    setSelectedCohort('');
  };

  return (
    <AuthenticatedLayout allowedRoles={['principal', 'hod']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Teacher Assignments</h2>
            <p className="text-muted-foreground">Assign teachers to subjects and cohorts</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Assign Teacher
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Teacher to Subject</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Teacher</Label>
                  <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers?.map((teacher) => (
                        <SelectItem key={teacher.user_id} value={teacher.user_id}>
                          {teacher.full_name} ({teacher.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects?.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name} ({subject.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Cohort</Label>
                  <Select value={selectedCohort} onValueChange={setSelectedCohort}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select cohort" />
                    </SelectTrigger>
                    <SelectContent>
                      {cohorts?.map((cohort) => (
                        <SelectItem key={cohort.id} value={cohort.id}>
                          {cohort.name} - {cohort.program?.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Academic Year</Label>
                  <Input
                    type="text"
                    placeholder="e.g., 2024"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                  />
                </div>
                
                <Button 
                  className="w-full" 
                  onClick={handleCreate}
                  disabled={createAssignment.isPending}
                >
                  {createAssignment.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Assign Teacher
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Current Assignments
              <Badge variant="secondary" className="ml-2">
                {assignments?.length || 0} total
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : !assignments?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                No teacher assignments yet
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Cohort</TableHead>
                    <TableHead>Academic Year</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">
                        {assignment.teacher?.full_name || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">{assignment.subject?.name}</span>
                          <span className="text-muted-foreground ml-2">
                            ({assignment.subject?.code})
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{assignment.cohort?.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{assignment.academic_year}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteAssignment.mutate(assignment.id)}
                          disabled={deleteAssignment.isPending}
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
