// Chat API Endpoint
// Handles real-time chat functionality for direct and group chats

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

// Extend global type for socket.io
declare global {
  var io: any
}

// Input validation schemas
const createChatSchema = z.object({
  type: z.enum(['DIRECT', 'GROUP']),
  participantIds: z.array(z.string()).min(1),
  title: z.string().optional(),
  description: z.string().optional()
})

const sendMessageSchema = z.object({
  content: z.string().min(1).max(10000),
  messageType: z.enum(['TEXT', 'IMAGE', 'FILE', 'SYSTEM']).default('TEXT'),
  replyToId: z.string().optional(),
  metadata: z.record(z.any()).optional()
})

const updateChatSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional()
})

// GET /api/chat - Get user's chats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const chatId = searchParams.get('chatId')
    const type = searchParams.get('type')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get specific chat with messages
    if (chatId) {
      const chat = await prisma.chat.findFirst({
        where: {
          id: chatId,
          participants: {
            some: {
              userId: userId,
              isActive: true
            }
          }
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          },
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 50, // Limit for performance
            include: {
              sender: {
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
            }
          }
        }
      })

      if (!chat) {
        return NextResponse.json(
          { error: 'Chat not found or access denied' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        chat: {
          id: chat.id,
          type: chat.type,
          title: chat.title,
          description: chat.description,
          isActive: chat.isActive,
          lastMessageAt: chat.lastMessageAt,
          lastMessagePreview: chat.lastMessagePreview,
          participantCount: chat.participantCount,
          createdAt: chat.createdAt,
          participants: chat.participants.map(p => ({
            id: p.id,
            user: p.user,
            role: p.role,
            joinedAt: p.joinedAt,
            lastReadAt: p.lastReadAt
          })),
          messages: chat.messages.map(m => ({
            id: m.id,
            content: m.content,
            messageType: m.messageType,
            status: m.status,
            replyToId: m.replyToId,
            editedAt: m.editedAt,
            deletedAt: m.deletedAt,
            createdAt: m.createdAt,
            sender: m.sender,
            attachments: m.attachments,
            deliveryStatus: m.deliveries[0]?.status || 'SENT',
            readAt: m.deliveries[0]?.readAt
          }))
        }
      })
    }

    // Get all user's chats
    const chats = await prisma.chat.findMany({
      where: {
        participants: {
          some: {
            userId: userId,
            isActive: true
          }
        },
        isActive: true
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: { lastMessageAt: 'desc' }
    })

    // Filter by type if specified
    const filteredChats = type
      ? chats.filter(chat => chat.type === type)
      : chats

    const transformedChats = filteredChats.map(chat => ({
      id: chat.id,
      type: chat.type,
      title: chat.title,
      description: chat.description,
      lastMessageAt: chat.lastMessageAt,
      lastMessagePreview: chat.lastMessagePreview,
      participantCount: chat.participantCount,
      participants: chat.participants.map(p => ({
        id: p.user.id,
        name: p.user.name,
        email: p.user.email,
        role: p.role
      })),
      lastMessage: chat.messages[0] ? {
        id: chat.messages[0].id,
        content: chat.messages[0].content,
        sender: chat.messages[0].sender,
        createdAt: chat.messages[0].createdAt
      } : null
    }))

    return NextResponse.json({
      success: true,
      chats: transformedChats
    })

  } catch (error) {
    console.error('Error fetching chats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chats' },
      { status: 500 }
    )
  }
}

