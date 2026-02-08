import { useState, useEffect, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, Send, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface SubQuestion {
  id: string;
  label: string;
  maxMarks: number;
  questionId: string;
}

interface Student {
  studentId: string;
  studentName: string;
  rollNumber: string;
}

interface MarksEntryGridProps {
  students: Student[];
  subQuestions: SubQuestion[];
  existingMarks: Array<{ student_id: string; sub_question_id: string; marks: number }>;
  onSave: (marks: Array<{ studentId: string; subQuestionId: string; marks: number }>) => Promise<void>;
  onPublish: () => Promise<void>;
  isPublished?: boolean;
  isSaving?: boolean;
  isLocked?: boolean;
  onRequestEdit?: () => void;
}

export function MarksEntryGrid({ 
  students, 
  subQuestions, 
  existingMarks,
  onSave, 
  onPublish,
  isPublished = false,
  isSaving = false,
  isLocked = false,
  onRequestEdit,
}: MarksEntryGridProps) {
  const [marksData, setMarksData] = useState<Record<string, Record<string, number>>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Initialize marks from existing data
  useEffect(() => {
    const initialMarks: Record<string, Record<string, number>> = {};
    
    students.forEach(student => {
      initialMarks[student.studentId] = {};
      subQuestions.forEach(sq => {
        const existing = existingMarks.find(
          m => m.student_id === student.studentId && m.sub_question_id === sq.id
        );
        initialMarks[student.studentId][sq.id] = existing?.marks ?? 0;
      });
    });
    
    setMarksData(initialMarks);
    setHasChanges(false);
  }, [students, subQuestions, existingMarks]);

  const handleMarkChange = (studentId: string, subQuestionId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    const maxMarks = subQuestions.find(sq => sq.id === subQuestionId)?.maxMarks || 10;
    const clampedValue = Math.min(Math.max(numValue, 0), maxMarks);

    setMarksData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [subQuestionId]: clampedValue,
      },
    }));
    setHasChanges(true);
  };

  const calculateTotal = (studentId: string) => {
    const studentMarks = marksData[studentId] || {};
    return Object.values(studentMarks).reduce((sum, mark) => sum + (mark || 0), 0);
  };

  const totalMaxMarks = useMemo(() => 
    subQuestions.reduce((sum, sq) => sum + sq.maxMarks, 0), 
    [subQuestions]
  );

  const handleSave = async () => {
    const marksArray: Array<{ studentId: string; subQuestionId: string; marks: number }> = [];
    
    Object.entries(marksData).forEach(([studentId, marks]) => {
      Object.entries(marks).forEach(([subQuestionId, mark]) => {
        if (mark > 0) {
          marksArray.push({ studentId, subQuestionId, marks: mark });
        }
      });
    });

    try {
      await onSave(marksArray);
      setHasChanges(false);
      toast({
        title: 'Marks saved',
        description: 'All changes have been saved successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error saving marks',
        description: 'Failed to save marks. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handlePublish = async () => {
    if (hasChanges) {
      toast({
        title: 'Please save first',
        description: 'Save your changes before publishing.',
        variant: 'destructive',
      });
      return;
    }

    setIsPublishing(true);
    try {
      await onPublish();
      toast({
        title: 'Marks published',
        description: 'Results are now visible to students.',
      });
    } catch (error) {
      toast({
        title: 'Error publishing',
        description: 'Failed to publish marks. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  if (students.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No students enrolled in this cohort.
      </div>
    );
  }

  if (subQuestions.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Please create exam structure first before entering marks.
      </div>
    );
  }

  // Group sub-questions by question
  const groupedSubQuestions = useMemo(() => {
    const groups: Record<string, SubQuestion[]> = {};
    subQuestions.forEach(sq => {
      if (!groups[sq.questionId]) {
        groups[sq.questionId] = [];
      }
      groups[sq.questionId].push(sq);
    });
    return groups;
  }, [subQuestions]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Marks Entry</h3>
          <p className="text-sm text-muted-foreground">
            {isPublished ? 'Published - Read only' : 'Enter marks for each sub-question'}
          </p>
        </div>
        {!isPublished && (
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Badge variant="outline" className="gap-1">
                <AlertCircle className="w-3 h-3" />
                Unsaved changes
              </Badge>
            )}
            <Button variant="outline" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Draft
            </Button>
            <Button onClick={handlePublish} disabled={isPublishing || hasChanges}>
              {isPublishing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Publish
            </Button>
          </div>
        )}
        
        {isLocked && onRequestEdit && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-600">
              <AlertCircle className="w-3 h-3" />
              Dataset Locked
            </Badge>
            <Button variant="outline" size="sm" onClick={onRequestEdit}>
              Request Unlock / Edit
            </Button>
          </div>
        )}
      </div>

      <div className="border border-border bg-card overflow-x-auto rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-card z-10 min-w-[100px]">Roll No</TableHead>
              <TableHead className="sticky left-[100px] bg-card z-10 min-w-[150px]">Student Name</TableHead>
              {subQuestions.map(sq => (
                <TableHead key={sq.id} className="text-center min-w-[80px]">
                  <div className="text-xs">Q{sq.label}</div>
                  <div className="text-xs font-normal text-muted-foreground">/{sq.maxMarks}</div>
                </TableHead>
              ))}
              <TableHead className="text-center min-w-[80px]">
                <div>Total</div>
                <div className="text-xs font-normal text-muted-foreground">/{totalMaxMarks}</div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map(student => {
              const total = calculateTotal(student.studentId);
              const passThreshold = totalMaxMarks * 0.4;
              
              return (
                <TableRow key={student.studentId}>
                  <TableCell className="sticky left-0 bg-card font-mono text-sm">
                    {student.rollNumber}
                  </TableCell>
                  <TableCell className="sticky left-[100px] bg-card font-medium">
                    {student.studentName}
                  </TableCell>
                  {subQuestions.map(sq => (
                    <TableCell key={sq.id} className="p-1">
                      <Input
                        type="number"
                        min={0}
                        max={sq.maxMarks}
                        step={0.5}
                        value={marksData[student.studentId]?.[sq.id] ?? 0}
                        onChange={(e) => handleMarkChange(student.studentId, sq.id, e.target.value)}
                        className="w-16 text-center h-8"
                        disabled={isPublished || isLocked}
                      />
                    </TableCell>
                  ))}
                  <TableCell className="text-center font-semibold">
                    <span className={total < passThreshold ? 'text-destructive' : 'text-foreground'}>
                      {total.toFixed(1)}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
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
