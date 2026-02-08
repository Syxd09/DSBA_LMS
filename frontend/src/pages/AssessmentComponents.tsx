/**
 * EduMetrics - Assessment Components Page
 * F-03: Assignment, Attendance, Activity Marks Entry
 * 
 * Features:
 * - Select Subject Offering (via Cohort filter)
 * - Tabbed interface: Assignments | Attendance | Activity
 * - Assignment: Create assignments, bulk marks entry
 * - Attendance: Bulk import (5 marks max)
 * - Activity: Bulk import (5 marks max)
 * - Role-based: Teacher + HOD + Principal
 */

import { useState, useEffect, useMemo } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { offeringsApi, cohortsApi, enrollmentsApi, assessmentApi } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  FileText, Plus, Loader2, Save, Upload, Users, BookOpen, 
  CheckCircle, AlertCircle, ClipboardList, Calendar, Activity
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

// ============================================================================
// TYPES
// ============================================================================

interface Assignment {
  id: string;
  offering_id: string;
  assignment_no: number;
  title: string | null;
  max_marks: number;
  due_before_exam: string | null;
  created_at: string;
}

interface MarkEntry {
  usn: string;
  marks: number;
}

interface Student {
  usn: string;
  name: string;
  email?: string;
}

interface Offering {
  id: string;
  subject: { name: string; code: string };
  cohort: { name: string; year: number; id: string };
  semester: number;
}

