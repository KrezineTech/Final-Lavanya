import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// PATCH /api/messages/[threadId] - Update thread properties
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const { threadId } = await params;
    const threadIdNum = parseInt(threadId);

    if (isNaN(threadIdNum)) {
      return NextResponse.json(
        { error: 'Invalid thread ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const updates: any = {};

    // Validate and map allowed updates
    if (body.status !== undefined) {
      const validStatuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
      updates.status = body.status;
    }

    if (body.priority !== undefined) {
      const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
      if (!validPriorities.includes(body.priority)) {
        return NextResponse.json(
          { error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}` },
          { status: 400 }
        );
      }
      updates.priority = body.priority;
    }

    if (body.privateNote !== undefined) {
      updates.privateNote = body.privateNote;
    }

    if (body.assignedAdmin !== undefined) {
      updates.assignedAdmin = body.assignedAdmin;
    }

    if (body.read !== undefined) {
      updates.read = body.read;
    }

    if (body.folder !== undefined) {
      const validFolders = ['INBOX', 'SENT', 'TRASH', 'ARCHIVE', 'SPAM'];
      if (!validFolders.includes(body.folder)) {
        return NextResponse.json(
          { error: `Invalid folder. Must be one of: ${validFolders.join(', ')}` },
          { status: 400 }
        );
      }
      updates.folder = body.folder;
    }

    // Update the thread
    const updatedThread = await prisma.messageThread.update({
      where: { id: threadIdNum },
      data: {
        ...updates,
        updatedAt: new Date()
      },
      include: {
        labels: {
          include: {
            label: true
          }
        },
        conversation: {
          orderBy: {
            createdAt: 'asc'
          },
          take: 1,
          select: {
            content: true
          }
        }
      }
    });

    // Broadcast update via socket.io if available
    if (global.io) {
      global.io.emit('thread_updated', {
        threadId: updatedThread.id,
        updates: {
          status: updatedThread.status,
          priority: updatedThread.priority,
          read: updatedThread.read,
          folder: updatedThread.folder,
          privateNote: updatedThread.privateNote,
          assignedAdmin: updatedThread.assignedAdmin,
          updatedAt: updatedThread.updatedAt
        }
      });
    }

    return NextResponse.json({
      success: true,
      thread: updatedThread
    });

  } catch (error) {
    console.error('Error updating thread:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update thread' },
      { status: 500 }
    );
  }
}

// GET /api/messages/[threadId] - Get thread details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const { threadId } = await params;
    const threadIdNum = parseInt(threadId);

    if (isNaN(threadIdNum)) {
      return NextResponse.json(
        { error: 'Invalid thread ID' },
        { status: 400 }
      );
    }

    const thread = await prisma.messageThread.findUnique({
      where: { id: threadIdNum },
      include: {
        labels: {
          include: {
            label: true
          }
        },
        conversation: {
          orderBy: {
            createdAt: 'asc'
          },
          include: {
            attachments: true
          }
        }
      }
    });

    if (!thread) {
      return NextResponse.json(
        { error: 'Thread not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      thread
    });

  } catch (error) {
    console.error('Error fetching thread:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch thread' },
      { status: 500 }
    );
  }
}
