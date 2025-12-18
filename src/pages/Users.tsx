import { useState, useEffect } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { UserPlus, Search, Loader2, Trash2, Pencil } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive?: boolean;
  createdAt: string;
  department?: { id: string; name: string; code: string };
}

interface Department {
  id: string;
  name: string;
  code: string;
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'STUDENT',
    departmentId: 'none',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, departmentsRes] = await Promise.all([
        api.get('/users'),
        api.get('/departments'),
      ]);
      setUsers(usersRes.data || []);
      setDepartments(departmentsRes.data || []);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch users.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ fullName: '', email: '', password: '', role: 'STUDENT', departmentId: 'none' });
    setIsEditMode(false);
    setEditingUser(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setFormData({
      fullName: user.fullName,
      email: user.email,
      password: '',
      role: user.role,
      departmentId: user.department?.id || 'none',
    });
    setEditingUser(user);
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  const handleOpenDelete = (user: User) => {
    setDeletingUser(user);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.fullName || !formData.email || (!isEditMode && !formData.password) || !formData.role) {
      toast({ title: 'Validation Error', description: 'Please fill in all required fields.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        departmentId: formData.departmentId === 'none' ? null : formData.departmentId
      };

      if (isEditMode && editingUser) {
        await api.put(`/users/${editingUser.id}`, payload);
        toast({ title: 'User updated', description: `${formData.fullName} has been updated.` });
      } else {
        await api.post('/users', payload);
        toast({ title: 'User created', description: `${formData.fullName} has been created.` });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Operation failed.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    
    setIsSubmitting(true);
    try {
      await api.delete(`/users/${deletingUser.id}`);
      toast({ title: 'User deleted', description: `${deletingUser.fullName} has been removed.` });
      setDeleteDialogOpen(false);
      setDeletingUser(null);
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to delete user.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter(user =>
    (user.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.role || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AuthenticatedLayout allowedRoles={['principal', 'admin']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">User Management</h2>
            <p className="text-muted-foreground">Manage faculty, students, and staff access</p>
          </div>
          <Button onClick={handleOpenCreate}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{isEditMode ? 'Edit User' : 'Add New User'}</DialogTitle>
              <DialogDescription>
                {isEditMode ? 'Update user details.' : 'Create a new user account.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g., John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@college.edu"
                  disabled={isEditMode}
                />
              </div>
              {!isEditMode && (
                <div className="space-y-2">
                  <Label>Password *</Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role *</Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STUDENT">Student</SelectItem>
                      <SelectItem value="TEACHER">Teacher</SelectItem>
                      <SelectItem value="HOD">HOD</SelectItem>
                      <SelectItem value="PRINCIPAL">Principal</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={formData.departmentId} onValueChange={(value) => setFormData({ ...formData, departmentId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select dept" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>{dept.code}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="w-full" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : (isEditMode ? 'Update User' : 'Create Account')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <ConfirmDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Delete User"
          description={`This will permanently delete "${deletingUser?.fullName}" and all associated data.`}
          confirmText={deletingUser?.email?.split('@')[0] || ''}
          onConfirm={handleDelete}
          isLoading={isSubmitting}
        />

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUsers.map((user) => (
              <Card key={user.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{user.fullName}</CardTitle>
                  <Badge variant={
                    user.role === 'PRINCIPAL' ? 'destructive' :
                    user.role === 'HOD' ? 'default' :
                    user.role === 'TEACHER' ? 'secondary' : 'outline'
                  }>{user.role}</Badge>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground mb-2">{user.email}</div>
                  {user.department && (
                    <div className="text-xs font-medium mb-4">Dept: {user.department.code}</div>
                  )}
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(user)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleOpenDelete(user)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
