/**
 * EduMetrics - Loading State Components
 * U-04: Consistent loading indicators and skeleton loaders
 * 
 * Provides:
 * - Skeleton loaders for data-heavy components
 * - Spinner variants
 * - Full page loading overlay
 * - Table skeleton
 */

import { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

// =============================================================================
// BASE SKELETON
// =============================================================================

interface SkeletonProps {
  className?: string;
  animate?: boolean;
}

export function Skeleton({ className, animate = true }: SkeletonProps) {
  return (
    <div className={cn(
      'bg-muted rounded',
      animate && 'animate-pulse',
      className
    )} />
  );
}

// =============================================================================
// SPINNER
// =============================================================================

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  label?: string;
}

export function Spinner({ size = 'md', className, label }: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };
  
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Loader2 className={cn('animate-spin text-primary', sizeClasses[size])} />
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
    </div>
  );
}

// =============================================================================
// LOADING OVERLAY
// =============================================================================

interface LoadingOverlayProps {
  isLoading: boolean;
  children: ReactNode;
  label?: string;
}

export function LoadingOverlay({ isLoading, children, label = 'Loading...' }: LoadingOverlayProps) {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-2">
            <Spinner size="lg" />
            <span className="text-sm text-muted-foreground">{label}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// CARD SKELETON
// =============================================================================

interface CardSkeletonProps {
  showHeader?: boolean;
  lines?: number;
  className?: string;
}

export function CardSkeleton({ showHeader = true, lines = 3, className }: CardSkeletonProps) {
  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-3 w-2/3 mt-1" />
        </CardHeader>
      )}
      <CardContent className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" style={{ width: `${85 - i * 10}%` }} />
        ))}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// TABLE SKELETON
// =============================================================================

interface TableSkeletonProps {
  columns?: number;
  rows?: number;
  showHeader?: boolean;
  className?: string;
}

export function TableSkeleton({ 
  columns = 5, 
  rows = 5, 
  showHeader = true,
  className 
}: TableSkeletonProps) {
  return (
    <div className={cn('w-full', className)}>
      {/* Header */}
      {showHeader && (
        <div className="flex gap-4 border-b pb-3 mb-3">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      )}
      
      {/* Rows */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="flex gap-4 items-center">
            {Array.from({ length: columns }).map((_, colIdx) => (
              <Skeleton 
                key={colIdx} 
                className="h-4 flex-1" 
                style={{ opacity: 1 - (rowIdx * 0.1) }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// STATS SKELETON
// =============================================================================

interface StatsSkeletonProps {
  count?: number;
  className?: string;
}

export function StatsSkeleton({ count = 4, className }: StatsSkeletonProps) {
  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <Skeleton className="h-3 w-1/2 mb-2" />
            <Skeleton className="h-8 w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// =============================================================================
// CHART SKELETON
// =============================================================================

interface ChartSkeletonProps {
  type?: 'bar' | 'line' | 'pie';
  className?: string;
}

export function ChartSkeleton({ type = 'bar', className }: ChartSkeletonProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <Skeleton className="h-5 w-1/4" />
      </CardHeader>
      <CardContent>
        <div className="h-64 flex items-end justify-around gap-2 pt-4">
          {type === 'bar' && (
            <>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton 
                  key={i} 
                  className="w-12 rounded-t" 
                  style={{ height: `${Math.random() * 60 + 40}%` }}
                />
              ))}
            </>
          )}
          {type === 'line' && (
            <Skeleton className="w-full h-48" />
          )}
          {type === 'pie' && (
            <Skeleton className="w-48 h-48 rounded-full mx-auto" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// DASHBOARD SKELETON
// =============================================================================

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      
      {/* Stats */}
      <StatsSkeleton />
      
      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartSkeleton type="bar" />
        <ChartSkeleton type="pie" />
      </div>
      
      {/* Table */}
      <CardSkeleton lines={5} />
    </div>
  );
}

// =============================================================================
// FULL PAGE LOADING
// =============================================================================

interface PageLoadingProps {
  message?: string;
}

export function PageLoading({ message = 'Loading...' }: PageLoadingProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="xl" />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

export default {
  Skeleton,
  Spinner,
  LoadingOverlay,
  CardSkeleton,
  TableSkeleton,
  StatsSkeleton,
  ChartSkeleton,
  DashboardSkeleton,
  PageLoading
};
