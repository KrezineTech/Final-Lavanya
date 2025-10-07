// Direct Messages API Endpoint
// Handles direct messaging between users (not thread-based)

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

// Extend global type for socket.io
declare global {
  var io: any
}

// Input validation schemas
const sendMessageSchema = z.object({
  receiverId: z.string(),
  content: z.string().min(1).max(10000),
  messageType: z.enum(['TEXT', 'IMAGE', 'FILE', 'SYSTEM']).default('TEXT'),
  replyToId: z.string().optional(),
  metadata: z.record(z.any()).optional()
})

// GET /api/messages/direct - Get direct messages
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const otherUserId = searchParams.get('otherUserId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get conversation with specific user
    if (otherUserId) {
      const messages = await prisma.message.findMany({
        where: {
          OR: [
            { senderId: userId, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: userId }
          ],
          deletedAt: null
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          receiver: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          attachments: true,
          deliveries: {
            where: { recipientId: userId },
            select: { status: true, readAt: true }
          }
        },
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset
      })

      // Mark messages as read
      await prisma.messageDelivery.updateMany({
        where: {
          directMessageId: { in: messages.filter(m => m.senderId !== userId).map(m => m.id) },
          recipientId: userId,
          status: { in: ['SENT', 'DELIVERED'] }
        },
        data: {
          status: 'READ',
          readAt: new Date()
        }
      })

      const transformedMessages = messages.reverse().map(message => ({
        id: message.id,
        senderId: message.senderId,
        receiverId: message.receiverId,
        content: message.content,
        messageType: message.messageType,
        replyToId: message.replyToId,
        editedAt: message.editedAt,
        deletedAt: message.deletedAt,
        timestamp: message.timestamp,
        isRead: message.isRead,
        readAt: message.readAt,
        sender: message.sender,
        receiver: message.receiver,
        attachments: message.attachments,
        deliveryStatus: message.deliveries[0]?.status || 'SENT',
        deliveryReadAt: message.deliveries[0]?.readAt
      }))

      return NextResponse.json({
        success: true,
        messages: transformedMessages,
        hasMore: messages.length === limit
      })
    }

    // Get all conversations for user
    const conversations = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId }
        ],
        deletedAt: null
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { timestamp: 'desc' }
    })

    // Group by conversation partner
    const conversationMap = new Map()

    conversations.forEach(message => {
      const partnerId = message.senderId === userId ? message.receiverId : message.senderId
      const partner = message.senderId === userId ? message.receiver : message.sender

      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, {
          partner: {
            id: partner.id,
            name: partner.name,
            email: partner.email
          },
          lastMessage: message,
          unreadCount: 0
        })
      }

      // Count unread messages
      if (message.receiverId === userId && !message.isRead) {
        conversationMap.get(partnerId).unreadCount++
      }

      // Update last message if newer
      if (message.timestamp > conversationMap.get(partnerId).lastMessage.timestamp) {
        conversationMap.get(partnerId).lastMessage = message
      }
    })

    const conversationList = Array.from(conversationMap.values()).map(conv => ({
      partner: conv.partner,
      lastMessage: {
        id: conv.lastMessage.id,
        content: conv.lastMessage.content,
        timestamp: conv.lastMessage.timestamp,
        isFromMe: conv.lastMessage.senderId === userId
      },
      unreadCount: conv.unreadCount
    }))

    return NextResponse.json({
      success: true,
      conversations: conversationList
    })

  } catch (error) {
    console.error('Error fetching direct messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch direct messages' },
      { status: 500 }
    )
  }
}

