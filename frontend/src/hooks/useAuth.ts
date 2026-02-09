import { useState, useEffect } from 'react';
import { authApi } from '@/lib/api';

export type AppRole = 'principal' | 'hod' | 'teacher' | 'student';

interface UserProfile {
    id: string;
    user_id: string;
    email: string;
    full_name: string;
    avatar_url: string | null;
    department: string | null;
    role?: AppRole;
}

interface AuthState {
    user: UserProfile | null;
    profile: UserProfile | null;
    role: AppRole | null;
    isLoading: boolean;
}

// 1. Singleton State
let globalState: AuthState = {
    user: null,
    profile: null,
    role: null,
    isLoading: true,
};

// 2. Listeners
const listeners = new Set<(state: AuthState) => void>();

// Helper to notify all listeners
const notifyListeners = () => {
    listeners.forEach((listener) => listener({ ...globalState }));
};

// Initialize state from storage immediately
const initAuth = () => {
    const storedUser = authApi.getCurrentUser();
    if (storedUser) {
        globalState = {
            user: storedUser,
            profile: storedUser,
            role: (storedUser.role as AppRole) || 'student',
            isLoading: false,
        };
    } else {
        globalState = {
            ...globalState,
            isLoading: false,
        };
    }
};

// Run initialization once
initAuth();

export function useAuth() {
    // 3. Local state synced with global state
    const [state, setState] = useState<AuthState>(globalState);

    useEffect(() => {
        // Subscriber
        const listener = (newState: AuthState) => {
            setState(newState);
        };

        listeners.add(listener);

        // Sync in case it changed before mount
        setState(globalState);

        return () => {
            listeners.delete(listener);
        };
    }, []);

    // 4. Actions
    const signUp = async (email: string, password: string, fullName: string) => {
        try {
            const response = await authApi.signup(email, password, fullName);

            // Update Global State
            globalState = {
                user: response.user,
                profile: response.user,
                role: (response.user.role as AppRole) || 'student',
                isLoading: false,
            };
            notifyListeners();

            return { error: null };
        } catch (error: any) {
            return { error: new Error(error.response?.data?.detail || 'Signup failed') };
        }
    };

    const signIn = async (email: string, password: string) => {
        try {
            const response = await authApi.login(email, password);

            // Update Global State
            globalState = {
                user: response.user,
                profile: response.user,
                role: (response.user.role as AppRole) || 'student',
                isLoading: false,
            };
            notifyListeners();

            return { error: null };
        } catch (error: any) {
            return { error: new Error(error.response?.data?.detail || 'Invalid email or password') };
        }
    };

    const signOut = async () => {
        authApi.logout();

        // Update Global State
        globalState = {
            user: null,
            profile: null,
            role: null,
            isLoading: false,
        };
        notifyListeners();
    };

    /**
     * Manually update the user state (e.g. after profile update)
     * This ensures all components (Header, Sidebar) reflect changes immediately.
     */
    const updateUser = (updatedUser: UserProfile) => {
        globalState = {
            ...globalState,
            user: updatedUser,
            profile: updatedUser,
        };
        // Also update localStorage to persist across refreshes
        localStorage.setItem('user', JSON.stringify(updatedUser));

        notifyListeners();
    };

    return {
        ...state,
        signUp,
        signIn,
        signOut,
        updateUser,
    };
}
