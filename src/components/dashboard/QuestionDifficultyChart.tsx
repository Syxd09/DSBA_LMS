import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { roleAnalyticsApi } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { HelpCircle, Loader2 } from 'lucide-react';

interface QuestionDifficultyChartProps {
  offeringId?: string;
}

export function QuestionDifficultyChart({ offeringId }: QuestionDifficultyChartProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['question-analysis', offeringId],
    queryFn: () => roleAnalyticsApi.getQuestionAnalysis(offeringId!),
    enabled: !!offeringId,
    staleTime: 60000,
  });

  if (!offeringId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            Question Difficulty Index
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center py-8 text-muted-foreground">
            Select an exam to view question difficulty analysis.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            Question Difficulty Index
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const questionData = data?.data?.questions || [];
  
  // Process difficulty data
  const difficultyData = questionData.map((q: any, index: number) => {
    // Difficulty Index = (Average Marks / Max Marks) * 100
    // Lower value = harder question
    const difficultyIndex = q.max_marks > 0 
      ? ((q.average_marks || 0) / q.max_marks) * 100 
      : 0;
    
    return {
      question: `Q${index + 1}`,
      difficulty: Math.round(difficultyIndex),
      avgMarks: q.average_marks || 0,
      maxMarks: q.max_marks || 0,
      attemptRate: q.attempt_rate || 0,
      bloom: q.bloom_level || 'Unknown',
      co: q.co_code || 'N/A',
    };
  });

  // Calculate statistics
  const avgDifficulty = difficultyData.length > 0
    ? difficultyData.reduce((sum: number, d: any) => sum + d.difficulty, 0) / difficultyData.length
    : 0;
  
  const easyQuestions = difficultyData.filter((d: any) => d.difficulty >= 70).length;
  const hardQuestions = difficultyData.filter((d: any) => d.difficulty < 40).length;
  const moderateQuestions = difficultyData.length - easyQuestions - hardQuestions;

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty >= 70) return 'hsl(var(--chart-2))'; // Green - Easy
    if (difficulty >= 40) return 'hsl(var(--chart-3))'; // Yellow - Moderate
    return 'hsl(var(--destructive))'; // Red - Hard
  };

  const getDifficultyLabel = (difficulty: number) => {
    if (difficulty >= 70) return 'Easy';
    if (difficulty >= 40) return 'Moderate';
    return 'Hard';
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            Question Difficulty Analysis
          </CardTitle>
          <Badge variant="outline">
            Avg: {Math.round(avgDifficulty)}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {difficultyData.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            No question analysis data available for this exam.
          </p>
        ) : (
          <>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={difficultyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="question" tick={{ fontSize: 10 }} />
                  <YAxis 
                    tick={{ fontSize: 11 }} 
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-background border rounded-lg p-3 shadow-lg">
                            <p className="font-medium">{d.question}</p>
                            <p className="text-sm text-muted-foreground">
                              Difficulty: {d.difficulty}% ({getDifficultyLabel(d.difficulty)})
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Avg: {d.avgMarks.toFixed(1)}/{d.maxMarks}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Bloom: {d.bloom} • {d.co}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine y={50} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                  <Bar dataKey="difficulty" radius={[4, 4, 0, 0]}>
                    {difficultyData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={getDifficultyColor(entry.difficulty)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Summary */}
            <div className="grid grid-cols-3 gap-2 mt-4 text-center text-sm">
              <div className="p-2 bg-green-50 dark:bg-green-950 rounded-lg">
                <p className="font-semibold text-green-600">{easyQuestions}</p>
                <p className="text-xs text-muted-foreground">Easy (≥70%)</p>
              </div>
              <div className="p-2 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                <p className="font-semibold text-yellow-600">{moderateQuestions}</p>
                <p className="text-xs text-muted-foreground">Moderate</p>
              </div>
              <div className="p-2 bg-red-50 dark:bg-red-950 rounded-lg">
                <p className="font-semibold text-red-600">{hardQuestions}</p>
                <p className="text-xs text-muted-foreground">Hard (&lt;40%)</p>
              </div>
            </div>

            {hardQuestions > difficultyData.length * 0.5 && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ Over 50% of questions are considered hard. Consider reviewing question design or teaching coverage.
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
