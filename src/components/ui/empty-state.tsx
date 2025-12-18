import { ReactNode } from 'react';
import { FileQuestion, FolderOpen, Users, BookOpen, ClipboardList, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type EmptyStateType = 
  | 'default' 
  | 'no-data' 
  | 'no-results' 
  | 'no-students' 
  | 'no-subjects'
  | 'no-exams';

interface EmptyStateProps {
  type?: EmptyStateType;
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const defaultContent: Record<EmptyStateType, { icon: ReactNode; title: string; description: string }> = {
  default: {
    icon: <FileQuestion className="w-12 h-12" />,
    title: 'No data found',
    description: 'There is no data to display at the moment.',
  },
  'no-data': {
    icon: <FolderOpen className="w-12 h-12" />,
    title: 'No data available',
    description: 'Start by adding some data to see it here.',
  },
  'no-results': {
    icon: <Search className="w-12 h-12" />,
    title: 'No results found',
    description: 'Try adjusting your search or filter criteria.',
  },
  'no-students': {
    icon: <Users className="w-12 h-12" />,
    title: 'No students enrolled',
    description: 'Enroll students to this cohort to see them here.',
  },
  'no-subjects': {
    icon: <BookOpen className="w-12 h-12" />,
    title: 'No subjects found',
    description: 'Add subjects to the curriculum to see them here.',
  },
  'no-exams': {
    icon: <ClipboardList className="w-12 h-12" />,
    title: 'No exams created',
    description: 'Create an exam to start entering marks.',
  },
};

export function EmptyState({
  type = 'default',
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  const defaults = defaultContent[type];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      <div className="text-muted-foreground/50 mb-4">
        {icon || defaults.icon}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {title || defaults.title}
      </h3>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        {description || defaults.description}
      </p>
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

interface DataEmptyWrapperProps {
  isEmpty: boolean;
  type?: EmptyStateType;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  children: ReactNode;
}

export function DataEmptyWrapper({
  isEmpty,
  type = 'default',
  title,
  description,
  action,
  children,
}: DataEmptyWrapperProps) {
  if (isEmpty) {
    return (
      <EmptyState
        type={type}
        title={title}
        description={description}
        action={action}
      />
    );
  }

  return <>{children}</>;
}
