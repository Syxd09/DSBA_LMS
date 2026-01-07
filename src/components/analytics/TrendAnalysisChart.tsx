import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

interface TrendDataPoint {
  semester: number;
  [key: string]: number; // department names as keys
}

interface TrendAnalysisChartProps {
  data: TrendDataPoint[];
  departments: Array<{ id: string; name: string }>;
}

const COLORS = [
  '#3B82F6', // blue-500
  '#10B981', // green-500
  '#F59E0B', // amber-500
  '#8B5CF6', // violet-500
  '#EF4444', // red-500
  '#06B6D4', // cyan-500
  '#EC4899', // pink-500
  '#14B8A6', // teal-500
];

/**
 * Multi-line chart showing semester trends across departments
 * Toggle metric (score vs marks) and select departments to display
 */
export function TrendAnalysisChart({ data, departments }: TrendAnalysisChartProps) {
  const [metric, setMetric] = useState<'score' | 'marks'>('score');
  const [selectedDepartments, setSelectedDepartments] = useState<Set<string>>(
    new Set(departments.slice(0, 3).map(d => d.name)) // Show first 3 by default
  );

  const toggleDepartment = (deptName: string) => {
    setSelectedDepartments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(deptName)) {
        newSet.delete(deptName);
      } else {
        newSet.add(deptName);
      }
      return newSet;
    });
  };

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trend Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            No trend data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Trend Analysis (Cross-Semester)</CardTitle>
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
        {/* Department Selection */}
        <div className="mb-4 p-4 border rounded-lg">
          <Label className="text-sm font-medium mb-2 block">Select Departments</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {departments.map((dept) => (
              <div key={dept.id} className="flex items-center space-x-2">
                <Checkbox
                  id={dept.id}
                  checked={selectedDepartments.has(dept.name)}
                  onCheckedChange={() => toggleDepartment(dept.name)}
                />
                <Label
                  htmlFor={dept.id}
                  className="text-sm font-normal cursor-pointer"
                >
                  {dept.name}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="semester" 
              label={{ value: 'Semester', position: 'insideBottom', offset: -5 }}
            />
            <YAxis 
              label={{ 
                value: metric === 'score' ? 'Feedback Score' : 'Average Marks (%)', 
                angle: -90, 
                position: 'insideLeft' 
              }}
              domain={[0, 100]}
            />
            <Tooltip />
            <Legend />
            {departments
              .filter(dept => selectedDepartments.has(dept.name))
              .map((dept, index) => (
                <Line
                  key={dept.id}
                  type="monotone"
                  dataKey={dept.name}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
          </LineChart>
        </ResponsiveContainer>

        {selectedDepartments.size === 0 && (
          <p className="text-sm text-muted-foreground text-center mt-4">
            Select at least one department to view trends
          </p>
        )}
      </CardContent>
    </Card>
  );
}