interface Cohort {
  id: string;
  name: string;
  year: number;
  program?: { name: string; code: string };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AssessmentComponents() {
  const queryClient = useQueryClient();
  const { role } = useAuth();
  
  // State for filters
  const [selectedCohortId, setSelectedCohortId] = useState<string>('');
  const [selectedOfferingId, setSelectedOfferingId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('assignments');
  
  // State for dialogs
  const [isCreateAssignmentOpen, setIsCreateAssignmentOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  
  // State for form data
  const [assignmentForm, setAssignmentForm] = useState({
    assignment_no: 1,
    title: '',
    max_marks: 5,
    due_before_exam: '' as 'INT1' | 'INT2' | ''
  });
  
  // State for marks entry (keyed by USN)
  const [marksData, setMarksData] = useState<Record<string, number>>({});
  const [attendanceData, setAttendanceData] = useState<Record<string, number>>({});
  const [activityData, setActivityData] = useState<Record<string, number>>({});
  
  const canCreateAssignment = role === 'hod' || role === 'principal';
  
  // ============================================================================
  // QUERIES
  // ============================================================================
  
  const { data: cohorts = [] } = useQuery({
    queryKey: ['cohorts'],
    queryFn: () => cohortsApi.list(),
  });
  
  const { data: offerings = [] } = useQuery({
    queryKey: ['offerings', selectedCohortId],
    queryFn: () => offeringsApi.list({ cohort_id: selectedCohortId }),
    enabled: !!selectedCohortId,
  });
  
  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['assignments', selectedOfferingId],
    queryFn: () => assessmentApi.listAssignments(selectedOfferingId),
    enabled: !!selectedOfferingId,
  });
  
  const { data: students = [] } = useQuery({
    queryKey: ['students', selectedCohortId],
    queryFn: () => enrollmentsApi.list({ cohort_id: selectedCohortId }),
    enabled: !!selectedCohortId,
  });
  
  const { data: assignmentMarks = [], isLoading: marksLoading } = useQuery({
    queryKey: ['assignmentMarks', selectedAssignment?.id],
    queryFn: () => assessmentApi.getAssignmentMarks(selectedAssignment!.id),
    enabled: !!selectedAssignment,
  });
  
  const { data: attendanceMarks = [] } = useQuery({
    queryKey: ['attendance', selectedOfferingId],
    queryFn: () => assessmentApi.getAttendance(selectedOfferingId),
    enabled: !!selectedOfferingId,
  });
  
  const { data: activityMarks = [] } = useQuery({
    queryKey: ['activity', selectedOfferingId],
    queryFn: () => assessmentApi.getActivity(selectedOfferingId),
    enabled: !!selectedOfferingId,
  });
  
  // ============================================================================
  // EFFECTS - Load existing marks into state
  // ============================================================================
  
  useEffect(() => {
    if (assignmentMarks.length > 0) {
      const markMap: Record<string, number> = {};
      assignmentMarks.forEach((m: any) => {
        markMap[m.usn] = parseFloat(m.marks);
      });
      setMarksData(markMap);
    } else {
      setMarksData({});
    }
  }, [assignmentMarks]);
  
  useEffect(() => {
    if (attendanceMarks.length > 0) {
      const markMap: Record<string, number> = {};
      attendanceMarks.forEach((m: any) => {
        markMap[m.usn] = parseFloat(m.marks);
      });
      setAttendanceData(markMap);
    } else {
      setAttendanceData({});
    }
  }, [attendanceMarks]);
  
  useEffect(() => {
    if (activityMarks.length > 0) {
      const markMap: Record<string, number> = {};
      activityMarks.forEach((m: any) => {
        markMap[m.usn] = parseFloat(m.marks);
      });
      setActivityData(markMap);
    } else {
      setActivityData({});
    }
  }, [activityMarks]);
  
  // ============================================================================
  // MUTATIONS
  // ============================================================================
  
  const createAssignmentMutation = useMutation({
    mutationFn: (data: { assignment_no: number; title?: string; max_marks?: number; due_before_exam?: 'INT1' | 'INT2' }) =>
      assessmentApi.createAssignment(selectedOfferingId, data),
    onSuccess: () => {
      toast({ title: 'Assignment created successfully' });
      setIsCreateAssignmentOpen(false);
      setAssignmentForm({ assignment_no: 1, title: '', max_marks: 5, due_before_exam: '' });
      queryClient.invalidateQueries({ queryKey: ['assignments', selectedOfferingId] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating assignment',
        description: error.response?.data?.detail || 'Failed to create assignment',
        variant: 'destructive',
      });
    },
  });
  
  const saveAssignmentMarksMutation = useMutation({
    mutationFn: (data: { assignmentId: string; marks: MarkEntry[] }) =>
      assessmentApi.saveAssignmentMarks(data.assignmentId, data.marks),
    onSuccess: (result) => {
      toast({ title: `Saved ${result.saved_count} marks` });
      queryClient.invalidateQueries({ queryKey: ['assignmentMarks', selectedAssignment?.id] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error saving marks',
        description: error.response?.data?.detail || 'Failed to save marks',
        variant: 'destructive',
      });
    },
  });
  
  const importAttendanceMutation = useMutation({
    mutationFn: (marks: MarkEntry[]) =>
      assessmentApi.importAttendance(selectedOfferingId, marks),
    onSuccess: (result) => {
      toast({ 
        title: `Saved ${result.saved_count} attendance marks`,
        description: result.skipped_usns?.length ? `Skipped: ${result.skipped_usns.join(', ')}` : undefined
      });
      queryClient.invalidateQueries({ queryKey: ['attendance', selectedOfferingId] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error importing attendance',
        description: error.response?.data?.detail || 'Failed to import',
        variant: 'destructive',
      });
    },
  });
  
  const importActivityMutation = useMutation({
    mutationFn: (marks: MarkEntry[]) =>
      assessmentApi.importActivity(selectedOfferingId, marks),
    onSuccess: (result) => {
      toast({ 
        title: `Saved ${result.saved_count} activity marks`,
        description: result.skipped_usns?.length ? `Skipped: ${result.skipped_usns.join(', ')}` : undefined
      });
      queryClient.invalidateQueries({ queryKey: ['activity', selectedOfferingId] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error importing activity',
        description: error.response?.data?.detail || 'Failed to import',
        variant: 'destructive',
      });
    },
  });
  
  // ============================================================================
  // HANDLERS
  // ============================================================================
  
  const handleCohortChange = (cohortId: string) => {
    setSelectedCohortId(cohortId);
    setSelectedOfferingId('');
    setSelectedAssignment(null);
  };
  
  const handleOfferingChange = (offeringId: string) => {
    setSelectedOfferingId(offeringId);
    setSelectedAssignment(null);
  };
  
  const handleCreateAssignment = () => {
    const data: any = {
      assignment_no: assignmentForm.assignment_no,
      title: assignmentForm.title || undefined,
      max_marks: assignmentForm.max_marks,
    };
    if (assignmentForm.due_before_exam) {
      data.due_before_exam = assignmentForm.due_before_exam;
    }
    createAssignmentMutation.mutate(data);
  };
  
  const handleSaveAssignmentMarks = () => {
    if (!selectedAssignment) return;
    
    const marks: MarkEntry[] = Object.entries(marksData)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([usn, marks]) => ({ usn, marks }));
    
    if (marks.length === 0) {
      toast({ title: 'No marks to save', variant: 'destructive' });
      return;
    }
    
    saveAssignmentMarksMutation.mutate({
      assignmentId: selectedAssignment.id,
      marks
    });
  };
  
