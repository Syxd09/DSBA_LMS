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


export function StatsCard({ title, value, subtitle, icon: Icon, trend, variant = 'default' }: StatsCardProps) {
  const isPrimary = variant === 'primary';

  const variantConfigs = {
    default: 'bg-card border-border/50 shadow-sm',
    primary: 'bg-primary text-primary-foreground shadow-lg shadow-primary/20',
    success: 'bg-card border-l-4 border-l-green-500 shadow-sm',
    warning: 'bg-card border-l-4 border-l-yellow-500 shadow-sm',
    danger: 'bg-card border-l-4 border-l-destructive shadow-sm',
  };

  return (
    <div className={cn(
      'p-6 rounded-xl border transition-all duration-200 hover:shadow-md', 
      variantConfigs[variant]
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className={cn(
            'text-sm font-medium tracking-tight uppercase opacity-80', 
            isPrimary ? 'text-primary-foreground' : 'text-muted-foreground'
          )}>
            {title}
          </p>
          <p className={cn(
            'text-4xl font-extrabold tracking-tighter', 
            isPrimary ? 'text-primary-foreground' : 'text-foreground'
          )}>
            {value}
          </p>
          {subtitle && (
            <p className={cn(
              'text-xs font-medium opacity-70', 
              isPrimary ? 'text-primary-foreground' : 'text-muted-foreground'
            )}>
              {subtitle}
            </p>
          )}
          {trend && (
            <div className={cn(
              'text-xs mt-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-full font-semibold', 
              trend.isPositive ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'
            )}>
              <span>{trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
              <span className="opacity-70 font-normal">vs prev.</span>
            </div>
          )}
        </div>
        <div className={cn(
          'p-3.5 rounded-xl transition-colors', 
          isPrimary ? 'bg-white/20' : 'bg-secondary/50'
        )}>
          <Icon className={cn('w-6 h-6', isPrimary ? 'text-primary-foreground' : 'text-primary')} />
        </div>
      </div>
    </div>
  );
}
