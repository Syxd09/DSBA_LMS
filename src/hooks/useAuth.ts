import { useState, useEffect } from 'react';
import api from '@/lib/api';

export type AppRole = 'admin' | 'principal' | 'hod' | 'teacher' | 'student';

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  department: string | null;
}

interface UserWithRole {
  user: any | null;
  profile: UserProfile | null;
  role: AppRole | null;
  isLoading: boolean;
}

export function useAuth(): UserWithRole & {
  signUp: (email: string, password: string, fullName: string, role?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
} {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setRole(parsedUser.role.toLowerCase() as AppRole);
        // Map backend user to frontend profile shape if needed
        setProfile({
          id: parsedUser.id,
          user_id: parsedUser.id,
          email: parsedUser.email,
          full_name: parsedUser.fullName,
          department: parsedUser.departmentId
        });
      } catch (e) {
        console.error("Failed to parse user data", e);
        localStorage.removeItem('token');
      }
    }
    setIsLoading(false);
  }, []);

  const signUp = async (email: string, password: string, fullName: string, role?: string) => {
    try {
      await api.post('/auth/register', { email, password, fullName, role });
      return { error: null };
    } catch (error: any) {
      return { error: new Error(error.response?.data?.message || 'Registration failed') };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      setUser(data.user);
      setRole(data.user.role.toLowerCase() as AppRole);
      setProfile({
        id: data.user.id,
        user_id: data.user.id,
        email: data.user.email,
        full_name: data.user.fullName,
        department: data.user.departmentId
      });

      return { error: null };
    } catch (error: any) {
      return { error: new Error(error.response?.data?.message || 'Login failed') };
    }
  };

  const signOut = async () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setProfile(null);
    setRole(null);
  };

  return {
    user,
    profile,
    role,
    isLoading,
    signUp,
    signIn,
    signOut,
  };
}
