import { useState } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAcademicContext } from '@/contexts/AcademicContext';
import { 
  FileText, Download, Printer, Search, 
  Users, BookOpen, Layers, Sparkles, 
  Activity, Info, FileSpreadsheet, ChevronRight,
  Star, GraduationCap, School
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

export default function Reports() {
  const { cohortId: globalCohortId, departmentId: globalDeptId } = useAcademicContext();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>(globalDeptId || '');
  const [selectedCohortId, setSelectedCohortId] = useState<string>(globalCohortId || '');
  const [selectedSemester, setSelectedSemester] = useState<string>('Semester 1');
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  // Fetch departments
  const { data: departments = [] } = useQuery({
    queryKey: ['departments-list'],
    queryFn: async () => {
      const { data } = await api.get('/departments');
      return data || [];
    }
  });

  // Fetch cohorts
  const { data: cohorts = [] } = useQuery({
    queryKey: ['cohorts-list', selectedDeptId],
    queryFn: async () => {
      const { data } = await api.get('/cohorts');
      return data || [];
    }
  });

  const effectiveCohortId = selectedCohortId || globalCohortId;

  const semesterNumber = selectedSemester.split(' ')[1];

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['class-detailed-report', effectiveCohortId, semesterNumber],
    queryFn: async () => {
      if (!effectiveCohortId) return null;
      const { data } = await api.get(`/reports/class-detailed?cohortId=${effectiveCohortId}&semester=${semesterNumber}`);
      return data;
    },
    enabled: !!effectiveCohortId
  });

  const handleExportExcel = () => {
    if (!reportData?.students?.length) return;
    // ... same excel logic ...
    const flattenedData = reportData.students.flatMap((student: any) => 
      student.subjects.map((sub: any) => ({
        'Reg Number': student.registrationNumber,
        'Student Name': student.name,
        'Overall SGPA': student.overallSgpa,
        'PO Attainment %': student.poAttainment,
        'Feedback Rating': student.feedbackRating,
        'Subject Code': sub.subjectCode,
        'Subject Name': sub.subjectName,
        'Faculty': sub.faculty,
        'Internal 1': sub.internal1,
        'Internal 2': sub.internal2,
        'External': sub.external,
        'Total Marks': sub.total,
        'Grade': sub.grade,
        'Subject Grade Point': sub.subjectSgpa,
        'CO Attainment %': sub.coAttainment,
        'Subject Feedback': sub.feedbackRating
      }))
    );
    const worksheet = XLSX.utils.json_to_sheet(flattenedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Detailed Report');
    XLSX.writeFile(workbook, `Class_Report_${reportData.cohortName}.xlsx`);
    toast({ title: "Export Successful", description: "Report downloaded." });
  };

  const filteredStudents = reportData?.students?.filter((s: any) => {
    const search = searchTerm.toLowerCase().trim();
    return s.name.toLowerCase().includes(search) || 
           s.registrationNumber.toLowerCase().includes(search);
  }) || [];

  const selectedDeptName = departments.find((d: any) => d.id === selectedDeptId)?.name || 'Department';
  const selectedCohortName = cohorts.find((c: any) => c.id === selectedCohortId)?.name || 'Cohort';

  return (
    <AuthenticatedLayout allowedRoles={['admin', 'principal', 'hod']}>
      <div className="p-6 space-y-6 bg-[#f8fafc] min-h-screen font-inter">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-[#1e293b]">Class Detailed Reports</h1>
            <p className="text-sm text-slate-500 mt-1">View detailed performance, marks, and attainment reports by class</p>
          </div>
          <div className="flex gap-2">
             <Button variant="outline" className="bg-white border-slate-200 text-slate-700 font-semibold" onClick={() => window.print()}>
               <Printer className="w-4 h-4 mr-2" /> Print PDF
             </Button>
             <Button 
               className="bg-[#1e293b] hover:bg-[#0f172a] text-white font-semibold" 
               onClick={handleExportExcel}
               disabled={!reportData?.students?.length}
             >
               <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel
             </Button>
          </div>
        </div>

        {/* Select Context Card */}
        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6">
            <div className="flex items-center gap-2 text-slate-700">
               <Layers className="w-4 h-4" />
               <span className="text-sm font-bold uppercase tracking-wider">Select Context</span>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-tight">Department</label>
                <Select 
                  value={selectedDeptId}
                  onValueChange={(val) => {
                    setSelectedDeptId(val);
                    setSelectedCohortId('');
                  }}
                >
                  <SelectTrigger className="h-10 bg-white border-slate-200">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-tight">Cohort</label>
                <Select 
                  value={selectedCohortId}
                  onValueChange={setSelectedCohortId}
                  disabled={!selectedDeptId}
                >
                  <SelectTrigger className="h-10 bg-white border-slate-200">
                    <SelectValue placeholder="Select Cohort" />
                  </SelectTrigger>
                  <SelectContent>
                    {cohorts.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name} ({c.year})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-tight">Semester</label>
                <Select 
                  value={selectedSemester}
                  onValueChange={setSelectedSemester}
                >
                  <SelectTrigger className="h-10 bg-white border-slate-200">
                    <SelectValue placeholder="Select Semester" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Semester 1">Semester 1</SelectItem>
                    <SelectItem value="Semester 2">Semester 2</SelectItem>
                    <SelectItem value="Semester 3">Semester 3</SelectItem>
                    <SelectItem value="Semester 4">Semester 4</SelectItem>
                    <SelectItem value="Semester 5">Semester 5</SelectItem>
                    <SelectItem value="Semester 6">Semester 6</SelectItem>
                    <SelectItem value="Semester 7">Semester 7</SelectItem>
                    <SelectItem value="Semester 8">Semester 8</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search Bar Row */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Search by name, reg. number, email, or mobile..."
            className="pl-11 h-11 bg-white border-slate-200 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Report Content */}
        {!effectiveCohortId ? (
          <div className="bg-white border border-slate-200 rounded-xl p-20 flex flex-col items-center justify-center space-y-4">
             <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                <Info className="w-8 h-8" />
             </div>
             <p className="text-slate-500 font-medium text-sm">Please select a class context to generate the report</p>
          </div>
        ) : (
          <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
            <CardContent className="p-0">
               {/* List Header */}
               <div className="p-6 border-b border-slate-100 bg-white">
                  <div className="flex items-center gap-3">
                     <h2 className="text-lg font-bold text-slate-800">Class Student Records</h2>
                     <Badge className="bg-slate-500 hover:bg-slate-500 text-white rounded-full px-2 py-0 h-5 text-[10px] font-black">
                        {filteredStudents.length}
                     </Badge>
                  </div>
                  <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">
                     {selectedDeptName} → {selectedCohortName} → {selectedSemester}
                  </p>
               </div>

               {/* Table Header Style */}
               <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50/50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                  <div className="col-span-2">Reg. Number</div>
                  <div className="col-span-3">Name</div>
                  <div className="col-span-2 text-center">Overall SGPA</div>
                  <div className="col-span-2 text-center">PO Attainment</div>
                  <div className="col-span-2 text-center">Feedback</div>
                  <div className="col-span-1 text-right">Action</div>
               </div>

               {isLoading ? (
                 <div className="p-20 flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Analyzing Performance Records...</p>
                 </div>
               ) : filteredStudents.length > 0 ? (
                 <div className="divide-y divide-slate-100">
                    {filteredStudents.map((student: any) => (
                      <div key={student.registrationNumber} className="group">
                         {/* Student Row */}
                         <div 
                           className={cn(
                             "grid grid-cols-12 gap-4 px-6 py-4 items-center cursor-pointer hover:bg-slate-50 transition-colors",
                             expandedStudentId === student.registrationNumber ? "bg-slate-50/80" : ""
                           )}
                           onClick={() => setExpandedStudentId(expandedStudentId === student.registrationNumber ? null : student.registrationNumber)}
                         >
                            <div className="col-span-2 text-sm font-bold text-slate-900">{student.registrationNumber}</div>
                            <div className="col-span-3 text-sm font-black text-slate-800">{student.name}</div>
                            <div className="col-span-2 text-center">
                               <Badge variant="outline" className="bg-white font-bold text-blue-700 border-blue-100">{student.overallSgpa}</Badge>
                            </div>
                            <div className="col-span-2 text-center">
                               <Badge className="bg-emerald-50 text-emerald-700 border-none font-bold">{student.poAttainment}%</Badge>
                            </div>
                            <div className="col-span-2 text-center flex justify-center items-center gap-1">
                               <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                               <span className="text-sm font-bold text-slate-700">{student.feedbackRating}</span>
                            </div>
                            <div className="col-span-1 text-right">
                               <ChevronRight className={cn("w-4 h-4 text-slate-300 transition-transform ml-auto", expandedStudentId === student.registrationNumber ? "rotate-90" : "")} />
                            </div>
                         </div>

                         {/* Expanded Details */}
                         <div className={cn(
                           "overflow-hidden transition-all duration-300 bg-[#fbfcfd]",
                           expandedStudentId === student.registrationNumber ? "max-h-[1000px] border-t border-slate-100" : "max-h-0"
                         )}>
                            <div className="p-6">
                               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {student.subjects.map((sub: any, idx: number) => (
                                    <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                                       <div className="flex justify-between items-start">
                                          <div className="space-y-0.5">
                                             <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight line-clamp-1">{sub.subjectName}</p>
                                             <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{sub.faculty}</p>
                                          </div>
                                          <Badge className="bg-[#1e293b] text-white text-[9px] font-black h-5">{sub.grade}</Badge>
                                       </div>
                                       <div className="flex gap-2">
                                          <div className="flex-1 bg-slate-50 p-1.5 rounded-lg text-center">
                                             <p className="text-[8px] font-black text-slate-400 uppercase">I1</p>
                                             <p className="text-xs font-black text-slate-800">{sub.internal1}</p>
                                          </div>
                                          <div className="flex-1 bg-slate-50 p-1.5 rounded-lg text-center">
                                             <p className="text-[8px] font-black text-slate-400 uppercase">I2</p>
                                             <p className="text-xs font-black text-slate-800">{sub.internal2}</p>
                                          </div>
                                          <div className="flex-1 bg-slate-50 p-1.5 rounded-lg text-center">
                                             <p className="text-[8px] font-black text-slate-400 uppercase">EXT</p>
                                             <p className="text-xs font-black text-slate-800">{sub.external}</p>
                                          </div>
                                       </div>
                                       <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">CO Attainment</span>
                                          <span className="text-xs font-black text-slate-900">{sub.coAttainment}%</span>
                                       </div>
                                    </div>
                                  ))}
                               </div>
                            </div>
                         </div>
                      </div>
                    ))}
                 </div>
               ) : (
                 <div className="p-20 text-center text-slate-400 font-medium italic text-sm">No student records found matching search</div>
               )}
            </CardContent>
          </Card>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
