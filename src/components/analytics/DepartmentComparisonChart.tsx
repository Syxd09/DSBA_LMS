import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';

interface DepartmentData {
  departmentId: string;
  departmentName: string;
  avgFeedbackScore: number;
  avgMarks: number;
  totalFeedback: number;
}

interface DepartmentComparisonChartProps {
  departments: DepartmentData[];
  onDepartmentClick?: (departmentId: string) => void;
}

const COLORS = [
  '#3B82F6', // blue-500
  '#10B981', // green-500
  '#F59E0B', // amber-500
  '#8B5CF6', // violet-500
  '#EF4444', // red-500
  '#06B6D4', // cyan-500
];

/**
 * Horizontal bar chart comparing department performance
 * Click bar to drill down to department view
 */
export function DepartmentComparisonChart({ departments, onDepartmentClick }: DepartmentComparisonChartProps) {
  const [metric, setMetric] = useState<'score' | 'marks'>('score');

  // Prepare data for chart
  const chartData = departments
    .map(dept => ({
      id: dept.departmentId,
      name: dept.departmentName.length > 20 
        ? dept.departmentName.substring(0, 20) + '...' 
        : dept.departmentName,
      value: metric === 'score' ? dept.avgFeedbackScore : dept.avgMarks,
      fullName: dept.departmentName
    }))
    .sort((a, b) => b.value - a.value); // Sort by value descending

  if (departments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Department Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            No department data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Department Comparison</CardTitle>
          <Select value={metric} onValueChange={(value) => setMetric(value as 'score' | 'marks')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="score">Feedback Score</SelectItem>
              <SelectItem value="marks">Average Marks</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(400, departments.length * 50)}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              type="number" 
              domain={[0, metric === 'score' ? 100 : 100]}
              label={{ value: metric === 'score' ? 'Feedback Score' : 'Average Marks (%)', position: 'insideBottom', offset: -5 }}
            />
            <YAxis 
              dataKey="name" 
              type="category"
              width={90}
            />
            <Tooltip 
              formatter={(value: number) => [value.toFixed(1), metric === 'score' ? 'Score' : 'Marks']}
              labelFormatter={(label, payload) => payload[0]?.payload?.fullName || label}
            />
            <Bar 
              dataKey="value" 
              onClick={(data) => onDepartmentClick && onDepartmentClick(data.id)}
              style={{ cursor: onDepartmentClick ? 'pointer' : 'default' }}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Click on a bar to view department details
        </p>
      </CardContent>
    </Card>
  );
}
