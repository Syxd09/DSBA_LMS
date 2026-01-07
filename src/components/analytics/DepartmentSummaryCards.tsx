import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, TrendingUp, Award, AlertTriangle } from 'lucide-react';

interface DepartmentSummaryCardsProps {
  summary: {
    totalFeedback: number;
    avgFeedbackScore: number;
    avgMarks: number;
    avgAlignmentIndex: number;
    riskDistribution: {
      CRITICAL: number;
      HIGH: number;
      MODERATE: number;
      STABLE: number;
    };
  };
  onCardClick?: (type: 'total' | 'score' | 'marks' | 'at-risk') => void;
}

/**
 * Department summary cards - follows existing StatsCard pattern
 * 4 cards: Total Feedback, Avg Score, Avg Marks, At-Risk Count
 */
export function DepartmentSummaryCards({ summary, onCardClick }: DepartmentSummaryCardsProps) {
  const atRiskCount = summary.riskDistribution.CRITICAL + summary.riskDistribution.HIGH;

  const cards = [
    {
      type: 'total' as const,
      title: 'Total Feedback',
      value: summary.totalFeedback,
      icon: FileText,
      description: 'Feedback entries',
      color: 'text-blue-600'
    },
    {
      type: 'score' as const,
      title: 'Avg Feedback Score',
      value: summary.avgFeedbackScore.toFixed(1),
      icon: TrendingUp,
      description: 'Out of 100',
      color: 'text-green-600'
    },
    {
      type: 'marks' as const,
      title: 'Avg Marks',
      value: summary.avgMarks.toFixed(1) + '%',
      icon: Award,
      description: 'Exam performance',
      color: 'text-purple-600'
    },
    {
      type: 'at-risk' as const,
      title: 'At-Risk Students',
      value: atRiskCount,
      icon: AlertTriangle,
      description: 'Critical + High risk',
      color: 'text-red-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.type}
            className={onCardClick ? 'cursor-pointer hover:border-primary transition-colors' : ''}
            onClick={() => onCardClick && onCardClick(card.type)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <Icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