// POST /api/chat - Create chat or send message
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const chatId = searchParams.get('chatId')

    // Create new chat
    if (action === 'create') {
      const body = await request.json()
      const validationResult = createChatSchema.safeParse(body)

      if (!validationResult.success) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: validationResult.error.flatten().fieldErrors
          },
          { status: 400 }
        )
      }

      const { type, participantIds, title, description } = validationResult.data

      // For direct chats, check if one already exists
      if (type === 'DIRECT' && participantIds.length === 2) {
        const existingChat = await prisma.chat.findFirst({
          where: {
            type: 'DIRECT',
            participants: {
              every: {
                userId: { in: participantIds },
                isActive: true
              }
            },
            participantCount: 2
          }
        })

        if (existingChat) {
          return NextResponse.json({
            success: true,
            chat: existingChat,
            message: 'Direct chat already exists'
          })
        }
      }

      // Create chat
      const chat = await prisma.chat.create({
        data: {
          type,
          title,
          description,
          participantCount: participantIds.length,
          createdBy: participantIds[0] // First participant as creator
        }
      })

      // Add participants
      const participants = await Promise.all(
        participantIds.map((userId, index) =>
          prisma.chatParticipant.create({
            data: {
              chatId: chat.id,
              userId,
              role: index === 0 ? 'ADMIN' : 'MEMBER'
            }
          })
        )
      )

      // Broadcast chat creation
      try {
        if (global.io) {
          participantIds.forEach(userId => {
            global.io.to(`user_${userId}`).emit('chat_created', {
              chat: {
                id: chat.id,
                type: chat.type,
                title: chat.title,
                description: chat.description,
                participantCount: chat.participantCount,
                createdAt: chat.createdAt
              },
              participants: participants.map(p => ({
                userId: p.userId,
                role: p.role
              }))
            })
          })
        }
      } catch (broadcastError) {
        console.error('Error broadcasting chat creation:', broadcastError)
      }

      return NextResponse.json({
        success: true,
        chat: {
          id: chat.id,
          type: chat.type,
          title: chat.title,
          description: chat.description,
          participantCount: chat.participantCount,
          createdAt: chat.createdAt,
          participants
        }
      })
    }

    // Send message to existing chat
    if (chatId && action === 'message') {
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

      const { content, messageType, replyToId, metadata } = validationResult.data
      const senderId = searchParams.get('senderId')

      if (!senderId) {
        return NextResponse.json(
          { error: 'Sender ID is required' },
          { status: 400 }
        )
      }

      // Verify user is participant in chat
      const participant = await prisma.chatParticipant.findFirst({
        where: {
          chatId,
          userId: senderId,
          isActive: true
        }
      })

      if (!participant) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        )
      }

      // Create message
      const message = await prisma.chatMessage.create({
        data: {
          chatId,
          senderId,
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
          attachments: true
        }
      })

      // Update chat's last message info
      await prisma.chat.update({
        where: { id: chatId },
        data: {
          lastMessageAt: new Date(),
          lastMessagePreview: content.length > 100 ? content.substring(0, 100) + '...' : content
        }
      })

      // Create delivery records for all participants except sender
      const participants = await prisma.chatParticipant.findMany({
        where: {
          chatId,
          isActive: true,
          userId: { not: senderId }
        }
      })

      await Promise.all(
        participants.map(participant =>
          prisma.messageDelivery.create({
            data: {
              chatMessageId: message.id,
              recipientId: participant.userId,
              recipientType: 'CUSTOMER', // Default, could be enhanced
              status: 'SENT'
            }
          })
        )
      )

      // Broadcast message
      try {
        if (global.io) {
          global.io.to(`chat_${chatId}`).emit('new_chat_message', {
            chatId,
            content: message.content,
            messageType: message.messageType,
            status: message.status,
            replyToId: message.replyToId,
            createdAt: message.createdAt,
            sender: message.sender,
            attachments: message.attachments,
            id: message.id
          })
        }
      } catch (broadcastError) {
        console.error('Error broadcasting chat message:', broadcastError)
      }

      return NextResponse.json({
        success: true,
        message: {
          id: message.id,
          chatId: message.chatId,
          content: message.content,
          messageType: message.messageType,
          status: message.status,
          replyToId: message.replyToId,
          createdAt: message.createdAt,
          sender: message.sender,
          attachments: message.attachments
        }
      })
    }

    return NextResponse.json(
      { error: 'Invalid action or parameters' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Error creating chat/message:', error)
    return NextResponse.json(
      { error: 'Failed to create chat/message' },
      { status: 500 }
    )
  }
}

