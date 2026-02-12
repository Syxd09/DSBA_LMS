
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { roleAnalyticsApi } from '@/services/analyticsService';
import { examsApi } from '@/services/marksService';
import { FileText, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface QPQICardProps {
  offeringId: string;
  subjectName?: string;
}

export function QPQICard({ offeringId, subjectName }: QPQICardProps) {
  const [selectedExamId, setSelectedExamId] = useState<string>('');

  // 1. Fetch Exams for this offering
  const { data: exams, isLoading: loadingExams } = useQuery({
    queryKey: ['offering-exams', offeringId],
    queryFn: () => examsApi.list({ offering_id: offeringId }),
    enabled: !!offeringId,
  });

  // Select the latest (or specifically INT1/INT2 if available)
  useEffect(() => {
    if (exams && exams.length > 0) {
        // Prefer locked exams, then by date/type.
        // Assuming list returns chronologically or we sort.
        // Simple heuristic: Take the last one.
        const sorted = [...exams].sort((a: any, b: any) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setSelectedExamId(sorted[0].id);
    } else {
        setSelectedExamId('');
    }
  }, [exams]);

  // 2. Fetch QPQI for selected exam
  const { data, isLoading: loadingQPQI, error } = useQuery({
    queryKey: ['qpqi', selectedExamId],
    queryFn: () => roleAnalyticsApi.getQPQI(selectedExamId),
    enabled: !!selectedExamId,
  });

  if (loadingExams || (selectedExamId && loadingQPQI)) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Quality Index
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!exams || exams.length === 0) {
      return (
        <Card className="h-full">
            <CardHeader>
            <CardTitle className="text-base font-semibold">Quality Index</CardTitle>
            </CardHeader>
            <CardContent>
            <div className="text-sm text-muted-foreground py-8 text-center">
                No exams evaluated yet.
            </div>
            </CardContent>
        </Card>
      );
  }

  if (error || !data?.data) {
       return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Quality Index</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Unable to load quality index.</div>
        </CardContent>
      </Card>
    );
  }

  const qpqi = data.data;
  const score = qpqi.qpqi_score || 0;
  
  // Prepare chart data
  const bloomData = Object.entries(qpqi.bloom_distribution || {}).map(([key, value]) => ({
    name: key,
    value: Number(value)
  })).filter(item => item.value > 0);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  let statusColor = "text-green-500";
  
  if (score < 60) {
      statusColor = "text-red-500";
  } else if (score < 80) {
      statusColor = "text-yellow-500";
  }

  const currentExam = exams.find((e: any) => e.id === selectedExamId);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Quality Index
            </CardTitle>
            {exams.length > 1 && (
                <Select value={selectedExamId} onValueChange={setSelectedExamId}>
                    <SelectTrigger className="h-7 text-xs w-[140px]">
                        <SelectValue placeholder="Select Exam" />
                    </SelectTrigger>
                    <SelectContent>
                        {exams.map((e: any) => (
                            <SelectItem key={e.id} value={e.id}>{e.exam_type} ({e.status})</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
            {exams.length === 1 && (
                <CardDescription>{currentExam?.exam_type}</CardDescription>
            )}
          </div>
          <Badge variant={score >= 80 ? "default" : "secondary"}>
             QPQI: {score}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        
        <div className="flex items-center justify-center gap-4 mt-2">
            <div className={`text-4xl font-bold ${statusColor}`}>{score}</div>
            <div className="text-xs text-muted-foreground max-w-[150px] border-l pl-2">
                {qpqi.recommendation}
            </div>
        </div>

        <div className="h-[160px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={bloomData}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={55}
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {bloomData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend verticalAlign="bottom" height={36} iconSize={8} fontSize={10}/>
                </PieChart>
            </ResponsiveContainer>
        </div>
        
        <div className="space-y-1 text-xs text-muted-foreground pb-2">
            <div className="flex justify-between">
                <span>HOTS (Target: 40%)</span>
                <span className="font-medium">{qpqi.hots_percentage}%</span>
            </div>
            <Progress value={Math.min(100, (qpqi.hots_percentage / 40) * 100)} className="h-1.5" />
        </div>

      </CardContent>
    </Card>
  );
}
