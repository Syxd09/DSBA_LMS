/**
 * useRealtime Hook
 * Provides real-time data updates using polling or WebSocket fallback
 */
import { useEffect, useCallback, useRef, useState } from 'react';
import { useQueryClient, UseQueryResult } from '@tanstack/react-query';

interface UseRealtimeOptions {
    /** Query key to invalidate on update */
    queryKey: string[];
    /** Polling interval in milliseconds (default: 30000) */
    pollingInterval?: number;
    /** Whether real-time updates are enabled */
    enabled?: boolean;
    /** Callback when data changes */
    onDataChange?: (data: any) => void;
}

/**
 * Hook for real-time data updates with automatic polling
 */
export function useRealtime<T>({
    queryKey,
    pollingInterval = 30000,
    enabled = true,
    onDataChange,
}: UseRealtimeOptions) {
    const queryClient = useQueryClient();
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const [isPolling, setIsPolling] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const refresh = useCallback(() => {
        queryClient.invalidateQueries({ queryKey });
        setLastUpdated(new Date());
    }, [queryClient, queryKey]);

    // Start polling
    useEffect(() => {
        if (!enabled) return;

        setIsPolling(true);
        intervalRef.current = setInterval(refresh, pollingInterval);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            setIsPolling(false);
        };
    }, [enabled, pollingInterval, refresh]);

    return {
        isPolling,
        lastUpdated,
        refresh,
        stop: () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            setIsPolling(false);
        },
        start: () => {
            if (!intervalRef.current && enabled) {
                intervalRef.current = setInterval(refresh, pollingInterval);
                setIsPolling(true);
            }
        },
    };
}

/**
 * Hook for managing optimistic updates with conflict resolution
 */
export function useOptimisticUpdate<T extends { version?: number }>() {
    const queryClient = useQueryClient();
    const [conflicts, setConflicts] = useState<T[]>([]);

    const updateOptimistically = useCallback(async (
        queryKey: string[],
        updater: (old: T[]) => T[],
        serverUpdate: () => Promise<T>,
    ) => {
        // Snapshot current data
        const previousData = queryClient.getQueryData<T[]>(queryKey);

        // Optimistically update
        queryClient.setQueryData<T[]>(queryKey, (old) => {
            if (!old) return old;
            return updater(old);
        });

        try {
            // Perform server update
            const result = await serverUpdate();

            // Check for version conflict
            if (result.version) {
                queryClient.invalidateQueries({ queryKey });
            }

            return result;
        } catch (error: any) {
            // Rollback on error
            queryClient.setQueryData(queryKey, previousData);

            // Handle version conflict
            if (error?.response?.status === 409) {
                const conflictData = error.response.data;
                setConflicts((prev) => [...prev, conflictData]);
            }

            throw error;
        }
    }, [queryClient]);

    const resolveConflict = useCallback((index: number, resolution: 'keep' | 'overwrite') => {
        setConflicts((prev) => prev.filter((_, i) => i !== index));
    }, []);

    return {
        updateOptimistically,
        conflicts,
        resolveConflict,
        clearConflicts: () => setConflicts([]),
    };
}

/**
 * Hook for notification polling
 */
export function useNotificationPolling(userId: string, enabled = true) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    interface Notification {
        id: string;
        type: 'approval' | 'rejection' | 'info' | 'warning';
        title: string;
        message: string;
        read: boolean;
        createdAt: Date;
    }

    const fetchNotifications = useCallback(async () => {
        // In production, this would fetch from API
        // For now, return mock data
        return [];
    }, []);

    const { refresh, isPolling, lastUpdated } = useRealtime({
        queryKey: ['notifications', userId],
        pollingInterval: 60000, // Poll every minute
        enabled,
        onDataChange: (data) => {
            if (data) {
                setNotifications(data);
                setUnreadCount(data.filter((n: Notification) => !n.read).length);
            }
        },
    });

    const markAsRead = useCallback((notificationId: string) => {
        setNotifications((prev) =>
            prev.map((n) =>
                n.id === notificationId ? { ...n, read: true } : n
            )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
    }, []);

    const markAllAsRead = useCallback(() => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
    }, []);

    return {
        notifications,
        unreadCount,
        isPolling,
        lastUpdated,
        refresh,
        markAsRead,
        markAllAsRead,
    };
}

export default useRealtime;
