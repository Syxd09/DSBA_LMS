import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, GripVertical } from 'lucide-react';

interface Section {
  id: string;
  name: string;
  requiredQuestions: number;
  selectionMode: 'FIRST_N' | 'BEST_N';
  questions: Question[];
}

interface Question {
  id: string;
  sequence: number;
  maxMarks: number;
  coMapping: string;
  bloomLevel: string;
  isOptional: boolean;
}

export function ExamStructureBuilder() {
  const [sections, setSections] = useState<Section[]>([
    {
      id: '1',
      name: 'Section A - Short Questions',
      requiredQuestions: 5,
      selectionMode: 'FIRST_N',
      questions: [
        { id: 'q1', sequence: 1, maxMarks: 5, coMapping: 'CO1', bloomLevel: 'Remember', isOptional: false },
        { id: 'q2', sequence: 2, maxMarks: 5, coMapping: 'CO2', bloomLevel: 'Understand', isOptional: false },
      ],
    },
    {
      id: '2',
      name: 'Section B - Long Questions',
      requiredQuestions: 3,
      selectionMode: 'BEST_N',
      questions: [
        { id: 'q3', sequence: 1, maxMarks: 10, coMapping: 'CO3', bloomLevel: 'Apply', isOptional: true },
        { id: 'q4', sequence: 2, maxMarks: 10, coMapping: 'CO4', bloomLevel: 'Analyze', isOptional: true },
      ],
    },
  ]);

  const addSection = () => {
    const newSection: Section = {
      id: Date.now().toString(),
      name: `Section ${String.fromCharCode(65 + sections.length)}`,
      requiredQuestions: 1,
      selectionMode: 'FIRST_N',
      questions: [],
    };
    setSections([...sections, newSection]);
  };

  const addQuestion = (sectionId: string) => {
    setSections(prev =>
      prev.map(section => {
        if (section.id === sectionId) {
          const newQuestion: Question = {
            id: Date.now().toString(),
            sequence: section.questions.length + 1,
            maxMarks: 5,
            coMapping: 'CO1',
            bloomLevel: 'Remember',
            isOptional: false,
          };
          return { ...section, questions: [...section.questions, newQuestion] };
        }
        return section;
      })
    );
  };

  const bloomLevels = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];
  const coOptions = ['CO1', 'CO2', 'CO3', 'CO4', 'CO5'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Exam Structure</h3>
          <p className="text-sm text-muted-foreground">Define sections, questions, and mapping</p>
        </div>
        <Button onClick={addSection}>
          <Plus className="w-4 h-4 mr-2" />
          Add Section
        </Button>
      </div>

      <div className="space-y-6">
        {sections.map((section) => (
          <Card key={section.id}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab" />
                  <Input
                    value={section.name}
                    onChange={(e) =>
                      setSections(prev =>
                        prev.map(s => (s.id === section.id ? { ...s, name: e.target.value } : s))
                      )
                    }
                    className="font-semibold text-lg border-0 px-0 focus-visible:ring-0"
                  />
                </div>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">Required:</Label>
                  <Input
                    type="number"
                    value={section.requiredQuestions}
                    onChange={(e) =>
                      setSections(prev =>
                        prev.map(s =>
                          s.id === section.id ? { ...s, requiredQuestions: parseInt(e.target.value) || 1 } : s
                        )
                      )
                    }
                    className="w-16 h-8"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">Mode:</Label>
                  <Select
                    value={section.selectionMode}
                    onValueChange={(value: 'FIRST_N' | 'BEST_N') =>
                      setSections(prev =>
                        prev.map(s => (s.id === section.id ? { ...s, selectionMode: value } : s))
                      )
                    }
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
              <div className="space-y-3">
                {section.questions.map((question, index) => (
                  <div
                    key={question.id}
                    className="flex items-center gap-3 p-3 bg-background border border-border"
                  >
                    <span className="text-sm font-mono text-muted-foreground w-8">Q{index + 1}</span>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Marks:</Label>
                      <Input type="number" value={question.maxMarks} className="w-16 h-8" />
                    </div>
                    <Select value={question.coMapping}>
                      <SelectTrigger className="w-20 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {coOptions.map(co => (
                          <SelectItem key={co} value={co}>{co}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={question.bloomLevel}>
                      <SelectTrigger className="w-28 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {bloomLevels.map(level => (
                          <SelectItem key={level} value={level}>{level}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {question.isOptional && (
                      <Badge variant="outline" className="text-xs">Optional</Badge>
                    )}
                    <Button variant="ghost" size="icon" className="ml-auto h-8 w-8 text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3 h-3" />
                    </Button>
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
    </div>
  );
}
