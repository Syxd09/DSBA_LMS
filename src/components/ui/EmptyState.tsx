/**
 * EduMetrics - Empty State Components
 * U-03: Meaningful empty states for all dashboards
 * 
 * Provides guidance when no data available and suggests next actions.
 */

import { ReactNode } from 'react';
import { 
  FileQuestion, BookOpen, Users, ClipboardList, 
  BarChart3, GraduationCap, AlertCircle, Plus,
  ArrowRight, Target, TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

export type EmptyStateType = 
  | 'no-data' 
  | 'no-results' 
  | 'no-subjects' 
  | 'no-exams' 
  | 'no-students' 
  | 'no-marks' 
  | 'no-analytics'
  | 'no-outcomes'
  | 'error'
  | 'custom';

export interface EmptyStateProps {
  type?: EmptyStateType;
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

// =============================================================================
// PRESET CONFIGS
// =============================================================================

const presets: Record<EmptyStateType, { icon: ReactNode; title: string; description: string }> = {
  'no-data': {
    icon: <FileQuestion className="w-12 h-12 text-muted-foreground" />,
    title: 'No Data Available',
    description: 'There is no data to display at the moment. This section will populate once data is added.'
  },
  'no-results': {
    icon: <AlertCircle className="w-12 h-12 text-muted-foreground" />,
    title: 'No Results Found',
    description: 'Your search or filter did not match any records. Try adjusting your criteria.'
  },
  'no-subjects': {
    icon: <BookOpen className="w-12 h-12 text-blue-400" />,
    title: 'No Subjects Yet',
    description: 'No subjects have been added to this program. Add subjects to start building the curriculum.'
  },
  'no-exams': {
    icon: <ClipboardList className="w-12 h-12 text-amber-400" />,
    title: 'No Exams Created',
    description: 'No exams have been created for this subject. Create an exam to start evaluating students.'
  },
  'no-students': {
    icon: <Users className="w-12 h-12 text-green-400" />,
    title: 'No Students Enrolled',
    description: 'No students are enrolled in this cohort yet. Add students to begin academic tracking.'
  },
  'no-marks': {
    icon: <TrendingUp className="w-12 h-12 text-purple-400" />,
    title: 'No Marks Entered',
    description: 'Marks have not been entered for this exam yet. Start entering marks to enable analytics.'
  },
  'no-analytics': {
    icon: <BarChart3 className="w-12 h-12 text-indigo-400" />,
    title: 'Analytics Not Available',
    description: 'Analytics require marks data. Once marks are entered, detailed insights will appear here.'
  },
  'no-outcomes': {
    icon: <Target className="w-12 h-12 text-rose-400" />,
    title: 'No Outcomes Defined',
    description: 'Course Outcomes (COs) have not been defined for this subject. Define COs to enable outcome-based analysis.'
  },
  'error': {
    icon: <AlertCircle className="w-12 h-12 text-red-400" />,
    title: 'Something Went Wrong',
    description: 'We encountered an error loading this data. Please try refreshing the page.'
  },
  'custom': {
    icon: <FileQuestion className="w-12 h-12 text-muted-foreground" />,
    title: 'Empty',
    description: 'No content available.'
  }
};

// =============================================================================
// COMPONENT
// =============================================================================

export function EmptyState({
  type = 'no-data',
  title,
  description,
  icon,
  action,
  secondaryAction,
  className,
  size = 'md'
}: EmptyStateProps) {
  const preset = presets[type];
  
  const sizeClasses = {
    sm: 'py-6',
    md: 'py-12',
    lg: 'py-20'
  };
  
  const iconSizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };
  
  return (
    <Card className={cn('border-dashed', className)}>
      <CardContent className={cn(
        'flex flex-col items-center justify-center text-center',
        sizeClasses[size]
      )}>
        {/* Icon */}
        <div className="mb-4">
          {icon || preset.icon}
        </div>
        
        {/* Title */}
        <h3 className={cn(
          'font-semibold text-foreground mb-2',
          size === 'sm' && 'text-sm',
          size === 'md' && 'text-lg',
          size === 'lg' && 'text-xl'
        )}>
          {title || preset.title}
        </h3>
        
        {/* Description */}
        <p className={cn(
          'text-muted-foreground max-w-md',
          size === 'sm' && 'text-xs',
          size === 'md' && 'text-sm',
          size === 'lg' && 'text-base'
        )}>
          {description || preset.description}
        </p>
        
        {/* Actions */}
        {(action || secondaryAction) && (
          <div className="flex items-center gap-3 mt-6">
            {action && (
              <Button 
                variant={action.variant || 'default'}
                onClick={action.onClick}
                size={size === 'sm' ? 'sm' : 'default'}
              >
                <Plus className="w-4 h-4 mr-2" />
                {action.label}
              </Button>
            )}
            {secondaryAction && (
              <Button 
                variant="ghost"
                onClick={secondaryAction.onClick}
                size={size === 'sm' ? 'sm' : 'default'}
              >
                {secondaryAction.label}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// SPECIALIZED VARIANTS
// =============================================================================

export function NoExamsEmpty({ onCreateExam }: { onCreateExam?: () => void }) {
  return (
    <EmptyState
      type="no-exams"
      action={onCreateExam ? { label: 'Create Exam', onClick: onCreateExam } : undefined}
    />
  );
}

export function NoStudentsEmpty({ onAddStudents }: { onAddStudents?: () => void }) {
  return (
    <EmptyState
      type="no-students"
      action={onAddStudents ? { label: 'Add Students', onClick: onAddStudents } : undefined}
    />
  );
}

export function NoMarksEmpty({ onEnterMarks }: { onEnterMarks?: () => void }) {
  return (
    <EmptyState
      type="no-marks"
      action={onEnterMarks ? { label: 'Enter Marks', onClick: onEnterMarks } : undefined}
    />
  );
}

export function NoOutcomesEmpty({ onDefineOutcomes }: { onDefineOutcomes?: () => void }) {
  return (
    <EmptyState
      type="no-outcomes"
      action={onDefineOutcomes ? { label: 'Define COs', onClick: onDefineOutcomes } : undefined}
    />
  );
}

export function SearchNoResults({ onClearFilters }: { onClearFilters?: () => void }) {
  return (
    <EmptyState
      type="no-results"
      size="sm"
      action={onClearFilters ? { label: 'Clear Filters', onClick: onClearFilters, variant: 'outline' } : undefined}
    />
  );
}

export default EmptyState;
