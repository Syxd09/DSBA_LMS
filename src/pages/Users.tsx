
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserPlus, Search, Loader2, Trash2, Pencil, Key, Plus, AlertCircle, BookOpen } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface TeacherAssignment {
    id?: string;
    cohortId: string;
    semester: string;
    subjectId: string;
    departmentId?: string;
}

interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
  registrationNumber?: string;
  isActive?: boolean;
  createdAt: string;
  department?: { id: string; name: string; code: string };
  teacherAssignments?: TeacherAssignment[];
}

interface Department {
  id: string;
  name: string;
  code: string;
}

interface Cohort {
    id: string;
    name: string;
    program?: { name: string };
}

interface Subject {
    id: string;
    name: string;
    code: string;
    semester: number;
    curriculum?: {
        program?: {
            departmentId: string;
            name: string;
        }
    }
}

export default function Users() {
  const { user: currentUser } = useAuth();
  const isHod = currentUser?.role === 'hod' || currentUser?.role === 'HOD';
  const hodDepartmentId = currentUser?.departmentId || currentUser?.department?.id;

  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]); // All subjects, filtered in UI
  
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  
  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'STUDENT',
    registrationNumber: '',
    departmentId: 'none',
  });
  
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, departmentsRes, cohortsRes, subjectsRes] = await Promise.all([
        api.get('/users'),
        api.get('/departments'),
        api.get('/cohorts'),
        api.get('/subjects') 
      ]);
      setUsers(usersRes.data || []);
      setDepartments(departmentsRes.data || []);
      setCohorts(cohortsRes.data || []);
      setSubjects(subjectsRes.data || []);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch users.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ 
        fullName: '', 
        email: '', 
        password: '', 
        role: 'STUDENT', 
        registrationNumber: '',
        departmentId: isHod ? (hodDepartmentId || 'none') : 'none' 
    });
    setAssignments([]);
    setIsEditMode(false);
    setEditingUser(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleOpenEdit = async (user: User) => {
    // If Teacher, fetch full details including assignments
    let assignmentsData: TeacherAssignment[] = [];
    if (user.role === 'TEACHER') {
        try {
            const { data } = await api.get(`/users/${user.id}`);
            if (data.teacherAssignments) {
                assignmentsData = data.teacherAssignments.map((a: any) => ({
                    id: a.id,
                    cohortId: a.cohortId,
                    subjectId: a.subjectId,
                    semester: String(a.semester),
                    departmentId: a.departmentId
                }));
            }
        } catch (e) {
            console.error("Failed to fetch user details", e);
        }
    }

    setFormData({
      fullName: user.fullName,
      email: user.email,
      password: '',
      registrationNumber: user.registrationNumber || '',
      role: user.role,
      departmentId: user.department?.id || 'none',
    });
    setAssignments(assignmentsData);
    setEditingUser(user);
    setIsEditMode(true);
    setIsDialogOpen(true);
  };
  
  // Assignment Handlers
  const handleAddAssignment = () => {
      setAssignments([...assignments, { cohortId: '', semester: '', subjectId: '' }]);
  };

  const handleRemoveAssignment = (index: number) => {
      const newAssignments = [...assignments];
      newAssignments.splice(index, 1);
      setAssignments(newAssignments);
  };

  const handleAssignmentChange = (index: number, field: keyof TeacherAssignment, value: string) => {
      const newAssignments = [...assignments];
      newAssignments[index] = { ...newAssignments[index], [field]: value };
      
      // Reset subject if semester changes (to enforce validity)
      if (field === 'semester') {
           newAssignments[index].subjectId = '';
      }
      setAssignments(newAssignments);
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
        departmentId: formData.departmentId === 'none' ? null : formData.departmentId,
        teacherAssignments: formData.role === 'TEACHER' ? assignments : undefined
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

  const handleOpenReset = (user: User) => {
    setResettingUser(user);
    setNewPassword('');
    setResetDialogOpen(true);
  };

  const handleResetPassword = async () => {
    if (!resettingUser || !newPassword) return;
    
    setIsSubmitting(true);
    try {
      await api.put(`/users/${resettingUser.id}`, { password: newPassword });
      toast({ title: 'Success', description: 'Password updated successfully.' });
      setResetDialogOpen(false);
      setResettingUser(null);
      setNewPassword('');
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to reset password.', variant: 'destructive' });
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

  const filteredUsers = users.filter(user => {
    const matchesSearch = (user.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.role || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.registrationNumber || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

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

        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
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
              {formData.role === 'STUDENT' && (
                <div className="space-y-2">
                  <Label>Registration Number</Label>
                  <Input
                    value={formData.registrationNumber}
                    onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                    placeholder="e.g., U03CH23S0055"
                  />
                </div>
              )}
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
                  <Select 
                    value={formData.role} 
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                    disabled={isEditMode && formData.role !== 'TEACHER'} // Optional: lock role on edit? User didn't specify.
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STUDENT">Student</SelectItem>
                      <SelectItem value="TEACHER">Teacher</SelectItem>
                      {!isHod && <SelectItem value="HOD">HOD</SelectItem>}
                      {!isHod && <SelectItem value="PRINCIPAL">Principal</SelectItem>}
                      {!isHod && <SelectItem value="ADMIN">Admin</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select 
                    value={formData.departmentId} 
                    onValueChange={(value) => setFormData({ ...formData, departmentId: value })}
                    disabled={isHod} // HOD cannot change department
                  >
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

              {/* Teaching Assignments Section */}
              {formData.role === 'TEACHER' && (
                  <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
                      <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <h4 className="text-sm font-semibold flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-primary" />
                                Teaching Assignments
                            </h4>
                            <p className="text-xs text-muted-foreground">Assign subjects for this teacher</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={handleAddAssignment} type="button">
                              <Plus className="w-4 h-4 mr-2" /> Add Class
                          </Button>
                      </div>
                      
                      <div className="space-y-3">
                          {assignments.map((assignment, index) => {
                               // Filter subjects by Department (if selected in form)
                               const deptSubjects = subjects.filter(s => 
                                   !formData.departmentId || formData.departmentId === 'none' ||
                                   s.curriculum?.program?.departmentId === formData.departmentId
                               );

                               return (
                                  <div key={index} className="grid grid-cols-10 gap-2 items-end p-3 bg-card rounded border shadow-sm relative">
                                      <div className="col-span-3 space-y-1">
                                          <Label className="text-xs">Batch/Cohort</Label>
                                          <Select value={assignment.cohortId} onValueChange={(val) => handleAssignmentChange(index, 'cohortId', val)}>
                                              <SelectTrigger className="h-8 text-xs">
                                                  <SelectValue placeholder="Batch" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                  {cohorts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                              </SelectContent>
                                          </Select>
                                      </div>

                                      <div className="col-span-5 space-y-1">
                                          <Label className="text-xs">Subject (Auto-sets Sem)</Label>
                                           <Select 
                                                value={assignment.subjectId} 
                                                onValueChange={(val) => {
                                                    // Find subject and auto-set semester
                                                    const selectedSub = subjects.find(s => s.id === val);
                                                    if (selectedSub) {
                                                        const newAssignments = [...assignments];
                                                        newAssignments[index] = { 
                                                            ...newAssignments[index], 
                                                            subjectId: val,
                                                            semester: String(selectedSub.semester)
                                                        };
                                                        setAssignments(newAssignments);
                                                    }
                                                }}
                                           >
                                              <SelectTrigger className="h-8 text-xs">
                                                  <SelectValue placeholder="Select Subject" />
                                              </SelectTrigger>
                                              <SelectContent className="max-h-[200px]">
                                                  {[1,2,3,4,5,6,7,8].map(sem => {
                                                      const semSubjects = deptSubjects.filter(s => s.semester === sem);
                                                      if (semSubjects.length === 0) return null;
                                                      return (
                                                          <div key={sem}>
                                                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/20">
                                                                  Semester {sem}
                                                              </div>
                                                              {semSubjects.map(s => (
                                                                  <SelectItem key={s.id} value={s.id} className="pl-4">
                                                                      {s.code} - {s.name}
                                                                  </SelectItem>
                                                              ))}
                                                          </div>
                                                      );
                                                  })}
                                              </SelectContent>
                                          </Select>
                                      </div>

                                      <div className="col-span-1 space-y-1">
                                          <Label className="text-xs">Sem</Label>
                                            <div className="flex h-8 w-full items-center justify-center rounded-md border border-input bg-muted px-3 py-1 text-xs text-muted-foreground shadow-sm">
                                                {assignment.semester || '-'}
                                            </div>
                                      </div>

                                      <div className="col-span-1 flex justify-center pb-1">
                                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => handleRemoveAssignment(index)}>
                                               <Trash2 className="w-4 h-4" />
                                          </Button>
                                      </div>
                                  </div>
                              );
                          })}
                          {assignments.length === 0 && (
                              <div className="text-center py-4 text-xs text-muted-foreground border border-dashed rounded">
                                  No classes assigned yet. Click "Add Class" to start.
                              </div>
                          )}
                      </div>
                  </div>
              )}
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
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Roles</SelectItem>
              <SelectItem value="STUDENT">Student</SelectItem>
              <SelectItem value="TEACHER">Teacher</SelectItem>
              <SelectItem value="HOD">HOD</SelectItem>
              <SelectItem value="PRINCIPAL">Principal</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
            </SelectContent>
          </Select>
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
                  <CardTitle className="text-sm font-medium text-slate-900 border-b border-transparent pb-1">
                    {user.fullName}
                  </CardTitle>
                  <Badge variant={
                    user.role === 'PRINCIPAL' ? 'destructive' :
                    user.role === 'HOD' ? 'default' :
                    user.role === 'TEACHER' ? 'secondary' : 'outline'
                  }>{user.role}</Badge>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground mb-2">{user.email}</div>
                  {user.role === 'STUDENT' && user.registrationNumber && (
                    <div className="text-xs font-mono text-slate-600 mb-2">Reg: {user.registrationNumber}</div>
                  )}
                  {user.department && (
                    <div className="text-xs font-medium mb-4">Dept: {user.department.code}</div>
                  )}
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenReset(user)} title="Reset Password">
                      <Key className="w-4 h-4" />
                    </Button>
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

        {/* Reset Password Dialog */}
        <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
          <DialogContent>
             <DialogHeader>
               <DialogTitle>Reset Password</DialogTitle>
               <DialogDescription>
                 Enter a new password for {resettingUser?.fullName}.
               </DialogDescription>
             </DialogHeader>
             <div className="space-y-4 py-4">
               <div className="space-y-2">
                 <Label>New Password</Label>
                 <Input 
                   type="password" 
                   value={newPassword} 
                   onChange={(e) => setNewPassword(e.target.value)}
                   placeholder="Enter new password"
                 />
               </div>
               <Button className="w-full" onClick={handleResetPassword} disabled={isSubmitting || !newPassword}>
                 {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating...</> : 'Set New Password'}
               </Button>
             </div>
          </DialogContent>
        </Dialog>
      </div>
    </AuthenticatedLayout>
  );
}
