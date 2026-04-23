import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useAcademicContext } from '@/contexts/AcademicContext';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, Users, Search, GraduationCap, BookOpen, Building2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function Students() {
  const { user } = useAuth();
  const role = user?.role?.toLowerCase();
  const { 
    cohortId, setCohortId, 
    semester, setSemester, 
    departmentId, setDepartmentId,
    setAcademicContext
  } = useAcademicContext();
  
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch departments (for HOD/Admin)
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data } = await api.get('/departments');
      return data || [];
    },
    enabled: role !== 'teacher'
  });

  // Fetch teacher assignments
  const { data: assignments = [] } = useQuery({
    queryKey: ['my-assignments', user?.id],
    queryFn: async () => {
      const { data } = await api.get('/assignments');
      // Backend already filters by teacherId for the TEACHER role
      return data || [];
    },
    enabled: role === 'teacher' && !!user?.id
  });

  // Auto-select assignment for teacher if current context is invalid or missing
  useEffect(() => {
    if (role === 'teacher' && assignments.length > 0) {
      const isCurrentValid = assignments.some((a: any) => a.cohortId === cohortId && a.semester === Number(semester));
      if (!isCurrentValid) {
        const first = assignments[0];
        setAcademicContext({
          cohortId: first.cohortId,
          semester: first.semester,
          departmentId: first.departmentId
        });
      }
    }
  }, [role, assignments, cohortId, semester, setAcademicContext]);
  const { data: cohorts = [] } = useQuery({
    queryKey: ['cohorts', departmentId],
    queryFn: async () => {
      const { data } = await api.get('/cohorts');
      if (departmentId && role !== 'teacher') {
        return data.filter((c: any) => c.program?.departmentId === departmentId);
      }
      return data || [];
    },
    enabled: !!(role !== 'teacher')
  });

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students-list', cohortId, semester],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (cohortId) params.append('cohortId', cohortId);
      if (semester) params.append('semester', String(semester));
      
      const { data } = await api.get(`/enrollments?${params.toString()}`);
      return data;
    },
    enabled: !!(cohortId && semester)
  });

  const filteredStudents = students.filter((enrollment: any) => {
    if (!enrollment?.student) return false;
    const search = searchQuery.toLowerCase();
    const regNo = enrollment.student.registrationNumber?.toLowerCase() || '';
    const name = enrollment.student.fullName?.toLowerCase() || '';
    return regNo.includes(search) || name.includes(search);
  });

  return (
    <AuthenticatedLayout allowedRoles={['hod', 'teacher']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
            <div>
                <h2 className="text-2xl font-bold text-foreground">Students</h2>
                <p className="text-muted-foreground">View and manage students in your classes</p>
            </div>
            {filteredStudents.length > 0 && (
                 <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full">
                    <GraduationCap className="h-4 w-4" />
                    <span>{filteredStudents.length} Students Active</span>
                 </div>
            )}
        </div>

        {/* Local Context Selector */}
        <Card>
          <CardHeader className="pb-3 border-b bg-muted/20">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              Academic Context
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {role === 'teacher' ? (
                // Teacher View: Filtered by assignments
                <>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assigned Subject</Label>
                    <Select 
                      value={cohortId} 
                      onValueChange={(val) => {
                        const ass = assignments.find((a: any) => a.cohortId === val);
                        if (ass) {
                          setCohortId(ass.cohortId);
                          setSemester(ass.semester);
                          setDepartmentId(ass.departmentId);
                        }
                      }}
                    >
                      <SelectTrigger className="bg-background shadow-sm border-muted-foreground/20">
                        <SelectValue placeholder="Choose a subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {assignments.map((ass: any) => (
                          <SelectItem key={ass.id} value={ass.cohortId}>
                            {ass.subject?.name} ({ass.cohort?.name}) - Sem {ass.semester}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Semester</Label>
                    <Input value={`Semester ${semester || '-'}`} disabled className="bg-muted fill-muted" />
                  </div>
                  <div className="flex items-end pb-1">
                    <Badge variant="outline" className="h-9 px-4 border-dashed">
                      Teacher View Protected
                    </Badge>
                  </div>
                </>
              ) : (
                // HOD/Admin View: Cascading selectors
                <>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Department</Label>
                    <Select value={departmentId} onValueChange={setDepartmentId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept: any) => (
                          <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cohort</Label>
                    <Select value={cohortId} onValueChange={setCohortId} disabled={!departmentId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Cohort" />
                      </SelectTrigger>
                      <SelectContent>
                        {cohorts.map((cohort: any) => (
                          <SelectItem key={cohort.id} value={cohort.id}>{cohort.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Semester</Label>
                    <Select value={String(semester)} onValueChange={(val) => setSemester(Number(val))} disabled={!cohortId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Semester" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                          <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Search Bar */}
        {cohortId && (
          <div className="flex items-center gap-4 bg-card p-4 rounded-lg border border-border shadow-sm">
              <div className="flex-1 w-full">
                  <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                          placeholder="Search by name or reg. number..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 bg-background"
                      />
                  </div>
              </div>
          </div>
        )}

        {/* Content Area */}
        <div className="border border-border rounded-lg bg-card overflow-hidden shadow-sm">
            {isLoading ? (
                <div className="p-12 text-center flex justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : !cohortId || !semester ? (
                <div className="py-24 text-center text-muted-foreground bg-muted/10 flex flex-col items-center justify-center">
                    <BookOpen className="h-16 w-16 mb-4 opacity-20 text-primary" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">No Context Selected</h3>
                    <p className="max-w-md mx-auto">
                        {role === 'teacher' && assignments.length === 0 
                          ? "You don't have any subjects assigned to you yet. Please contact your HOD."
                          : "Please select an assigned subject or department/cohort context above to view and manage students."
                        }
                    </p>
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
                            <TableHead className="w-[180px]">Reg. Number</TableHead>
                            <TableHead>Student Name</TableHead>
                            <TableHead>Email Address</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredStudents.map((enrollment: any) => (
                            <TableRow key={enrollment.id} className="hover:bg-muted/50 transition-colors">
                                <TableCell className="font-mono text-sm font-medium">{enrollment.student.registrationNumber || '-'}</TableCell>
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
