import { useParams, useNavigate } from 'react-router-dom';
import { StudentDashboardView } from '@/components/dashboard/StudentDashboardView';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';

export default function StudentProfile360() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) {
    return (
      <AuthenticatedLayout>
        <div className="p-8 text-center text-muted-foreground">
          Invalid Student ID
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-2">
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate(-1)}
                className="hover:bg-primary/10 transition-colors"
            >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
            </Button>
            <div className="h-4 w-px bg-border" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Student 360° View</span>
        </div>

        <StudentDashboardView studentId={id} isStaffView={true} />
      </div>
    </AuthenticatedLayout>
  );
}
