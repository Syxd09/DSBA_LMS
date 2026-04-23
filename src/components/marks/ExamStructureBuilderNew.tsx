import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, Trash2, GripVertical, Save, AlertCircle, CheckCircle2, 
  BookOpen, Target, Eye, EyeOff, BookText, Info 
} from 'lucide-react';
import { CourseOutcome } from '@/hooks/useCourseOutcomes';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SubQuestionInput {
  id: string;
  label: string;
  maxMarks: number;
  bloomLevel: string;
  coId: string | null;
}

interface QuestionInput {
  id: string;
  sequence: number;
  maxMarks: number;
  bloomLevel: string;
  coId: string | null;
  isOptional: boolean;
  subQuestions: SubQuestionInput[];
}

interface SectionInput {
  id: string;
  name: string;
  sequence: number;
  maxMarks: number;
  requiredQuestions: number;
  selectionMode: 'FIRST_N' | 'BEST_N';
  questions: QuestionInput[];
}

interface ExamStructureBuilderProps {
  courseOutcomes: CourseOutcome[];
  initialSections?: SectionInput[];
  onSave: (sections: SectionInput[]) => Promise<void>;
  isLoading?: boolean;
  readOnly?: boolean;
}

const bloomLevels = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];

const bloomColors: Record<string, string> = {
  Remember: 'bg-blue-100 text-blue-700 border-blue-300',
  Understand: 'bg-green-100 text-green-700 border-green-300',
  Apply: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  Analyze: 'bg-orange-100 text-orange-700 border-orange-300',
  Evaluate: 'bg-purple-100 text-purple-700 border-purple-300',
  Create: 'bg-pink-100 text-pink-700 border-pink-300',
};

