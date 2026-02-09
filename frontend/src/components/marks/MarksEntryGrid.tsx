import { useState, useEffect, useMemo, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, Send, AlertCircle, Loader2, Copy, CheckCircle2, Cloud } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import React from 'react';

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
  examId?: string; // For localStorage key
  sectionMaxMarks?: Record<string, number>; // Section ID -> Max Marks
}

// Memoized Row Component for Performance
const MarksEntryRow = React.memo(({ 
  student, 
  filteredSubQuestions, 
  marksData, 
  onMarkChange, 
  onKeyDown, 
  onPaste,
  isPublished,
  isLocked,
  studentIdx,
  maxMarksMap,
  sectionMaxMarks
}: {
  student: Student,
  filteredSubQuestions: SubQuestion[],
  marksData: Record<string, number>,
  onMarkChange: (studentId: string, subQuestionId: string, value: string) => void,
  onKeyDown: (e: React.KeyboardEvent, sIdx: number, sqIdx: number) => void,
  onPaste: (e: React.ClipboardEvent, sIdx: number, sqIdx: number) => void,
  isPublished: boolean,
  isLocked: boolean,
  studentIdx: number,
  maxMarksMap: Record<string, number>,
  sectionMaxMarks?: Record<string, number>
}) => {
  // Calculate raw total for visible section
  const sectionObtained = filteredSubQuestions.reduce((sum, sq) => sum + (marksData[sq.id] || 0), 0);
  
  // Determine Section Max Cap
  const sectionId = filteredSubQuestions.length > 0 ? filteredSubQuestions[0].label.split('.')[0] : null;
  const sectionMax = sectionId && sectionMaxMarks ? sectionMaxMarks[sectionId] : Infinity;
  
  // Apply Cap
  const cappedTotal = Math.min(sectionObtained, sectionMax);
  const isCapped = sectionObtained > sectionMax;

  return (
    <TableRow>
       <TableCell className="sticky left-0 bg-card font-mono text-sm w-[100px]">
        {student.rollNumber}
      </TableCell>
      <TableCell className="sticky left-[100px] bg-card font-medium w-[150px]">
        {student.studentName}
      </TableCell>
      {filteredSubQuestions.map((sq, sqIdx) => (
        <TableCell key={sq.id} className="p-1 text-center">
          <Input
            id={`mark-input-${studentIdx}-${sqIdx}`}
            type="number"
            min={0}
            max={sq.maxMarks}
            step={0.5}
            value={marksData[sq.id] ?? ''} 
            onChange={(e) => onMarkChange(student.studentId, sq.id, e.target.value)}
            onKeyDown={(e) => onKeyDown(e, studentIdx, sqIdx)}
            onPaste={(e) => onPaste(e, studentIdx, sqIdx)}
            className={`w-16 text-center h-8 ${
              marksData[sq.id] === undefined 
                ? 'bg-yellow-50 dark:bg-yellow-950/20' 
                : ''
            }`}
            placeholder="-"
            disabled={isPublished || isLocked}
          />
        </TableCell>
      ))}
       <TableCell className="text-center font-semibold w-[80px]">
         <div className="flex flex-col items-center justify-center">
            <span>{cappedTotal.toFixed(1)}</span>
            {isCapped && (
                <span className="text-[10px] text-muted-foreground line-through">
                    {sectionObtained.toFixed(1)}
                </span>
            )}
         </div>
       </TableCell>
    </TableRow>
  );
});

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
  examId,
  sectionMaxMarks
}: MarksEntryGridProps) {
  // Global State
  const [marksData, setMarksData] = useState<Record<string, Record<string, number>>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Group sub-questions by Section (derived from Question Label e.g. "1.1a" -> Section 1?)
  // Actually, subQuestions prop doesn't have Section info directly.
  // The 'label' constructed in parent is "1.1a".
  // We need to infer sections or pass them in.
  // Parent "1.1a" means Section Index 0 (1), Question Index 0 (1).
  // Let's group by the first character of the label (Section Number).
  
  const sections = useMemo(() => {
     const sects = new Set<string>();
     subQuestions.forEach(sq => {
         const sectionNum = sq.label.split('.')[0]; 
         sects.add(sectionNum);
     });
     return Array.from(sects).sort();
  }, [subQuestions]);

  const [activeSection, setActiveSection] = useState<string>(sections[0] || '1');

  // Filter columns/questions for active section
  const filteredSubQuestions = useMemo(() => {
    return subQuestions.filter(sq => sq.label.startsWith(`${activeSection}.`));
  }, [subQuestions, activeSection]);

  // Load from LocalStorage (Draft Recovery)
  useEffect(() => {
      const savedDraft = localStorage.getItem(`draft_marks_${examId}`);
      if (savedDraft && !isPublished && !isLocked) {
          try {
              const draft = JSON.parse(savedDraft);
              // Merge draft with existing marks (Draft takes precedence if newer? No, difficult to track)
              // Let's hint user? Or just load it. 
              // Simple: If existingMarks is empty, load draft.
              // Better: Load existing API marks first, then overlay draft?
              // For now, simple initialization from props.
          } catch(e) {}
      }
  }, [examId]);

  // Initialize Data
  useEffect(() => {
    const initialMarks: Record<string, Record<string, number>> = {};
    students.forEach(student => {
      initialMarks[student.studentId] = {};
      subQuestions.forEach(sq => {
        const existing = existingMarks.find(
          m => m.student_id === student.studentId && m.sub_question_id === sq.id
        );
        initialMarks[student.studentId][sq.id] = existing?.marks ?? 0; // Or undefined?
        // If we use 0, it shows 0. If undefined, it shows empty.
        // Existing logic used existing?.marks ?? 0. 
        // Let's keep undefined for empty slots to show yellow.
        if (existing) {
             initialMarks[student.studentId][sq.id] = existing.marks;
        }
      });
    });
    setMarksData(initialMarks);
    setHasChanges(false);
  }, [students, subQuestions, existingMarks]);

  // DEBOUNCED AUTO-SAVE
  useEffect(() => {
      if (!hasChanges || isPublished || isLocked) return;

      const timer = setTimeout(() => {
          handleSave(true); // Auto-save silent
      }, 2000); // 2 seconds debounce

      return () => clearTimeout(timer);
  }, [marksData, hasChanges]);


  const handleMarkChange = useCallback((studentId: string, subQuestionId: string, value: string) => {
    const sq = subQuestions.find(s => s.id === subQuestionId);
    const maxMarks = sq?.maxMarks || 10;
    
    // Allow empty string
    if (value === '') {
        setMarksData(prev => {
            const newSt = { ...prev[studentId] };
            delete newSt[subQuestionId];
            return { ...prev, [studentId]: newSt };
        });
        setHasChanges(true);
        return;
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    const clampedValue = Math.min(Math.max(numValue, 0), maxMarks);

    setMarksData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [subQuestionId]: clampedValue,
      },
    }));
    setHasChanges(true);
    
    // Save to LocalStorage immediately as backup
    if (examId) {
        localStorage.setItem(`draft_marks_${examId}`, JSON.stringify(marksData));
    }
  }, [subQuestions, examId]);

  const handleSave = async (silent = false) => {
    const marksArray: Array<{ studentId: string; subQuestionId: string; marks: number }> = [];
    Object.entries(marksData).forEach(([studentId, marks]) => {
      Object.entries(marks).forEach(([subQuestionId, mark]) => {
        if (mark !== undefined && mark !== null) {
          marksArray.push({ studentId, subQuestionId, marks: mark });
        }
      });
    });

    try {
      await onSave(marksArray);
      setLastSaved(new Date());
      setHasChanges(false);
      if (examId) localStorage.removeItem(`draft_marks_${examId}`); // Clear draft on success
      if (!silent) {
        toast({ title: 'Marks saved successfully' });
      }
    } catch (error) {
      if (!silent) {
        toast({ title: 'Error saving marks', variant: 'destructive' });
      }
    }
  };

  // Keyboard Nav (Optimized)
  const handleKeyDown = useCallback((
    e: React.KeyboardEvent,
    studentIdx: number,
    sqIdx: number
  ) => {
    const dirs: Record<string, [number, number]> = {
        'ArrowUp': [-1, 0],
        'ArrowDown': [1, 0],
        'Enter': [1, 0],
        'ArrowLeft': [0, -1],
        'ArrowRight': [0, 1],
        'Tab': [0, 1] // Strict Tab
    };

    if (dirs[e.key]) {
        if (e.key === 'Tab') {
           // Default tab behavior is fine, but we want strict grid nav?
           // Let's allow default tab but prevent default for Arrows/Enter
        } else {
             e.preventDefault();
        }
        
        const [dRow, dCol] = dirs[e.key];
        const nextRow = Math.min(Math.max(0, studentIdx + dRow), students.length - 1);
        const nextCol = Math.min(Math.max(0, sqIdx + dCol), filteredSubQuestions.length - 1);
        
        const inputId = `mark-input-${nextRow}-${nextCol}`;
        const el = document.getElementById(inputId) as HTMLInputElement;
        if (el) {
            el.focus();
            el.select();
        }
    }
  }, [students.length, filteredSubQuestions.length]);

  // Paste Support
  const handlePaste = useCallback((
    e: React.ClipboardEvent,
    startStudentIdx: number,
    startSqIdx: number
  ) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').split('\n').map(row => row.split('\t'));
    
    // Logic similar to before, but needs to respect filtered columns?
    // User expects to paste into visible grid.
    // Yes, paste mapping should align with filteredSubQuestions
    
    setMarksData(prev => {
        const next = { ...prev };
        let changed = false;
        
        pasteData.forEach((row, rIdx) => {
            if (startStudentIdx + rIdx >= students.length) return;
            const studentId = students[startStudentIdx + rIdx].studentId;
            if (!next[studentId]) next[studentId] = {};

            row.forEach((cellValue, cIdx) => {
               if (startSqIdx + cIdx >= filteredSubQuestions.length) return;
               const sq = filteredSubQuestions[startSqIdx + cIdx];
               const val = parseFloat(cellValue.trim());
               if (!isNaN(val)) {
                   const clamped = Math.min(Math.max(val, 0), sq.maxMarks);
                   next[studentId][sq.id] = clamped;
                   changed = true;
               }
            });
        });
        
        if (changed) setHasChanges(true);
        return next;
    });
  }, [students, filteredSubQuestions]);

  // Progress Calculation
  const progressPercentage = useMemo(() => {
    if (students.length === 0 || subQuestions.length === 0) return 0;
    let filled = 0;
    Object.values(marksData).forEach(m => filled += Object.keys(m).length);
    return Math.round((filled / (students.length * subQuestions.length)) * 100);
  }, [marksData, students.length, subQuestions.length]);

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
  return (
      <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-4">
             <h3 className="text-lg font-semibold">Marks Entry</h3>
             {lastSaved && (
                 <span className="text-xs text-muted-foreground flex items-center gap-1">
                     <Cloud className="w-3 h-3" />
                     Saved {lastSaved.toLocaleTimeString()}
                 </span>
             )}
         </div>
         
         {!isPublished && (
          <div className="flex items-center gap-2">
            {hasChanges ? (
             <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-600 animate-pulse">
                <AlertCircle className="w-3 h-3" />
                Saving...
             </Badge>
            ) : (
             <Badge variant="outline" className="gap-1 border-green-500 text-green-600">
                <CheckCircle2 className="w-3 h-3" />
                Saved
             </Badge>
            )}
            
            <Button onClick={handlePublish} disabled={isPublishing || hasChanges}>
               {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
               Publish
            </Button>
          </div>
         )}
      </div>

       {/* Tabs for Sections */}
       <Tabs value={activeSection} onValueChange={setActiveSection} className="w-full">
           <TabsList>
               {sections.map(sec => (
                   <TabsTrigger key={sec} value={sec}>Section {String.fromCharCode(64 + parseInt(sec))}</TabsTrigger>
               ))}
               {/* 1=A, 2=B, 3=C mapping assuming numeric prefixes */}
           </TabsList>
       </Tabs>
        
        {/* Progress */}
       <Progress value={progressPercentage} className="h-1" />

       {/* Grid */}
       <div className="border rounded-md bg-card overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh]">
         <Table>
           <TableHeader>
             <TableRow>
               <TableHead className="sticky top-0 left-0 bg-card z-20 w-[100px]">Roll No</TableHead>
               <TableHead className="sticky top-0 left-[100px] bg-card z-20 w-[150px]">Student Name</TableHead>
               {filteredSubQuestions.map(sq => (
                   <TableHead key={sq.id} className="sticky top-0 bg-card z-10 text-center min-w-[80px]">
                       <div className="text-xs">{sq.label.split('.').slice(1).join('.')}</div>
                       <div className="text-[10px] text-muted-foreground">/{sq.maxMarks}</div>
                   </TableHead>
               ))}
               <TableHead className="sticky top-0 bg-card z-10 text-center w-[80px]">Total</TableHead>
             </TableRow>
           </TableHeader>
           <TableBody>
             {students.map((student, sIdx) => (
                 <MarksEntryRow
                    key={student.studentId}
                    student={student}
                    studentIdx={sIdx}
                    filteredSubQuestions={filteredSubQuestions}
                    marksData={marksData[student.studentId] || {}}
                    onMarkChange={handleMarkChange}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    isPublished={isPublished}
                    isLocked={isLocked}
                    maxMarksMap={{}}
                    sectionMaxMarks={sectionMaxMarks}
                 />
             ))}
           </TableBody>
         </Table>
        </div>
       </div>
    </div>
  );
}
