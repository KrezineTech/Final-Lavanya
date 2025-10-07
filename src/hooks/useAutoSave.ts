import { useCallback, useRef, useEffect, useState } from 'react';
import { useToast } from './use-toast';

interface UseAutoSaveOptions {
  delay?: number;
  maxRetries?: number;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
}

interface SaveState {
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  error: Error | null;
}

export function useAutoSave<T>(
  data: T,
  saveFunction: (data: T) => Promise<void>,
  options: UseAutoSaveOptions = {}
) {
  const {
    delay = 2000,
    maxRetries = 3,
    onSuccess,
    onError,
    enabled = true
  } = options;

  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const retryCountRef = useRef(0);
  const lastDataRef = useRef<T>(data);
  const isMountedRef = useRef(true);

  const [saveState, setSaveState] = useState<SaveState>({
    isSaving: false,
    lastSaved: null,
    hasUnsavedChanges: false,
    error: null
  });

  // Check if data has actually changed
  const hasDataChanged = useCallback((newData: T, oldData: T): boolean => {
    return JSON.stringify(newData) !== JSON.stringify(oldData);
  }, []);

  // Perform the actual save with retry logic
  const performSave = useCallback(async (dataToSave: T): Promise<void> => {
    if (!isMountedRef.current) return;

    try {
      setSaveState(prev => ({ ...prev, isSaving: true, error: null }));
      
      await saveFunction(dataToSave);
      
      if (!isMountedRef.current) return;
      
      setSaveState(prev => ({
        ...prev,
        isSaving: false,
        lastSaved: new Date(),
        hasUnsavedChanges: false,
        error: null
      }));
      
      retryCountRef.current = 0;
      lastDataRef.current = dataToSave;
      
      onSuccess?.();
      
      toast({
        title: "Saved",
        description: "Changes saved successfully",
        duration: 2000,
      });
      
    } catch (error) {
      if (!isMountedRef.current) return;
      
      const err = error as Error;
      retryCountRef.current += 1;
      
      if (retryCountRef.current < maxRetries) {
        // Retry with exponential backoff
        const retryDelay = Math.min(1000 * Math.pow(2, retryCountRef.current), 10000);
        setTimeout(() => performSave(dataToSave), retryDelay);
        
        toast({
          title: "Retrying save...",
          description: `Attempt ${retryCountRef.current + 1} of ${maxRetries}`,
          duration: 3000,
        });
      } else {
        setSaveState(prev => ({
          ...prev,
          isSaving: false,
          error: err,
          hasUnsavedChanges: true
        }));
        
        onError?.(err);
        
        toast({
          variant: "destructive",
          title: "Save failed",
          description: "Please save manually or try again",
          duration: 5000,
        });
      }
    }
  }, [saveFunction, maxRetries, onSuccess, onError, toast]);

  // Debounced save trigger
  const triggerSave = useCallback(() => {
    if (!enabled || !hasDataChanged(data, lastDataRef.current)) {
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setSaveState(prev => ({ ...prev, hasUnsavedChanges: true }));

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      if (isMountedRef.current && enabled) {
        performSave(data);
      }
    }, delay);
  }, [data, enabled, delay, hasDataChanged, performSave]);

  // Manual save function
  const saveNow = useCallback(async (): Promise<void> => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (hasDataChanged(data, lastDataRef.current)) {
      await performSave(data);
    }
  }, [data, hasDataChanged, performSave]);

  // Cancel pending save
  const cancelSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    
    setSaveState(prev => ({ 
      ...prev, 
      hasUnsavedChanges: hasDataChanged(data, lastDataRef.current)
    }));
  }, [data, hasDataChanged]);

  // Effect to trigger save when data changes
  useEffect(() => {
    if (enabled) {
      triggerSave();
    }
  }, [data, enabled, triggerSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    saveState,
    saveNow,
    cancelSave,
    triggerSave
  };
}

// Alternative hook for manual save with draft protection
export function useManualSave<T>(
  data: T,
  saveFunction: (data: T) => Promise<void>,
  options: { 
    draftKey?: string;
    onSuccess?: () => void;
    onError?: (error: Error) => void;
  } = {}
) {
  const { draftKey, onSuccess, onError } = options;
  const { toast } = useToast();
  
  const [saveState, setSaveState] = useState<SaveState>({
    isSaving: false,
    lastSaved: null,
    hasUnsavedChanges: false,
    error: null
  });

  // Save draft to localStorage
  const saveDraft = useCallback(() => {
    if (draftKey) {
      try {
        localStorage.setItem(`draft_${draftKey}`, JSON.stringify({
          data,
          timestamp: new Date().toISOString()
        }));
        
        toast({
          title: "Draft saved",
          description: "Your work is saved locally",
          duration: 2000,
        });
      } catch (error) {
        console.warn('Failed to save draft:', error);
      }
    }
  }, [data, draftKey, toast]);

  // Load draft from localStorage
  const loadDraft = useCallback((): T | null => {
    if (!draftKey) return null;
    
    try {
      const draft = localStorage.getItem(`draft_${draftKey}`);
      if (draft) {
        const parsed = JSON.parse(draft);
        return parsed.data;
      }
    } catch (error) {
      console.warn('Failed to load draft:', error);
    }
    return null;
  }, [draftKey]);

  // Clear draft
  const clearDraft = useCallback(() => {
    if (draftKey) {
      localStorage.removeItem(`draft_${draftKey}`);
    }
  }, [draftKey]);

  // Manual save function
  const save = useCallback(async (): Promise<void> => {
    try {
      setSaveState(prev => ({ ...prev, isSaving: true, error: null }));
      
      await saveFunction(data);
      
      setSaveState(prev => ({
        ...prev,
        isSaving: false,
        lastSaved: new Date(),
        hasUnsavedChanges: false,
        error: null
      }));
      
      clearDraft();
      onSuccess?.();
      
      toast({
        title: "Saved successfully",
        description: "Your changes have been saved",
        duration: 3000,
      });
      
    } catch (error) {
      const err = error as Error;
      setSaveState(prev => ({
        ...prev,
        isSaving: false,
        error: err,
        hasUnsavedChanges: true
      }));
      
      onError?.(err);
      
      toast({
        variant: "destructive",
        title: "Save failed",
        description: err.message || "Please try again",
        duration: 5000,
      });
    }
  }, [data, saveFunction, clearDraft, onSuccess, onError, toast]);

  return {
    saveState,
    save,
    saveDraft,
    loadDraft,
    clearDraft
  };
}
