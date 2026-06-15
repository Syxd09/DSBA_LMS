import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { FeedbackLockCard } from '@/components/analytics/FeedbackLockCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Search, AlertCircle, Lock } from 'lucide-react';
import { teacherFeedbackApi, apiCall } from '@/api/feedbackApi';
import { toast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { useAvailableSemesters } from '@/hooks/useAvailableSemesters';

export default function FinalApprovals() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [semesterFilter, setSemesterFilter] = useState<string>('all');
  const [lockingIds, setLockingIds] = useState<Set<string>>(new Set());
  const availableSemesters = useAvailableSemesters();

  const isAuthorized = user?.role === 'PRINCIPAL' || user?.role === 'ADMIN';

  // RBAC: Only Principal/Admin can access
  useEffect(() => {
    if (user && !isAuthorized) {
      navigate('/dashboard');
    }
  }, [user, navigate, isAuthorized]);

  // Fetch pending locks (APPROVED feedback)
  const { data, isLoading, error } = useQuery({
    queryKey: ['final-approvals'],
    queryFn: async () => {
      const response = await apiCall(
        teacherFeedbackApi.getFinalApprovals()
      );
      return response.feedbacks;
    },
    enabled: isAuthorized,
  });

  // Fetch departments for filter
  const { data: departments = [] } = useQuery({
    queryKey: ['all-departments'],
    queryFn: async () => {
      const { data } = await api.get('/departments');
      return data || [];
    },
    enabled: isAuthorized,
  });

  // Lock mutation
  const lockMutation = useMutation({
    mutationFn: async (feedbackId: string) => {
      return await apiCall(teacherFeedbackApi.lock(feedbackId));
    },
    onSuccess: (_, feedbackId) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['final-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['college-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['hod-analytics'] });
      
      setLockingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(feedbackId);
        return newSet;
      });
      
      toast({
        title: 'Feedback Locked Successfully',
        description: 'This feedback is now permanent NAAC evidence.',
        variant: 'default'
      });
    },
    onError: (err: any, feedbackId) => {
      setLockingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(feedbackId);
        return newSet;
      });
      
      toast({
        title: 'Lock Failed',
        description: err.message || 'Could not lock feedback. Only APPROVED feedback can be locked.',
        variant: 'destructive'
      });
    }
  });

  // Safe early return if not authorized (after all hooks have been declared)
  if (!isAuthorized) {
    return null;
  }

  const handleLock = async (feedbackId: string) => {
    setLockingIds(prev => new Set(prev).add(feedbackId));
    await lockMutation.mutateAsync(feedbackId);
  };

  const handleViewDetails = (feedbackId: string) => {
    navigate(`/feedback/teacher/view/${feedbackId}`);
  };

  // Filter feedback
  const filteredFeedback = data?.filter(feedback => {
    const matchesSearch = 
      feedback.student?.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      feedback.teacher?.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      feedback.subject?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      feedback.department?.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDepartment = departmentFilter === 'all' || feedback.departmentId === departmentFilter;
    const matchesSemester = semesterFilter === 'all' || feedback.semester === parseInt(semesterFilter);
    
    return matchesSearch && matchesDepartment && matchesSemester;
  }) || [];

  // Group by department
  const groupedByDepartment = filteredFeedback.reduce((acc, feedback) => {
    const deptName = feedback.department?.name || 'Unknown';
    if (!acc[deptName]) {
      acc[deptName] = [];
    }
    acc[deptName].push(feedback);
    return acc;
  }, {} as Record<string, typeof filteredFeedback>);

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Final Approvals</h1>
            <p className="text-muted-foreground">
              Lock APPROVED feedback as permanent NAAC evidence
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/analytics/principal/dashboard')}>
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
                    placeholder="Search by student, teacher, subject, or department..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept: any) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
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
              {(error as Error).message || 'Failed to load final approvals'}
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
            <Lock className="h-12 w-12 mx-auto mb-4 text-green-600" />
            <h3 className="text-lg font-medium mb-2">No Pending Locks</h3>
            <p className="text-muted-foreground">
              {data?.length === 0
                ? 'All APPROVED feedback has been locked'
                : 'No feedback matches your current filters'}
            </p>
          </div>
        ) : (
          <>
            {/* Count */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {filteredFeedback.length} of {data?.length} pending locks
              </p>
            </div>

            {/* Grouped by Department */}
            <div className="space-y-6">
              {Object.entries(groupedByDepartment).map(([deptName, feedbacks]) => (
                <div key={deptName}>
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    {deptName}
                    <Badge variant="secondary">{feedbacks.length}</Badge>
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {feedbacks.map((feedback) => (
                      <FeedbackLockCard
                        key={feedback.id}
                        feedback={feedback}
                        onLock={handleLock}
                        onViewDetails={handleViewDetails}
                        isLocking={lockingIds.has(feedback.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
