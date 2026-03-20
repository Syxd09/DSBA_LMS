import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, FileText, Users, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';

interface Student {
  id: string;
  fullName: string;
  email: string;
  departmentId?: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  semester: number;
}

export default function TeacherAssignedStudents() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch assigned students
  const { data: students = [], isLoading: studentsLoading } = useQuery<Student[]>({
    queryKey: ['teacher-assigned-students'],
    queryFn: async () => {
      // This would fetch students assigned to the logged-in teacher
      const { data } = await api.get('/enrollments/teacher/students');
      return data?.students || [];
    },
  });

  // Fetch teacher's subjects
  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ['teacher-subjects'],
    queryFn: async () => {
      const { data } = await api.get('/assignments');
      // Extract unique subjects from teacher's assignments
      const subjectMap = new Map();
      (data || []).forEach((a: any) => {
        if (a.subject && !subjectMap.has(a.subject.id)) {
          subjectMap.set(a.subject.id, {
            id: a.subject.id,
            name: a.subject.name,
            code: a.subject.code,
            semester: a.subject.semester || a.semester
          });
        }
      });
      return Array.from(subjectMap.values());
    },
  });

  // Fetch existing feedback
  const { data: existingFeedback = [] } = useQuery({
    queryKey: ['teacher-feedback'],
    queryFn: async () => {
      const { data } = await api.get('/teacher-feedback/teacher/me');
      return data?.feedbacks || data || [];
    },
  });

  const filteredStudents = students.filter((student) =>
    student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getFeedbackStatus = (studentId: string) => {
    const feedback = existingFeedback.find((f: any) => f.studentId === studentId);
    if (!feedback) return null;
    return feedback.status;
  };

  const hasFeedback = (studentId: string) => {
    return existingFeedback.some((f: any) => f.studentId === studentId);
  };

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Student Feedback</h1>
          <p className="text-muted-foreground">
            Provide qualitative feedback for your assigned students
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{students.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Feedback Given</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{existingFeedback.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Subjects</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{subjects.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        {/* Students List */}
        {studentsLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredStudents.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <p className="text-muted-foreground">
                  {searchQuery ? 'No students found matching your search' : 'No students assigned'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredStudents.map((student) => {
              const status = getFeedbackStatus(student.id);
              const hasExistingFeedback = hasFeedback(student.id);

              return (
                <Card key={student.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{student.fullName}</CardTitle>
                        <CardDescription className="mt-1">
                          {student.email}
                        </CardDescription>
                      </div>
                      {status && (
                        <Badge
                          variant={
                            status === 'DRAFT'
                              ? 'secondary'
                              : status === 'SUBMITTED'
                              ? 'default'
                              : status === 'APPROVED'
                              ? 'default'
                              : 'outline'
                          }
                        >
                          {status}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      {hasExistingFeedback ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              const feedback = existingFeedback.find(
                                (f: any) => f.studentId === student.id
                              );
                              navigate(`/feedback/teacher/view/${feedback.id}`);
                            }}
                          >
                            View Feedback
                          </Button>
                          {status === 'DRAFT' && (
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={() => {
                                const feedback = existingFeedback.find(
                                  (f: any) => f.studentId === student.id
                                );
                                navigate(`/feedback/teacher/edit/${feedback.id}`);
                              }}
                            >
                              Continue Draft
                            </Button>
                          )}
                        </>
                      ) : (
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => navigate(`/feedback/teacher/create/${student.id}`, { 
                            state: { 
                              studentName: student.fullName,
                              cohortId: (student as any).cohort.id,
                              semester: (student as any).semester,
                              assignedSubjects: (student as any).assignedSubjects
                            } 
                          })}
                        >
                          Give Feedback
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
