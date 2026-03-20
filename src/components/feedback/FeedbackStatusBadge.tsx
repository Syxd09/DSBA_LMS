import { Badge } from '@/components/ui/badge';
import { FeedbackStatus } from '@/types/feedback.types';
import { Circle, CheckCircle2, Lock, Send } from 'lucide-react';

interface FeedbackStatusBadgeProps {
  status: FeedbackStatus;
  className?: string;
}

/**
 * Status badge following existing design system
 * DRAFT (gray) → SUBMITTED (yellow) → APPROVED (green) → LOCKED (blue)
 */
export function FeedbackStatusBadge({ status, className }: FeedbackStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'DRAFT':
        return {
          variant: 'secondary' as const,
          icon: Circle,
          label: 'Draft',
        };
      case 'SUBMITTED':
        return {
          variant: 'default' as const,
          icon: Send,
          label: 'Submitted',
        };
      case 'APPROVED':
        return {
          variant: 'default' as const,
          icon: CheckCircle2,
          label: 'Approved',
          extraClass: 'bg-green-600 hover:bg-green-700',
        };
      case 'LOCKED':
        return {
          variant: 'default' as const,
          icon: Lock,
          label: 'Locked',
          extraClass: 'bg-blue-600 hover:bg-blue-700',
        };
      default:
        const s = status as any;
        return {
          variant: 'secondary' as const,
          icon: Circle,
          label: s ? s.charAt(0) + s.slice(1).toLowerCase() : 'Unknown',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={`${config.extraClass || ''} ${className || ''}`}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}