// POST /api/messages/direct - Send direct message
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const senderId = searchParams.get('senderId')

    if (!senderId) {
      return NextResponse.json(
        { error: 'Sender ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validationResult = sendMessageSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.flatten().fieldErrors
        },
        { status: 400 }
      )
    }

    const { receiverId, content, messageType, replyToId, metadata } = validationResult.data

    // Verify receiver exists
    const receiver = await prisma.frontendUser.findUnique({
      where: { id: receiverId }
    })

    if (!receiver) {
      return NextResponse.json(
        { error: 'Receiver not found' },
        { status: 404 }
      )
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        senderId,
        receiverId,
        content,
        messageType,
        replyToId,
        metadata
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        attachments: true
      }
    })

    // Create delivery record
    await prisma.messageDelivery.create({
      data: {
        directMessageId: message.id,
        recipientId: receiverId,
        recipientType: 'CUSTOMER', // Default, could be enhanced
        status: 'SENT'
      }
    })

    // Broadcast message
    try {
      if (global.io) {
        // Send to receiver
        global.io.to(`user_${receiverId}`).emit('new_direct_message', {
          id: message.id,
          senderId: message.senderId,
          receiverId: message.receiverId,
          content: message.content,
          messageType: message.messageType,
          replyToId: message.replyToId,
          timestamp: message.timestamp,
          sender: message.sender,
          receiver: message.receiver,
          attachments: message.attachments
        })

        // Send delivery confirmation to sender
        global.io.to(`user_${senderId}`).emit('message_sent', {
          messageId: message.id,
          status: 'SENT'
        })
      }
    } catch (broadcastError) {
      console.error('Error broadcasting direct message:', broadcastError)
    }

    return NextResponse.json({
      success: true,
      message: {
        id: message.id,
        senderId: message.senderId,
        receiverId: message.receiverId,
        content: message.content,
        messageType: message.messageType,
        replyToId: message.replyToId,
        timestamp: message.timestamp,
        sender: message.sender,
        receiver: message.receiver,
        attachments: message.attachments
      }
    })

  } catch (error) {
    console.error('Error sending direct message:', error)
    return NextResponse.json(
      { error: 'Failed to send direct message' },
      { status: 500 }
    )
  }
}

// PATCH /api/messages/direct - Mark messages as read
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const messageIds = searchParams.get('messageIds')?.split(',') || []

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    if (messageIds.length === 0) {
      return NextResponse.json(
        { error: 'Message IDs are required' },
        { status: 400 }
      )
    }

    // Mark messages as read
    await prisma.message.updateMany({
      where: {
        id: { in: messageIds },
        receiverId: userId,
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    })

    // Update delivery status
    await prisma.messageDelivery.updateMany({
      where: {
        directMessageId: { in: messageIds },
        recipientId: userId,
        status: { in: ['SENT', 'DELIVERED'] }
      },
      data: {
        status: 'READ',
        readAt: new Date()
      }
    })

    // Broadcast read status
    try {
      if (global.io) {
        messageIds.forEach(messageId => {
          global.io.to(`user_${userId}`).emit('direct_messages_read', {
            messageIds: [messageId],
            userId,
            timestamp: new Date()
          })
        })
      }
    } catch (broadcastError) {
      console.error('Error broadcasting read status:', broadcastError)
    }

    return NextResponse.json({
      success: true,
      message: 'Messages marked as read'
    })

  } catch (error) {
    console.error('Error updating direct messages:', error)
    return NextResponse.json(
      { error: 'Failed to update direct messages' },
      { status: 500 }
    )
  }
}

// DELETE /api/messages/direct - Delete message
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const messageId = searchParams.get('messageId')
    const userId = searchParams.get('userId')

    if (!messageId || !userId) {
      return NextResponse.json(
        { error: 'Message ID and User ID are required' },
        { status: 400 }
      )
    }

    // Verify user owns the message
    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        senderId: userId
      }
    })

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found or access denied' },
        { status: 404 }
      )
    }

    // Soft delete message
    await prisma.message.update({
      where: { id: messageId },
      data: {
        deletedAt: new Date(),
        content: '[Message deleted]'
      }
    })

    // Broadcast deletion
    try {
      if (global.io) {
        global.io.to(`user_${message.receiverId}`).emit('direct_message_deleted', {
          messageId,
          deletedAt: new Date()
        })
      }
    } catch (broadcastError) {
      console.error('Error broadcasting message deletion:', broadcastError)
    }

    return NextResponse.json({
      success: true,
      message: 'Message deleted'
    })

  } catch (error) {
    console.error('Error deleting direct message:', error)
    return NextResponse.json(
      { error: 'Failed to delete direct message' },
      { status: 500 }
    )
  }
}