import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, GripVertical, Save } from 'lucide-react';
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

  useEffect(() => {
    if (initialSections) {
      setSections(initialSections);
    }
  }, [initialSections]);

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

  const calculateSectionMarks = (section: SectionInput) => {
    return section.questions.reduce((sum, q) => 
      sum + q.subQuestions.reduce((sqSum, sq) => sqSum + sq.maxMarks, 0), 0
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(sections);
      toast({
        title: 'Structure saved',
        description: 'Exam structure has been saved successfully.',
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

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading structure...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Exam Structure</h3>
          <p className="text-sm text-muted-foreground">Define sections, questions, and CO/Bloom mapping</p>
        </div>
        <div className="flex gap-2">
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
                    <Badge variant="secondary">{calculateSectionMarks(section)} marks</Badge>
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

                      {/* Sub-questions */}
                      <div className="ml-8 space-y-2">
                        {question.subQuestions.map((sq) => (
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
