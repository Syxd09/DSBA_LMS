import { useAuth } from '@/hooks/useAuth';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { PrincipalDashboard } from '@/components/dashboard/PrincipalDashboard';
import { HODDashboard } from '@/components/dashboard/HODDashboard';
import { TeacherDashboard } from '@/components/dashboard/TeacherDashboard';
import { StudentDashboard } from '@/components/dashboard/StudentDashboard';

export default function Dashboard() {
  const { role } = useAuth();

  const getDashboard = () => {
    switch (role) {
      case 'principal':
        return <PrincipalDashboard />;
      case 'hod':
        return <HODDashboard />;
      case 'teacher':
        return <TeacherDashboard />;
      case 'student':
        return <StudentDashboard />;
      default:
        return <StudentDashboard />;
    }
  };

  return <AuthenticatedLayout>{getDashboard()}</AuthenticatedLayout>;
}
