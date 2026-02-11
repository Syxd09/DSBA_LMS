import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from 'recharts';
import { Brain, Loader2, AlertCircle } from 'lucide-react';

interface BloomData {
  level: string;
  count?: number;
  percentage: number;
}

interface BloomTaxonomyChartProps {
  data: BloomData[];
  title?: string;
  isLoading?: boolean;
}

export function BloomTaxonomyChart({ data, title = "Bloom's Taxonomy Distribution", isLoading }: BloomTaxonomyChartProps) {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Brain className="w-4 h-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[250px] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Transform data for Recharts
  const chartData = data.map((item) => ({
    subject: item.level,
    A: item.percentage,
    fullMark: 100,
  }));

  // Ensure all Bloom levels are represented if data is partial
  const allLevels = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];
  const finalChartData = allLevels.map(level => {
    const existing = chartData.find(d => d.subject.toLowerCase() === level.toLowerCase());
    return existing || { subject: level, A: 0, fullMark: 100 };
  });

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Brain className="w-4 h-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={finalChartData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis 
                  dataKey="subject" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} 
                />
                <PolarRadiusAxis 
                  angle={30} 
                  domain={[0, 100]} 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} 
                />
                <Tooltip
                   contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Radar
                  name="Distribution"
                  dataKey="A"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[250px] flex flex-col items-center justify-center text-muted-foreground">
            <AlertCircle className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-sm">No Bloom data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
