import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AcademicContextState {
  departmentId: string;
  cohortId: string;
  semester: number;
  academicYear: string;
}

interface AcademicContextValue extends AcademicContextState {
  setDepartmentId: (id: string) => void;
  setCohortId: (id: string) => void;
  setSemester: (sem: number) => void;
  setAcademicYear: (year: string) => void;
  resetContext: () => void;
  isContextComplete: boolean;
}

const STORAGE_KEY = 'academic-context';

const defaultState: AcademicContextState = {
  departmentId: '',
  cohortId: '',
  semester: 1,
  academicYear: new Date().getFullYear().toString(),
};

const AcademicContext = createContext<AcademicContextValue | undefined>(undefined);

export function AcademicContextProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AcademicContextState>(() => {
    // Load from localStorage on init
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return defaultState;
      }
    }
    return defaultState;
  });

  // Persist to localStorage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const setDepartmentId = (id: string) => {
    setState(prev => ({ 
      ...prev, 
      departmentId: id,
      cohortId: '', // Reset cohort when department changes
    }));
  };

  const setCohortId = (id: string) => {
    setState(prev => ({ ...prev, cohortId: id }));
  };

  const setSemester = (sem: number) => {
    setState(prev => ({ ...prev, semester: sem }));
  };

  const setAcademicYear = (year: string) => {
    setState(prev => ({ ...prev, academicYear: year }));
  };

  const resetContext = () => {
    setState(defaultState);
    localStorage.removeItem(STORAGE_KEY);
  };

  const isContextComplete = !!(state.departmentId && state.cohortId && state.semester);

  return (
    <AcademicContext.Provider
      value={{
        ...state,
        setDepartmentId,
        setCohortId,
        setSemester,
        setAcademicYear,
        resetContext,
        isContextComplete,
      }}
    >
      {children}
    </AcademicContext.Provider>
  );
}

export function useAcademicContext() {
  const context = useContext(AcademicContext);
  if (!context) {
    throw new Error('useAcademicContext must be used within AcademicContextProvider');
  }
  return context;
}
