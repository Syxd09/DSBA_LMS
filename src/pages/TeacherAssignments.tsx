import { useState } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useTeacherAssignments, useTeachers } from '@/hooks/useTeacherAssignments';
import { useQuery } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { UserPlus, Trash2, Loader2, BookOpen, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export default function TeacherAssignments() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedCohort, setSelectedCohort] = useState('');
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear().toString());
  
  // New state for filtering and expansion
  const [filterSubjectId, setFilterSubjectId] = useState('all');
  const [expandedTeacherId, setExpandedTeacherId] = useState<string | null>(null);
  
  const { assignments, isLoading, assignTeacher, removeAssignment } = useTeacherAssignments();
  const { data: teachers } = useTeachers();
  
  const { data: subjects } = useQuery({
    queryKey: ['subjects-list'],
    queryFn: async () => {
      const { data } = await api.get('/subjects');
      return data || [];
    },
  });
  
  const { data: cohorts } = useQuery({
    queryKey: ['cohorts-list'],
    queryFn: async () => {
      const { data } = await api.get('/cohorts');
      return data || [];
    },
  });

  const handleCreate = async () => {
    if (!selectedTeacher || !selectedSubject || !selectedCohort || !academicYear) {
      toast({ title: 'Error', description: 'Please fill all fields', variant: 'destructive' });
      return;
    }

    const subject = subjects.find((s: any) => s.id === selectedSubject);
    if (!subject) {
      toast({ title: 'Error', description: 'Subject not found', variant: 'destructive' });
      return;
    }

    await assignTeacher.mutateAsync({
      teacherId: selectedTeacher,
      subjectId: selectedSubject,
      cohortId: selectedCohort,
      departmentId: subject.departmentId, // Required by backend
      academicYear: academicYear,
      section: 'A',
      semester: subject.semester || 1
    });
    
    setIsDialogOpen(false);
    setSelectedTeacher('');
    setSelectedSubject('');
    setSelectedCohort('');
  };

  // Filter and Group Logic
  const filteredAssignments = assignments?.filter((a: any) => 
      filterSubjectId === 'all' || a.subjectId === filterSubjectId
  ) || [];

  const groupedAssignments = filteredAssignments.reduce((acc: any, curr: any) => {
      const teacherId = curr.teacherId;
      if (!acc[teacherId]) {
          acc[teacherId] = {
              teacher: curr.teacher,
              assignments: []
          };
      }
      acc[teacherId].assignments.push(curr);
      return acc;
  }, {});

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
                      {teachers?.map((teacher: any) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.fullName} ({teacher.email})
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
                      {subjects?.map((subject: any) => (
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
                      {cohorts?.map((cohort: any) => (
                        <SelectItem key={cohort.id} value={cohort.id}>
                          {cohort.name}
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
                  disabled={assignTeacher.isPending}
                >
                  {assignTeacher.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Assign Teacher
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-2 bg-card p-3 rounded-md border">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filter by Subject:</span>
            <Select value={filterSubjectId} onValueChange={setFilterSubjectId}>
                <SelectTrigger className="w-[250px] h-8">
                    <SelectValue placeholder="All Subjects" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {subjects?.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>

        <div className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : Object.keys(groupedAssignments).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-lg">
                No assignments found for the selected criteria
              </div>
            ) : (
                Object.values(groupedAssignments).map((group: any) => (
                    <Collapsible 
                        key={group.teacher.id} 
                        open={expandedTeacherId === group.teacher.id}
                        onOpenChange={() => setExpandedTeacherId(expandedTeacherId === group.teacher.id ? null : group.teacher.id)}
                        className="bg-card border rounded-lg shadow-sm"
                    >
                        <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpandedTeacherId(expandedTeacherId === group.teacher.id ? null : group.teacher.id)}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                                    {group.teacher.fullName.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-semibold">{group.teacher.fullName}</h3>
                                    <p className="text-sm text-muted-foreground">{group.teacher.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Badge variant="secondary">{group.assignments.length} assignments</Badge>
                                <CollapsibleTrigger asChild>
                                    <Button variant="ghost" size="sm" className="p-0 h-8 w-8">
                                        {expandedTeacherId === group.teacher.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </Button>
                                </CollapsibleTrigger>
                            </div>
                        </div>
                        
                        <CollapsibleContent>
                            <div className="px-4 pb-4">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead className="w-[40%]">Subject</TableHead>
                                            <TableHead>Cohort</TableHead>
                                            <TableHead>Academic Year</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {group.assignments.map((assignment: any) => (
                                            <TableRow key={assignment.id}>
                                                <TableCell>
                                                    <span className="font-medium">{assignment.subject?.name}</span>
                                                    <span className="text-xs text-muted-foreground ml-2">({assignment.subject?.code})</span>
                                                </TableCell>
                                                <TableCell>{assignment.cohort?.name}</TableCell>
                                                <TableCell>{assignment.academicYear}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost" 
                                                        size="sm"
                                                        className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removeAssignment.mutate(assignment.id);
                                                        }}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                ))
            )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
