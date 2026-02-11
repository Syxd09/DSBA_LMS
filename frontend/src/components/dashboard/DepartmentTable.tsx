import { DepartmentStats } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface DepartmentTableProps {
  departments: DepartmentStats[];
}

export function DepartmentTable({ departments }: DepartmentTableProps) {
  return (
    <div className="border border-border bg-card">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-foreground">Department Performance</h3>
        <p className="text-sm text-muted-foreground">Current semester overview</p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Department</TableHead>
            <TableHead>Students</TableHead>
            <TableHead>Pass Rate</TableHead>
            <TableHead>Avg Score</TableHead>
            <TableHead>At Risk</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {departments.map((dept) => (
            <TableRow key={dept.name}>
              <TableCell className="font-medium">{dept.name}</TableCell>
              <TableCell>{dept.totalStudents}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Progress value={dept.passPercentage} className="w-20 h-2" />
                  <span className="text-sm">{dept.passPercentage}%</span>
                </div>
              </TableCell>
              <TableCell>{(Number(dept.averageScore) || 0).toFixed(1)}</TableCell>
              <TableCell>
                <span className={dept.atRiskStudents > 20 ? 'text-destructive font-medium' : ''}>
                  {dept.atRiskStudents}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant={dept.passPercentage >= 85 ? 'default' : dept.passPercentage >= 75 ? 'secondary' : 'destructive'}>
                  {dept.passPercentage >= 85 ? 'Excellent' : dept.passPercentage >= 75 ? 'Good' : 'Needs Attention'}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
