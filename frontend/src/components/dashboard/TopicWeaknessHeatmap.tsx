import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Book, Loader2, TrendingDown, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { roleAnalyticsApi } from '@/lib/api';

interface TopicWeaknessHeatmapProps {
  results: Array<{
    offering_id?: string;
    subject_name: string;
    subject_code?: string;
  }>;
}

export function TopicWeaknessHeatmap({ results }: TopicWeaknessHeatmapProps) {
  const [selectedOffering, setSelectedOffering] = useState<string>('');

  const { data: heatmapData, isLoading } = useQuery({
    queryKey: ['topic-heatmap', selectedOffering],
    queryFn: () => roleAnalyticsApi.getTopicHeatmap(selectedOffering),
    enabled: !!selectedOffering,
  });

  const units = heatmapData?.data?.units || [];
  
  // Filter results with offering_id
  const availableSubjects = results.filter(r => r.offering_id);

  // Get color class based on percentage
  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500/80';
    if (percentage >= 60) return 'bg-green-400/60';
    if (percentage >= 50) return 'bg-yellow-400/60';
    if (percentage >= 35) return 'bg-orange-400/70';
    return 'bg-red-500/80';
  };

  // Find weak and strong topics
  const allTopics = units.flatMap((u: any) => u.topics.map((t: any) => ({ ...t, unit: u.unit_name })));
  const weakTopics = allTopics.filter((t: any) => t.percentage < 50).sort((a: any, b: any) => a.percentage - b.percentage);
  const strongTopics = allTopics.filter((t: any) => t.percentage >= 70).sort((a: any, b: any) => b.percentage - a.percentage);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Book className="w-4 h-4" />
          Topic Weakness Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Subject Selector */}
        <Select value={selectedOffering} onValueChange={setSelectedOffering}>
          <SelectTrigger>
            <SelectValue placeholder="Select a subject to analyze" />
          </SelectTrigger>
          <SelectContent>
            {availableSubjects.map((subject, idx) => (
              <SelectItem key={idx} value={subject.offering_id!}>
                {subject.subject_code || subject.subject_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Results */}
        {!selectedOffering ? (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-sm">Select a subject to view topic-wise performance</p>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : units.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-sm">No topic data available for this subject</p>
          </div>
        ) : (
          <>
            {/* Quick Stats */}
            {weakTopics.length > 0 && (
              <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-4 h-4 text-destructive" />
                  <span className="text-sm font-medium">Focus Areas</span>
                </div>
                <div className="space-y-1">
                  {weakTopics.slice(0, 3).map((topic: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-muted-foreground truncate flex-1">
                        {topic.topic_name} <span className="text-xs">({topic.unit})</span>
                      </span>
                      <Badge variant="destructive" className="ml-2">
                        {(Number(topic.percentage) || 0).toFixed(0)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {strongTopics.length > 0 && (
              <div className="p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium">Strong Areas</span>
                </div>
                <div className="space-y-1">
                  {strongTopics.slice(0, 2).map((topic: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-muted-foreground truncate flex-1">
                        {topic.topic_name}
                      </span>
                      <Badge className="bg-green-500 ml-2">
                        {(Number(topic.percentage) || 0).toFixed(0)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Topic Heatmap */}
            <div className="space-y-4">
              {units.map((unit: any) => (
                <div key={unit.unit_no} className="space-y-2">
                  <p className="text-sm font-medium">
                    Unit {unit.unit_no}: {unit.unit_name}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {unit.topics.map((topic: any) => (
                      <div
                        key={topic.topic_id}
                        className={`p-2 rounded-lg text-center ${getPerformanceColor(topic.percentage)}`}
                        title={`${topic.topic_name}: ${(Number(topic.percentage) || 0).toFixed(1)}%`}
                      >
                        <p className="text-xs font-medium truncate text-white">
                          {topic.topic_name}
                        </p>
                        <p className="text-lg font-bold text-white">
                          {(Number(topic.percentage) || 0).toFixed(0)}%
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