// PATCH /api/chat - Update chat or mark messages as read
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const chatId = searchParams.get('chatId')
    const action = searchParams.get('action')
    const userId = searchParams.get('userId')

    if (!chatId || !userId) {
      return NextResponse.json(
        { error: 'Chat ID and User ID are required' },
        { status: 400 }
      )
    }

    // Mark messages as read
    if (action === 'read') {
      // Update participant's last read time
      await prisma.chatParticipant.updateMany({
        where: {
          chatId,
          userId
        },
        data: {
          lastReadAt: new Date()
        }
      })

      // Mark all undelivered messages as read
      await prisma.messageDelivery.updateMany({
        where: {
          chatMessage: {
            chatId
          },
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
          global.io.to(`chat_${chatId}`).emit('messages_read', {
            chatId,
            userId,
            timestamp: new Date()
          })
        }
      } catch (broadcastError) {
        console.error('Error broadcasting read status:', broadcastError)
      }

      return NextResponse.json({
        success: true,
        message: 'Messages marked as read'
      })
    }

    // Update chat details
    if (action === 'update') {
      const body = await request.json()
      const validationResult = updateChatSchema.safeParse(body)

      if (!validationResult.success) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: validationResult.error.flatten().fieldErrors
          },
          { status: 400 }
        )
      }

      const { title, description } = validationResult.data

      // Verify user is admin of the chat
      const participant = await prisma.chatParticipant.findFirst({
        where: {
          chatId,
          userId,
          role: 'ADMIN'
        }
      })

      if (!participant) {
        return NextResponse.json(
          { error: 'Only chat admins can update chat details' },
          { status: 403 }
        )
      }

      const updatedChat = await prisma.chat.update({
        where: { id: chatId },
        data: { title, description }
      })

      // Broadcast chat update
      try {
        if (global.io) {
          global.io.to(`chat_${chatId}`).emit('chat_updated', {
            chatId,
            title: updatedChat.title,
            description: updatedChat.description
          })
        }
      } catch (broadcastError) {
        console.error('Error broadcasting chat update:', broadcastError)
      }

      return NextResponse.json({
        success: true,
        chat: updatedChat
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Error updating chat:', error)
    return NextResponse.json(
      { error: 'Failed to update chat' },
      { status: 500 }
    )
  }
}

// DELETE /api/chat - Leave chat or delete message
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const chatId = searchParams.get('chatId')
    const userId = searchParams.get('userId')
    const messageId = searchParams.get('messageId')

    if (!chatId || !userId) {
      return NextResponse.json(
        { error: 'Chat ID and User ID are required' },
        { status: 400 }
      )
    }

    // Delete message (only by sender)
    if (messageId) {
      const message = await prisma.chatMessage.findFirst({
        where: {
          id: messageId,
          chatId,
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
      await prisma.chatMessage.update({
        where: { id: messageId },
        data: {
          deletedAt: new Date(),
          content: '[Message deleted]'
        }
      })

      // Broadcast message deletion
      try {
        if (global.io) {
          global.io.to(`chat_${chatId}`).emit('message_deleted', {
            chatId,
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
    }

    // Leave chat
    const participant = await prisma.chatParticipant.findFirst({
      where: {
        chatId,
        userId,
        isActive: true
      }
    })

    if (!participant) {
      return NextResponse.json(
        { error: 'Not a participant in this chat' },
        { status: 404 }
      )
    }

    // Mark as inactive (soft leave)
    await prisma.chatParticipant.update({
      where: { id: participant.id },
      data: {
        isActive: false,
        leftAt: new Date()
      }
    })

    // Update participant count
    const activeParticipants = await prisma.chatParticipant.count({
      where: {
        chatId,
        isActive: true
      }
    })

    await prisma.chat.update({
      where: { id: chatId },
      data: { participantCount: activeParticipants }
    })

    // If no active participants, deactivate chat
    if (activeParticipants === 0) {
      await prisma.chat.update({
        where: { id: chatId },
        data: { isActive: false }
      })
    }

    // Broadcast user left
    try {
      if (global.io) {
        global.io.to(`chat_${chatId}`).emit('user_left_chat', {
          chatId,
          userId,
          leftAt: new Date()
        })
      }
    } catch (broadcastError) {
      console.error('Error broadcasting user left:', broadcastError)
    }

    return NextResponse.json({
      success: true,
      message: 'Left chat successfully'
    })

  } catch (error) {
    console.error('Error deleting from chat:', error)
    return NextResponse.json(
      { error: 'Failed to delete from chat' },
      { status: 500 }
    )
  }
}