import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { slug } = req.query;
    
    if (!slug || !Array.isArray(slug)) {
      return res.status(400).json({ error: 'Invalid file path' });
    }

    // Join the slug array to get the full file path
    const filename = slug.join('/');
    
    // Construct the file path
    const filePath = path.join(process.cwd(), 'public', 'uploads', filename);
    
    // Security check: ensure the file is within the uploads directory
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const resolvedPath = path.resolve(filePath);
    const resolvedUploadsDir = path.resolve(uploadsDir);
    
    if (!resolvedPath.startsWith(resolvedUploadsDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if file exists
    try {
      const stats = await stat(resolvedPath);
      
      if (!stats.isFile()) {
        // Not a file, serve placeholder for images
        const ext = path.extname(filename).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
          res.setHeader('Cache-Control', 'public, max-age=3600');
          res.redirect(302, '/placeholder.svg');
          return;
        }
        return res.status(404).json({ error: 'File not found' });
      }
    } catch (error) {
      // File doesn't exist, serve placeholder for images
      const ext = path.extname(filename).toLowerCase();
      if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.redirect(302, '/placeholder.svg');
        return;
      }
      return res.status(404).json({ error: 'File not found' });
    }

    // Get file extension to determine content type
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';
    
    // Set appropriate content type based on file extension
    const mimeTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.pdf': 'application/pdf',
    };
    
    if (mimeTypes[ext]) {
      contentType = mimeTypes[ext];
    }

    // Set appropriate headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    
    // For video files, support range requests for better streaming
    if (contentType.startsWith('video/')) {
      const stats = await stat(resolvedPath);
      const fileSize = stats.size;
      const range = req.headers.range;

      if (range) {
        // Parse range header
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = (end - start) + 1;

        // Create read stream for the requested range
        const fileStream = fs.createReadStream(resolvedPath, { start, end });
        
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': contentType,
        });
        
        fileStream.pipe(res);
        return;
      } else {
        // No range request, serve entire file
        res.setHeader('Content-Length', fileSize);
        res.setHeader('Accept-Ranges', 'bytes');
      }
    }

    // Read and send the file
    const fileBuffer = await readFile(resolvedPath);
    res.send(fileBuffer);
    
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}