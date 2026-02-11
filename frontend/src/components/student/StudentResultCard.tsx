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
}: StudentResultCardProps) {
  const percentage = (totalMarks / maxMarks) * 100;
  const isAboveAverage = totalMarks > classAverage;
  const isPassing = percentage >= 40;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{subject}</CardTitle>
            <p className="text-sm text-muted-foreground">{examType}</p>
          </div>
          <Badge variant={isPassing ? 'default' : 'destructive'}>
            {isPassing ? 'Pass' : 'Fail'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-4xl font-bold text-foreground">{totalMarks}</p>
            <p className="text-sm text-muted-foreground">out of {maxMarks}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-sm">
              {isAboveAverage ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-destructive" />
              )}
              <span className={isAboveAverage ? 'text-green-500' : 'text-destructive'}>
                {isAboveAverage ? '+' : ''}{(Number(totalMarks - classAverage) || 0).toFixed(1)} vs avg
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Class avg: {(Number(classAverage) || 0).toFixed(1)}</p>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Score</span>
            <span className="font-medium">{(Number(percentage) || 0).toFixed(1)}%</span>
          </div>
          <Progress value={percentage} className="h-2" />
        </div>

        <div className="flex items-center gap-2 p-3 bg-secondary/50">
          <Award className="w-5 h-5 text-primary" />
          <span className="text-sm">
            Rank <strong>{rank}</strong> of {totalStudents} students
          </span>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">CO-wise Performance</p>
          <div className="grid grid-cols-5 gap-2">
            {coScores.map(({ co, score, max }) => {
              const coPercent = (score / max) * 100;
              return (
                <div key={co} className="text-center">
                  <div
                    className={`text-xs font-medium px-2 py-1 ${
                      coPercent >= 70 ? 'bg-green-500/20 text-green-700' : coPercent >= 40 ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive'
                    }`}
                  >
                    {co}
                  </div>
                  <p className="text-sm font-semibold mt-1">{(Number(coPercent) || 0).toFixed(0)}%</p>
                </div>
              );
            })}
          </div>
        </div>

        {!isPassing && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>Focus on CO2 and CO5 for improvement</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
