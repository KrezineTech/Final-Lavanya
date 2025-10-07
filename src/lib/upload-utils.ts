/**
 * Utility function to convert upload file paths to the correct API URLs
 * @param filePath - The file path from the database (e.g., "/uploads/filename.mp4" or "uploads/filename.mp4")
 * @returns The correct API URL for the file
 */
export function getUploadUrl(filePath: string): string {
  if (!filePath) return '';
  
  // If it's already a full URL, return as is
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }
  
  // Extract filename from path
  let filename = '';
  if (filePath.startsWith('/uploads/')) {
    filename = filePath.replace('/uploads/', '');
  } else if (filePath.startsWith('uploads/')) {
    filename = filePath.replace('uploads/', '');
  } else {
    // Assume it's just the filename
    filename = filePath;
  }
  
  // Return API URL
  return `/api/uploads/${filename}`;
}

/**
 * Get the correct video URL for frontend display
 * @param videoPath - The video path from the database or metadata
 * @returns The correct URL for video playback
 */
export function getVideoUrl(videoPath: string): string | null {
  if (!videoPath || typeof videoPath !== 'string' || videoPath.trim() === '') {
    return null;
  }
  
  // If it's already a full URL (like external videos), return as is
  if (videoPath.startsWith('http://') || videoPath.startsWith('https://')) {
    return videoPath;
  }
  
  // Convert local uploads to API URLs
  return getUploadUrl(videoPath);
}

/**
 * Get the correct image URL for frontend display
 * @param imagePath - The image path from the database
 * @returns The correct URL for image display
 */
export function getImageUrl(imagePath: string): string {
  if (!imagePath) return '';
  
  // If it's already a full URL, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // Convert local uploads to API URLs
  return getUploadUrl(imagePath);
}
