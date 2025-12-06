import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
}

const variantStyles = {
  default: 'bg-card',
  primary: 'bg-primary text-primary-foreground',
  success: 'bg-card border-l-4 border-l-green-500',
  warning: 'bg-card border-l-4 border-l-yellow-500',
  danger: 'bg-card border-l-4 border-l-destructive',
};

export function StatsCard({ title, value, subtitle, icon: Icon, trend, variant = 'default' }: StatsCardProps) {
  const isPrimary = variant === 'primary';

  return (
    <div className={cn('p-6 border border-border', variantStyles[variant])}>
      <div className="flex items-start justify-between">
        <div>
          <p className={cn('text-sm font-medium', isPrimary ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
            {title}
          </p>
          <p className={cn('text-3xl font-bold mt-2', isPrimary ? 'text-primary-foreground' : 'text-foreground')}>
            {value}
          </p>
          {subtitle && (
            <p className={cn('text-sm mt-1', isPrimary ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
              {subtitle}
            </p>
          )}
          {trend && (
            <p className={cn('text-sm mt-2 flex items-center gap-1', trend.isPositive ? 'text-green-500' : 'text-destructive')}>
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-muted-foreground">vs last semester</span>
            </p>
          )}
        </div>
        <div className={cn('p-3', isPrimary ? 'bg-primary-foreground/10' : 'bg-secondary')}>
          <Icon className={cn('w-6 h-6', isPrimary ? 'text-primary-foreground' : 'text-foreground')} />
        </div>
      </div>
    </div>
  );
}
