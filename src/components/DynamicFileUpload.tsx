"use client";

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Upload, Image as ImageIcon, Video, X, FileText } from 'lucide-react';
import SafeImage from '@/components/ui/SafeImage';

interface DynamicFileUploadProps {
  onFileSelect?: (files: any[]) => void;
  onUploaded?: (files: any[]) => void;
  accept?: string;
  maxFiles?: number;
  multiple?: boolean;
  className?: string;
  ownerType?: string;
  ownerId?: string;
  children?: React.ReactNode;
  placeholder?: string;
  showPreview?: boolean;
  value?: string; // Current file URL for preview
}

export default function DynamicFileUpload({
  onFileSelect,
  onUploaded,
  accept = "image/*,video/*",
  maxFiles = 1,
  multiple = false,
  className = "",
  ownerType,
  ownerId,
  children,
  placeholder,
  showPreview = true,
  value
}: DynamicFileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();

  const handleFiles = useCallback(async (files: File[]) => {
    if (!files.length) return;
    
    const fileArray = Array.from(files).slice(0, maxFiles);
    
    // If onFileSelect is provided, call it with file info
    if (onFileSelect) {
      const fileInfo = fileArray.map(file => ({
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file)
      }));
      onFileSelect(fileInfo);
    }

    // If onUploaded is provided, upload the files
    if (onUploaded) {
      setUploading(true);
      try {
        const uploadedFiles = [];
        
        for (const file of fileArray) {
          const formData = new FormData();
          formData.append('file', file);
          if (ownerType) formData.append('ownerType', ownerType);
          if (ownerId) formData.append('ownerId', ownerId);

          const response = await fetch('/api/media/upload', {
            method: 'POST',
            body: formData
          });

          if (response.ok) {
            const result = await response.json();
            const uploadedFile = Array.isArray(result) ? result[0] : result;
            uploadedFiles.push(uploadedFile);
          } else {
            throw new Error(`Upload failed for ${file.name}`);
          }
        }

        onUploaded(uploadedFiles);
        toast({
          title: "Success",
          description: `${uploadedFiles.length} file(s) uploaded successfully`
        });
      } catch (error) {
        console.error('Upload error:', error);
        toast({
          title: "Error",
          description: "Failed to upload files",
          variant: "destructive"
        });
      } finally {
        setUploading(false);
      }
    }
  }, [maxFiles, onFileSelect, onUploaded, ownerType, ownerId, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFiles(Array.from(files));
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const getFileTypeIcon = (acceptTypes: string) => {
    if (acceptTypes.includes('image')) return ImageIcon;
    if (acceptTypes.includes('video')) return Video;
    return FileText;
  };

  const FileTypeIcon = getFileTypeIcon(accept);

  const isVideoFile = (url: string) => {
    return url.includes('.mp4') || url.includes('.mov') || url.includes('.avi') || url.includes('.webm');
  };

  return (
    <div className="space-y-3">
      {/* Preview of current value */}
      {showPreview && value && (
        <div className="relative w-full max-w-xs h-32 border rounded-lg overflow-hidden bg-gray-50">
          {isVideoFile(value) ? (
            <video src={value} className="w-full h-full object-cover" controls />
          ) : (
            <SafeImage src={value} alt="Preview" className="w-full h-full object-cover" />
          )}
        </div>
      )}

      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg transition-all duration-200
          ${dragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'}
          ${uploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
          ${className}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          disabled={uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        {children ? (
          children
        ) : (
          <div className="flex flex-col items-center justify-center p-6 space-y-2">
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="text-sm text-muted-foreground">Uploading...</span>
              </>
            ) : (
              <>
                <FileTypeIcon className="h-8 w-8 text-muted-foreground" />
                <div className="text-center">
                  <span className="text-sm font-medium text-foreground">
                    Click to upload or drag and drop
                  </span>
                  {placeholder && (
                    <p className="text-xs text-muted-foreground mt-1">{placeholder}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {accept.includes('image') && accept.includes('video') 
                      ? 'Images and videos supported'
                      : accept.includes('image') 
                        ? 'Images supported' 
                        : 'Videos supported'
                    }
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
