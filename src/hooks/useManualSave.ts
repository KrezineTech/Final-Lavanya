'use client';

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface ManualSaveConfig {
  maxRetries?: number;
  baseDelay?: number;
}

export interface SaveResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface ManualSaveState {
  hasUnsavedChanges: boolean;
  lastSaved: Date | null;
  isSaving: boolean;
  saveError: string | null;
  retryCount: number;
}

export interface ManualSaveActions {
  markAsChanged: () => void;
  performSave: (data: any) => Promise<SaveResult>;
  handleSave: (data: any, validateFn?: (data: any) => string | null) => Promise<void>;
  resetSaveState: () => void;
}

export function useManualSave(
  config: ManualSaveConfig,
  saveFunction: (data: any) => Promise<any>
): [ManualSaveState, ManualSaveActions] {
  const { toast } = useToast();
  const {
    maxRetries = 3,
    baseDelay = 1000
  } = config;

  // State
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Mark as having unsaved changes
  const markAsChanged = useCallback(() => {
    if (!hasUnsavedChanges) {
      setHasUnsavedChanges(true);
    }
  }, [hasUnsavedChanges]);

  // Manual save with retry logic
  const performSave = useCallback(async (
    data: any, 
    retryAttempt: number = 0
  ): Promise<SaveResult> => {
    try {
      setIsSaving(true);
      setSaveError(null);
      
      const result = await saveFunction(data);
      
      // Success
      setHasUnsavedChanges(false);
      setLastSaved(new Date());
      setRetryCount(0);
      
      return { success: true, data: result };
    } catch (error) {
      console.error('Save error:', error);
      
      if (retryAttempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, retryAttempt); // Exponential backoff
        setTimeout(() => {
          performSave(data, retryAttempt + 1);
        }, delay);
        
        setRetryCount(retryAttempt + 1);
        setSaveError(`Save failed. Retrying in ${delay / 1000} seconds... (Attempt ${retryAttempt + 1}/${maxRetries})`);
      } else {
        setSaveError(`Failed to save after ${maxRetries} attempts. Please check your connection and try again.`);
        setRetryCount(0);
      }
      
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    } finally {
      setIsSaving(false);
    }
  }, [saveFunction, maxRetries, baseDelay]);

  // Handle save with validation
  const handleSave = useCallback(async (
    data: any, 
    validateFn?: (data: any) => string | null
  ) => {
    // Run validation if provided
    if (validateFn) {
      const validationError = validateFn(data);
      if (validationError) {
        toast({
          variant: 'destructive',
          title: 'Validation Error',
          description: validationError
        });
        return;
      }
    }
    
    try {
      const result = await performSave(data);
      if (result.success) {
        toast({
          title: "Saved Successfully",
          description: "Your changes have been saved.",
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Save Failed',
          description: result.error || 'Failed to save. Please try again.',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Failed to save. Please try again.',
      });
    }
  }, [performSave, toast]);

  const resetSaveState = useCallback(() => {
    setHasUnsavedChanges(false);
    setLastSaved(null);
    setIsSaving(false);
    setSaveError(null);
    setRetryCount(0);
  }, []);

  const state: ManualSaveState = {
    hasUnsavedChanges,
    lastSaved,
    isSaving,
    saveError,
    retryCount
  };

  const actions: ManualSaveActions = {
    markAsChanged,
    performSave,
    handleSave,
    resetSaveState
  };

  return [state, actions];
}
