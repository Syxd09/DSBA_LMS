import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface Cohort {
  id: string;
  name: string;
  year?: number;
}

interface ExamWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: Subject[];
  cohorts: Cohort[];
  onSubmit: (data: any) => Promise<void>;
  isSubmitting?: boolean;
}

const EXAM_TYPES = [
  { value: 'INTERNAL_1', label: 'Internal Assessment 1' },
  { value: 'INTERNAL_2', label: 'Internal Assessment 2' },
  { value: 'EXTERNAL', label: 'End-Semester Exam' }
];

export function ExamWizard({ open, onOpenChange, subjects, cohorts, onSubmit, isSubmitting }: ExamWizardProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    subjectId: '',
    cohortId: '',
    semester: '',
    examType: 'INTERNAL_1',
    customTypeName: '',
    maxMarks: 30,
    passingMarks: '',
    examDate: '',
    duration: '',
    instructions: ''
  });

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    if (step === 1) {
      return formData.subjectId && formData.cohortId && formData.semester &&
        formData.examType;
    }
    if (step === 2) {
      return formData.maxMarks > 0;
    }
    return true;
  };

  const handleNext = () => {
    if (canProceed() && step < totalSteps) {
      setStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!canProceed()) return;
    
    const submitData = {
      ...formData,
      passingMarks: formData.passingMarks ? parseFloat(formData.passingMarks) : undefined,
      duration: formData.duration ? parseInt(formData.duration) : undefined,
      examDate: formData.examDate || undefined
    };
    
    await onSubmit(submitData);
    
    // Reset form
    setStep(1);
    setFormData({
      subjectId: '',
      cohortId: '',
      semester: '',
      examType: 'INTERNAL_1',
      customTypeName: '',
      maxMarks: 30,
      passingMarks: '',
      examDate: '',
      duration: '',
      instructions: ''
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Exam</DialogTitle>
          <Progress value={progress} className="mt-2" />
          <p className="text-sm text-muted-foreground mt-1">
            Step {step} of {totalSteps}
          </p>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label>Subject *</Label>
                <Select value={formData.subjectId} onValueChange={(v) => updateField('subjectId', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.code} - {s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Cohort *</Label>
                <Select value={formData.cohortId} onValueChange={(v) => updateField('cohortId', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select cohort" />
                  </SelectTrigger>
                  <SelectContent>
                    {cohorts.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Semester *</Label>
                <Select value={formData.semester} onValueChange={(v) => updateField('semester', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select semester" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                      <SelectItem key={sem} value={sem.toString()}>Semester {sem}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Exam Type *</Label>
                <Select value={formData.examType} onValueChange={(v) => updateField('examType', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXAM_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Maximum Marks *</Label>
                  <Input
                    type="number"
                    value={formData.maxMarks}
                    onChange={(e) => updateField('maxMarks', parseInt(e.target.value) || 0)}
                    min={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Passing Marks</Label>
                  <Input
                    type="number"
                    value={formData.passingMarks}
                    onChange={(e) => updateField('passingMarks', e.target.value)}
                    placeholder="Optional"
                    max={formData.maxMarks}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Exam Date & Time</Label>
                  <Input
                    type="datetime-local"
                    value={formData.examDate}
                    onChange={(e) => updateField('examDate', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duration (minutes)</Label>
                  <Input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => updateField('duration', e.target.value)}
                    placeholder="e.g., 60"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Instructions for Students</Label>
                <Textarea
                  value={formData.instructions}
                  onChange={(e) => updateField('instructions', e.target.value)}
                  placeholder="Add exam instructions, rules, or special notes..."
                  rows={4}
                />
              </div>
            </>
          )}

          {step === 3 && (
            <div className="space-y-4 bg-muted/30 p-4 rounded-lg">
              <h3 className="font-semibold">Review Exam Details</h3>
              
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subject:</span>
                  <span className="font-medium">
                    {subjects.find(s => s.id === formData.subjectId)?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cohort:</span>
                  <span className="font-medium">
                    {cohorts.find(c => c.id === formData.cohortId)?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium">
                    {formData.examType === 'CUSTOM' ? formData.customTypeName : 
                      EXAM_TYPES.find(t => t.value === formData.examType)?.label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Marks:</span>
                  <span className="font-medium">{formData.maxMarks} marks</span>
                </div>
                {formData.examDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Scheduled:</span>
                    <span className="font-medium">
                      {new Date(formData.examDate).toLocaleString()}
                    </span>
                  </div>
                )}
                {formData.duration && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="font-medium">{formData.duration} minutes</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 1 || isSubmitting}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {step < totalSteps ? (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!canProceed() || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Create Exam
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
