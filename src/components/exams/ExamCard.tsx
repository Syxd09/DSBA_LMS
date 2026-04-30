import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, FileEdit, Eye, BarChart, Trash2, Calendar as CalendarIcon, Unlock } from 'lucide-react';
import { format } from 'date-fns';
import { type Exam } from '@/hooks/useExams';

// Using Exam type from @/hooks/useExams

interface ExamCardProps {
  exam: Exam;
  onEdit: (examId: string) => void;
  onView: (examId: string) => void;
  onDelete?: (examId: string) => void;
  onViewFeedback?: (examId: string) => void;
  onUnlock?: (examId: string) => void;
}

export function ExamCard({ exam, onEdit, onView, onDelete, onViewFeedback, onUnlock }: ExamCardProps) {
  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'DRAFT':
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
      case 'PENDING_APPROVAL':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'SCHEDULED':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'PUBLISHED':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'LOCKED':
        return 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20';
      case 'COMPLETED':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  const formatExamType = (type: string, customName?: string) => {
    if (type === 'CUSTOM' && customName) return customName;
    return type
      .replace('INTERNAL_', 'Internal ')
      .replace('MIDSEM', 'Mid-Semester')
      .replace('ENDSEM', 'End-Semester')
      .replace(/_/g, ' ');
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-foreground">
              {exam.subject?.name || 'Unknown Subject'}
            </h3>
            <p className="text-sm text-muted-foreground">{exam.subject?.code}</p>
          </div>
          <Badge className={getStatusColor(exam.status)} variant="outline">
            {exam.status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="secondary" className="font-normal">
            {formatExamType(exam.examType, exam.customTypeName)}
          </Badge>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">{exam.cohort?.name}</span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileEdit className="w-4 h-4" />
            <span>{exam.maxMarks} marks</span>
          </div>
          {exam.duration && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{exam.duration} min</span>
            </div>
          )}
        </div>

        {exam.examDate && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded">
            <CalendarIcon className="w-4 h-4" />
            <span>{format(new Date(exam.examDate), 'PPp')}</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-3 border-t">
        <div className="flex items-center gap-2 w-full">
          {exam.status === 'DRAFT' || exam.status === 'SCHEDULED' ? (
            <>
              <Button size="sm" variant="default" onClick={() => onEdit(exam.id)} className="flex-1">
                <FileEdit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              {onDelete && (
                <Button size="sm" variant="outline" onClick={() => onDelete(exam.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={() => onView(exam.id)} className="flex-1">
                <Eye className="w-4 h-4 mr-2" />
                View
              </Button>
              {exam.status === 'PUBLISHED' && onUnlock && (
                <Button size="sm" variant="outline" onClick={() => onUnlock(exam.id)}>
                  <Unlock className="w-4 h-4 mr-2" />
                  Unlock
                </Button>
              )}
              {onViewFeedback && (
                <Button size="sm" variant="outline" onClick={() => onViewFeedback(exam.id)}>
                  <BarChart className="w-4 h-4 mr-2" />
                  Stats
                </Button>
              )}
            </>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
