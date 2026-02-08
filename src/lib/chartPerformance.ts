/**
 * EduMetrics - Chart Performance Utilities
 * P-03: Virtualization and data sampling for large datasets
 * 
 * Provides:
 * - Data sampling for large datasets
 * - Virtualized data loading
 * - Progressive chart loading
 * - Memory-efficient data transformation
 */

// =============================================================================
// DATA SAMPLING
// =============================================================================

export interface SamplingOptions {
    maxPoints: number;
    strategy: 'uniform' | 'lttb' | 'minmax' | 'first';
}

/**
 * Sample data points to reduce chart load.
 * Uses LTTB (Largest Triangle Three Buckets) for visual fidelity.
 */
export function sampleDataPoints<T extends { x: number; y: number }>(
    data: T[],
    options: SamplingOptions = { maxPoints: 500, strategy: 'lttb' }
): T[] {
    if (data.length <= options.maxPoints) {
        return data;
    }

    if (options.strategy === 'uniform') {
        return uniformSample(data, options.maxPoints);
    }

    if (options.strategy === 'minmax') {
        return minMaxSample(data, options.maxPoints);
    }

    if (options.strategy === 'first') {
        return data.slice(0, options.maxPoints);
    }

    // Default: LTTB
    return lttbSample(data, options.maxPoints);
}

/**
 * Uniform sampling - every Nth point
 */
function uniformSample<T>(data: T[], targetCount: number): T[] {
    const step = Math.ceil(data.length / targetCount);
    const result: T[] = [];

    for (let i = 0; i < data.length; i += step) {
        result.push(data[i]);
    }

    // Always include last point
    if (result[result.length - 1] !== data[data.length - 1]) {
        result.push(data[data.length - 1]);
    }

    return result;
}

/**
 * Min-Max sampling - preserves peaks and valleys
 */
function minMaxSample<T extends { y: number }>(data: T[], targetCount: number): T[] {
    const bucketSize = Math.ceil(data.length / (targetCount / 2));
    const result: T[] = [];

    for (let i = 0; i < data.length; i += bucketSize) {
        const bucket = data.slice(i, i + bucketSize);
        if (bucket.length === 0) continue;

        const min = bucket.reduce((a, b) => a.y < b.y ? a : b);
        const max = bucket.reduce((a, b) => a.y > b.y ? a : b);

        // Add in order
        if (bucket.indexOf(min) < bucket.indexOf(max)) {
            result.push(min, max);
        } else {
            result.push(max, min);
        }
    }

    return result;
}

/**
 * LTTB - Largest Triangle Three Buckets
 * Best visual fidelity for downsampling time series
 */
function lttbSample<T extends { x: number; y: number }>(data: T[], targetCount: number): T[] {
    if (data.length <= 2) return data;

    const sampled: T[] = [data[0]]; // Always include first
    const bucketSize = (data.length - 2) / (targetCount - 2);

    let prevIndex = 0;

    for (let i = 0; i < targetCount - 2; i++) {
        // Calculate bucket range
        const rangeStart = Math.floor((i + 1) * bucketSize) + 1;
        const rangeEnd = Math.floor((i + 2) * bucketSize) + 1;

        // Calculate average of next bucket (for triangle)
        let avgX = 0, avgY = 0;
        const nextBucketStart = Math.floor((i + 2) * bucketSize) + 1;
        const nextBucketEnd = Math.min(Math.floor((i + 3) * bucketSize) + 1, data.length);
        const nextBucketSize = nextBucketEnd - nextBucketStart;

        for (let j = nextBucketStart; j < nextBucketEnd; j++) {
            avgX += data[j].x;
            avgY += data[j].y;
        }

        if (nextBucketSize > 0) {
            avgX /= nextBucketSize;
            avgY /= nextBucketSize;
        }

        // Find point in current bucket with largest triangle area
        let maxArea = -1;
        let maxAreaIndex = rangeStart;

        const prevPoint = data[prevIndex];

        for (let j = rangeStart; j < rangeEnd; j++) {
            // Calculate triangle area
            const area = Math.abs(
                (prevPoint.x - avgX) * (data[j].y - prevPoint.y) -
                (prevPoint.x - data[j].x) * (avgY - prevPoint.y)
            ) * 0.5;

            if (area > maxArea) {
                maxArea = area;
                maxAreaIndex = j;
            }
        }

        sampled.push(data[maxAreaIndex]);
        prevIndex = maxAreaIndex;
    }

    sampled.push(data[data.length - 1]); // Always include last
    return sampled;
}

// =============================================================================
// PROGRESSIVE LOADING
// =============================================================================

export interface ChunkLoadOptions {
    chunkSize: number;
    delayMs: number;
    onProgress?: (loaded: number, total: number) => void;
}

