import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAnalytics } from '@/contexts/AnalyticsContext';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { DepartmentSummaryCards } from '@/components/analytics/DepartmentSummaryCards';
import { RiskDistributionChart } from '@/components/analytics/RiskDistributionChart';
import { AnalyticsFilters } from '@/components/analytics/AnalyticsFilters';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, Bell, RefreshCw } from 'lucide-react';
import { RiskLevel } from '@/types/feedback.types';

const t = {
  departmentAnalytics: "Department Analytics",
  feedbackInsights: "Feedback insights for your department",
  pendingApprovals: "Pending Approvals",
  analyticsUpdating: "Analytics Updating",
  updatingMessage: "Recent exam marks were updated. Analytics are being recalculated and will refresh shortly.",
  quickActions: "Quick Actions",
  viewAllAtRisk: "View All At-Risk Students",
  reviewPendingApprovals: "Review Pending Approvals",
  atRiskStudentsTitle: "At-Risk Students (Top 10)",
  viewAllLink: "View All →",
  noAnalyticsData: "No analytics data available",
  refreshData: "Refresh Data",
  dismiss: "Dismiss",
  noAnalyticsText: "No analytics data available"
};

export default function HODAnalyticsDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    departmentAnalytics,
    filters,
    setFilters,
    fetchDepartmentAnalytics,
    isLoading,
    error,
    clearError
  } = useAnalytics();

  const departmentId = user?.departmentId;

  // RBAC Redirect: Only HOD can access
  useEffect(() => {
    if (user && user.role !== 'HOD') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Fetch filter options
  const { data: subjects = [] } = useQuery({
    queryKey: ['department-subjects', departmentId],
    queryFn: async () => {
      const { data } = await api.get(`/subjects?departmentId=${departmentId}`);
      return data || [];
    },
    enabled: !!departmentId && user?.role === 'HOD',
  });

  const { data: teachers = [] } = useQuery({
    queryKey: ['department-teachers', departmentId],
    queryFn: async () => {
      const { data } = await api.get(`/users?departmentId=${departmentId}&role=TEACHER`);
      return data || [];
    },
    enabled: !!departmentId && user?.role === 'HOD',
  });

  const { data: cohorts = [] } = useQuery({
    queryKey: ['department-cohorts'],
    queryFn: async () => {
      const { data } = await api.get('/cohorts');
      return data || [];
    },
    enabled: user?.role === 'HOD',
  });

  // Fetch pending approvals count
  const { data: pendingApprovals } = useQuery({
    queryKey: ['pending-approvals-count', departmentId],
    queryFn: async () => {
      const { data } = await api.get('/teacher-feedback/pending-approvals', {
        params: { departmentId }
      });
      return data?.feedbacks || [];
    },
    enabled: !!departmentId && user?.role === 'HOD',
  });

  // Initial load
  useEffect(() => {
    if (departmentId && user?.role === 'HOD') {
      fetchDepartmentAnalytics(departmentId);
    }
  }, [departmentId, fetchDepartmentAnalytics, user]);

  // Early return if user is not loaded or is not HOD
  if (!user || user.role !== 'HOD') {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleApplyFilters = () => {
    if (departmentId) {
      fetchDepartmentAnalytics(departmentId, filters);
    }
  };

  const handleResetFilters = () => {
    setFilters({});
    if (departmentId) {
      fetchDepartmentAnalytics(departmentId, {});
    }
  };

  const handleCardClick = (type: 'total' | 'score' | 'marks' | 'at-risk') => {
    if (type === 'at-risk') {
      navigate('/analytics/hod/at-risk');
    }
  };

  const handleRiskSegmentClick = (riskLevel: RiskLevel) => {
    navigate(`/analytics/hod/at-risk?risk=${riskLevel}`);
  };

  const handleViewStudent = (studentId: string) => {
    navigate(`/analytics/hod/student/${studentId}`);
  };

  const handleRefresh = () => {
    if (departmentId) {
      fetchDepartmentAnalytics(departmentId, filters);
    }
  };

  // Check if analytics are stale
  const hasStaleData = false; // Would check analytics.isStale flags

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t.departmentAnalytics}</h1>
            <p className="text-muted-foreground">
              {t.feedbackInsights}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {pendingApprovals && pendingApprovals.length > 0 && (
              <Button
                variant="outline"
                onClick={() => navigate('/analytics/hod/pending-approvals')}
              >
                <Bell className="h-4 w-4 mr-2" />
                {t.pendingApprovals}
                <Badge variant="destructive" className="ml-2">
                  {pendingApprovals.length}
                </Badge>
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <Button
                variant="link"
                size="sm"
                className="ml-2"
                onClick={clearError}
              >
                {t.dismiss}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Stale Data Alert */}
        {hasStaleData && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t.analyticsUpdating}</AlertTitle>
            <AlertDescription>
              {t.updatingMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <AnalyticsFilters
          filters={filters}
          onFiltersChange={setFilters}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
          subjects={subjects}
          teachers={teachers}
          cohorts={cohorts}
        />

        {/* Loading State */}
        {isLoading && !departmentAnalytics ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : departmentAnalytics ? (
          <>
            {/* Summary Cards */}
            <DepartmentSummaryCards
              summary={departmentAnalytics.summary}
              onCardClick={handleCardClick}
            />

            {/* Charts and Lists Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Risk Distribution Chart */}
              <RiskDistributionChart
                riskDistribution={departmentAnalytics.summary.riskDistribution}
                onSegmentClick={handleRiskSegmentClick}
              />

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>{t.quickActions}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => navigate('/analytics/hod/at-risk')}
                    >
                      {t.viewAllAtRisk}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => navigate('/analytics/hod/pending-approvals')}
                    >
                      {t.reviewPendingApprovals}
                      {pendingApprovals && pendingApprovals.length > 0 && (
                        <Badge variant="secondary" className="ml-auto">
                          {pendingApprovals.length}
                        </Badge>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top At-Risk Students Preview */}
            {departmentAnalytics.atRiskStudents.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>
                      {t.atRiskStudentsTitle}
                    </CardTitle>
                    <Button
                      variant="link"
                      onClick={() => navigate('/analytics/hod/at-risk')}
                    >
                      {t.viewAllLink}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {departmentAnalytics.atRiskStudents.slice(0, 10).map((student) => (
                      <div
                        key={`${student.studentId}-${student.subjectId}`}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                        onClick={() => handleViewStudent(student.studentId)}
                      >
                        <div>
                          <p className="font-medium">{student.studentName}</p>
                          <p className="text-sm text-muted-foreground">{student.subjectName}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge
                            variant="destructive"
                            className={
                              student.riskLevel === 'CRITICAL'
                                ? 'bg-red-600'
                                : student.riskLevel === 'HIGH'
                                ? 'bg-orange-600'
                                : 'bg-yellow-600'
                            }
                          >
                            {student.riskLevel}
                          </Badge>
                          {student.avgMarks !== null && (
                            <span className="text-sm text-muted-foreground">
                              {student.avgMarks.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64">
              <p className="text-muted-foreground">{t.noAnalyticsText}</p>
              <Button variant="outline" className="mt-4" onClick={handleRefresh}>
                {t.refreshData}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
