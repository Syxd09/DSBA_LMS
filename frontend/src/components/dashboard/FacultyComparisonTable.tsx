import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { roleAnalyticsApi } from '@/lib/api';
import { Users, TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';

interface TeacherData {
  teacher_id: string;
  teacher_name: string;
  email: string;
  offerings_count: number;
  total_students: number;
  avg_co_attainment: number;
  effectiveness: 'HIGH' | 'MEDIUM' | 'NEEDS_SUPPORT' | 'NO_DATA';
}

interface TeacherEffectivenessData {
  data: {
    department_name: string;
    teachers: TeacherData[];
    summary: {
      total_teachers: number;
      high_performers: number;
      needs_support: number;
    };
  };
}

export function FacultyComparisonTable() {
  const { data, isLoading, error } = useQuery<TeacherEffectivenessData>({
    queryKey: ['hod-teacher-effectiveness'],
    queryFn: () => roleAnalyticsApi.getTeacherEffectiveness(),
    staleTime: 120000, // 2 minutes
  });

  const getEffectivenessVariant = (effectiveness: string) => {
    switch (effectiveness) {
      case 'HIGH':
        return 'default';
      case 'MEDIUM':
        return 'secondary';
      case 'NEEDS_SUPPORT':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getEffectivenessIcon = (effectiveness: string) => {
    switch (effectiveness) {
      case 'HIGH':
        return <TrendingUp className="w-3 h-3" />;
      case 'NEEDS_SUPPORT':
        return <TrendingDown className="w-3 h-3" />;
      default:
        return <Minus className="w-3 h-3" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="w-4 h-4" />
            Faculty Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data?.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="w-4 h-4" />
            Faculty Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center py-8 text-muted-foreground">
            Unable to load faculty comparison data.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { teachers, summary } = data.data;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="w-4 h-4" />
            Faculty Comparison
          </CardTitle>
          <div className="flex gap-2 text-xs">
            <Badge variant="default">{summary.high_performers} High</Badge>
            <Badge variant="destructive">{summary.needs_support} Need Support</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {teachers && teachers.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Faculty</TableHead>
                <TableHead className="text-center">Subjects</TableHead>
                <TableHead className="text-center">Students</TableHead>
                <TableHead>CO Attainment</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teachers.map((teacher) => (
                <TableRow key={teacher.teacher_id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{teacher.teacher_name}</p>
                      <p className="text-xs text-muted-foreground">{teacher.email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{teacher.offerings_count}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {teacher.total_students}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={teacher.avg_co_attainment} 
                        className="w-20 h-2" 
                      />
                      <span className="text-sm font-medium w-12">
                        {(Number(teacher.avg_co_attainment) || 0).toFixed(1)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge 
                      variant={getEffectivenessVariant(teacher.effectiveness)}
                      className="gap-1"
                    >
                      {getEffectivenessIcon(teacher.effectiveness)}
                      {teacher.effectiveness.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-center py-8 text-muted-foreground">
            No faculty data available. Data will appear after teacher assignments are made.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