/**
 * Load data in chunks for progressive rendering
 */
export async function loadDataInChunks<T>(
    data: T[],
    options: ChunkLoadOptions
): Promise<T[]> {
    const { chunkSize, delayMs, onProgress } = options;
    const result: T[] = [];
    const total = data.length;

    for (let i = 0; i < total; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        result.push(...chunk);

        onProgress?.(Math.min(i + chunkSize, total), total);

        if (i + chunkSize < total && delayMs > 0) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    return result;
}

/**
 * Hook for progressive data loading
 */
export function useProgressiveData<T>(
    data: T[] | undefined,
    options: { chunkSize?: number; enabled?: boolean } = {}
) {
    const { chunkSize = 100, enabled = true } = options;
    const [loadedData, setLoadedData] = useState<T[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (!data || !enabled) {
            setLoadedData(data || []);
            return;
        }

        if (data.length <= chunkSize) {
            setLoadedData(data);
            return;
        }

        setIsLoading(true);
        setProgress(0);

        loadDataInChunks(data, {
            chunkSize,
            delayMs: 16, // One frame
            onProgress: (loaded, total) => setProgress((loaded / total) * 100)
        }).then(result => {
            setLoadedData(result);
            setIsLoading(false);
        });
    }, [data, chunkSize, enabled]);

    return { data: loadedData, isLoading, progress };
}

// Required import for hook
import { useState, useEffect, useMemo } from 'react';

// =============================================================================
// AGGREGATION HELPERS
// =============================================================================

export interface AggregationOptions {
    groupBy: 'hour' | 'day' | 'week' | 'month';
    aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count';
}

/**
 * Aggregate time series data for better chart performance
 */
export function aggregateTimeSeriesData<T extends { timestamp: number; value: number }>(
    data: T[],
    options: AggregationOptions
): { timestamp: number; value: number }[] {
    if (data.length === 0) return [];

    const buckets = new Map<number, number[]>();

    for (const point of data) {
        const bucketKey = getBucketKey(point.timestamp, options.groupBy);

        if (!buckets.has(bucketKey)) {
            buckets.set(bucketKey, []);
        }
        buckets.get(bucketKey)!.push(point.value);
    }

    const result: { timestamp: number; value: number }[] = [];

    for (const [timestamp, values] of buckets) {
        let aggregatedValue: number;

        switch (options.aggregation) {
            case 'sum':
                aggregatedValue = values.reduce((a, b) => a + b, 0);
                break;
            case 'avg':
                aggregatedValue = values.reduce((a, b) => a + b, 0) / values.length;
                break;
            case 'min':
                aggregatedValue = Math.min(...values);
                break;
            case 'max':
                aggregatedValue = Math.max(...values);
                break;
            case 'count':
                aggregatedValue = values.length;
                break;
            default:
                aggregatedValue = values[0];
        }

        result.push({ timestamp, value: aggregatedValue });
    }

    return result.sort((a, b) => a.timestamp - b.timestamp);
}

function getBucketKey(timestamp: number, groupBy: string): number {
    const date = new Date(timestamp);

    switch (groupBy) {
        case 'hour':
            date.setMinutes(0, 0, 0);
            return date.getTime();
        case 'day':
            date.setHours(0, 0, 0, 0);
            return date.getTime();
        case 'week':
            const day = date.getDay();
            date.setDate(date.getDate() - day);
            date.setHours(0, 0, 0, 0);
            return date.getTime();
        case 'month':
            date.setDate(1);
            date.setHours(0, 0, 0, 0);
            return date.getTime();
        default:
            return timestamp;
    }
}

// =============================================================================
// MEMOIZATION HELPERS
// =============================================================================

/**
 * Memoize chart data transformations
 */
export function useChartData<T, R>(
    data: T[] | undefined,
    transform: (data: T[]) => R,
    deps: any[] = []
) {
    return useMemo(() => {
        if (!data || data.length === 0) return transform([]);
        return transform(data);
    }, [data, ...deps]);
}

/**
 * Limit visible data points based on container width
 */
export function useAdaptiveSampling<T extends { x: number; y: number }>(
    data: T[] | undefined,
    containerWidth: number,
    pointsPerPixel: number = 0.5
) {
    return useMemo(() => {
        if (!data) return [];

        const maxPoints = Math.floor(containerWidth * pointsPerPixel);
        return sampleDataPoints(data, { maxPoints, strategy: 'lttb' });
    }, [data, containerWidth, pointsPerPixel]);
}

export default {
    sampleDataPoints,
    loadDataInChunks,
    useProgressiveData,
    aggregateTimeSeriesData,
    useChartData,
    useAdaptiveSampling
};
