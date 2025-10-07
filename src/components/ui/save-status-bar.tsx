'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, Check, Loader2, RefreshCw, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ManualSaveState } from '@/hooks/useManualSave';

interface SaveStatusBarProps {
  saveState: ManualSaveState;
  onSave: () => void;
  onRetry?: () => void;
  className?: string;
  saveButtonText?: string;
  customActions?: React.ReactNode;
}

export function SaveStatusBar({
  saveState,
  onSave,
  onRetry,
  className,
  saveButtonText = "Save",
  customActions
}: SaveStatusBarProps) {
  const {
    hasUnsavedChanges,
    lastSaved,
    isSaving,
    saveError,
    retryCount
  } = saveState;

  const formatLastSaved = (date: Date | null) => {
    if (!date) return null;
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <footer className={cn(
      "sticky bottom-0 bg-background border-t p-4 z-50",
      className
    )}>
      <div className="flex justify-between items-center">
        {/* Status Indicators */}
        <div className="flex items-center gap-3">
          {/* Saving Indicator */}
          {isSaving && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving...</span>
            </div>
          )}

          {/* Save Error */}
          {saveError && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{saveError}</span>
              {onRetry && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onRetry}
                  className="h-6 px-2 text-destructive hover:text-destructive"
                >
                  <RefreshCw className="h-3 w-3" />
                  Retry
                </Button>
              )}
            </div>
          )}

          {/* Last Saved */}
          {!isSaving && !saveError && lastSaved && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="h-4 w-4 text-green-600" />
              <span>Saved {formatLastSaved(lastSaved)}</span>
            </div>
          )}

          {/* Unsaved Changes Warning */}
          {!isSaving && !saveError && hasUnsavedChanges && (
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <AlertCircle className="h-4 w-4" />
              <span>You have unsaved changes</span>
            </div>
          )}

          {/* Retry Count */}
          {retryCount > 0 && (
            <div className="text-xs text-muted-foreground">
              Retry {retryCount}/3
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {customActions}
          
          <Button 
            onClick={onSave} 
            disabled={isSaving || (!hasUnsavedChanges && !saveError)}
            size="sm"
            variant={hasUnsavedChanges || saveError ? "default" : "outline"}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {saveButtonText}
          </Button>
        </div>
      </div>
    </footer>
  );
}
