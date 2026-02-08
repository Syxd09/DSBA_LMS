import { useState, useEffect } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { gradingApi } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings as SettingsIcon, Award, Calendar, Palette, Bell, Plus, Loader2, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export default function Settings() {
  const queryClient = useQueryClient();
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('notifications_enabled');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Persist notification preference
  useEffect(() => {
    localStorage.setItem('notifications_enabled', JSON.stringify(notifications));
  }, [notifications]);
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null);
  const [newRule, setNewRule] = useState({
    grade: '',
    min_percentage: 0,
    max_percentage: 100,
    grade_point: 0,
  });

  const { data: gradingRules = [], isLoading: rulesLoading } = useQuery({
    queryKey: ['grading-rules'],
    queryFn: () => gradingApi.getRules(),
  });

  const createRuleMutation = useMutation({
    mutationFn: (data: typeof newRule) => gradingApi.createRule(data),
    onSuccess: () => {
      toast({ title: 'Grading rule added' });
      setIsRuleDialogOpen(false);
      setNewRule({ grade: '', min_percentage: 0, max_percentage: 100, grade_point: 0 });
      queryClient.invalidateQueries({ queryKey: ['grading-rules'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to add rule',
        variant: 'destructive',
      });
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id: string) => gradingApi.deleteRule(id),
    onSuccess: () => {
      toast({ title: 'Rule deleted' });
      setDeleteRuleId(null);
      queryClient.invalidateQueries({ queryKey: ['grading-rules'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to delete rule',
        variant: 'destructive',
      });
    },
  });

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    localStorage.setItem('theme', newTheme);
    toast({ title: `Theme changed to ${newTheme} mode` });
  };

  return (
    <AuthenticatedLayout allowedRoles={['principal']}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Settings</h2>
          <p className="text-muted-foreground">System configuration and preferences</p>
        </div>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Appearance
            </CardTitle>
            <CardDescription>Customize the look and feel</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Dark Mode</p>
                <p className="text-sm text-muted-foreground">Toggle between light and dark theme</p>
              </div>
              <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notifications
            </CardTitle>
            <CardDescription>Manage notification preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Receive updates via email</p>
              </div>
              <Switch checked={notifications} onCheckedChange={setNotifications} />
            </div>
          </CardContent>
        </Card>

        {/* Grading Scale */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  Grading Scale
                </CardTitle>
                <CardDescription>Configure grade boundaries and points</CardDescription>
              </div>
              <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Grade
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Grading Rule</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
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
                    <Button
                      className="w-full"
                      onClick={() => createRuleMutation.mutate(newRule)}
                      disabled={createRuleMutation.isPending}
                    >
                      {createRuleMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Add Rule
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {rulesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : gradingRules.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No grading rules configured</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {gradingRules.map((rule: any) => (
                  <div key={rule.id} className="relative p-4 border rounded-lg text-center bg-secondary/20 group">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 h-6 w-6"
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

        {/* Academic Year */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Academic Year
            </CardTitle>
            <CardDescription>Current academic year settings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label>Current Academic Year</Label>
                <Input value="2024-2025" className="mt-2" disabled />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Academic year is configured at the system level.
            </p>
          </CardContent>
        </Card>

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={!!deleteRuleId}
          onOpenChange={() => setDeleteRuleId(null)}
          title="Delete Grading Rule"
          description="Are you sure you want to delete this grading rule? This action cannot be undone."
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={() => deleteRuleId && deleteRuleMutation.mutate(deleteRuleId)}
          isLoading={deleteRuleMutation.isPending}
        />
      </div>
    </AuthenticatedLayout>
  );
}
