import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useFeedback } from '@/contexts/FeedbackContext';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Loader2, FileText } from 'lucide-react';
import { TeacherStudentFeedback, FeedbackStatus } from '@/types/feedback.types';

interface Student {
  id: string;
  fullName: string;
  email: string;
  enrollmentNo?: string;
  department?: { name: string };
}

interface Subject {
  id: string;
  name: string;
  code: string;
  semester: number;
}

export default function TeacherAssignedStudents() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { myFeedbacks, fetchMyFeedbacks, isLoading } = useFeedback();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedSemester, setSelectedSemester] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Fetch subjects where teacher is assigned
  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ['teacher-subjects', user?.id],
    queryFn: async () => {
      const { data } = await api.get('/subjects');
      return data || [];
    },
  });

  // Fetch assigned students
  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ['teacher-students', user?.id],
    queryFn: async () => {
      const { data } = await api.get('/enrollments/teacher/students');
      return data || [];
    },
  });

  useEffect(() => {
    fetchMyFeedbacks();
  }, [fetchMyFeedbacks]);

  // Get feedback status for a student in a subject
  const getFeedbackForStudent = (studentId: string, subjectId?: string): TeacherStudentFeedback | undefined => {
    return myFeedbacks.find(
      f => f.studentId === studentId && (!subjectId || f.subjectId === subjectId)
    );
  };

  // Filter students
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.enrollmentNo?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesSearch;
  });

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Student Feedback</h1>
            <p className="text-muted-foreground">
              Provide feedback for your assigned students
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search students..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {subjects.map(subject => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.code} - {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="not-started">Not Started</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="SUBMITTED">Submitted</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="LOCKED">Locked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Students List */}
        <Card>
          <CardHeader>
            <CardTitle>Assigned Students ({filteredStudents.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No students found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredStudents.map(student => {
                  const feedback = getFeedbackForStudent(student.id, selectedSubject !== 'all' ? selectedSubject : undefined);
                  
                  return (
                    <div key={student.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium">{student.fullName}</h3>
                        <p className="text-sm text-muted-foreground">{student.email}</p>
                        {student.enrollmentNo && (
                          <p className="text-sm text-muted-foreground">Enrollment: {student.enrollmentNo}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        {feedback ? (
                          <>
                            <Badge variant={
                              feedback.status === 'DRAFT' ? 'secondary' :
                              feedback.status === 'SUBMITTED' ? 'default' :
                              feedback.status === 'APPROVED' ? 'default' :
                              'default'
                            }>
                              {feedback.status}
                            </Badge>
                            <div className="flex gap-2">
                              {feedback.status === 'DRAFT' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => navigate(`/feedback/teacher/edit/${feedback.id}`)}
                                >
                                  Edit Draft
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => navigate(`/feedback/teacher/view/${feedback.id}`)}
                              >
                                View
                              </Button>
                            </div>
                          </>
                        ) : (
                          <Button
                            onClick={() => navigate(`/feedback/teacher/create/${student.id}`)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Create Feedback
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}
