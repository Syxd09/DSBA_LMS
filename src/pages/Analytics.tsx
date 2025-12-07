import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { COAttainmentChart } from '@/components/dashboard/COAttainmentChart';
import { BloomTaxonomyChart } from '@/components/dashboard/BloomTaxonomyChart';
import { PerformanceTrendChart } from '@/components/dashboard/PerformanceTrendChart';
import { mockCOAttainment, bloomDistributionData, coTrendData, examPerformanceData } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';
import { useState } from 'react';

const difficultyData = [
  { question: 'Q1', difficulty: 0.72, discrimination: 0.45 },
  { question: 'Q2', difficulty: 0.58, discrimination: 0.62 },
  { question: 'Q3', difficulty: 0.45, discrimination: 0.78 },
  { question: 'Q4', difficulty: 0.82, discrimination: 0.32 },
  { question: 'Q5', difficulty: 0.35, discrimination: 0.85 },
];

const studentDistribution = [
  { range: '0-20', count: 5 },
  { range: '21-40', count: 12 },
  { range: '41-60', count: 28 },
  { range: '61-80', count: 35 },
  { range: '81-100', count: 20 },
];

export default function Analytics() {
  const [selectedSubject, setSelectedSubject] = useState('all');

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
              <SelectItem value="cs201">Data Structures</SelectItem>
              <SelectItem value="cs202">DBMS</SelectItem>
              <SelectItem value="cs203">Operating Systems</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Main Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <COAttainmentChart data={mockCOAttainment} />
          <BloomTaxonomyChart data={bloomDistributionData} />
        </div>

        {/* Trend Chart */}
        <PerformanceTrendChart data={coTrendData} />

        {/* Additional Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Question Difficulty Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Question Difficulty Index</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={difficultyData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" domain={[0, 1]} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis dataKey="question" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={40} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="difficulty" name="Difficulty" fill="hsl(var(--chart-2))" />
                    <Bar dataKey="discrimination" name="Discrimination" fill="hsl(var(--chart-4))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Difficulty: Higher = Easier | Discrimination: Higher = Better differentiates students
              </p>
            </CardContent>
          </Card>

          {/* Score Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Score Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={studentDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="range" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      name="Students"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Distribution of student scores across percentage ranges
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Internal Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Internal 1 vs Internal 2 Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={examPerformanceData}>
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
                  <Bar dataKey="average" name="Average" fill="hsl(var(--chart-2))" />
                  <Bar dataKey="highest" name="Highest" fill="hsl(var(--chart-3))" />
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
