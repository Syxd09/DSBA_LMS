import axios from 'axios';

// Vite proxy should forward /api to backend, or use absolute URL
// For development, we assume backend runs on localhost:3000
// But usually in Vite setup:
// "/api": { target: "http://localhost:3000", changeOrigin: true }

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const status = error.response?.status;
        const errorData = error.response?.data;

        // Handle rate limiting (429 Too Many Requests)
        if (status === 429) {
            const code = errorData?.code || 'RATE_LIMIT_EXCEEDED';
            const retryAfter = error.response.headers?.['retry-after'];
            const minutes = retryAfter ? Math.ceil(retryAfter / 60) : 15;

            // Show toast notification with retry time
            const { toast } = await import('@/hooks/use-toast');

            if (code.includes('AUTH')) {
                toast({
                    variant: 'destructive',
                    title: 'Too Many Login Attempts',
                    description: `Please wait ${minutes} minutes before trying again.`,
                    duration: 8000,
                });
            } else if (code.includes('CALC')) {
                toast({
                    variant: 'destructive',
                    title: 'Calculation Limit Reached',
                    description: `You can request ${Math.ceil(retryAfter / 60) || 5} calculations every 5 minutes. Please wait.`,
                    duration: 8000,
                });
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Rate Limit Exceeded',
                    description: errorData?.message || 'Too many requests. Please slow down.',
                    duration: 8000,
                });
            }

            // Attach retry-after to error for programmatic handling
            error.retryAfter = retryAfter;
        }

        // Handle validation errors (400 with VALIDATION_ERROR code)
        if (status === 400 && errorData?.code === 'VALIDATION_ERROR') {
            // Let the form components handle field-specific errors
            // But show a general toast for awareness
            const { toast } = await import('@/hooks/use-toast');
            toast({
                variant: 'destructive',
                title: 'Invalid Input',
                description: 'Please correct the highlighted fields.',
                duration: 5000,
            });
        }

        // Handle authentication errors (401) - token is invalid/expired
        if (status === 401) {
            // Only clear token if we're not already on the auth page
            if (!window.location.pathname.includes('/auth')) {
                localStorage.removeItem('token');
                window.location.href = '/auth';
            }
        }

        // Handle authorization errors (403) - valid token but insufficient permissions
        if (status === 403) {
            const { toast } = await import('@/hooks/use-toast');
            toast({
                variant: 'destructive',
                title: 'Access Denied',
                description: errorData?.message || 'You do not have permission to perform this action.',
                duration: 5000,
            });
        }

        // Handle server errors (500+)
        if (status >= 500) {
            const { toast } = await import('@/hooks/use-toast');
            toast({
                variant: 'destructive',
                title: 'Server Error',
                description: 'Something went wrong on our end. Please try again later.',
                duration: 6000,
            });
        }

        return Promise.reject(error);
    }
);

export default api;
