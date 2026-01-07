import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAnalytics } from '@/contexts/AnalyticsContext';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { AtRiskStudentsList } from '@/components/analytics/AtRiskStudentsList';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';

export default function AtRiskStudents() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { departmentAnalytics, fetchDepartmentAnalytics, isLoading } = useAnalytics();

  // RBAC: Only HOD can access
  if (user?.role !== 'HOD') {
    navigate('/dashboard');
    return null;
  }

  const departmentId = user.departmentId;
  const riskFilter = searchParams.get('risk');

  // Re-fetch data if not available
  useEffect(() => {
    if (departmentId && !departmentAnalytics) {
      fetchDepartmentAnalytics(departmentId);
    }
  }, [departmentId, departmentAnalytics, fetchDepartmentAnalytics]);

  const handleViewStudent = (studentId: string) => {
    navigate(`/analytics/hod/student/${studentId}`);
  };

  // Filter students by risk level from URL param
  const filteredStudents = riskFilter
    ? departmentAnalytics?.atRiskStudents.filter(s => s.riskLevel === riskFilter) || []
    : departmentAnalytics?.atRiskStudents || [];

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">At-Risk Students</h1>
            <p className="text-muted-foreground">
              {riskFilter
                ? `Students with ${riskFilter} risk level`
                : 'All students requiring attention'}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate('/analytics/hod/dashboard')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <AtRiskStudentsList
            students={filteredStudents}
            onViewStudent={handleViewStudent}
          />
        )}
      </div>
    </AuthenticatedLayout>
  );
}