  const handleSaveAttendance = () => {
    const marks: MarkEntry[] = Object.entries(attendanceData)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([usn, marks]) => ({ usn, marks }));
    
    if (marks.length === 0) {
      toast({ title: 'No attendance marks to save', variant: 'destructive' });
      return;
    }
    
    importAttendanceMutation.mutate(marks);
  };
  
  const handleSaveActivity = () => {
    const marks: MarkEntry[] = Object.entries(activityData)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([usn, marks]) => ({ usn, marks }));
    
    if (marks.length === 0) {
      toast({ title: 'No activity marks to save', variant: 'destructive' });
      return;
    }
    
    importActivityMutation.mutate(marks);
  };
  
  const selectedOffering = offerings.find((o: Offering) => o.id === selectedOfferingId);
  
  // ============================================================================
  // RENDER HELPERS
  // ============================================================================
  
  const renderMarksTable = (
    type: 'assignment' | 'attendance' | 'activity',
    data: Record<string, number>,
    setData: React.Dispatch<React.SetStateAction<Record<string, number>>>,
    maxMarks: number = 5
  ) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-32">USN</TableHead>
          <TableHead>Name</TableHead>
          <TableHead className="w-32 text-center">Marks (max {maxMarks})</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {students.map((student: Student) => (
          <TableRow key={student.usn}>
            <TableCell className="font-mono">{student.usn}</TableCell>
            <TableCell>{student.name}</TableCell>
            <TableCell>
              <Input
                type="number"
                min={0}
                max={maxMarks}
                step={0.5}
                className="w-20 text-center mx-auto"
                value={data[student.usn] ?? ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                  if (value === undefined || (value >= 0 && value <= maxMarks)) {
                    setData(prev => ({
                      ...prev,
                      [student.usn]: value as number
                    }));
                  }
                }}
                placeholder="-"
              />
            </TableCell>
          </TableRow>
        ))}
        {students.length === 0 && (
          <TableRow>
            <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
              No students enrolled in this cohort
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <AuthenticatedLayout allowedRoles={['teacher', 'hod', 'principal']}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-foreground">Assessment Components</h2>
          <p className="text-muted-foreground">
            Manage assignment, attendance, and activity marks
          </p>
        </div>
        
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select Subject Offering</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cohort</Label>
                <Select value={selectedCohortId} onValueChange={handleCohortChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select cohort..." />
                  </SelectTrigger>
                  <SelectContent>
                    {cohorts.map((cohort: Cohort) => (
                      <SelectItem key={cohort.id} value={cohort.id}>
                        {cohort.name} ({cohort.year})
                        {cohort.program && ` - ${cohort.program.code}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Subject Offering</Label>
                <Select 
                  value={selectedOfferingId} 
                  onValueChange={handleOfferingChange}
                  disabled={!selectedCohortId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedCohortId ? "Select subject..." : "Select cohort first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {offerings.map((offering: Offering) => (
                      <SelectItem key={offering.id} value={offering.id}>
                        {offering.subject.code} - {offering.subject.name} (Sem {offering.semester})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Selected Offering Info */}
        {selectedOffering && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{selectedOffering.subject.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedOffering.subject.code} • {selectedOffering.cohort.name} • Semester {selectedOffering.semester}
                  </p>
                </div>
                <Badge variant="secondary" className="ml-auto">
                  {students.length} Students
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Main Content */}
        {!selectedOfferingId ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Select a Subject Offering</h3>
              <p className="text-muted-foreground">
                Choose a cohort and subject to manage assessment components.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="assignments" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Assignments
              </TabsTrigger>
              <TabsTrigger value="attendance" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Attendance
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Activity
              </TabsTrigger>
            </TabsList>
            
            {/* ASSIGNMENTS TAB */}
            <TabsContent value="assignments" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Assignments</CardTitle>
                      <CardDescription>
                        Create assignments and enter marks (5 marks each)
                      </CardDescription>
                    </div>
                    {canCreateAssignment && (
                      <Button onClick={() => setIsCreateAssignmentOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Assignment
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {assignmentsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : assignments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>No assignments created yet</p>
                      {canCreateAssignment && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-4"
                          onClick={() => setIsCreateAssignmentOpen(true)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Create First Assignment
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        {assignments.map((a: Assignment) => (
                          <Button
                            key={a.id}
                            variant={selectedAssignment?.id === a.id ? "default" : "outline"}
                            onClick={() => setSelectedAssignment(a)}
                          >
                            Assignment {a.assignment_no}
                            {a.title && `: ${a.title}`}
                          </Button>
                        ))}
                      </div>
                      
                      {selectedAssignment && (
                        <Card>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle className="text-base">
                                  Assignment {selectedAssignment.assignment_no}
                                  {selectedAssignment.title && ` - ${selectedAssignment.title}`}
                                </CardTitle>
                                <CardDescription>
                                  Max marks: {selectedAssignment.max_marks}
                                  {selectedAssignment.due_before_exam && ` • Due before ${selectedAssignment.due_before_exam}`}
                                </CardDescription>
                              </div>
                              <Button 
                                onClick={handleSaveAssignmentMarks}
                                disabled={saveAssignmentMarksMutation.isPending}
                              >
                                {saveAssignmentMarksMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                  <Save className="w-4 h-4 mr-2" />
                                )}
                                Save Marks
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent>
                            {marksLoading ? (
                              <div className="flex justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin" />
                              </div>
                            ) : (
                              renderMarksTable('assignment', marksData, setMarksData, selectedAssignment.max_marks)
                            )}
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* ATTENDANCE TAB */}
            <TabsContent value="attendance">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Attendance Marks</CardTitle>
                      <CardDescription>
                        5 marks contribution to internal total
                      </CardDescription>
                    </div>
                    <Button 
                      onClick={handleSaveAttendance}
                      disabled={importAttendanceMutation.isPending}
                    >
                      {importAttendanceMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save Attendance
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {renderMarksTable('attendance', attendanceData, setAttendanceData, 5)}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* ACTIVITY TAB */}
            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Classroom Activity Marks</CardTitle>
                      <CardDescription>
                        5 marks contribution to internal total
                      </CardDescription>
                    </div>
                    <Button 
                      onClick={handleSaveActivity}
                      disabled={importActivityMutation.isPending}
                    >
                      {importActivityMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save Activity
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {renderMarksTable('activity', activityData, setActivityData, 5)}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
        
        {/* Create Assignment Dialog */}
        <Dialog open={isCreateAssignmentOpen} onOpenChange={setIsCreateAssignmentOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Assignment</DialogTitle>
              <DialogDescription>
                Create a new assignment for {selectedOffering?.subject.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Assignment Number *</Label>
                  <Select 
                    value={String(assignmentForm.assignment_no)} 
                    onValueChange={(v) => setAssignmentForm({ ...assignmentForm, assignment_no: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Assignment 1</SelectItem>
                      <SelectItem value="2">Assignment 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Max Marks</Label>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={assignmentForm.max_marks}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, max_marks: parseInt(e.target.value) || 5 })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Title (optional)</Label>
                <Input
                  value={assignmentForm.title}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                  placeholder="e.g., Data Structures Implementation"
                />
              </div>
              <div className="space-y-2">
                <Label>Due Before Exam (optional)</Label>
                <Select 
                  value={assignmentForm.due_before_exam} 
                  onValueChange={(v) => setAssignmentForm({ ...assignmentForm, due_before_exam: v as 'INT1' | 'INT2' | '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select exam..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    <SelectItem value="INT1">Internal 1</SelectItem>
                    <SelectItem value="INT2">Internal 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateAssignmentOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateAssignment} disabled={createAssignmentMutation.isPending}>
                {createAssignmentMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Assignment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthenticatedLayout>
  );
}
