import { useEffect, useState } from 'react';

/**
 * Hook to handle rate limit countdown
 * Shows a timer counting down until user can retry
 */
export function useRateLimitCountdown(retryAfterSeconds: number | null) {
    const [timeRemaining, setTimeRemaining] = useState<number | null>(retryAfterSeconds);
    const [isLimited, setIsLimited] = useState(!!retryAfterSeconds);

    useEffect(() => {
        if (!retryAfterSeconds) {
            setIsLimited(false);
            return;
        }

        setTimeRemaining(retryAfterSeconds);
        setIsLimited(true);

        const interval = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev === null || prev <= 1) {
                    setIsLimited(false);
                    clearInterval(interval);
                    return null;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [retryAfterSeconds]);

    const formatTime = (seconds: number | null): string => {
        if (!seconds) return '';

        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;

        if (mins > 0) {
            return `${mins}m ${secs}s`;
        }
        return `${secs}s`;
    };

    return {
        timeRemaining,
        isLimited,
        formattedTime: formatTime(timeRemaining)
    };
}
