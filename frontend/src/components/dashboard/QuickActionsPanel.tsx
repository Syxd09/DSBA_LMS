import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Zap, Plus, FileText, Users, ClipboardCheck, Download, 
  BookOpen, BarChart3, Upload, CheckCircle2, Settings
} from 'lucide-react';

export type ActionConfig = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path?: string;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'outline';
};

interface QuickActionsPanelProps {
  title?: string;
  actions: ActionConfig[];
  compact?: boolean;
}

export function QuickActionsPanel({ 
  title = "Quick Actions", 
  actions, 
  compact = false 
}: QuickActionsPanelProps) {
  const navigate = useNavigate();

  const handleAction = (action: ActionConfig) => {
    if (action.onClick) {
      action.onClick();
    } else if (action.path) {
      navigate(action.path);
    }
  };

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {actions.map((action, idx) => (
          <Button
            key={idx}
            variant={action.variant === 'primary' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleAction(action)}
          >
            <action.icon className="w-4 h-4 mr-2" />
            {action.label}
          </Button>
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-500" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {actions.map((action, idx) => (
            <Button
              key={idx}
              variant={action.variant === 'primary' ? 'default' : 'outline'}
              className="h-auto py-3 flex flex-col items-center gap-2"
              onClick={() => handleAction(action)}
            >
              <action.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{action.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Pre-defined action sets for each role
export const teacherActions: ActionConfig[] = [
  { label: 'Create Exam', icon: Plus, path: '/exams', variant: 'primary' },
  { label: 'Enter Marks', icon: ClipboardCheck, path: '/marks' },
  { label: 'Download Template', icon: Download, path: '/exams' },
  { label: 'View Reports', icon: FileText, path: '/reports' },
];

export const hodActions: ActionConfig[] = [
  { label: 'Pending Approvals', icon: CheckCircle2, path: '/exams?status=submitted', variant: 'primary' },
  { label: 'Manage Teachers', icon: Users, path: '/users?role=teacher' },
  { label: 'Batch Analytics', icon: BarChart3, path: '/analytics' },
  { label: 'Department Reports', icon: FileText, path: '/reports' },
];

export const principalActions: ActionConfig[] = [
  { label: 'Institution Overview', icon: BarChart3, path: '/analytics', variant: 'primary' },
  { label: 'Accreditation Status', icon: CheckCircle2, path: '/reports' },
  { label: 'Manage Departments', icon: BookOpen, path: '/departments' },
  { label: 'System Settings', icon: Settings, path: '/settings' },
];

export const studentActions: ActionConfig[] = [
  { label: 'My Performance', icon: BarChart3, path: '/analytics', variant: 'primary' },
  { label: 'View Results', icon: FileText, path: '/reports' },
  { label: 'Download Report', icon: Download, path: '/reports' },
];
