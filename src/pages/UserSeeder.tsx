import { useState } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { authApi, usersApi } from '@/lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Loader2, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function UserSeeder() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'principal' | 'hod' | 'teacher' | 'student'>('student');
  const [createdUsers, setCreatedUsers] = useState<Array<{ email: string; role: string }>>([]);

  const createUserMutation = useMutation({
    mutationFn: async () => {
      // First signup the user
      const signupResult = await authApi.signup(email, password, fullName);
      
      // Then update their role if not student
      if (role !== 'student' && signupResult.user?.id) {
        await usersApi.updateRole(signupResult.user.id, role);
      }
      
      return { email, role };
    },
    onSuccess: (data) => {
      toast({ title: 'User created successfully', description: `${data.email} as ${data.role}` });
      setCreatedUsers(prev => [...prev, data]);
      setEmail('');
      setPassword('');
      setFullName('');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating user',
        description: error.response?.data?.detail || 'Failed to create user',
        variant: 'destructive',
      });
    },
  });

  const handleCreate = () => {
    if (!email || !password || !fullName) {
      toast({ title: 'Please fill in all fields', variant: 'destructive' });
      return;
    }
    if (password.length < 6) {
      toast({ title: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    createUserMutation.mutate();
  };

  const predefinedUsers = [
    { email: 'principal@edumetrics.com', name: 'Dr. Principal', role: 'principal' as const },
    { email: 'hod@edumetrics.com', name: 'Prof. HOD', role: 'hod' as const },
    { email: 'teacher@edumetrics.com', name: 'Mr. Teacher', role: 'teacher' as const },
    { email: 'student@edumetrics.com', name: 'John Student', role: 'student' as const },
  ];

  const seedPredefined = async (user: typeof predefinedUsers[0]) => {
    setEmail(user.email);
    setFullName(user.name);
    setRole(user.role);
    setPassword('password123');
  };

  return (
    <AuthenticatedLayout allowedRoles={['principal']}>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">User Seeder</h2>
          <p className="text-muted-foreground">Create test users for the system</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Seed</CardTitle>
            <CardDescription>Click to populate form with predefined user data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {predefinedUsers.map((user) => (
                <Button
                  key={user.email}
                  variant="outline"
                  onClick={() => seedPredefined(user)}
                  className="justify-start"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create User</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g., John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g., user@edumetrics.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v: any) => setRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="principal">Principal</SelectItem>
                  <SelectItem value="hod">HOD</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleCreate} disabled={createUserMutation.isPending}>
              {createUserMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create User
            </Button>
          </CardContent>
        </Card>

        {createdUsers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Created Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {createdUsers.map((user, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-green-500/10 border border-green-500/20 rounded">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">{user.email}</span>
                    <span className="text-xs text-muted-foreground">({user.role})</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
