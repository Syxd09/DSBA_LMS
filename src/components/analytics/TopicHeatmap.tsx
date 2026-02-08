/**
 * EduMetrics - Topic Weakness Heatmap Component
 * F-04: Visualization of student performance per topic
 * 
 * Features:
 * - Color-coded heatmap (red=weak, yellow=average, green=strong)
 * - Unit-wise grouping
 * - Hover tooltips with exact scores
 * - Weakness highlighting
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, AlertTriangle, CheckCircle, TrendingDown, BookOpen } from 'lucide-react';
import { topicCoverageApi, insightsApi } from '@/lib/api';

// =============================================================================
// TYPES
// =============================================================================

interface TopicPerformance {
  topic_id: string;
  topic_name: string;
  percentage: number;
  scored: number;
  max_marks: number;
}

interface UnitPerformance {
  unit_no: number;
  unit_name: string;
  topics: TopicPerformance[];
}

interface TopicHeatmapData {
  usn: string;
  offering_id: string;
  units: UnitPerformance[];
}

interface Insight {
  id: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  recommendation: string;
}

// =============================================================================
// COLOR UTILITIES
// =============================================================================

const getPerformanceColor = (percentage: number): string => {
  if (percentage >= 75) return 'bg-emerald-500/80 hover:bg-emerald-500';
  if (percentage >= 60) return 'bg-green-400/70 hover:bg-green-400';
  if (percentage >= 50) return 'bg-yellow-400/70 hover:bg-yellow-400';
  if (percentage >= 40) return 'bg-orange-400/70 hover:bg-orange-400';
  return 'bg-red-500/80 hover:bg-red-500';
};

const getPerformanceLabel = (percentage: number): string => {
  if (percentage >= 75) return 'Excellent';
  if (percentage >= 60) return 'Good';
  if (percentage >= 50) return 'Average';
  if (percentage >= 40) return 'Needs Work';
  return 'Weak';
};

const getSeverityColor = (severity: string): string => {
  switch (severity) {
    case 'info': return 'bg-blue-500/10 text-blue-600 border-blue-200';
    case 'suggestion': return 'bg-yellow-500/10 text-yellow-600 border-yellow-200';
    case 'warning': return 'bg-orange-500/10 text-orange-600 border-orange-200';
    case 'critical': return 'bg-red-500/10 text-red-600 border-red-200';
    default: return 'bg-gray-500/10 text-gray-600 border-gray-200';
  }
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface TopicHeatmapProps {
  usn: string;
  offeringId: string;
  subjectName?: string;
  showInsights?: boolean;
}

export default function TopicHeatmap({ 
  usn, 
  offeringId, 
  subjectName,
  showInsights = true 
}: TopicHeatmapProps) {
  const [hoveredTopic, setHoveredTopic] = useState<string | null>(null);
  
  // Fetch topic performance data
  const { data: heatmapData, isLoading: heatmapLoading, error: heatmapError } = useQuery({
    queryKey: ['topicHeatmap', usn, offeringId],
    queryFn: () => topicCoverageApi.getStudentTopicHeatmap(usn, offeringId),
    enabled: !!usn && !!offeringId,
  });
  
  // Fetch insights if enabled
  const { data: insightsData, isLoading: insightsLoading } = useQuery({
    queryKey: ['studentInsights', offeringId],
    queryFn: () => insightsApi.getStudentInsights(offeringId),
    enabled: showInsights && !!offeringId,
  });
  
  // Calculate summary stats
  const calculateStats = (units: UnitPerformance[]) => {
    const allTopics = units.flatMap(u => u.topics);
    if (allTopics.length === 0) return null;
    
    const avg = allTopics.reduce((sum, t) => sum + t.percentage, 0) / allTopics.length;
    const weak = allTopics.filter(t => t.percentage < 50);
    const strong = allTopics.filter(t => t.percentage >= 75);
    
    return { avg, weakCount: weak.length, strongCount: strong.length, total: allTopics.length };
  };
  
  const stats = heatmapData?.data?.units ? calculateStats(heatmapData.data.units) : null;
  const insights: Insight[] = insightsData?.data || [];
  
  // =============================================================================
  // RENDER
  // =============================================================================
  
  if (heatmapLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  
  if (heatmapError) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-orange-500" />
          <p>Unable to load topic performance data</p>
        </CardContent>
      </Card>
    );
  }
  
  const units: UnitPerformance[] = heatmapData?.data?.units || [];
  
  if (units.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No topic performance data available yet</p>
          <p className="text-sm">Data appears after exam marks are entered</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Header with Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5" />
              Topic Performance Heatmap
            </CardTitle>
            {subjectName && (
              <CardDescription>{subjectName}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {/* Summary Stats */}
            {stats && (
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded ${getPerformanceColor(stats.avg)}`} />
                  <span className="text-sm">
                    Average: <strong>{stats.avg.toFixed(0)}%</strong>
                  </span>
                </div>
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {stats.weakCount} weak topics
                </Badge>
                <Badge variant="secondary" className="gap-1 bg-emerald-100 text-emerald-700">
                  <CheckCircle className="w-3 h-3" />
                  {stats.strongCount} strong topics
                </Badge>
              </div>
            )}
            
            {/* Heatmap Grid */}
            <div className="space-y-4">
              {units.map((unit) => (
                <div key={unit.unit_no} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">
                      Unit {unit.unit_no}
                    </Badge>
                    <span className="text-sm font-medium text-muted-foreground">
                      {unit.unit_name}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {unit.topics.map((topic) => (
                      <Tooltip key={topic.topic_id}>
                        <TooltipTrigger asChild>
                          <div
                            className={`
                              w-24 h-16 rounded-md flex flex-col items-center justify-center
                              cursor-pointer transition-all duration-200
                              ${getPerformanceColor(topic.percentage)}
                              ${hoveredTopic === topic.topic_id ? 'ring-2 ring-primary scale-105' : ''}
                            `}
                            onMouseEnter={() => setHoveredTopic(topic.topic_id)}
                            onMouseLeave={() => setHoveredTopic(null)}
                          >
                            <span className="text-xs font-medium text-white text-center px-1 truncate max-w-full">
                              {topic.topic_name.length > 12 
                                ? topic.topic_name.substring(0, 12) + '...'
                                : topic.topic_name}
                            </span>
                            <span className="text-lg font-bold text-white">
                              {topic.percentage.toFixed(0)}%
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <div className="space-y-1">
                            <p className="font-medium">{topic.topic_name}</p>
                            <p className="text-sm">
                              Score: {topic.scored}/{topic.max_marks} ({topic.percentage.toFixed(1)}%)
                            </p>
                            <p className={`text-sm font-medium ${
                              topic.percentage >= 60 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {getPerformanceLabel(topic.percentage)}
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Legend */}
            <div className="flex items-center gap-4 mt-6 pt-4 border-t">
              <span className="text-sm text-muted-foreground">Legend:</span>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded bg-red-500/80" />
                <span className="text-xs">&lt;40%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded bg-orange-400/70" />
                <span className="text-xs">40-50%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded bg-yellow-400/70" />
                <span className="text-xs">50-60%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded bg-green-400/70" />
                <span className="text-xs">60-75%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded bg-emerald-500/80" />
                <span className="text-xs">&gt;75%</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Insights Section */}
        {showInsights && insights.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Personalized Insights</CardTitle>
              <CardDescription>AI-generated recommendations based on your performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insights.slice(0, 5).map((insight) => (
                  <div
                    key={insight.id}
                    className={`p-3 rounded-lg border ${getSeverityColor(insight.severity)}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{insight.title}</h4>
                        <p className="text-sm mt-1 opacity-90">{insight.description}</p>
                        {insight.recommendation && (
                          <p className="text-sm mt-2 font-medium">
                            💡 {insight.recommendation}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}
