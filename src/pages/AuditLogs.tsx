import { useState } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, History, Filter, Download, Loader2, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  action: string;
  table_name: string;
  record_id: string | null;
  user_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
  user?: {
    full_name: string;
    email: string;
  };
}

export default function AuditLogs() {
  const [searchQuery, setSearchQuery] = useState('');
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  
  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs', tableFilter, actionFilter],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (tableFilter && tableFilter !== 'all') {
        query = query.eq('table_name', tableFilter);
      }
      
      if (actionFilter && actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Fetch user profiles for the logs
      const userIds = [...new Set(data?.map(l => l.user_id).filter(Boolean) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);
      
      return data?.map(log => ({
        ...log,
        user: profiles?.find(p => p.user_id === log.user_id)
      })) || [];
    },
  });
  
  const filteredLogs = logs?.filter(log =>
    log.table_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];
  
  const getActionBadgeVariant = (action: string) => {
    switch (action.toLowerCase()) {
      case 'insert':
      case 'create':
        return 'default';
      case 'update':
        return 'secondary';
      case 'delete':
        return 'destructive';
      default:
        return 'outline';
    }
  };
  
  const exportLogs = () => {
    const csv = [
      ['Timestamp', 'Action', 'Table', 'User', 'Record ID'].join(','),
      ...filteredLogs.map(log => [
        log.created_at,
        log.action,
        log.table_name,
        log.user?.full_name || log.user_id || 'System',
        log.record_id || ''
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AuthenticatedLayout allowedRoles={['principal', 'hod']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Audit Logs</h2>
            <p className="text-muted-foreground">Track all changes made to the system</p>
          </div>
          <Button variant="outline" onClick={exportLogs}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={tableFilter} onValueChange={setTableFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Tables" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tables</SelectItem>
                  <SelectItem value="student_marks">Student Marks</SelectItem>
                  <SelectItem value="exams">Exams</SelectItem>
                  <SelectItem value="questions">Questions</SelectItem>
                  <SelectItem value="user_roles">User Roles</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="INSERT">Insert</SelectItem>
                  <SelectItem value="UPDATE">Update</SelectItem>
                  <SelectItem value="DELETE">Delete</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <History className="w-4 h-4" />
              Activity Log
              <Badge variant="secondary" className="ml-2">
                {filteredLogs.length} entries
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mb-4" />
                <p>No audit logs found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Table</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Record ID</TableHead>
                    <TableHead>Changes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getActionBadgeVariant(log.action)}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.table_name}
                      </TableCell>
                      <TableCell>
                        {log.user?.full_name || log.user_id || 'System'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.record_id ? log.record_id.slice(0, 8) + '...' : '—'}
                      </TableCell>
                      <TableCell>
                        {log.old_data || log.new_data ? (
                          <Button variant="ghost" size="sm">
                            View Details
                          </Button>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}
