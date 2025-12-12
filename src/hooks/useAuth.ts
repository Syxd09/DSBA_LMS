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

interface UserWithRole {
  user: UserProfile | null;
  profile: UserProfile | null;
  role: AppRole | null;
  isLoading: boolean;
}

export function useAuth(): UserWithRole & {
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
} {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    const storedUser = authApi.getCurrentUser();
    if (storedUser) {
      setProfile(storedUser);
      setRole(storedUser.role as AppRole || 'student');
    }
    setIsLoading(false);
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const response = await authApi.signup(email, password, fullName);
      setProfile(response.user);
      setRole(response.user.role as AppRole || 'student');
      return { error: null };
    } catch (error: any) {
      return { error: new Error(error.response?.data?.detail || 'Signup failed') };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const response = await authApi.login(email, password);
      setProfile(response.user);
      setRole(response.user.role as AppRole || 'student');
      return { error: null };
    } catch (error: any) {
      return { error: new Error(error.response?.data?.detail || 'Invalid email or password') };
    }
  };

  const signOut = async () => {
    authApi.logout();
    setProfile(null);
    setRole(null);
  };

  return {
    user: profile,
    profile,
    role,
    isLoading,
    signUp,
    signIn,
    signOut,
  };
}
