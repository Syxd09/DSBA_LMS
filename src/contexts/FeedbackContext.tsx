import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  FeedbackTemplate,
  TeacherStudentFeedback,
  FeedbackInput
} from '../types/feedback.types';
import {
  feedbackTemplateApi,
  teacherFeedbackApi,
  apiCall
} from '../api/feedbackApi';

interface FeedbackContextValue {
  // Data
  templates: FeedbackTemplate[];
  myFeedbacks: TeacherStudentFeedback[];
  
  // Loading states
  isLoading: boolean;
  isSubmitting: boolean;
  
  //Error state
  error: string | null;
  
  // Actions
  fetchTemplates: () => Promise<void>;
  fetchMyFeedbacks: (filters?: {
    subjectId?: string;
    semester?: number;
    cohortId?: string;
    status?: string;
  }) => Promise<void>;
  createFeedback: (data: FeedbackInput) => Promise<TeacherStudentFeedback>;
  updateFeedback: (id: string, data: Partial<FeedbackInput>) => Promise<void>;
  submitFeedback: (id: string) => Promise<void>;
  deleteFeedback: (id: string) => Promise<void>;
  getFeedbackById: (id: string) => Promise<TeacherStudentFeedback | null>;
  clearError: () => void;
}

const FeedbackContext = createContext<FeedbackContextValue | undefined>(undefined);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [templates, setTemplates] = useState<FeedbackTemplate[]>([]);
  const [myFeedbacks, setMyFeedbacks] = useState<TeacherStudentFeedback[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Fetch active templates
   */
  const fetchTemplates = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiCall(feedbackTemplateApi.list());
      setTemplates(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch templates');
      console.error('fetchTemplates error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Fetch teacher's own feedbacks
   */
  const fetchMyFeedbacks = useCallback(async (filters?: {
    subjectId?: string;
    semester?: number;
    cohortId?: string;
    status?: string;
  }) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiCall(teacherFeedbackApi.getMyFeedbacks(filters));
      setMyFeedbacks(response.feedbacks);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch feedbacks');
      console.error('fetchMyFeedbacks error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Create new feedback (DRAFT status)
   * TEMPLATE IS LOCKED AFTER CREATION - cannot be changed
   */
  const createFeedback = useCallback(async (data: FeedbackInput): Promise<TeacherStudentFeedback> => {
    try {
      setIsSubmitting(true);
      setError(null);
      const feedback = await apiCall(teacherFeedbackApi.create(data));
      
      // Optimistically add to local state
      setMyFeedbacks(prev => [feedback, ...prev]);
      
      return feedback;
    } catch (err: any) {
      setError(err.message || 'Failed to create feedback');
      console.error('createFeedback error:', err);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  /**
   * Update feedback (DRAFT only)
   * OPTIMISTIC UPDATE - immediate UI feedback
   */
  const updateFeedback = useCallback(async (id: string, data: Partial<FeedbackInput>) => {
    // Store previous state for rollback
    const previousFeedbacks = [...myFeedbacks];
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Optimistic update for DRAFT save (only update timestamp, backend will return full data)
      setMyFeedbacks(prev =>
        prev.map(f =>
          f.id === id
            ? { ...f, updatedAt: new Date().toISOString() }
            : f
        )
      );
      
      // API call
      await apiCall(teacherFeedbackApi.update(id, data));
    } catch (err: any) {
      // Rollback on error
      setMyFeedbacks(previousFeedbacks);
      setError(err.message || 'Failed to update feedback');
      console.error('updateFeedback error:', err);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [myFeedbacks]);

  /**
   * Submit feedback for approval (DRAFT → SUBMITTED)
   * NO OPTIMISTIC UPDATE - waits for backend confirmation
   */
  const submitFeedback = useCallback(async (id: string) => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Wait for backend confirmation
      const updated = await apiCall(teacherFeedbackApi.submit(id));
      
      // Update local state only after success
      setMyFeedbacks(prev =>
        prev.map(f => (f.id === id ? updated : f))
      );
    } catch (err: any) {
      setError(err.message || 'Failed to submit feedback');
      console.error('submitFeedback error:', err);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  /**
   * Delete feedback (DRAFT only)
   */
  const deleteFeedback = useCallback(async (id: string) => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      await apiCall(teacherFeedbackApi.delete(id));
      
      // Remove from local state
      setMyFeedbacks(prev => prev.filter(f => f.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete feedback');
      console.error('deleteFeedback error:', err);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  /**
   * Get feedback by ID
   */
  const getFeedbackById = useCallback(async (id: string): Promise<TeacherStudentFeedback | null> => {
    try {
      setError(null);
      
      // Check local cache first
      const cached = myFeedbacks.find(f => f.id === id);
      if (cached) {
        return cached;
      }
      
      // Fetch from API
      const feedback = await apiCall(teacherFeedbackApi.get(id));
      return feedback;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch feedback');
      console.error('getFeedbackById error:', err);
      return null;
    }
  }, [myFeedbacks]);

  return (
    <FeedbackContext.Provider
      value={{
        templates,
        myFeedbacks,
        isLoading,
        isSubmitting,
        error,
        fetchTemplates,
        fetchMyFeedbacks,
        createFeedback,
        updateFeedback,
        submitFeedback,
        deleteFeedback,
        getFeedbackById,
        clearError,
      }}
    >
      {children}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within FeedbackProvider');
  }
  return context;
}
