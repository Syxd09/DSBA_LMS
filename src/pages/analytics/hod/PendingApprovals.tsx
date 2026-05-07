import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { FeedbackApprovalCard } from '@/components/analytics/FeedbackApprovalCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Search, AlertCircle, CheckCircle2 } from 'lucide-react';
import { teacherFeedbackApi, apiCall } from '@/api/feedbackApi';
import { toast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { useAvailableSemesters } from '@/hooks/useAvailableSemesters';

export default function PendingApprovals() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [semesterFilter, setSemesterFilter] = useState<string>('all');
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set());
  const availableSemesters = useAvailableSemesters();

  // RBAC: Only HOD/Principal/Admin can access
  if (!['HOD', 'PRINCIPAL', 'ADMIN'].includes(user?.role || '')) {
    navigate('/dashboard');
    return null;
  }

  const departmentId = user?.departmentId;

  // Fetch pending approvals
  const { data, isLoading, error } = useQuery({
    queryKey: ['pending-approvals', departmentId],
    queryFn: async () => {
      const response = await apiCall(
        teacherFeedbackApi.getPendingApprovals({ departmentId })
      );
      return response.feedbacks;
    },
  });

  // Fetch subjects for filter
  const { data: subjects = [] } = useQuery({
    queryKey: ['department-subjects', departmentId],
    queryFn: async () => {
      const { data } = await api.get(`/subjects?departmentId=${departmentId}`);
      return data || [];
    },
    enabled: !!departmentId
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (feedbackId: string) => {
      return await apiCall(teacherFeedbackApi.approve(feedbackId));
    },
    onSuccess: (_, feedbackId) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['hod-analytics'] });
      
      setApprovingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(feedbackId);
        return newSet;
      });
      
      toast({
        title: 'Success',
        description: 'Feedback approved successfully'
      });
    },
    onError: (err: any, feedbackId) => {
      setApprovingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(feedbackId);
        return newSet;
      });
      
      toast({
        title: 'Approval Failed',
        description: err.message || 'Could not approve feedback',
        variant: 'destructive'
      });
    }
  });

  const handleApprove = async (feedbackId: string) => {
    setApprovingIds(prev => new Set(prev).add(feedbackId));
    await approveMutation.mutateAsync(feedbackId);
  };

  const handleViewDetails = (feedbackId: string) => {
    navigate(`/feedback/teacher/view/${feedbackId}`);
  };

  // Filter feedback
  const filteredFeedback = data?.filter(feedback => {
    const matchesSearch = 
      feedback.student?.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      feedback.teacher?.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      feedback.subject?.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSubject = subjectFilter === 'all' || feedback.subjectId === subjectFilter;
    const matchesSemester = semesterFilter === 'all' || feedback.semester === parseInt(semesterFilter);
    
    return matchesSearch && matchesSubject && matchesSemester;
  }) || [];

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pending Approvals</h1>
            <p className="text-muted-foreground">
              Review and approve feedback submissions
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/analytics/hod/dashboard')}>
            Back to Dashboard
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by student, teacher, or subject..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {subjects.map((subject: any) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.code} - {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={semesterFilter} onValueChange={setSemesterFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Semesters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Semesters</SelectItem>
                  {availableSemesters.map((sem) => (
                    <SelectItem key={sem} value={sem.toString()}>
                      Semester {sem}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {(error as Error).message || 'Failed to load pending approvals'}
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredFeedback.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-600" />
            <h3 className="text-lg font-medium mb-2">All caught up!</h3>
            <p className="text-muted-foreground">
              {data?.length === 0
                ? 'No pending approvals at the moment'
                : 'No approvals match your current filters'}
            </p>
          </div>
        ) : (
          <>
            {/* Count */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {filteredFeedback.length} of {data?.length} pending approvals
              </p>
            </div>

            {/* Approval Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredFeedback.map((feedback) => (
                <FeedbackApprovalCard
                  key={feedback.id}
                  feedback={feedback}
                  onApprove={handleApprove}
                  onViewDetails={handleViewDetails}
                  isApproving={approvingIds.has(feedback.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
