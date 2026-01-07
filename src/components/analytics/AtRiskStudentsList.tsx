import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RiskLevel, AtRiskStudent } from '@/types/feedback.types';
import { Eye } from 'lucide-react';

interface AtRiskStudentsListProps {
  students: AtRiskStudent[];
  onViewStudent?: (studentId: string) => void;
}

/**
 * Sortable table of at-risk students
 * Follows existing table patterns
 */
export function AtRiskStudentsList({ students, onViewStudent }: AtRiskStudentsListProps) {
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'name' | 'risk' | 'marks' | 'alignment'>('risk');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filter students by risk level
  const filteredStudents = students.filter(student => {
    if (riskFilter === 'all') return true;
    return student.riskLevel === riskFilter;
  });

  // Sort students
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    let compareValue = 0;
    
    switch (sortField) {
      case 'name':
        compareValue = a.studentName.localeCompare(b.studentName);
        break;
      case 'risk':
        const riskOrder = { CRITICAL: 0, HIGH: 1, MODERATE: 2, STABLE: 3 };
        compareValue = riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
        break;
      case 'marks':
        compareValue = (a.avgMarks || 0) - (b.avgMarks || 0);
        break;
      case 'alignment':
        compareValue = (a.alignmentIndex || 0) - (b.alignmentIndex || 0);
        break;
    }
    
    return sortOrder === 'asc' ? compareValue : -compareValue;
  });

  const getRiskBadgeVariant = (risk: RiskLevel) => {
    switch (risk) {
      case 'CRITICAL':
        return 'destructive';
      case 'HIGH':
        return 'default';
      case 'MODERATE':
        return 'secondary';
      case 'STABLE':
        return 'outline';
    }
  };

  const getRiskBadgeClass = (risk: RiskLevel) => {
    switch (risk) {
      case 'CRITICAL':
        return 'bg-red-600 hover:bg-red-700';
      case 'HIGH':
        return 'bg-orange-600 hover:bg-orange-700';
      case 'MODERATE':
        return 'bg-yellow-600 hover:bg-yellow-700';
      case 'STABLE':
        return 'bg-green-600 hover:bg-green-700';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>At-Risk Students ({sortedStudents.length})</CardTitle>
          <div className="flex items-center gap-4">
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by risk" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk Levels</SelectItem>
                <SelectItem value="CRITICAL">Critical Only</SelectItem>
                <SelectItem value="HIGH">High Only</SelectItem>
                <SelectItem value="MODERATE">Moderate Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sortedStudents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No at-risk students found
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer hover:text-foreground"
                  onClick={() => {
                    setSortField('name');
                    setSortOrder(sortField === 'name' && sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                >
                  Student Name {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead>Subject</TableHead>
                <TableHead
                  className="cursor-pointer hover:text-foreground"
                  onClick={() => {
                    setSortField('risk');
                    setSortOrder(sortField === 'risk' && sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                >
                  Risk Level {sortField === 'risk' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:text-foreground text-right"
                  onClick={() => {
                    setSortField('marks');
                    setSortOrder(sortField === 'marks' && sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                >
                  Avg Marks {sortField === 'marks' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:text-foreground text-right"
                  onClick={() => {
                    setSortField('alignment');
                    setSortOrder(sortField === 'alignment' && sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                >
                  Alignment {sortField === 'alignment' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedStudents.map((student) => (
                <TableRow key={`${student.studentId}-${student.subjectId}`}>
                  <TableCell className="font-medium">{student.studentName}</TableCell>
                  <TableCell>{student.subjectName}</TableCell>
                  <TableCell>
                    <Badge
                      variant={getRiskBadgeVariant(student.riskLevel)}
                      className={getRiskBadgeClass(student.riskLevel)}
                    >
                      {student.riskLevel}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {student.avgMarks !== null ? `${student.avgMarks.toFixed(1)}%` : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    {student.alignmentIndex !== null ? student.alignmentIndex.toFixed(2) : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    {onViewStudent && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onViewStudent(student.studentId)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
