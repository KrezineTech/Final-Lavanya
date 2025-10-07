'use client'

import { useState, useCallback } from 'react'
import { Upload, X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface FileUploadProps {
  productId?: string
  multiple?: boolean
  // optional API endpoints to use for images/videos; defaults to /api/media/upload
  imageEndpoint?: string
  videoEndpoint?: string
  // optional callback when upload finishes
  onUploaded?: (media: any[]) => void
  // optional owner type/id to attach media (e.g. ownerType='blogs' ownerId=blogId)
  ownerType?: string
  ownerId?: string
  batch?: string
  // UI customization
  maxFileSize?: number // in MB
  acceptedTypes?: string[]
  className?: string
  showProgress?: boolean
}

interface UploadState {
  uploading: boolean
  progress: number
  error: string | null
  success: boolean
  uploadedFiles: any[]
}

export default function FileUpload({ 
  productId, 
  multiple = false, 
  imageEndpoint, 
  videoEndpoint, 
  onUploaded, 
  ownerType, 
  ownerId,
  maxFileSize = 200, // 200MB default for video support
  acceptedTypes = ['image/*', 'video/*'],
  className,
  showProgress = true
}: FileUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    uploading: false,
    progress: 0,
    error: null,
    success: false,
    uploadedFiles: []
  })

  const validateFile = (file: File): string | null => {
    // Check file size
    const maxSizeBytes = maxFileSize * 1024 * 1024
    if (file.size > maxSizeBytes) {
      return `File size must be less than ${maxFileSize}MB`
    }

    // Check file type
    const isValidType = acceptedTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.replace('/*', '/'))
      }
      return file.type === type
    })

    if (!isValidType) {
      return `File type not supported. Accepted types: ${acceptedTypes.join(', ')}`
    }

    return null
  }

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    // Reset state
    setUploadState({
      uploading: true,
      progress: 0,
      error: null,
      success: false,
      uploadedFiles: []
    })

    try {
      // Validate all files first
      for (const file of files) {
        const error = validateFile(file)
        if (error) {
          setUploadState(prev => ({ ...prev, uploading: false, error }))
          return
        }
      }

      // Group files by basic type so we can call specific endpoints if provided
      const grouped: Record<string, File[]> = { image: [], video: [], other: [] }
      for (const f of files) {
        if (f.type.startsWith('image')) grouped.image.push(f)
        else if (f.type.startsWith('video')) grouped.video.push(f)
        else grouped.other.push(f)
      }

      const results: any[] = []
      let totalFiles = files.length
      let uploadedCount = 0

      // helper to upload a list of files to a chosen endpoint
      const uploadList = async (list: File[], endpoint: string, typeField?: string) => {
        if (!list.length) return

        for (const file of list) {
          const fd = new FormData()
          fd.append('file', file)
          if (productId) fd.append('productId', productId)
          if (typeField) fd.append('type', typeField)
          if (ownerType) fd.append('ownerType', ownerType)
          if (ownerId) fd.append('ownerId', ownerId)
          if ((window as any).__UPLOAD_BATCH) fd.append('batch', String((window as any).__UPLOAD_BATCH))

          const resp = await fetch(endpoint, { method: 'POST', body: fd })
          
          if (!resp.ok) {
            const txt = await resp.text().catch(() => 'Upload failed')
            throw new Error(`Failed to upload ${file.name}: ${txt}`)
          }

          const json = await resp.json()
          console.log('FileUpload API response:', json)

          // server returns array of media entries
          if (Array.isArray(json)) {
            results.push(...json)
          } else if (Array.isArray(json.data)) {
            results.push(...json.data)
          } else if (json.success && json.data) {
            results.push(json.data)
          } else {
            results.push(json)
          }

          // Ensure proper file type detection for frontend
          results.forEach(item => {
            if (item && !item.fileType) {
              if (item.type && item.type.startsWith('image')) {
                item.fileType = 'IMAGE'
              } else if (item.type && item.type.startsWith('video')) {
                item.fileType = 'VIDEO'
              }
            }
          })

          uploadedCount++
          setUploadState(prev => ({ 
            ...prev, 
            progress: (uploadedCount / totalFiles) * 100 
          }))
        }
      }

      // Upload images
      if (grouped.image.length) {
        const ep = imageEndpoint ?? '/api/media/upload'
        await uploadList(grouped.image, ep, 'image')
      }

      // Upload videos
      if (grouped.video.length) {
        const ep = videoEndpoint ?? '/api/media/upload'
        await uploadList(grouped.video, ep, 'video')
      }

      // Upload others (send to default endpoint)
      if (grouped.other.length) {
        const ep = '/api/media/upload'
        await uploadList(grouped.other, ep, 'misc')
      }

      // Success state
      setUploadState({
        uploading: false,
        progress: 100,
        error: null,
        success: true,
        uploadedFiles: results
      })

      // dispatch event and call callback
      if (results.length) {
        const evt = new CustomEvent('media:uploaded', { detail: results })
        window.dispatchEvent(evt)
        console.log('FileUpload: Results to callback:', results)
        onUploaded?.(results)
        console.log('FileUpload: Files uploaded successfully:', results)
      }

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setUploadState(prev => ({ ...prev, success: false }))
      }, 3000)

    } catch (error) {
      console.error('Upload failed:', error)
      setUploadState({
        uploading: false,
        progress: 0,
        error: error instanceof Error ? error.message : 'Upload failed',
        success: false,
        uploadedFiles: []
      })
    } finally {
      // clear file input value to allow re-uploading same file if needed
      try { (e.target as HTMLInputElement).value = '' } catch (e) {}
    }
  }, [productId, ownerType, ownerId, onUploaded, imageEndpoint, videoEndpoint, maxFileSize, acceptedTypes])

  const clearError = () => {
    setUploadState(prev => ({ ...prev, error: null }))
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Error Alert */}
      {uploadState.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            {uploadState.error}
            <Button variant="ghost" size="sm" onClick={clearError}>
              <X className="h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Success Alert */}
      {uploadState.success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Successfully uploaded {uploadState.uploadedFiles.length} file(s)
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Area */}
      <div className="flex items-center justify-center w-full">
        <label className={cn(
          "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
          uploadState.uploading 
            ? "border-blue-300 bg-blue-50" 
            : "border-gray-300 bg-gray-50 hover:bg-gray-100",
          uploadState.error && "border-red-300 bg-red-50"
        )}>
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {uploadState.uploading ? (
              <Loader2 className="w-8 h-8 mb-4 text-blue-500 animate-spin" />
            ) : (
              <Upload className="w-8 h-8 mb-4 text-gray-500" />
            )}
            
            {uploadState.uploading ? (
              <div className="text-center">
                <p className="mb-2 text-sm text-blue-600 font-semibold">
                  Uploading files...
                </p>
                {showProgress && (
                  <div className="w-48 mx-auto">
                    <Progress value={uploadState.progress} className="h-2" />
                    <p className="text-xs text-gray-500 mt-1">
                      {Math.round(uploadState.progress)}% complete
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <>
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">
                  {acceptedTypes.includes('image/*') && acceptedTypes.includes('video/*') 
                    ? 'Images and Videos' 
                    : acceptedTypes.includes('image/*') 
                    ? 'Images only'
                    : 'Videos only'
                  } (max {maxFileSize}MB)
                </p>
              </>
            )}
          </div>
          <input
            type="file"
            accept={acceptedTypes.join(',')}
            onChange={handleUpload}
            disabled={uploadState.uploading}
            multiple={multiple}
            className="hidden"
          />
        </label>
      </div>

      {/* File Type Info */}
      <div className="text-xs text-gray-500 text-center">
        <p>Supported formats: {acceptedTypes.join(', ')}</p>
        <p>Maximum file size: {maxFileSize}MB per file</p>
        {multiple && <p>You can upload multiple files at once</p>}
      </div>
    </div>
  )
}