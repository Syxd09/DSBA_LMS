import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PrincipalDashboard } from '@/components/dashboard/PrincipalDashboard';
import { HODDashboard } from '@/components/dashboard/HODDashboard';
import { TeacherDashboard } from '@/components/dashboard/TeacherDashboard';
import { StudentDashboard } from '@/components/dashboard/StudentDashboard';
import { Navigate } from 'react-router-dom';

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const getDashboard = () => {
    switch (user?.role) {
      case 'principal':
        return <PrincipalDashboard />;
      case 'hod':
        return <HODDashboard />;
      case 'teacher':
        return <TeacherDashboard />;
      case 'student':
        return <StudentDashboard />;
      default:
        return <div>Unknown role</div>;
    }
  };

  return <DashboardLayout>{getDashboard()}</DashboardLayout>;
}
