import { useState, useEffect } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { usersApi } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Calendar, Palette, Bell } from 'lucide-react';
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
    } as any);
  };

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
      </div>
    </AuthenticatedLayout>
  );
}
