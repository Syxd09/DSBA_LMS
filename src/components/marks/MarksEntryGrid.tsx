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
  registrationNumber: string;
}

interface MarksEntryGridProps {
  students: Student[];
  subQuestions: SubQuestion[];
  existingMarks: Array<{ student_id: string; sub_question_id: string; marks: number }>;
  onSave: (marks: Array<{ studentId: string; subQuestionId: string; marks: number }>) => Promise<void>;
  onPublish: () => Promise<void>;
  onUnlock?: () => Promise<void>;
  isPublished?: boolean;
  isSaving?: boolean;
}

export function MarksEntryGrid({ 
  students, 
  subQuestions, 
  existingMarks,
  onSave, 
  onPublish,
  onUnlock,
  isPublished = false,
  isSaving = false,
}: MarksEntryGridProps) {
  const [marksData, setMarksData] = useState<Record<string, Record<string, number>>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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

  const calculateTotal = (studentId: string): number => {
    const studentMarks = marksData[studentId];
    if (!studentMarks) return 0;
    return Object.values(studentMarks).reduce((sum, mark) => sum + (Number(mark) || 0), 0);
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
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save marks. Please try again.';
      toast({
        title: 'Error saving marks',
        description: errorMessage,
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
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to publish exam.';
      
      // Special handling for "already published" error
      if (errorMessage.includes('already published')) {
        toast({
          title: 'Exam already published',
          description: 'This exam is already published. Use the Unlock button to edit it first.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error publishing',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const handleUnlock = async () => {
    if (!onUnlock) return;
    
    if (!confirm('Are you sure you want to unlock this exam for editing? Students will no longer be able to view their marks until you publish again.')) {
      return;
    }

    setIsUnlocking(true);
    try {
      await onUnlock();
      toast({
        title: 'Exam unlocked',
        description: 'You can now edit the marks.',
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to unlock exam.';
      toast({
        title: 'Error unlocking',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsUnlocking(false);
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

  // Filter students based on search term
  const filteredStudents = useMemo(() => {
    if (!searchTerm) return students;
    const term = searchTerm.toLowerCase();
    return students.filter(s => 
      s.studentName.toLowerCase().includes(term) || 
      s.registrationNumber.toLowerCase().includes(term)
    );
  }, [students, searchTerm]);

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
      <div className="flex items-center justify-between gap-4 bg-muted/30 p-4 rounded-lg border border-border">
        <div className="flex-1 max-w-md relative">
          <Input 
            placeholder="Search student by name or registration number..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isPublished ? (
            <>
              <Badge variant="secondary">Published - Read Only</Badge>
              {onUnlock && (
                <Button variant="outline" onClick={handleUnlock} disabled={isUnlocking} size="sm">
                  {isUnlocking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Unlock for Editing
                </Button>
              )}
            </>
          ) : (
            <>
              {hasChanges && (
                <Badge variant="outline" className="gap-1 text-amber-600 border-amber-200 bg-amber-50">
                  <AlertCircle className="w-3 h-3" />
                  Unsaved changes
                </Badge>
              )}
              <Button variant="outline" onClick={handleSave} disabled={isSaving} size="sm">
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Draft
              </Button>
              <Button onClick={handlePublish} disabled={isPublishing || hasChanges} size="sm">
                {isPublishing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Publish Results
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="border border-border bg-card overflow-x-auto rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-card z-10 min-w-[150px]">Reg. Number</TableHead>
              <TableHead className="sticky left-[150px] bg-card z-10 min-w-[200px]">Student Name</TableHead>
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
            {filteredStudents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={subQuestions.length + 3} className="text-center py-12 text-muted-foreground">
                  No students found matching your search.
                </TableCell>
              </TableRow>
            ) : filteredStudents.map((student, index) => {
              const total = calculateTotal(student.studentId);
              const passThreshold = totalMaxMarks * 0.4;
              const rowKey = `${student.studentId}-${index}`;
              
              if (index === 0) {
                console.log(`[DEBUG] MarksEntryGrid: First row key is "${rowKey}"`);
              }
              
              return (
                <TableRow key={rowKey}>
                  <TableCell className="sticky left-0 bg-card font-mono text-sm font-medium">
                    {student.registrationNumber}
                  </TableCell>
                  <TableCell className="sticky left-[150px] bg-card font-medium">
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
                        disabled={isPublished}
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
