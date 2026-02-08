import { useState, useEffect } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { gradingApi, usersApi } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Award, Calendar, Palette, Bell, Plus, Loader2, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAuth } from '@/hooks/useAuth';

export default function Settings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  
  // Fetch current user profile to get preferences
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.user_id],
    queryFn: () => usersApi.get(user?.user_id || ''),
    enabled: !!user?.user_id,
  });

  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    if (profile?.notification_preferences) {
      try {
        const prefs = JSON.parse(profile.notification_preferences);
        setNotifications(prefs.in_app !== false); // Default to true
      } catch (e) {
        setNotifications(true);
      }
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: (data: { notification_preferences: string }) => 
      usersApi.updateProfile({ ...profile, ...data }),
    onSuccess: () => {
      toast({ title: 'Preferences saved' });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: () => {
      toast({ title: 'Failed to save preferences', variant: 'destructive' });
    }
  });

  const handleNotificationToggle = (enabled: boolean) => {
    setNotifications(enabled);
    updateProfileMutation.mutate({
      notification_preferences: JSON.stringify({
        email: enabled, // For now sync both
        in_app: enabled
      })
    });
  };

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

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    }
  }, []);

  return (
    <AuthenticatedLayout allowedRoles={['principal', 'hod', 'teacher', 'student']}>
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
              <div className="space-y-0.5">
                <Label>Dark Mode</Label>
                <p className="text-sm text-muted-foreground">Enable dark theme for the application</p>
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
            <CardDescription>Manage how you receive alerts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive alerts for important updates</p>
              </div>
              <Switch 
                checked={notifications} 
                onCheckedChange={handleNotificationToggle} 
                disabled={updateProfileMutation.isPending}
              />
            </div>
          </CardContent>
        </Card>

        {/* Grading Scale - Only for Principal */}
        {user?.role === 'principal' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="w-4 h-4" />
                Grading Scale
              </CardTitle>
              <CardDescription>Define grade ranges and points</CardDescription>
            </div>
            <Button size="sm" onClick={() => setIsRuleDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Rule
            </Button>
          </CardHeader>
          <CardContent>
            {rulesLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : gradingRules.length > 0 ? (
              <div className="space-y-2">
                {gradingRules.map((rule: any) => (
                  <div key={rule.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                        {rule.grade}
                      </div>
                      <div>
                        <p className="font-medium">{rule.min_percentage}% - {rule.max_percentage}%</p>
                        <p className="text-sm text-muted-foreground">Grade Point: {rule.grade_point}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteRuleId(rule.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-4 text-muted-foreground">No grading rules defined</p>
            )}
          </CardContent>
        </Card>
        )}

        {/* Academic Years - Placeholder */}
        {user?.role === 'principal' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Academic Years
            </CardTitle>
            <CardDescription>Manage academic sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-3 border rounded-lg opacity-50 cursor-not-allowed">
              <div>
                <p className="font-medium">2023-2024</p>
                <p className="text-sm text-muted-foreground">Current Session</p>
              </div>
              <Badge>Active</Badge>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Rule Dialog */}
        <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Grading Rule</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Grade (e.g., A+)</Label>
                  <Input 
                    value={newRule.grade}
                    onChange={(e) => setNewRule({...newRule, grade: e.target.value.toUpperCase()})}
                    placeholder="A+"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Grade Point</Label>
                  <Input 
                    type="number" 
                    step="0.1"
                    value={newRule.grade_point}
                    onChange={(e) => setNewRule({...newRule, grade_point: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Min %</Label>
                  <Input 
                    type="number" 
                    value={newRule.min_percentage}
                    onChange={(e) => setNewRule({...newRule, min_percentage: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max %</Label>
                  <Input 
                    type="number" 
                    value={newRule.max_percentage}
                    onChange={(e) => setNewRule({...newRule, max_percentage: parseFloat(e.target.value)})}
                  />
                </div>
              </div>
              <Button 
                onClick={() => createRuleMutation.mutate(newRule)} 
                disabled={createRuleMutation.isPending || !newRule.grade}
                className="w-full"
              >
                {createRuleMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Rule
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <ConfirmDialog
          isOpen={!!deleteRuleId}
          onClose={() => setDeleteRuleId(null)}
          onConfirm={() => deleteRuleId && deleteRuleMutation.mutate(deleteRuleId)}
          title="Delete Rule"
          description="Are you sure you want to delete this grading rule?"
        />
      </div>
    </AuthenticatedLayout>
  );
}
