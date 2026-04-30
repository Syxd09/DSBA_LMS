import { DepartmentStats } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Building2, ArrowUpRight } from 'lucide-react';

interface DepartmentTableProps {
  departments: DepartmentStats[];
}

export function DepartmentTable({ departments }: DepartmentTableProps) {
  return (
    <Card className="border-none shadow-xl bg-card/60 backdrop-blur-xl overflow-hidden">
      <CardHeader className="border-b border-border/50 bg-muted/20">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-black flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Departmental Performance Ledger
            </CardTitle>
            <CardDescription className="font-medium mt-1">Cross-departmental academic synchronization and metrics</CardDescription>
          </div>
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold">
            Live Ecosystem
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-bold text-xs uppercase tracking-widest text-muted-foreground py-4 px-6">Department</TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-widest text-muted-foreground py-4 px-6">Enrolled</TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-widest text-muted-foreground py-4 px-6">Pass Velocity</TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-widest text-muted-foreground py-4 px-6 text-center">Avg. Score</TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-widest text-muted-foreground py-4 px-6 text-center">Risk Index</TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-widest text-muted-foreground py-4 px-6 text-right">Operational Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {departments.map((dept) => (
              <TableRow key={dept.name} className="group transition-colors hover:bg-primary/5 border-border/40">
                <TableCell className="font-bold text-foreground py-4 px-6">
                  <div className="flex items-center gap-2">
                    {dept.name}
                    <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                  </div>
                </TableCell>
                <TableCell className="font-medium text-muted-foreground px-6">{dept.totalStudents}</TableCell>
                <TableCell className="px-6 min-w-[200px]">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
                      <span>PROGRESSION</span>
                      <span>{dept.passPercentage}%</span>
                    </div>
                    <Progress 
                      value={dept.passPercentage} 
                      className="h-1.5 bg-muted shadow-inner" 
                    />
                  </div>
                </TableCell>
                <TableCell className="text-center font-black text-foreground px-6">
                  {dept.averageScore.toFixed(1)}
                </TableCell>
                <TableCell className="text-center px-6">
                  <span className={dept.atRiskStudents > 20 ? 'text-destructive font-black' : 'font-bold text-muted-foreground'}>
                    {dept.atRiskStudents || 0}
                  </span>
                </TableCell>
                <TableCell className="text-right px-6">
                  <Badge 
                    className="font-black text-[10px] tracking-tighter"
                    variant={dept.passPercentage >= 85 ? 'default' : dept.passPercentage >= 75 ? 'secondary' : 'destructive'}
                  >
                    {dept.passPercentage >= 85 ? 'ELITE' : dept.passPercentage >= 75 ? 'OPTIMAL' : 'INTERVENTION'}
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
