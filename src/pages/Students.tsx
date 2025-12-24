import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, Search, GraduationCap } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function Students() {
  const { user } = useAuth();
  const isHod = user?.role === 'hod';
  const isTeacher = user?.role === 'teacher';

  // Filters
  const [selectedCohortId, setSelectedCohortId] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch Context Data
  const { data: teacherAssignments = [] } = useQuery({
      queryKey: ['teacher-assignments', 'my'],
      queryFn: async () => {
          const { data } = await api.get('/teacher-assignments/my');
          return data;
      },
      enabled: isTeacher
  });

  const { data: cohorts = [] } = useQuery({
    queryKey: ['cohorts'],
    queryFn: async () => {
      const { data } = await api.get('/cohorts');
      return data;
    },
    enabled: isHod
  });

  // Derived Options for Teacher
  const teacherOptions = isTeacher ? teacherAssignments.map((a: any) => ({
      cohortId: a.cohortId,
      cohortName: a.cohort?.name,
      semester: a.semester,
      subjectName: a.subject?.name,
      label: `${a.cohort?.name} - Sem ${a.semester} (${a.subject?.name})`
  })) : [];

  const canFetch = 
    (isHod && selectedCohortId && selectedSemester) || 
    (isTeacher && selectedCohortId && selectedSemester);

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students-list', selectedCohortId, selectedSemester],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCohortId) params.append('cohortId', selectedCohortId);
      if (selectedSemester) params.append('semester', selectedSemester);
      
      const { data } = await api.get(`/enrollments?${params.toString()}`);
      return data;
    },
    enabled: isHod || isTeacher
  });

  const handleTeacherContextChange = (value: string) => {
      const [cId, sem] = value.split(':');
      setSelectedCohortId(cId);
      setSelectedSemester(sem);
  };

  const filteredStudents = students.filter((enrollment: any) => 
    enrollment.student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    enrollment.rollNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AuthenticatedLayout allowedRoles={['hod', 'teacher']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
            <div>
                <h2 className="text-2xl font-bold text-foreground">Students</h2>
                <p className="text-muted-foreground">View and manage students in your {isHod ? 'department' : 'classes'}</p>
            </div>
            {filteredStudents.length > 0 && (
                 <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full">
                    <GraduationCap className="h-4 w-4" />
                    <span>{filteredStudents.length} Students Active</span>
                 </div>
            )}
        </div>

        {/* Filters & Search Row */}
        <div className="flex flex-col md:flex-row gap-4 items-end md:items-center bg-card p-4 rounded-lg border border-border shadow-sm">
            {isHod && (
                <>
                    <div className="w-full md:w-48 space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Batch</label>
                        <Select value={selectedCohortId} onValueChange={setSelectedCohortId}>
                            <SelectTrigger className="bg-background">
                                <SelectValue placeholder="Select Batch" />
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
                    <div className="w-full md:w-40 space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Semester</label>
                            <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                            <SelectTrigger className="bg-background">
                                <SelectValue placeholder="Sem" />
                            </SelectTrigger>
                            <SelectContent>
                                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                                    <SelectItem key={sem} value={sem.toString()}>
                                        Semester {sem}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </>
            )}

            {isTeacher && (
                <div className="w-full md:w-64 space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Class Context</label>
                        <Select 
                        onValueChange={handleTeacherContextChange} 
                        disabled={teacherOptions.length === 0}
                        >
                        <SelectTrigger className="bg-background">
                            <SelectValue placeholder={teacherOptions.length === 0 ? "No active classes" : "Select Class"} />
                        </SelectTrigger>
                        <SelectContent>
                            {teacherOptions.map((opt: any, idx: number) => (
                                <SelectItem key={`${opt.cohortId}:${opt.semester}:${idx}`} value={`${opt.cohortId}:${opt.semester}`}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
                
            <div className="flex-1 w-full space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Search</label>
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name or roll number..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-background"
                    />
                </div>
            </div>
        </div>

        {/* Content Area */}
        <div className="border border-border rounded-lg bg-card overflow-hidden shadow-sm">
            {isLoading ? (
                <div className="p-12 text-center flex justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : filteredStudents.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground bg-muted/20">
                     <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">No students found matching your criteria</p>
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead className="w-[150px]">Roll Number</TableHead>
                            <TableHead>Student Name</TableHead>
                            <TableHead>Email Address</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredStudents.map((enrollment: any) => (
                            <TableRow key={enrollment.id} className="hover:bg-muted/50 transition-colors">
                                <TableCell className="font-mono text-sm font-medium">{enrollment.rollNumber}</TableCell>
                                <TableCell className="font-medium text-foreground">{enrollment.student.fullName}</TableCell>
                                <TableCell className="text-muted-foreground">{enrollment.student.email}</TableCell>
                                <TableCell className="text-muted-foreground">{enrollment.student.mobileNumber || '-'}</TableCell>
                                <TableCell className="text-right">
                                    <Badge variant={enrollment.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                                        {enrollment.status}
                                    </Badge>
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
