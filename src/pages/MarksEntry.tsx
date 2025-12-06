import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { MarksEntryGrid } from '@/components/marks/MarksEntryGrid';
import { ExamStructureBuilder } from '@/components/marks/ExamStructureBuilder';
import { mockStudentMarks } from '@/lib/mock-data';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const subQuestions = [
  { id: 'q1a', label: 'Q1(a)', maxMarks: 5 },
  { id: 'q1b', label: 'Q1(b)', maxMarks: 5 },
  { id: 'q2a', label: 'Q2(a)', maxMarks: 5 },
  { id: 'q2b', label: 'Q2(b)', maxMarks: 5 },
  { id: 'q3a', label: 'Q3(a)', maxMarks: 5 },
  { id: 'q3b', label: 'Q3(b)', maxMarks: 5 },
];

export default function MarksEntry() {
  const { isAuthenticated, user } = useAuth();
  const [selectedSubject, setSelectedSubject] = useState('cs201');
  const [selectedExam, setSelectedExam] = useState('internal1');

  if (!isAuthenticated || user?.role !== 'teacher') {
    return <Navigate to="/" replace />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Marks Entry</h2>
            <p className="text-muted-foreground">Create exam structure and enter student marks</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cs201">CS201 - Data Structures</SelectItem>
                <SelectItem value="cs202">CS202 - DBMS</SelectItem>
                <SelectItem value="cs203">CS203 - Operating Systems</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedExam} onValueChange={setSelectedExam}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Select Exam" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="internal1">Internal 1</SelectItem>
                <SelectItem value="internal2">Internal 2</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Data Structures (CS201)</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Semester 3</Badge>
                <Badge>Internal 1</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total Students</p>
                <p className="font-semibold">60</p>
              </div>
              <div>
                <p className="text-muted-foreground">Max Marks</p>
                <p className="font-semibold">30</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="font-semibold text-yellow-600">Draft</p>
              </div>
              <div>
                <p className="text-muted-foreground">Deadline</p>
                <p className="font-semibold">Dec 15, 2024</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="marks" className="w-full">
          <TabsList>
            <TabsTrigger value="marks">Marks Entry</TabsTrigger>
            <TabsTrigger value="structure">Exam Structure</TabsTrigger>
          </TabsList>
          <TabsContent value="marks" className="mt-6">
            <MarksEntryGrid
              students={mockStudentMarks}
              subQuestions={subQuestions}
              onSave={(marks) => console.log('Saved:', marks)}
              onPublish={() => console.log('Published')}
            />
          </TabsContent>
          <TabsContent value="structure" className="mt-6">
            <ExamStructureBuilder />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
