import { useState } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { gradingApi, subjectsApi, cohortsApi } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Award, Calculator, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export default function GradeManagement() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCohort, setSelectedCohort] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedScale, setSelectedScale] = useState<string>('');
  const [newRule, setNewRule] = useState({
    grade: '',
    min_percentage: 0,
    max_percentage: 100,
    grade_point: 0,
  });

  // Fetch grade scales
  const { data: scales = [] } = useQuery({
    queryKey: ['grade-scales'],
    queryFn: () => gradingApi.getScales(),
  });

  const { data: rules = [], isLoading: rulesLoading } = useQuery({
    queryKey: ['grading-rules'],
    queryFn: () => gradingApi.getRules(),
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => subjectsApi.list(),
  });

  const { data: cohorts = [] } = useQuery({
    queryKey: ['cohorts'],
    queryFn: () => cohortsApi.list(),
  });

  const { data: finalMarks = [], isLoading: marksLoading } = useQuery({
    queryKey: ['final-marks', selectedCohort, selectedSubject],
    queryFn: () => gradingApi.getFinalMarks({ 
      cohort_id: selectedCohort || undefined, 
      subject_id: selectedSubject || undefined 
    }),
    enabled: !!(selectedCohort || selectedSubject),
  });

  const createRuleMutation = useMutation({
    mutationFn: (data: { grade_scale_id: string; grade: string; min_percentage: number; max_percentage: number; grade_point: number }) =>
      gradingApi.createRule(data),
    onSuccess: () => {
      toast({ title: 'Grading rule created' });
      setIsDialogOpen(false);
      setNewRule({ grade: '', min_percentage: 0, max_percentage: 100, grade_point: 0 });
      queryClient.invalidateQueries({ queryKey: ['grading-rules'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating rule',
        description: error.response?.data?.detail || 'Failed to create rule',
        variant: 'destructive',
      });
    },
  });

  const calculateMutation = useMutation({
    mutationFn: () => gradingApi.calculateGrades(selectedCohort, selectedSubject),
    onSuccess: () => {
      toast({ title: 'Grades calculated successfully' });
      queryClient.invalidateQueries({ queryKey: ['final-marks'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error calculating grades',
        description: error.response?.data?.detail || 'Failed to calculate grades',
        variant: 'destructive',
      });
    },
  });

  const handleCreateRule = () => {
    if (!selectedScale) {
      toast({ title: 'Please select a grade scale', variant: 'destructive' });
      return;
    }
    if (!newRule.grade) {
      toast({ title: 'Please enter a grade name', variant: 'destructive' });
      return;
    }
    createRuleMutation.mutate({ ...newRule, grade_scale_id: selectedScale });
  };
  // Create Scale mutation
  const createScaleMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) => gradingApi.createScale(data),
    onSuccess: () => {
      toast({ title: 'Grade scale created' });
      queryClient.invalidateQueries({ queryKey: ['grade-scales'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating scale',
        description: error.response?.data?.detail || 'Failed to create scale',
        variant: 'destructive',
      });
    },
  });

  // Delete Rule mutation
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null);
  const deleteRuleMutation = useMutation({
    mutationFn: (id: string) => gradingApi.deleteRule(id),
    onSuccess: () => {
      toast({ title: 'Grading rule deleted' });
      setDeleteRuleId(null);
      queryClient.invalidateQueries({ queryKey: ['grading-rules'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting rule',
        description: error.response?.data?.detail || 'Failed to delete rule',
        variant: 'destructive',
      });
    },
  });

  return (
    <AuthenticatedLayout allowedRoles={['principal', 'hod']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Grade Management</h2>
            <p className="text-muted-foreground">Configure grading rules and calculate grades</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Rule
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Grading Rule</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Grade Scale</Label>
                  {scales.length === 0 ? (
                    <div className="flex gap-2 items-center">
                      <p className="text-sm text-muted-foreground">No scales exist.</p>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => createScaleMutation.mutate({ name: 'R-2021 Absolute', description: 'Default grading scale' })}
                        disabled={createScaleMutation.isPending}
                      >
                        {createScaleMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                        Create Default Scale
                      </Button>
                    </div>
                  ) : (
                    <Select value={selectedScale} onValueChange={setSelectedScale}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a grade scale" />
                      </SelectTrigger>
                      <SelectContent>
                        {scales.map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Grade</Label>
                  <Input
                    value={newRule.grade}
                    onChange={(e) => setNewRule({ ...newRule, grade: e.target.value.toUpperCase() })}
                    placeholder="e.g., A+"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Min %</Label>
                    <Input
                      type="number"
                      value={newRule.min_percentage}
                      onChange={(e) => setNewRule({ ...newRule, min_percentage: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max %</Label>
                    <Input
                      type="number"
                      value={newRule.max_percentage}
                      onChange={(e) => setNewRule({ ...newRule, max_percentage: parseInt(e.target.value) || 100 })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Grade Point</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={newRule.grade_point}
                    onChange={(e) => setNewRule({ ...newRule, grade_point: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <Button className="w-full" onClick={handleCreateRule} disabled={createRuleMutation.isPending}>
                  {createRuleMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Add Rule
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Grading Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Award className="w-4 h-4" />
              Grading Scale
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rulesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : rules.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No grading rules configured</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {rules.map((rule: any) => (
                  <div key={rule.id} className="p-4 border rounded-lg text-center bg-secondary/20 relative group">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                      onClick={() => setDeleteRuleId(rule.id)}
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                    <p className="text-2xl font-bold text-primary">{rule.grade}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {rule.min_percentage}% - {rule.max_percentage}%
                    </p>
                    <Badge variant="outline" className="mt-2">
                      GP: {rule.grade_point}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          open={!!deleteRuleId}
          onOpenChange={(open) => !open && setDeleteRuleId(null)}
          onConfirm={() => deleteRuleId && deleteRuleMutation.mutate(deleteRuleId)}
          title="Delete Grading Rule"
          description="Are you sure you want to delete this grading rule? This action cannot be undone."
          variant="destructive"
        />

        {/* Grade Calculation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              Calculate Grades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-6">
              <Select value={selectedCohort} onValueChange={setSelectedCohort}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select cohort" />
                </SelectTrigger>
                <SelectContent>
                  {cohorts.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.code} - {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => calculateMutation.mutate()}
                disabled={calculateMutation.isPending || !selectedCohort || !selectedSubject}
              >
                {calculateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Calculate
              </Button>
            </div>

            {marksLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : finalMarks.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Internal 1</TableHead>
                    <TableHead>Internal 2</TableHead>
                    <TableHead>Best</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>%</TableHead>
                    <TableHead>Grade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {finalMarks.map((m: any) => (
                    <TableRow key={m.id}>
                      <TableCell>{m.student?.full_name || 'N/A'}</TableCell>
                      <TableCell>{m.internal_1 ?? '-'}</TableCell>
                      <TableCell>{m.internal_2 ?? '-'}</TableCell>
                      <TableCell>{m.best_internal}</TableCell>
                      <TableCell>{m.total_marks}</TableCell>
                      <TableCell>{(Number(m.percentage) || 0).toFixed(1)}%</TableCell>
                      <TableCell>
                        <Badge variant={m.grade !== 'F' ? 'default' : 'destructive'}>
                          {m.grade}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center py-8 text-muted-foreground">
                Select a cohort and subject to view grades
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}
