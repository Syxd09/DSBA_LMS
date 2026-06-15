import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import { feedbackAnalyticsApi, apiCall } from '@/api/feedbackApi';
import { StudentAnalytics, RiskLevel } from '@/types/feedback.types';
import { StarRatingInput } from '@/components/feedback/StarRatingInput';

const t = {
  studentAnalytics: "Student Analytics",
  detailedFeedbackInsights: "Detailed feedback insights",
  backToAtRiskList: "Back to At-Risk List",
  semesterPrefix: "Semester ",
  teacher: "Teacher",
  feedbackRating: "Feedback Rating",
  averageMarks: "Average Marks",
  feedbackScore: "Feedback Score",
  alignmentIndex: "Alignment Index",
  aligned: "Aligned",
  misaligned: "Misaligned",
  categoryInsights: "Category Insights",
  noAnalyticsAvailable: "No analytics available for this student",
  calculated: "Calculated:",
  updating: "(Updating...)"
};

export default function StudentAnalyticsDetail() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isAuthorized = ['HOD', 'PRINCIPAL', 'ADMIN'].includes(user?.role || '');

  // RBAC: Only HOD/Principal/Admin can access
  useEffect(() => {
    if (user && !isAuthorized) {
      navigate('/dashboard');
    }
  }, [user, navigate, isAuthorized]);

  // Fetch student analytics
  const { data, isLoading, error } = useQuery({
    queryKey: ['student-analytics', studentId],
    queryFn: async () => {
      if (!studentId) throw new Error('Student ID required');
      const response = await apiCall(
        feedbackAnalyticsApi.getStudentAnalytics(studentId)
      );
      return response.analytics;
    },
    enabled: !!studentId && isAuthorized,
  });

  // Safe early return if not authorized (after all hooks have been declared)
  if (!user || !isAuthorized) {
    return null;
  }

  const getRiskBadgeClass = (risk: RiskLevel) => {
    switch (risk) {
      case 'CRITICAL':
        return 'bg-red-600 hover:bg-red-700';
      case 'HIGH':
        return 'bg-orange-600 hover:bg-orange-700';
      case 'MODERATE':
        return 'bg-yellow-600 hover:bg-yellow-700';
      case 'STABLE':
        return 'bg-green-600 hover:bg-green-700';
    }
  };

  const getMarksBandClass = (band: string) => {
    switch (band) {
      case 'HIGH':
        return 'bg-green-600 text-white';
      case 'MEDIUM':
        return 'bg-blue-600 text-white';
      case 'LOW':
        return 'bg-red-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t.studentAnalytics}</h1>
            <p className="text-muted-foreground font-medium flex items-center gap-2">
              {t.detailedFeedbackInsights}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate('/analytics/hod/at-risk')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t.backToAtRiskList}
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {(error as Error).message || 'Failed to load student analytics'}
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : data && data.length > 0 ? (
          <div className="space-y-6">
            {/* Analytics Cards */}
            {data.map((analytics: StudentAnalytics) => (
              <Card key={analytics.feedbackId}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>
                        {analytics.subject.code} - {analytics.subject.name}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary">{t.semesterPrefix}{analytics.semester}</Badge>
                        {analytics.cohort && (
                          <Badge variant="outline">{analytics.cohort.name}</Badge>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant="destructive"
                      className={getRiskBadgeClass(analytics.riskLevel)}
                    >
                      {analytics.riskLevel}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Teacher & Rating */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">{t.teacher}</p>
                        <p className="font-medium">
                          {analytics.teacher.fullName || analytics.teacher.name}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">{t.feedbackRating}</p>
                        <StarRatingInput
                          value={analytics.starRating}
                          onChange={() => {}}
                          disabled
                          size="sm"
                        />
                      </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            {t.averageMarks}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <div className="text-2xl font-bold">
                              {analytics.avgMarks !== null
                                ? `${analytics.avgMarks.toFixed(1)}%`
                                : 'N/A'}
                            </div>
                            {analytics.marksBand && (
                              <Badge className={getMarksBandClass(analytics.marksBand)}>
                                {analytics.marksBand}
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            {t.feedbackScore}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {analytics.feedbackScore.toFixed(1)}
                            <span className="text-sm text-muted-foreground ml-1">/100</span>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            {t.alignmentIndex}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {analytics.alignmentIndex !== null
                              ? analytics.alignmentIndex.toFixed(2)
                              : 'N/A'}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {analytics.alignmentIndex !== null && analytics.alignmentIndex >= 0
                              ? t.aligned
                              : t.misaligned}
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Category Insights */}
                    {analytics.categoryInsights.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">{t.categoryInsights}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {analytics.categoryInsights.map((insight, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-2 border rounded"
                              >
                                <span className="font-medium">{insight.categoryName}</span>
                                <div className="flex items-center gap-3">
                                  <span className="text-sm text-muted-foreground">
                                    {insight.rating}/5
                                  </span>
                                  <Badge
                                    variant={
                                      insight.interpretation === 'Strength'
                                        ? 'default'
                                        : insight.interpretation === 'Satisfactory'
                                        ? 'secondary'
                                        : 'destructive'
                                    }
                                  >
                                    {insight.interpretation}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Calculated Timestamp */}
                    <p className="text-xs text-muted-foreground">
                      {t.calculated} {new Date(analytics.calculatedAt).toLocaleString()}
                      {analytics.isStale && (
                        <span className="ml-2 text-yellow-600">{t.updating}</span>
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64">
              <p className="text-muted-foreground">{t.noAnalyticsAvailable}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
