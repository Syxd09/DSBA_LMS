import { useState } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, Pencil, Trash2, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

interface College {
  id: string;
  name: string;
  code: string;
  university: string;
  status: string;
  created_at: string;
}

const collegesApi = {
  list: () => apiClient.get('/colleges').then(r => r.data),
  create: (data: Partial<College>) => apiClient.post('/colleges', data).then(r => r.data),
  update: (id: string, data: Partial<College>) => apiClient.put(`/colleges/${id}`, data).then(r => r.data),
  delete: (id: string) => apiClient.delete(`/colleges/${id}`).then(r => r.data),
};

export default function Colleges() {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCollege, setEditingCollege] = useState<College | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '', university: '', status: 'active' });

  const { data: colleges = [], isLoading, error } = useQuery<College[]>({
    queryKey: ['colleges'],
    queryFn: collegesApi.list,
  });

  const createMutation = useMutation({
    mutationFn: collegesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colleges'] });
      toast({ title: 'College created successfully' });
      setIsAddOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast({ title: 'Failed to create college', description: err.response?.data?.detail, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<College> }) => collegesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colleges'] });
      toast({ title: 'College updated successfully' });
      setEditingCollege(null);
      resetForm();
    },
    onError: (err: any) => {
      toast({ title: 'Failed to update college', description: err.response?.data?.detail, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({ name: '', code: '', university: '', status: 'active' });
  };

  const handleEdit = (college: College) => {
    setEditingCollege(college);
    setFormData({
      name: college.name,
      code: college.code,
      university: college.university,
      status: college.status,
    });
  };

  const handleSubmit = () => {
    if (editingCollege) {
      updateMutation.mutate({ id: editingCollege.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <AuthenticatedLayout allowedRoles={['admin', 'principal']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">College Management</h2>
            <p className="text-muted-foreground">Manage multi-tenant college configurations</p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Add College
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New College</DialogTitle>
                <DialogDescription>Configure a new college for the multi-tenant system.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">College Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., ABC Engineering College"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">College Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g., ABC-BLR"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="university">University Affiliation</Label>
                  <Input
                    id="university"
                    value={formData.university}
                    onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                    placeholder="e.g., Visvesvaraya Technological University"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v: 'active' | 'inactive') => setFormData({ ...formData, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create College
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Registered Colleges
            </CardTitle>
            <CardDescription>Colleges configured in the system with their status and affiliations.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="text-center py-8 text-muted-foreground">
                Failed to load colleges. The endpoint may not be available yet.
              </div>
            ) : colleges.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No colleges configured yet. Add your first college to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>College</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>University</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {colleges.map((college) => (
                    <TableRow key={college.id}>
                      <TableCell className="font-medium">{college.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{college.code}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{college.university}</TableCell>
                      <TableCell>
                        {college.status === 'active' ? (
                          <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>
                        ) : (
                          <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(college)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={!!editingCollege} onOpenChange={(open) => !open && setEditingCollege(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit College</DialogTitle>
              <DialogDescription>Update college configuration.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">College Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-code">College Code</Label>
                <Input
                  id="edit-code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-university">University Affiliation</Label>
                <Input
                  id="edit-university"
                  value={formData.university}
                  onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v: 'active' | 'inactive') => setFormData({ ...formData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingCollege(null)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthenticatedLayout>
  );
}
