import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RiskLevel } from '@/types/feedback.types';

interface RiskDistributionChartProps {
  riskDistribution: {
    CRITICAL: number;
    HIGH: number;
    MODERATE: number;
    STABLE: number;
  };
  onSegmentClick?: (riskLevel: RiskLevel) => void;
}

const RISK_COLORS = {
  CRITICAL: '#EF4444', // red-500
  HIGH: '#F97316',    // orange-500
  MODERATE: '#FBBF24', // yellow-400
  STABLE: '#22C55E'    // green-500
};

/**
 * Risk distribution pie chart using Recharts
 * Follows existing chart patterns
 */
export function RiskDistributionChart({ riskDistribution, onSegmentClick }: RiskDistributionChartProps) {
  // Transform data for Recharts
  const data = [
    { name: 'CRITICAL', value: riskDistribution.CRITICAL, level: 'CRITICAL' as RiskLevel },
    { name: 'HIGH', value: riskDistribution.HIGH, level: 'HIGH' as RiskLevel },
    { name: 'MODERATE', value: riskDistribution.MODERATE, level: 'MODERATE' as RiskLevel },
    { name: 'STABLE', value: riskDistribution.STABLE, level: 'STABLE' as RiskLevel }
  ].filter(item => item.value > 0); // Only show non-zero segments

  const total = Object.values(riskDistribution).reduce((sum, val) => sum + val, 0);

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Risk Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderCustomizedLabel = (entry: any) => {
    const percent = ((entry.value / total) * 100).toFixed(0);
    return `${percent}%`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              onClick={(data) => onSegmentClick && onSegmentClick(data.level)}
              style={{ cursor: onSegmentClick ? 'pointer' : 'default' }}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={RISK_COLORS[entry.name as keyof typeof RISK_COLORS]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [value, name]}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
            />
            <Legend
              formatter={(value, entry: any) => `${value}: ${entry.payload.value}`}
              wrapperStyle={{ paddingTop: '20px' }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          {data.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: RISK_COLORS[item.name as keyof typeof RISK_COLORS] }}
              />
              <span className="text-muted-foreground">{item.name}:</span>
              <span className="font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
