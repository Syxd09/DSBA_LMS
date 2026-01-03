import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useAcademicContext } from '@/contexts/AcademicContext';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, Search, GraduationCap } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function Students() {
  const { user } = useAuth();
  const { cohortId, semester } = useAcademicContext();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students-list', cohortId, semester],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (cohortId) params.append('cohortId', cohortId);
      if (semester) params.append('semester', String(semester));
      
      const { data } = await api.get(`/enrollments?${params.toString()}`);
      return data;
    },
    enabled: !!(cohortId && semester)
  });

  const filteredStudents = students.filter((enrollment: any) => 
    enrollment.student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    enrollment.rollNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AuthenticatedLayout allowedRoles={['hod', 'teacher']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
            <div>
                <h2 className="text-2xl font-bold text-foreground">Students</h2>
                <p className="text-muted-foreground">View and manage students in your classes</p>
            </div>
            {filteredStudents.length > 0 && (
                 <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full">
                    <GraduationCap className="h-4 w-4" />
                    <span>{filteredStudents.length} Students Active</span>
                 </div>
            )}
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-4 bg-card p-4 rounded-lg border border-border shadow-sm">
            <div className="flex-1 w-full">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name or roll number..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-background"
                    />
                </div>
            </div>
        </div>

        {/* Content Area */}
        <div className="border border-border rounded-lg bg-card overflow-hidden shadow-sm">
            {isLoading ? (
                <div className="p-12 text-center flex justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : filteredStudents.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground bg-muted/20">
                     <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">No students found matching your criteria</p>
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead className="w-[150px]">Roll Number</TableHead>
                            <TableHead>Student Name</TableHead>
                            <TableHead>Email Address</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredStudents.map((enrollment: any) => (
                            <TableRow key={enrollment.id} className="hover:bg-muted/50 transition-colors">
                                <TableCell className="font-mono text-sm font-medium">{enrollment.rollNumber}</TableCell>
                                <TableCell className="font-medium text-foreground">{enrollment.student.fullName}</TableCell>
                                <TableCell className="text-muted-foreground">{enrollment.student.email}</TableCell>
                                <TableCell className="text-muted-foreground">{enrollment.student.mobileNumber || '-'}</TableCell>
                                <TableCell className="text-right">
                                    <Badge variant={enrollment.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                                        {enrollment.status}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
