import { DepartmentStats } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Building2, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DepartmentTableProps {
  departments: DepartmentStats[];
}

export function DepartmentTable({ departments }: DepartmentTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Departmental Performance</CardTitle>
        <CardDescription>Academic synchronization and performance metrics by department.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="py-4 px-6">Department</TableHead>
              <TableHead className="py-4 px-6">Students</TableHead>
              <TableHead className="py-4 px-6">Progress</TableHead>
              <TableHead className="py-4 px-6 text-center">Avg. Score</TableHead>
              <TableHead className="py-4 px-6 text-center">At Risk</TableHead>
              <TableHead className="py-4 px-6 text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {departments.map((dept) => (
              <TableRow key={dept.name}>
                <TableCell className="font-medium py-4 px-6">
                  {dept.name}
                </TableCell>
                <TableCell className="py-4 px-6">{dept.totalStudents}</TableCell>
                <TableCell className="px-6 min-w-[200px]">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{dept.passPercentage}%</span>
                    </div>
                    <Progress value={dept.passPercentage} className="h-1.5" />
                  </div>
                </TableCell>
                <TableCell className="text-center font-semibold px-6">
                  {dept.averageScore?.toFixed(1) || '0.0'}
                </TableCell>
                <TableCell className="text-center px-6">
                  <Badge variant={dept.atRiskStudents > 10 ? "destructive" : "secondary"}>
                    {dept.atRiskStudents || 0}
                  </Badge>
                </TableCell>
                <TableCell className="text-right px-6">
                  <Badge variant={dept.passPercentage >= 85 ? "default" : "outline"}>
                    {dept.passPercentage >= 85 ? 'High Performing' : dept.passPercentage >= 75 ? 'Standard' : 'Needs Review'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
