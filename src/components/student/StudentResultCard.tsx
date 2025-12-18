import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Award, AlertTriangle } from 'lucide-react';

interface StudentResultCardProps {
  subject: string;
  examType: string;
  totalMarks: number;
  maxMarks: number;
  rank: number;
  totalStudents: number;
  classAverage: number;
  coScores: Array<{ co: string; score: number; max: number }>;
  grade?: string | null;
  gradePoint?: number | null;
  internal1?: number | null;
  internal2?: number | null;
  external?: number | null;
  feedback?: string | null;
}

export function StudentResultCard({
  subject,
  examType,
  totalMarks,
  maxMarks,
  rank,
  totalStudents,
  classAverage,
  coScores,
  grade,
  gradePoint,
  internal1,
  internal2,
  external,
  feedback,
}: StudentResultCardProps) {
  const percentage = maxMarks > 0 ? (totalMarks / maxMarks) * 100 : 0;
  const isAboveAverage = totalMarks > classAverage;
  const isPassing = percentage >= 40;

  const getGradeBadgeVariant = (g: string) => {
    if (['A+', 'A'].includes(g)) return 'default';
    if (['B+', 'B'].includes(g)) return 'secondary';
    if (g === 'F') return 'destructive';
    return 'outline';
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{subject}</CardTitle>
            <p className="text-sm text-muted-foreground">{examType}</p>
          </div>
          {grade ? (
            <Badge variant={getGradeBadgeVariant(grade)}>{grade}</Badge>
          ) : (
            <Badge variant={isPassing ? 'default' : 'destructive'}>
              {isPassing ? 'Pass' : 'Fail'}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-4xl font-bold text-foreground">{totalMarks.toFixed(1)}</p>
            <p className="text-sm text-muted-foreground">out of {maxMarks}</p>
          </div>
          <div className="text-right">
            {gradePoint !== null && gradePoint !== undefined && (
              <p className="text-lg font-semibold text-primary">{gradePoint.toFixed(1)} GP</p>
            )}
            <div className="flex items-center gap-1 text-sm">
              {isAboveAverage ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-destructive" />
              )}
              <span className={isAboveAverage ? 'text-green-500' : 'text-destructive'}>
                {isAboveAverage ? '+' : ''}{(totalMarks - classAverage).toFixed(1)} vs avg
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Score</span>
            <span className="font-medium">{percentage.toFixed(1)}%</span>
          </div>
          <Progress value={percentage} className="h-2" />
        </div>

        {/* Show internal/external breakdown if available */}
        {(internal1 !== null || internal2 !== null || external !== null) && (
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            {internal1 !== null && internal1 !== undefined && (
              <div className="p-2 bg-secondary/50">
                <p className="text-muted-foreground">Int 1</p>
                <p className="font-semibold">{internal1}</p>
              </div>
            )}
            {internal2 !== null && internal2 !== undefined && (
              <div className="p-2 bg-secondary/50">
                <p className="text-muted-foreground">Int 2</p>
                <p className="font-semibold">{internal2}</p>
              </div>
            )}
            {external !== null && external !== undefined && (
              <div className="p-2 bg-secondary/50">
                <p className="text-muted-foreground">External</p>
                <p className="font-semibold">{external}</p>
              </div>
            )}
          </div>
        )}

        {rank > 0 && (
          <div className="flex items-center gap-2 p-3 bg-secondary/50">
            <Award className="w-5 h-5 text-primary" />
            <span className="text-sm">
              Rank <strong>{rank}</strong> of {totalStudents} students
            </span>
          </div>
        )}

        {coScores.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">CO-wise Performance</p>
            <div className="grid grid-cols-5 gap-2">
              {coScores.map(({ co, score, max }) => {
                const coPercent = max > 0 ? (score / max) * 100 : 0;
                return (
                  <div key={co} className="text-center">
                    <div
                      className={`text-xs font-medium px-2 py-1 ${
                        coPercent >= 70 ? 'bg-green-500/20 text-green-700' : coPercent >= 40 ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive'
                      }`}
                    >
                      {co}
                    </div>
                    <p className="text-sm font-semibold mt-1">{coPercent.toFixed(0)}%</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {feedback && (
          <div className="p-3 bg-muted rounded-md border text-sm">
            <span className="font-semibold block mb-1">Teacher's Feedback:</span>
            <p className="text-muted-foreground">{feedback}</p>
          </div>
        )}

        {!isPassing && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>Needs improvement to pass</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
