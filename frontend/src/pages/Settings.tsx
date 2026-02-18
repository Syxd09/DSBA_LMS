import { useState, useEffect } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { usersApi, configApi } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Palette, Bell, ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/components/theme-provider';

export default function Settings() {
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const { setTheme, theme } = useTheme();
  
  // Fetch current user profile to get preferences
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.user_id],
    queryFn: () => usersApi.get(user?.user_id || ''),
    enabled: !!user?.user_id,
  });

  // Institutional Settings (Principal Only)
  const { data: systemSettings, isLoading: loadingSettings } = useQuery({
    queryKey: ['system-settings'],
    queryFn: () => configApi.listSystemSettings(),
    enabled: user?.role === 'principal',
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
    mutationFn: (data: Record<string, any>) => 
      usersApi.updateProfile({ ...profile, ...data }),
    onSuccess: (updatedProfile) => {
      toast({ title: 'Profile updated' });
      // Sync global auth state
      updateUser(updatedProfile);
      queryClient.invalidateQueries({ queryKey: ['profile', user?.user_id] });
    },
    onError: () => {
      toast({ title: 'Failed to save preferences', variant: 'destructive' });
    }
  });

  const updateSettingMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      configApi.updateSystemSetting(key, value),
    onSuccess: () => {
      toast({ title: 'System setting updated' });
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
    },
    onError: () => {
      toast({ title: 'Failed to update system setting', variant: 'destructive' });
    }
  });

  const handleNotificationToggle = (enabled: boolean) => {
    setNotifications(enabled);
    updateProfileMutation.mutate({
      notification_preferences: JSON.stringify({
        email: enabled, // For now sync both
        in_app: enabled
      })
    } as any);
  };

  const activeYear = systemSettings?.find(s => s.key === 'active_academic_year')?.value || '2023-24';
  const activeSemType = systemSettings?.find(s => s.key === 'active_semester_type')?.value || 'Odd';

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
              <Switch 
                checked={theme === 'dark'} 
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')} 
              />
            </div>
          </CardContent>
        </Card>

        {/* Institutional Settings - Principal Only */}
        {user?.role === 'principal' && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-primary">
                <ShieldCheck className="w-4 h-4" />
                Institutional Governance
              </CardTitle>
              <CardDescription>Global defaults for all university dashboards</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {loadingSettings ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Active Academic Year */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Active Academic Year</Label>
                    <Select 
                      value={activeYear} 
                      onValueChange={(val) => updateSettingMutation.mutate({ key: 'active_academic_year', value: val })}
                      disabled={updateSettingMutation.isPending}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select Year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2022-23">2022-23</SelectItem>
                        <SelectItem value="2023-24">2023-24</SelectItem>
                        <SelectItem value="2024-25">2024-25</SelectItem>
                        <SelectItem value="2025-26">2025-26</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground italic">Affects default data scoping institution-wide</p>
                  </div>

                  {/* Active Semester type */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Active Semester Cycle</Label>
                    <Select 
                      value={activeSemType} 
                      onValueChange={(val) => updateSettingMutation.mutate({ key: 'active_semester_type', value: val })}
                      disabled={updateSettingMutation.isPending}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select Cycle" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Odd">Odd Semester (Aug - Jan)</SelectItem>
                        <SelectItem value="Even">Even Semester (Feb - July)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground italic">Controls current assessment visibility</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

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
      </div>
    </AuthenticatedLayout>
  );
}
