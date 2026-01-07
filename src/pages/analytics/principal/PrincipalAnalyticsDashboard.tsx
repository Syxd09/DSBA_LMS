import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAnalytics } from '@/contexts/AnalyticsContext';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { CollegeSummaryCards } from '@/components/analytics/CollegeSummaryCards';
import { DepartmentComparisonChart } from '@/components/analytics/DepartmentComparisonChart';
import { TrendAnalysisChart } from '@/components/analytics/TrendAnalysisChart';
import { RiskDistributionChart } from '@/components/analytics/RiskDistributionChart';
import { AnalyticsFilters } from '@/components/analytics/AnalyticsFilters';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, Lock, RefreshCw, TrendingUp } from 'lucide-react';
import { RiskLevel } from '@/types/feedback.types';

export default function PrincipalAnalyticsDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    collegeAnalytics,
    filters,
    setFilters,
    fetchCollegeAnalytics,
    isLoading,
    error,
    clearError
  } = useAnalytics();

  // Fetch all departments
  const { data: departments = [] } = useQuery({
    queryKey: ['all-departments'],
    queryFn: async () => {
      const { data } = await api.get('/departments');
      return data || [];
    },
  });

  // Fetch subjects for filters
  const { data: subjects = [] } = useQuery({
    queryKey: ['all-subjects'],
    queryFn: async () => {
      const { data } = await api.get('/subjects');
      return data || [];
    },
  });

  // Fetch cohorts for filters
  const { data: cohorts = [] } = useQuery({
    queryKey: ['all-cohorts'],
    queryFn: async () => {
      const { data } = await api.get('/cohorts');
      return data || [];
    },
  });

  // Fetch pending locks count
  const { data: pendingLocks } = useQuery({
    queryKey: ['pending-locks-count'],
    queryFn: async () => {
      const { data } = await api.get('/teacher-feedback/final-approvals');
      return data?.feedbacks || [];
    },
  });

  // Initial load
  useEffect(() => {
    fetchCollegeAnalytics();
  }, [fetchCollegeAnalytics]);

  // RBAC: Only Principal/Admin can access - check AFTER all hooks
  useEffect(() => {
    if (user?.role !== 'PRINCIPAL' && user?.role !== 'ADMIN') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Early return if not authorized (after all hooks have been called)
  if (user?.role !== 'PRINCIPAL' && user?.role !== 'ADMIN') {
    return null;
  }

  const handleApplyFilters = () => {
    fetchCollegeAnalytics(filters);
  };

  const handleResetFilters = () => {
    setFilters({});
    fetchCollegeAnalytics({});
  };

  const handleCardClick = (type: 'total' | 'score' | 'marks' | 'at-risk' | 'departments' | 'locks') => {
    if (type === 'locks') {
      navigate('/analytics/principal/final-approvals');
    }
    // Other card clicks could navigate to relevant views
  };

  const handleDepartmentClick = (departmentId: string) => {
    // Navigate to department detail (reuse HOD dashboard)
    navigate(`/analytics/principal/department/${departmentId}`);
  };

  const handleRiskSegmentClick = (riskLevel: RiskLevel) => {
    // Could navigate to college-wide at-risk view
    console.log('Risk segment clicked:', riskLevel);
  };

  const handleRefresh = () => {
    fetchCollegeAnalytics(filters);
  };

  // Trend data (simplified - would need multi-semester data)
  // For now, placeholder
  const trendData = [
    { semester: 1, ...{} },
    { semester: 2, ...{} },
    // Would populate from analytics
  ];

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">College Analytics</h1>
            <p className="text-muted-foreground">
              Strategic oversight across all departments
            </p>
          </div>
          <div className="flex items-center gap-3">
            {pendingLocks && pendingLocks.length > 0 && (
              <Button
                variant="outline"
                onClick={() => navigate('/analytics/principal/final-approvals')}
              >
                <Lock className="h-4 w-4 mr-2" />
                Final Approvals
                <Badge variant="destructive" className="ml-2">
                  {pendingLocks.length}
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
                Dismiss
              </Button>
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
          cohorts={cohorts}
        />

        {/* Loading State */}
        {isLoading && !collegeAnalytics ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : collegeAnalytics ? (
          <>
            {/* Summary Cards */}
            <CollegeSummaryCards
              summary={collegeAnalytics.summary}
              pendingLocksCount={pendingLocks?.length || 0}
              onCardClick={handleCardClick}
            />

            {/* Charts Row 1: Comparison + Risk */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DepartmentComparisonChart
                departments={collegeAnalytics.departmentBreakdown || []}
                onDepartmentClick={handleDepartmentClick}
              />
              <RiskDistributionChart
                riskDistribution={collegeAnalytics.summary.riskDistribution}
                onSegmentClick={handleRiskSegmentClick}
              />
            </div>

            {/* Trend Analysis */}
            {trendData.length > 0 && departments.length > 0 && (
              <TrendAnalysisChart
                data={trendData}
                departments={departments}
              />
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Strategic Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto py-4"
                    onClick={() => navigate('/analytics/principal/final-approvals')}
                  >
                    <div className="flex flex-col items-start">
                      <div className="flex items-center gap-2 mb-1">
                        <Lock className="h-4 w-4" />
                        <span className="font-medium">Final Approvals</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Lock NAAC evidence
                      </span>
                      {pendingLocks && pendingLocks.length > 0 && (
                        <Badge variant="secondary" className="mt-2">
                          {pendingLocks.length} pending
                        </Badge>
                      )}
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto py-4"
                    onClick={() => {/* Could open trends modal */}}
                  >
                    <div className="flex flex-col items-start">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="h-4 w-4" />
                        <span className="font-medium">Trend Analysis</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Cross-semester comparison
                      </span>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto py-4"
                    onClick={() => {/* Could open export modal */}}
                  >
                    <div className="flex flex-col items-start">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle className="h-4 w-4" />
                        <span className="font-medium">At-Risk Students</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        College-wide view
                      </span>
                      {collegeAnalytics.atRiskStudents && (
                        <Badge variant="destructive" className="mt-2">
                          {collegeAnalytics.atRiskStudents.length} students
                        </Badge>
                      )}
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Department Breakdown Table */}
            {collegeAnalytics.departmentBreakdown && collegeAnalytics.departmentBreakdown.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Department Performance Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-4 font-medium">Department</th>
                          <th className="text-right py-2 px-4 font-medium">Feedback Count</th>
                          <th className="text-right py-2 px-4 font-medium">Avg Score</th>
                          <th className="text-right py-2 px-4 font-medium">Avg Marks</th>
                          <th className="text-right py-2 px-4 font-medium">At-Risk</th>
                        </tr>
                      </thead>
                      <tbody>
                        {collegeAnalytics.departmentBreakdown.map((dept) => (
                          <tr
                            key={dept.departmentId}
                            className="border-b hover:bg-accent cursor-pointer"
                            onClick={() => handleDepartmentClick(dept.departmentId)}
                          >
                            <td className="py-3 px-4 font-medium">{dept.departmentName}</td>
                            <td className="text-right py-3 px-4">{dept.totalFeedback}</td>
                            <td className="text-right py-3 px-4">{dept.avgFeedbackScore.toFixed(1)}</td>
                            <td className="text-right py-3 px-4">{dept.avgMarks.toFixed(1)}%</td>
                            <td className="text-right py-3 px-4">
                              <Badge variant={dept.atRiskCount > 0 ? 'destructive' : 'secondary'}>
                                {dept.atRiskCount}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64">
              <p className="text-muted-foreground">No analytics data available</p>
              <Button variant="outline" className="mt-4" onClick={handleRefresh}>
                Refresh Data
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
