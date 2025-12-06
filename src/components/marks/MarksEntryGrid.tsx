import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, Send, AlertCircle } from 'lucide-react';
import { StudentMark } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

interface MarksEntryGridProps {
  students: StudentMark[];
  subQuestions: Array<{ id: string; label: string; maxMarks: number }>;
  onSave: (marks: StudentMark[]) => void;
  onPublish: () => void;
}

export function MarksEntryGrid({ students: initialStudents, subQuestions, onSave, onPublish }: MarksEntryGridProps) {
  const [students, setStudents] = useState(initialStudents);
  const [hasChanges, setHasChanges] = useState(false);

  const handleMarkChange = (studentId: string, subQuestionId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    const maxMarks = subQuestions.find(sq => sq.id === subQuestionId)?.maxMarks || 10;
    const clampedValue = Math.min(Math.max(numValue, 0), maxMarks);

    setStudents(prev =>
      prev.map(student => {
        if (student.studentId === studentId) {
          const newMarks = { ...student.marks, [subQuestionId]: clampedValue };
          const totalMarks = Object.values(newMarks).reduce((sum, mark) => sum + mark, 0);
          return { ...student, marks: newMarks, totalMarks };
        }
        return student;
      })
    );
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave(students);
    setHasChanges(false);
    toast({
      title: 'Marks saved',
      description: 'All changes have been saved successfully.',
    });
  };

  const handlePublish = () => {
    if (hasChanges) {
      toast({
        title: 'Please save first',
        description: 'Save your changes before publishing.',
        variant: 'destructive',
      });
      return;
    }
    onPublish();
    toast({
      title: 'Marks published',
      description: 'Results are now visible to students.',
    });
  };

  const totalMaxMarks = subQuestions.reduce((sum, sq) => sum + sq.maxMarks, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Marks Entry</h3>
          <p className="text-sm text-muted-foreground">Enter marks for each sub-question</p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="outline" className="gap-1">
              <AlertCircle className="w-3 h-3" />
              Unsaved changes
            </Badge>
          )}
          <Button variant="outline" onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>
          <Button onClick={handlePublish}>
            <Send className="w-4 h-4 mr-2" />
            Publish
          </Button>
        </div>
      </div>

      <div className="border border-border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-card z-10">Roll No</TableHead>
              <TableHead className="sticky left-20 bg-card z-10">Student Name</TableHead>
              {subQuestions.map(sq => (
                <TableHead key={sq.id} className="text-center min-w-[80px]">
                  <div>{sq.label}</div>
                  <div className="text-xs font-normal text-muted-foreground">/{sq.maxMarks}</div>
                </TableHead>
              ))}
              <TableHead className="text-center">
                <div>Total</div>
                <div className="text-xs font-normal text-muted-foreground">/{totalMaxMarks}</div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map(student => (
              <TableRow key={student.studentId}>
                <TableCell className="sticky left-0 bg-card font-mono text-sm">
                  {student.rollNumber}
                </TableCell>
                <TableCell className="sticky left-20 bg-card font-medium">
                  {student.studentName}
                </TableCell>
                {subQuestions.map(sq => (
                  <TableCell key={sq.id} className="p-1">
                    <Input
                      type="number"
                      min={0}
                      max={sq.maxMarks}
                      step={0.5}
                      value={student.marks[sq.id] ?? ''}
                      onChange={(e) => handleMarkChange(student.studentId, sq.id, e.target.value)}
                      className="w-16 text-center h-8"
                    />
                  </TableCell>
                ))}
                <TableCell className="text-center font-semibold">
                  <span className={student.totalMarks < totalMaxMarks * 0.4 ? 'text-destructive' : ''}>
                    {student.totalMarks}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-destructive rounded-full" />
          <span>Below 40% (Fail)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-primary rounded-full" />
          <span>Pass</span>
        </div>
      </div>
    </div>
  );
}