export function ExamStructureBuilderNew({ 
  courseOutcomes, 
  initialSections,
  onSave,
  isLoading,
  readOnly = false
}: ExamStructureBuilderProps) {
  const [sections, setSections] = useState<SectionInput[]>(initialSections || []);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  useEffect(() => {
    if (initialSections) {
      setSections(initialSections);
      // Auto-expand first section
      if (initialSections.length > 0) {
        setExpandedSections([initialSections[0].id]);
      }
    }
  }, [initialSections]);

  // Calculate CO coverage statistics
  const coStats = useMemo(() => {
    const stats = new Map<string, { count: number; marks: number }>();
    let totalSubQuestions = 0;
    let subQuestionsWithCO = 0;
    let totalMarks = 0;

    sections.forEach(section => {
      section.questions.forEach(q => {
        q.subQuestions.forEach(sq => {
          totalSubQuestions++;
          totalMarks += sq.maxMarks;
          
          if (sq.coId) {
            subQuestionsWithCO++;
            const current = stats.get(sq.coId) || { count: 0, marks: 0 };
            stats.set(sq.coId, {
              count: current.count + 1,
              marks: current.marks + sq.maxMarks
            });
          }
        });
      });
    });

    return {
      stats,
      totalSubQuestions,
      subQuestionsWithCO,
      totalMarks,
      completionPercent: totalSubQuestions > 0 
        ? Math.round((subQuestionsWithCO / totalSubQuestions) * 100) 
        : 0
    };
  }, [sections]);

  const addSection = () => {
    if (readOnly) return;
    const newSection: SectionInput = {
      id: `temp-${Date.now()}`,
      name: `Section ${String.fromCharCode(65 + sections.length)}`,
      sequence: sections.length + 1,
      maxMarks: 0,
      requiredQuestions: 1,
      selectionMode: 'FIRST_N',
      questions: [],
    };
    setSections([...sections, newSection]);
    setExpandedSections([...expandedSections, newSection.id]);
  };

  const removeSection = (sectionId: string) => {
    setSections(prev => prev.filter(s => s.id !== sectionId));
    setExpandedSections(prev => prev.filter(id => id !== sectionId));
  };

  const addQuestion = (sectionId: string) => {
    setSections(prev =>
      prev.map(section => {
        if (section.id === sectionId) {
          const newQuestion: QuestionInput = {
            id: `temp-q-${Date.now()}`,
            sequence: section.questions.length + 1,
            maxMarks: 5,
            bloomLevel: 'Remember',
            coId: courseOutcomes[0]?.id || null,
            isOptional: false,
            subQuestions: [{
              id: `temp-sq-${Date.now()}`,
              label: 'a',
              maxMarks: 5,
              bloomLevel: 'Remember',
              coId: courseOutcomes[0]?.id || null,
            }],
          };
          return { ...section, questions: [...section.questions, newQuestion] };
        }
        return section;
      })
    );
  };

  const removeQuestion = (sectionId: string, questionId: string) => {
    setSections(prev =>
      prev.map(section => {
        if (section.id === sectionId) {
          return { 
            ...section, 
            questions: section.questions.filter(q => q.id !== questionId) 
          };
        }
        return section;
      })
    );
  };

  const addSubQuestion = (sectionId: string, questionId: string) => {
    setSections(prev =>
      prev.map(section => {
        if (section.id === sectionId) {
          return {
            ...section,
            questions: section.questions.map(q => {
              if (q.id === questionId) {
                const nextLabel = String.fromCharCode(97 + q.subQuestions.length);
                return {
                  ...q,
                  subQuestions: [...q.subQuestions, {
                    id: `temp-sq-${Date.now()}`,
                    label: nextLabel,
                    maxMarks: 5,
                    bloomLevel: 'Remember',
                    coId: courseOutcomes[0]?.id || null,
                  }],
                };
              }
              return q;
            }),
          };
        }
        return section;
      })
    );
  };

  const removeSubQuestion = (sectionId: string, questionId: string, subQuestionId: string) => {
    setSections(prev =>
      prev.map(section => {
        if (section.id === sectionId) {
          return {
            ...section,
            questions: section.questions.map(q => {
              if (q.id === questionId) {
                return {
                  ...q,
                  subQuestions: q.subQuestions.filter(sq => sq.id !== subQuestionId)
                };
              }
              return q;
            }),
          };
        }
        return section;
      })
    );
  };

  const updateSectionField = (sectionId: string, field: keyof SectionInput, value: any) => {
    setSections(prev =>
      prev.map(s => (s.id === sectionId ? { ...s, [field]: value } : s))
    );
  };

  const updateQuestionField = (sectionId: string, questionId: string, field: keyof QuestionInput, value: any) => {
    setSections(prev =>
      prev.map(section => {
        if (section.id === sectionId) {
          return {
            ...section,
            questions: section.questions.map(q =>
              q.id === questionId ? { ...q, [field]: value } : q
            ),
          };
        }
        return section;
      })
    );
  };

  const updateSubQuestionField = (
    sectionId: string, 
    questionId: string, 
    subQuestionId: string, 
    field: keyof SubQuestionInput, 
    value: any
  ) => {
    setSections(prev =>
      prev.map(section => {
        if (section.id === sectionId) {
          return {
            ...section,
            questions: section.questions.map(q => {
              if (q.id === questionId) {
                return {
                  ...q,
                  subQuestions: q.subQuestions.map(sq =>
                    sq.id === subQuestionId ? { ...sq, [field]: value } : sq
                  ),
                };
              }
              return q;
            }),
          };
        }
        return section;
      })
    );
  };

  const calculateSectionMarks = (section: SectionInput) => {
    return section.questions.reduce((sum, q) => 
      sum + q.subQuestions.reduce((sqSum, sq) => sqSum + sq.maxMarks, 0), 0
    );
  };

  // GAP 2: Calculate section-wise CO distribution
  const calculateSectionCOStats = (section: SectionInput) => {
    const stats = new Map<string, number>();
    section.questions.forEach(q => {
      q.subQuestions.forEach(sq => {
        if (sq.coId) {
          stats.set(sq.coId, (stats.get(sq.coId) || 0) + sq.maxMarks);
        }
      });
    });
    return stats;
  };

  // GAP 4: Generate human-readable section rule text
  const getSectionRuleText = (section: SectionInput) => {
    const totalQuestions = section.questions.length;
    const required = section.requiredQuestions;
    
    if (totalQuestions === 0) return 'No questions';
    if (required === totalQuestions) {
      return `Answer all ${totalQuestions} question${totalQuestions > 1 ? 's' : ''}`;
    }
    if (required === 1) {
      return `Answer any 1 question`;
    }
    return `Answer any ${required} out of ${totalQuestions}`;
  };

  // GAP 1: Derive question CO from sub-questions
  const deriveQuestionCO = (subQuestions: SubQuestionInput[]) => {
    if (subQuestions.length === 0) return null;
    const firstCO = subQuestions[0].coId;
    if (!firstCO) return null;
    const allSame = subQuestions.every(sq => sq.coId === firstCO);
    return allSame ? firstCO : 'mixed';
  };

  const handleSave = async () => {
    if (readOnly) return;
    setIsSaving(true);
    try {
      await onSave(sections);
      toast({
        title: 'Structure saved',
        description: `Exam structure saved with ${coStats.subQuestionsWithCO} CO assignments.`,
      });
    } catch (error) {
      toast({
        title: 'Error saving structure',
        description: 'Failed to save exam structure. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getCOById = (coId: string | null) => {
    if (!coId) return null;
    const co = courseOutcomes.find(c => c.id === coId);
    if (!co) return null;
    return {
      ...co,
      code: co.code
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading exam structure...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h3 className="text-xl font-semibold text-foreground">Exam Structure Builder</h3>
          <p className="text-sm text-muted-foreground">
            Define sections, questions, and map them to Course Outcomes
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={addSection} disabled={readOnly}>
            <Plus className="w-4 h-4 mr-2" />
            Add Section
          </Button>
          <Button onClick={handleSave} disabled={isSaving || coStats.completionPercent < 100 || readOnly}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Structure'}
          </Button>
        </div>
      </div>

      {readOnly && (
        <Alert variant="default" className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            <strong>Structure Locked:</strong> Student marks have already been recorded for this exam. 
            The structure cannot be modified unless all marks are deleted.
          </AlertDescription>
        </Alert>
      )}

      {/* CO Coverage Progress */}
      {sections.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4" />
              CO Mapping Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {coStats.subQuestionsWithCO} of {coStats.totalSubQuestions} sub-questions mapped
                </span>
                <span className="font-medium">{coStats.completionPercent}%</span>
              </div>
              <Progress value={coStats.completionPercent} className="h-2" />
            </div>

            {coStats.completionPercent < 100 && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-md">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-500 mt-0.5" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <p className="font-medium">Incomplete CO mapping</p>
                  <p className="text-xs mt-1">Assign COs to all sub-questions before saving</p>
                </div>
              </div>
            )}

            {/* CO Distribution */}
            {coStats.stats.size > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2">
                {Array.from(coStats.stats.entries()).map(([coId, data]) => {
                  const co = getCOById(coId);
                  return (
                    <div key={coId} className="p-2 bg-muted/50 rounded border border-border">
                      <div className="text-xs font-medium">{co?.code || 'Unknown'}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {data.count} parts • {data.marks} marks
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sections */}
      {sections.length === 0 ? (
        <Card className="p-12">
          <div className="text-center space-y-3">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/50" />
            <div className="space-y-1">
              <p className="font-medium">No sections yet</p>
              <p className="text-sm text-muted-foreground">
                Click "Add Section" to start building your exam structure
              </p>
            </div>
            <Button onClick={addSection} variant="outline" className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Create First Section
            </Button>
          </div>
        </Card>
      ) : (
        <Accordion type="multiple" value={expandedSections} onValueChange={setExpandedSections} className="space-y-4">
          {sections.map((section, sectionIndex) => (
            <AccordionItem key={section.id} value={section.id} className="border-none">
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <AccordionTrigger className="flex-1 hover:no-underline">
                      <div className="flex items-center gap-3 text-left">
                        <GripVertical className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1">
                          <Input
                            value={section.name}
                            onChange={(e) => {
                              e.stopPropagation();
                              updateSectionField(section.id, 'name', e.target.value);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            readOnly={readOnly}
                            className={cn(
                              "font-semibold text-lg border-0 px-0 focus-visible:ring-1 max-w-sm h-auto py-0",
                              readOnly && "cursor-default"
                            )}
                          />
                          <div className="flex items-center gap-3 mt-1">
                            <Badge variant="secondary" className="font-normal">
                              {calculateSectionMarks(section)} marks
                            </Badge>
                            <Badge variant="outline" className="font-normal">
                              {section.questions.length} questions
                            </Badge>
                          </div>
                          
                          {/* GAP 2: Section CO Distribution */}
                          {(() => {
                            const sectionCOStats = calculateSectionCOStats(section);
                            return sectionCOStats.size > 0 && (
                              <div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-2">
                                {Array.from(sectionCOStats.entries()).map(([coId, marks]) => {
                                  const co = getCOById(coId);
                                  return (
                                    <span key={coId} className="inline-flex items-center">
                                      <Target className="w-3 h-3 mr-1" />
                                      {co?.code}: {marks} marks
                                    </span>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </AccordionTrigger>
                    
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeSection(section.id)}
                      disabled={readOnly}
                      className="text-muted-foreground hover:text-destructive flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Section Settings - GAP 4: Human-readable rule */}
                  <div className="flex items-center gap-4 mt-3 ml-8">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-900">
                      <BookText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        {getSectionRuleText(section)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Required:</Label>
                      <Input
                        type="number"
                        value={section.requiredQuestions}
                        onChange={(e) => updateSectionField(section.id, 'requiredQuestions', parseInt(e.target.value) || 1)}
                        readOnly={readOnly}
                        className="w-16 h-7 text-sm"
                        min={1}
                        max={section.questions.length || 1}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Selection:</Label>
                      <Select
                        value={section.selectionMode || 'FIRST_N'}
                        onValueChange={(value: 'FIRST_N' | 'BEST_N') => updateSectionField(section.id, 'selectionMode', value)}
                        disabled={readOnly}
                      >
                        <SelectTrigger className="w-28 h-7 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FIRST_N">First N</SelectItem>
                          <SelectItem value="BEST_N">Best N</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>

                <AccordionContent>
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      {section.questions.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed rounded-lg">
                          <p className="text-sm text-muted-foreground mb-3">No questions in this section</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addQuestion(section.id)}
                            disabled={readOnly}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add First Question
                          </Button>
                        </div>
                      ) : (
                        section.questions.map((question, qIndex) => (
                          <Card key={question.id} className="border-2">
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1">
                                  <span className="text-sm font-mono font-bold min-w-[3rem]">
                                    Q{qIndex + 1}
                                  </span>
                                  
                                  {/* GAP 1: Derived CO badge (read-only) */}
                                  {(() => {
                                    const derivedCO = deriveQuestionCO(question.subQuestions);
                                    if (derivedCO === 'mixed') {
                                      return (
                                        <Badge variant="secondary" className="gap-1">
                                          <Info className="w-3 h-3" />
                                          Mixed COs
                                        </Badge>
                                      );
                                    } else if (derivedCO) {
                                      const co = getCOById(derivedCO);
                                      return (
                                        <Badge variant="outline" className="gap-1">
                                          <Target className="w-3 h-3" />
                                          {co?.code}
                                        </Badge>
                                      );
                                    } else {
                                      return (
                                        <Badge variant="destructive" className="gap-1">
                                          <AlertCircle className="w-3 h-3" />
                                          No CO
                                        </Badge>
                                      );
                                    }
                                  })()}
                                  <Select
                                    value={question.bloomLevel || ''}
                                    onValueChange={(value) => updateQuestionField(section.id, question.id, 'bloomLevel', value)}
                                    disabled={readOnly}
                                  >
                                    <SelectTrigger className="w-32 h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {bloomLevels.map(level => (
                                        <SelectItem key={level} value={level}>{level}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={question.isOptional}
                                      onChange={(e) => updateQuestionField(section.id, question.id, 'isOptional', e.target.checked)}
                                      disabled={readOnly}
                                      className="rounded border-border"
                                    />
                                    Optional
                                  </label>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => removeQuestion(section.id, question.id)}
                                  disabled={readOnly}
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </CardHeader>

                            <CardContent className="pt-0">
                              {/* Sub-questions */}
                              <div className="space-y-2">
                                {question.subQuestions.map((sq, sqIndex) => {
                                  const co = getCOById(sq.coId);
                                  return (
                                    <div key={sq.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
                                      <span className="text-sm font-mono font-medium min-w-[2rem]">
                                        ({sq.label})
                                      </span>
                                      
                                      <div className="flex items-center gap-2">
                                        <Label className="text-xs text-muted-foreground whitespace-nowrap">Marks:</Label>
                                        <Input 
                                          type="number" 
                                          value={sq.maxMarks} 
                                          onChange={(e) => updateSubQuestionField(section.id, question.id, sq.id, 'maxMarks', parseInt(e.target.value) || 0)}
                                          readOnly={readOnly}
                                          className="w-16 h-8 text-sm" 
                                          min={0}
                                        />
                                      </div>

                                      <Select
                                        value={sq.coId || ''}
                                        onValueChange={(value) => updateSubQuestionField(section.id, question.id, sq.id, 'coId', value || null)}
                                        disabled={readOnly}
                                      >
                                        <SelectTrigger className={cn(
                                          "h-8 text-sm w-20",
                                          !sq.coId && "border-amber-500 border-2"
                                        )}>
                                          <SelectValue placeholder="⚠️ CO">
                                            {sq.coId && getCOById(sq.coId)?.code}
                                          </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                          {courseOutcomes.map(co => {
                                            const coCode = co.code;
                                            return (
                                              <SelectItem key={co.id} value={co.id}>
                                                <span className="font-medium">{coCode}</span>
                                              </SelectItem>
                                            );
                                          })}
                                        </SelectContent>
                                      </Select>

                                      <Select
                                        value={sq.bloomLevel || ''}
                                        onValueChange={(value) => updateSubQuestionField(section.id, question.id, sq.id, 'bloomLevel', value)}
                                        disabled={readOnly}
                                      >
                                        <SelectTrigger className="w-32 h-8 text-sm">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {bloomLevels.map(level => (
                                            <SelectItem key={level} value={level}>
                                              <div className="flex items-center gap-2">
                                                <div className={cn("w-2 h-2 rounded-full", bloomColors[level])} />
                                                {level}
                                              </div>
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>

                                      {question.subQuestions.length > 1 && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => removeSubQuestion(section.id, question.id, sq.id)}
                                          disabled={readOnly}
                                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      )}
                                    </div>
                                  );
                                })}
                                                             <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => addSubQuestion(section.id, question.id)}
                                  disabled={readOnly}
                                  className="w-full border-dashed border"
                                >
                                  <Plus className="w-3.5 h-3.5 mr-2" />
                                  Add Part ({String.fromCharCode(97 + question.subQuestions.length)})
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-dashed"
                        onClick={() => addQuestion(section.id)}
                        disabled={readOnly}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Question
                      </Button>
                    </div>
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
