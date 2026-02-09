import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Plus, Trash2, GripVertical, Save, Copy, ChevronDown, Zap, FileText } from 'lucide-react';
import { CourseOutcome } from '@/hooks/useCourseOutcomes';
import { toast } from '@/hooks/use-toast';

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
}

const bloomLevels = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];

export function ExamStructureBuilder({ 
  courseOutcomes, 
  initialSections,
  onSave,
  isLoading 
}: ExamStructureBuilderProps) {
  const [sections, setSections] = useState<SectionInput[]>(initialSections || []);
  const [isSaving, setIsSaving] = useState(false);

  // Transform initial snake_case data to camelCase for internal state
  const transformToInternal = (sections: any[]): SectionInput[] => {
    return sections.map(s => ({
      id: s.id || `temp-${Date.now()}-${Math.random()}`,
      name: s.name || '',
      sequence: s.sequence || 0,
      maxMarks: s.max_marks || s.maxMarks || 0,
      requiredQuestions: s.required_questions || s.requiredQuestions || 1,
      selectionMode: s.selection_mode || s.selectionMode || 'FIRST_N',
      questions: (s.questions || []).map((q: any) => ({
        id: q.id || `temp-q-${Date.now()}-${Math.random()}`,
        sequence: q.sequence || 0,
        maxMarks: q.max_marks || q.maxMarks || 0,
        bloomLevel: q.bloom_level || q.bloomLevel || 'Remember',
        coId: q.co_id || q.coId || null,
        isOptional: q.is_optional || q.isOptional || false,
        subQuestions: (q.sub_questions || q.subQuestions || []).map((sq: any) => ({
          id: sq.id || `temp-sq-${Date.now()}-${Math.random()}`,
          label: sq.label || '',
          maxMarks: sq.max_marks || sq.maxMarks || 0,
          bloomLevel: sq.bloom_level || sq.bloomLevel || 'Remember',
          coId: sq.co_id || sq.coId || null,
        })),
      })),
    }));
  };

  // Transform camelCase state to snake_case for API
  const transformToApi = (sections: SectionInput[]) => {
    return sections.map(s => ({
      name: s.name,
      sequence: s.sequence,
      max_marks: s.maxMarks,
      required_questions: s.requiredQuestions,
      selection_mode: s.selectionMode,
      max_questions: s.questions.length, // backend requires this
      questions: s.questions.map(q => ({
        sequence: q.sequence,
        max_marks: q.maxMarks,
        bloom_level: q.bloomLevel,
        co_id: q.coId,
        is_optional: q.isOptional,
        sub_questions: q.subQuestions.map(sq => ({
          label: sq.label,
          max_marks: sq.maxMarks,
          bloom_level: sq.bloomLevel,
          co_id: sq.coId
        }))
      }))
    }));
  };

  useEffect(() => {
    if (initialSections) {
      setSections(transformToInternal(initialSections));
    }
  }, [initialSections]);

  // ====== QUICK TEMPLATES ======
  const examTemplates = [
    { name: 'Internal 30-Mark (VTU)', sections: [
      { name: 'Section A', questions: 4, marks: 2, required: 4, sectionMax: 8 },
      { name: 'Section B', questions: 4, marks: 5, required: 2, sectionMax: 10 },
      { name: 'Section C', questions: 2, marks: 6, required: 2, sectionMax: 12 },
    ]},
    { name: 'Internal 40-Mark', sections: [
      { name: 'Section A', questions: 6, marks: 2, required: 4, sectionMax: 8 },
      { name: 'Section B', questions: 6, marks: 5, required: 4, sectionMax: 16 },
      { name: 'Section C', questions: 4, marks: 12, required: 2, sectionMax: 24 }, // Updated based on request
    ]},
    { name: 'External 60-Mark', sections: [
      { name: 'Section A', questions: 8, marks: 2, required: 6, sectionMax: 12 },
      { name: 'Section B', questions: 6, marks: 5, required: 4, sectionMax: 20 },
      { name: 'Section C', questions: 4, marks: 8, required: 4, sectionMax: 32 }, // Updated based on request (32) and pattern (8 marks/q?)
    ]},
  ];

  const applyTemplate = (templateIndex: number) => {
    const template = examTemplates[templateIndex];
    const newSections: SectionInput[] = template.sections.map((sec, idx) => ({
      id: `temp-${Date.now()}-${idx}`,
      name: sec.name,
      sequence: idx + 1,
      maxMarks: sec.sectionMax,
      requiredQuestions: sec.required,
      selectionMode: 'BEST_N' as const,
      questions: Array.from({ length: sec.questions }, (_, qIdx) => ({
        id: `temp-q-${Date.now()}-${idx}-${qIdx}`,
        sequence: qIdx + 1,
        maxMarks: sec.marks,
        bloomLevel: bloomLevels[Math.min(qIdx, 5)],
        coId: courseOutcomes[qIdx % (courseOutcomes.length || 1)]?.id || null,
        isOptional: qIdx >= sec.required,
        subQuestions: [],
      })),
    }));
    setSections(newSections);
    toast({ title: `Applied template: ${template.name}` });
  };

  // ====== BATCH ADD QUESTIONS ======
  const addBatchQuestions = (sectionId: string, count: number, marksPerQ: number) => {
    setSections(prev =>
      prev.map(section => {
        if (section.id === sectionId) {
          const existingCount = section.questions.length;
          const newQuestions: QuestionInput[] = Array.from({ length: count }, (_, idx) => ({
            id: `temp-q-${Date.now()}-${idx}`,
            sequence: existingCount + idx + 1,
            maxMarks: marksPerQ,
            bloomLevel: 'Remember',
            coId: courseOutcomes[0]?.id || null,
            isOptional: false,
            subQuestions: [],
          }));
          return { ...section, questions: [...section.questions, ...newQuestions] };
        }
        return section;
      })
    );
    toast({ title: `Added ${count} questions` });
  };

  // ====== DUPLICATE SECTION ======
  const duplicateSection = (sectionId: string) => {
    const sectionToCopy = sections.find(s => s.id === sectionId);
    if (!sectionToCopy) return;
    const newSection: SectionInput = {
      ...JSON.parse(JSON.stringify(sectionToCopy)),
      id: `temp-${Date.now()}`,
      name: `${sectionToCopy.name} (Copy)`,
      sequence: sections.length + 1,
      questions: sectionToCopy.questions.map((q, idx) => ({
        ...JSON.parse(JSON.stringify(q)),
        id: `temp-q-${Date.now()}-${idx}`,
        subQuestions: q.subQuestions.map((sq, sqIdx) => ({
          ...JSON.parse(JSON.stringify(sq)),
          id: `temp-sq-${Date.now()}-${sqIdx}`,
        })),
      })),
    };
    setSections([...sections, newSection]);
    toast({ title: 'Section duplicated' });
  };

  // ====== AUTO-CALCULATE SECTION MARKS ======
  const calculateSectionMarks = (section: SectionInput): number => {
    // If questions are explicitly marked as optional, exclude them from the pool
    // Otherwise, consider all questions as candidates (Answer Any N)
    const nonOptionalQuestions = section.questions.filter(q => !q.isOptional);
    const pool = nonOptionalQuestions.length > 0 ? nonOptionalQuestions : section.questions;

    const sortedMarks = pool
      .map(q => q.maxMarks)
      .sort((a, b) => b - a);
    return sortedMarks.slice(0, section.requiredQuestions).reduce((sum, m) => sum + m, 0);
  };

  const addSection = () => {
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
  };

  const removeSection = (sectionId: string) => {
    setSections(prev => prev.filter(s => s.id !== sectionId));
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



  const handleSave = async () => {
    setIsSaving(true);
    try {
      const apiPayload = transformToApi(sections);
      // We need to cast to any here because the onSave prop expects SectionInput[] 
      // but we're sending the transformed payload. 
      // ideally the parent should handle this or the types should be updated.
      await onSave(apiPayload as any); 
      toast({
        title: 'Structure saved',
        description: 'Exam structure has been saved successfully.',
      });
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Error saving structure',
        description: 'Failed to save exam structure. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading structure...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Exam Structure</h3>
          <p className="text-sm text-muted-foreground">Define sections, questions, and CO/Bloom mapping</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Quick Templates Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="bg-amber-50 border-amber-200 hover:bg-amber-100">
                <Zap className="w-4 h-4 mr-2 text-amber-600" />
                Quick Templates
                <ChevronDown className="w-4 h-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {examTemplates.map((template, idx) => (
                <DropdownMenuItem key={idx} onClick={() => applyTemplate(idx)}>
                  <FileText className="w-4 h-4 mr-2" />
                  {template.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                Templates auto-populate all sections & questions
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button variant="outline" onClick={addSection}>
            <Plus className="w-4 h-4 mr-2" />
            Add Section
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Structure'}
          </Button>
        </div>
      </div>

      {sections.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No sections yet. Click "Add Section" to start building the exam structure.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {sections.map((section) => (
            <Card key={section.id}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab" />
                    <Input
                      value={section.name}
                      onChange={(e) => updateSectionField(section.id, 'name', e.target.value)}
                      className="font-semibold text-lg border-0 px-0 focus-visible:ring-0 max-w-xs"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 mr-2">
                         <Label className="text-sm text-muted-foreground whitespace-nowrap">Max Marks:</Label>
                         <Input
                            type="number"
                            value={section.maxMarks}
                            onChange={(e) => updateSectionField(section.id, 'maxMarks', parseInt(e.target.value) || 0)}
                            className="w-16 h-8"
                            min={0}
                         />
                    </div>
                    <Badge variant="outline">{section.questions.length} Qs</Badge>
                    
                    {/* Batch Add Questions Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-muted-foreground">
                          <Plus className="w-4 h-4 mr-1" />
                          Add
                          <ChevronDown className="w-3 h-3 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => addQuestion(section.id)}>
                          Add 1 Question
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => addBatchQuestions(section.id, 4, 2)}>
                          +4 Questions (2 marks each)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => addBatchQuestions(section.id, 4, 5)}>
                          +4 Questions (5 marks each)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => addBatchQuestions(section.id, 2, 10)}>
                          +2 Questions (10 marks each)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    
                    {/* Duplicate Section */}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => duplicateSection(section.id)}
                      className="text-muted-foreground hover:text-foreground"
                      title="Duplicate section"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    
                    {/* Delete Section */}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeSection(section.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-muted-foreground">Required:</Label>
                    <Input
                      type="number"
                      value={section.requiredQuestions}
                      onChange={(e) => updateSectionField(section.id, 'requiredQuestions', parseInt(e.target.value) || 1)}
                      className="w-16 h-8"
                      min={1}
                    />
                  </div>
                   {calculateSectionMarks(section) > section.maxMarks && (
                      <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                          <Zap className="w-3 h-3" />
                           Sum ({calculateSectionMarks(section)}) &gt; Max ({section.maxMarks})
                      </div>
                   )}
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-muted-foreground">Selection:</Label>
                    <Select
                      value={section.selectionMode}
                      onValueChange={(value: 'FIRST_N' | 'BEST_N') => updateSectionField(section.id, 'selectionMode', value)}
                    >
                      <SelectTrigger className="w-32 h-8">
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
              <CardContent>
                <div className="space-y-4">
                  {section.questions.map((question, qIndex) => (
                    <div key={question.id} className="border border-border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-mono text-muted-foreground font-semibold">Q{qIndex + 1}</span>
                          <Select
                            value={question.coId || ''}
                            onValueChange={(value) => updateQuestionField(section.id, question.id, 'coId', value || null)}
                          >
                            <SelectTrigger className="w-24 h-8">
                              <SelectValue placeholder="CO" />
                            </SelectTrigger>
                            <SelectContent>
                              {courseOutcomes.map(co => (
                                <SelectItem key={co.id} value={co.id}>CO{co.co_number}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={question.bloomLevel}
                            onValueChange={(value) => updateQuestionField(section.id, question.id, 'bloomLevel', value)}
                          >
                            <SelectTrigger className="w-28 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {bloomLevels.map(level => (
                                <SelectItem key={level} value={level}>{level}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={question.isOptional}
                              onChange={(e) => updateQuestionField(section.id, question.id, 'isOptional', e.target.checked)}
                              className="rounded border-border"
                            />
                            Optional
                          </label>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => removeQuestion(section.id, question.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>

                      <div className="ml-8 space-y-2">
                        {(question.subQuestions || []).map((sq) => (
                          <div key={sq.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded">
                            <span className="text-xs font-mono text-muted-foreground w-8">({sq.label})</span>
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-muted-foreground">Marks:</Label>
                              <Input 
                                type="number" 
                                value={sq.maxMarks} 
                                onChange={(e) => updateSubQuestionField(section.id, question.id, sq.id, 'maxMarks', parseInt(e.target.value) || 0)}
                                className="w-16 h-7 text-sm" 
                                min={0}
                              />
                            </div>
                            <Select
                              value={sq.coId || ''}
                              onValueChange={(value) => updateSubQuestionField(section.id, question.id, sq.id, 'coId', value || null)}
                            >
                              <SelectTrigger className="w-20 h-7 text-sm">
                                <SelectValue placeholder="CO" />
                              </SelectTrigger>
                              <SelectContent>
                                {courseOutcomes.map(co => (
                                  <SelectItem key={co.id} value={co.id}>CO{co.co_number}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select
                              value={sq.bloomLevel}
                              onValueChange={(value) => updateSubQuestionField(section.id, question.id, sq.id, 'bloomLevel', value)}
                            >
                              <SelectTrigger className="w-24 h-7 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {bloomLevels.map(level => (
                                  <SelectItem key={level} value={level}>{level}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => addSubQuestion(section.id, question.id)}
                          className="text-xs h-7"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add Part
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-dashed"
                    onClick={() => addQuestion(section.id)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Question
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
