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
  const isDanger = variant === 'danger';
  const isWarning = variant === 'warning';
  const isSuccess = variant === 'success';

  return (
    <div className={cn(
      'p-6 rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow',
      isPrimary && 'bg-slate-900 text-white'
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className={cn(
            'text-xs font-medium uppercase tracking-wider opacity-70',
            isPrimary ? 'text-slate-400' : 'text-muted-foreground'
          )}>
            {title}
          </p>
          
          <p className="text-3xl font-bold tracking-tight">
            {value}
          </p>

          {subtitle && (
            <p className={cn(
              'text-xs opacity-60',
              isPrimary ? 'text-slate-400' : 'text-muted-foreground'
            )}>
              {subtitle}
            </p>
          )}
        </div>

        <div className={cn(
          'p-2.5 rounded-lg border',
          isPrimary ? 'bg-slate-800 border-slate-700' : 'bg-muted border-border'
        )}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
