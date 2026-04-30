import { useState } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import api from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, History, Filter, Download, Loader2, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  action: string;
  tableName: string;
  recordId: string | null;
  userId: string | null;
  userName?: string; // Add this
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export default function AuditLogs() {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  
  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs', actionFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (actionFilter && actionFilter !== 'all') {
        params.append('action', actionFilter);
      }
      params.append('limit', '100');
      
      const { data } = await api.get(`/audit-logs?${params.toString()}`);
      return data as AuditLog[];
    },
  });
  
  const filteredLogs = logs?.filter(log =>
    log.tableName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.user?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];
  
    const getActionBadgeVariant = (action: string) => {
        const a = action?.toLowerCase() || '';
        if (a.includes('delete')) return 'destructive';
        if (a.includes('create') || a.includes('insert')) return 'default';
        if (a.includes('update')) return 'secondary';
        return 'outline';
    };
  
  const exportLogs = () => {
    const csv = [
      ['Timestamp', 'Action', 'Table', 'User', 'Record ID'].join(','),
      ...filteredLogs.map(log => [
        log.createdAt,
        log.action,
        log.tableName,
        log.user?.name || log.userId || 'System',
        log.recordId || ''
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
    <AuthenticatedLayout allowedRoles={['admin', 'principal']}>
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
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border">
                        <TableHead className="py-4 font-black uppercase text-[10px] tracking-widest text-muted-foreground w-[220px]">Timestamp</TableHead>
                        <TableHead className="py-4 font-black uppercase text-[10px] tracking-widest text-muted-foreground w-[180px]">Action</TableHead>
                        <TableHead className="py-4 font-black uppercase text-[10px] tracking-widest text-muted-foreground w-[150px]">Table</TableHead>
                        <TableHead className="py-4 font-black uppercase text-[10px] tracking-widest text-muted-foreground">User</TableHead>
                        <TableHead className="py-4 font-black uppercase text-[10px] tracking-widest text-muted-foreground text-right pr-6">Record ID</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-accent/30 transition-colors border-b border-border/50 last:border-0 group">
                      <TableCell className="py-4 text-sm font-medium text-foreground/80">
                        {format(new Date(log.createdAt), 'MMM dd, yyyy HH:mm:ss')}
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="inline-flex">
                            <Badge 
                                variant={getActionBadgeVariant(log.action)}
                                className="font-mono text-[9px] font-black tracking-widest px-2.5 py-0.5 rounded-full border shadow-none uppercase"
                            >
                                {log.action?.replace(/_/g, ' ')}
                            </Badge>
                        </span>
                      </TableCell>
                      <TableCell className="py-4 font-mono text-xs text-muted-foreground lowercase">
                        {log.tableName}
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="space-y-0.5">
                          <p className="text-sm font-bold text-foreground">
                            {log.user?.name || log.userName || 'system_service'}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {log.user?.email || ''}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 font-mono text-[11px] text-muted-foreground/80 text-right pr-6">
                        {log.recordId ? (
                            <span title={log.recordId}>
                                {log.recordId.slice(0, 8)}...
                            </span>
                        ) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            {filteredLogs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-muted/5">
                    <FileText className="w-10 h-10 mb-4 opacity-20" />
                    <p className="text-sm font-medium italic">No audit records found in this sequence.</p>
                </div>
            )}
        </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}
