
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Loader2, TrendingUp, Users } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

export function FeedbackStats({ examId }: { examId: string | null }) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['feedback-stats', examId],
    queryFn: async () => {
      if (!examId) return null;
      const { data } = await api.get(`/feedback/stats/${examId}`);
      return data;
    },
    enabled: !!examId
  });

  if (!examId) return null;
  if (isLoading) return <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>;
  if (!stats || stats.count === 0) return <div className="text-center p-4 text-muted-foreground">No feedback received yet.</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 border rounded-lg bg-card">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">Avg Rating</span>
          </div>
          <div className="text-2xl font-bold flex items-end gap-1">
            {stats.avgRating}
            <span className="text-sm text-muted-foreground mb-1">/10</span>
          </div>
        </div>
        <div className="p-4 border rounded-lg bg-card">
           <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Users className="w-4 h-4" />
            <span className="text-sm">Responses</span>
          </div>
          <div className="text-2xl font-bold text-foreground">
            {stats.count}
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-medium mb-3">Common Areas for Improvement</h4>
        {Object.keys(stats.improvementCounts || {}).length === 0 ? (
          <p className="text-sm text-muted-foreground">None reported.</p>
        ) : (
          <div className="space-y-3">
             {Object.entries(stats.improvementCounts as Record<string, number>)
                .sort(([,a], [,b]) => b - a)
                .map(([tag, count]) => (
                  <div key={tag}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{tag}</span>
                      <span className="text-muted-foreground">{count} student{count > 1 ? 's' : ''}</span>
                    </div>
                    <Progress value={(count / stats.count) * 100} className="h-2" />
                  </div>
                ))}
          </div>
        )}
      </div>
    </div>
  );
}
