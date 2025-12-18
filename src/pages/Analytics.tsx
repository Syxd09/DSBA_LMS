import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { COAttainmentChart } from '@/components/dashboard/COAttainmentChart';
import { BloomTaxonomyChart } from '@/components/dashboard/BloomTaxonomyChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';
import { useState } from 'react';

import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { COAttainmentChart } from '@/components/dashboard/COAttainmentChart';
import { BloomTaxonomyChart } from '@/components/dashboard/BloomTaxonomyChart';
import { PerformanceTrendChart } from '@/components/dashboard/PerformanceTrendChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Loader2 } from 'lucide-react';
import { useAcademicContext } from '@/contexts/AcademicContext';

export default function Analytics() {
  // Use global academic context for filtering? Or local state?
  // User just requested "filter by Single subject". 
  // Let's keep local subject filter but maybe default to "all".
  const { departmentId, cohortId } = useAcademicContext();
  const [selectedSubject, setSelectedSubject] = useState('all');

  // 1. Fetch Subjects for the dropdown (Same filtering as other pages)
  const { data: subjects = [] } = useQuery({
      queryKey: ['analytics-subjects', departmentId],
      queryFn: async () => {
          const { data } = await api.get('/subjects'); 
          // Note: getSubjects already RBAC filtered for Teacher.
          // For HOD/Principal, it might return many. Ideally filter by dept.
          // Let's assume backend handles text/RBAC correctly here.
          return data;
      },
      enabled: !!departmentId
  });

  // 2. Fetch CO Attainment (Real Data)
  const { data: coAttainmentData = [], isLoading: loadingCO } = useQuery({
      queryKey: ['analytics-co-attainment', selectedSubject, cohortId],
      queryFn: async () => {
          // If no subject selected, backend might default or error. 
          // Current backend getCOAttainment requires subjectId param.
          // If "all", we might need to aggregate or pick first?
          // Let's force pick first subject if 'all' or show empty.
          // Or better: Update backend to handle 'all'. 
          // For now, let's only fetch if specific subject is selected.
          if(selectedSubject === 'all') {
              if (subjects.length > 0) return api.get(`/analytics/co-attainment/${subjects[0].id}`).then(r => r.data);
              return [];
          }
          const { data } = await api.get(`/analytics/co-attainment/${selectedSubject}`);
          return data;
      },
      enabled: subjects.length > 0
  });

  // 3. Fetch Bloom Distribution (Real Data)
  // Requires examId. We don't have exam selector yet. 
  // Maybe just fetch for "latest published exam" of selected subject?
  // Let's assume we can fetch bloom stats by subject too? Backend logic for 'getBloomDistribution' requires examId.
  // Hack: Fetch exams for subject first, then pick one?
  // Simplified: Let's mock or skip bloom for a sec or use a fixed one if we find one.
  const { data: bloomData = [] } = useQuery({
      queryKey: ['analytics-bloom', selectedSubject],
      queryFn: async () => {
           if(selectedSubject === 'all') return [];
           // Find latest exam for this subject
           const { data: exams } = await api.get(`/exams?subjectId=${selectedSubject}&status=PUBLISHED`);
           if(exams && exams.length > 0) {
               const latest = exams[0];
               const { data } = await api.get(`/analytics/bloom-distribution/${latest.id}`);
               return data;
           }
           return [];
      },
      enabled: selectedSubject !== 'all'
  });

  // 4. Fetch Subject/Cohort Performance (Real Data)
  // This endpoint returns array of subjects with stats. Good for "all" view.
  const { data: performanceData = [] } = useQuery({
      queryKey: ['analytics-performance', cohortId],
      queryFn: async () => {
          if(!cohortId) return [];
          const { data } = await api.get(`/analytics/performance/${cohortId}`);
          return data;
      },
      enabled: !!cohortId
  });

  // Prepare Chart Data
  // PerformanceTrendChart expects: name (CO), value (%). 
  // Let's reuse coAttainmentData for trend (it's actually just a bar chart).
  
  // Internal Comparison Chart (Bar)
  // performanceData maps to: subjectName, average, highest, passRate.
  // Chart needs: name, average, highest, passRate.
  const internalComparisonData = performanceData.map((p: any) => ({
      name: p.subjectCode,
      average: p.average,
      highest: p.highest,
      passRate: p.passRate
  }));

  // Student Distribution (Mock for now, or fetch if we add endpoint)
  const studentDistribution = [
    { range: '0-20', count: 0 },
    { range: '21-40', count: 0 },
    { range: '41-60', count: 0 },
    { range: '61-80', count: 0 },
    { range: '81-100', count: 0 },
  ]; // TODO: Add real distribution endpoint

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Analytics Dashboard</h2>
            <p className="text-muted-foreground">Comprehensive performance analysis and insights</p>
          </div>
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by Subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Main Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
             <CardHeader><CardTitle>CO Attainment</CardTitle></CardHeader>
             <CardContent>
                 {selectedSubject === 'all' && <p className="text-sm text-muted-foreground mb-4">Showing data for first subject (Select a subject for details)</p>}
                 {loadingCO ? <Loader2 className="animate-spin" /> : 
                    <COAttainmentChart data={coAttainmentData.map((d:any) => ({
                        co: d.co,
                        attainment: d.attainment,
                        target: d.target
                    }))} />
                 }
             </CardContent>
          </Card>
          
          <Card>
              <CardHeader><CardTitle>Bloom's Taxonomy Distribution</CardTitle></CardHeader>
              <CardContent>
                  {selectedSubject === 'all' ? 
                    <div className="flex items-center justify-center h-64 text-muted-foreground">Select a subject to view Bloom stats</div> :
                    <BloomTaxonomyChart data={bloomData} />
                  }
              </CardContent>
          </Card>
        </div>

        {/* Performance Overview (Internal Comparison) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Subject Performance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={internalComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="average" name="Average %" fill="hsl(var(--chart-2))" />
                  <Bar dataKey="highest" name="Highest %" fill="hsl(var(--chart-3))" />
                  <Bar dataKey="passRate" name="Pass Rate %" fill="hsl(var(--chart-5))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}
