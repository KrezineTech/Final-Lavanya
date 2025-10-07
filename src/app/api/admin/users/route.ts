import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { getServerSession } from 'next-auth/next'
import authOptions from '@/lib/auth'

const prisma = new PrismaClient()

// Get all users
export const GET = async (request: NextRequest) => {
  try {
    // Check admin authentication with enhanced permissions
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      )
    }

    // Check if user can manage users (Super Admin only)
    if (!session.user.canManageUsers && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Only Super Admin can manage users', code: 'ADMIN_REQUIRED' },
        { status: 403 }
      )
    }

    // Get all users with comprehensive data
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        permissions: true,
        allowedPages: true,
        canManageUsers: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        createdBy: true,
        _count: {
          select: {
            sessions: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      users,
      totalCount: users.length,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch users',
        code: 'USER_FETCH_ERROR',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Update user role and permissions
export const PUT = async (request: NextRequest) => {
  try {
    // Check admin authentication with enhanced permissions
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      )
    }

    // Check if user can manage users (Super Admin only)
    if (!session.user.canManageUsers && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Only Super Admin can manage users', code: 'ADMIN_REQUIRED' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { userId, role, isActive, permissions, allowedPages } = body

    if (!userId) {
      return NextResponse.json(
        {
          error: 'User ID is required',
          code: 'MISSING_USER_ID',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      )
    }

    // Validate role if provided
    const validRoles = ['USER', 'CUSTOMER', 'SUPPORT', 'ADMIN', 'SUPER_ADMIN']
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        {
          error: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
          code: 'INVALID_ROLE',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      )
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        role: role || undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        permissions: permissions || undefined,
        allowedPages: allowedPages || undefined,
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        permissions: true,
        allowedPages: true,
        canManageUsers: true,
        updatedAt: true
      }
    })

    return NextResponse.json({
      success: true,
      user: updatedUser,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      {
        error: 'Failed to update user',
        code: 'USER_UPDATE_ERROR',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Create new user
export const POST = async (request: NextRequest) => {
  try {
    // Check admin authentication with enhanced permissions
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      )
    }

    // Check if user can manage users (Super Admin only)
    if (!session.user.canManageUsers && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Only Super Admin can create users', code: 'ADMIN_REQUIRED' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, email, password, role = 'ADMIN', permissions = [], allowedPages = ['/profile'] } = body

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json(
        {
          error: 'Name, email, and password are required',
          code: 'MISSING_REQUIRED_FIELDS',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (existingUser) {
      return NextResponse.json(
        {
          error: 'User with this email already exists',
          code: 'USER_ALREADY_EXISTS',
          timestamp: new Date().toISOString()
        },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    const newUser = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role,
        permissions,
        allowedPages,
        isActive: true,
        canManageUsers: false, // Only Super Admin can manage users
        createdBy: session.user.id,
        emailVerified: new Date()
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        permissions: true,
        allowedPages: true,
        canManageUsers: true,
        createdAt: true
      }
    })

    return NextResponse.json({
      success: true,
      user: newUser,
      timestamp: new Date().toISOString()
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      {
        error: 'Failed to create user',
        code: 'USER_CREATION_ERROR',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Delete user
export const DELETE = async (request: NextRequest) => {
  try {
    // Check admin authentication with enhanced permissions
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      )
    }

    // Check if user can manage users (Super Admin only)
    if (!session.user.canManageUsers && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Only Super Admin can delete users', code: 'ADMIN_REQUIRED' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('id')

    if (!userId) {
      return NextResponse.json(
        {
          error: 'User ID is required',
          code: 'MISSING_USER_ID',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      )
    }

    // Prevent deleting Super Admin or self
    if (userId === session.user.id) {
      return NextResponse.json(
        {
          error: 'Cannot delete your own account',
          code: 'CANNOT_DELETE_SELF',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      )
    }

    // Get user to be deleted
    const userToDelete = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, role: true }
    })

    if (!userToDelete) {
      return NextResponse.json(
        {
          error: 'User not found',
          code: 'USER_NOT_FOUND',
          timestamp: new Date().toISOString()
        },
        { status: 404 }
      )
    }

    // Prevent deleting Super Admin
    if (userToDelete.role === 'SUPER_ADMIN') {
      return NextResponse.json(
        {
          error: 'Cannot delete Super Admin account',
          code: 'CANNOT_DELETE_SUPER_ADMIN',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      )
    }

    // Delete user and related data
    await prisma.user.delete({
      where: { id: userId }
    })

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
      deletedUser: userToDelete.email,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete user',
        code: 'USER_DELETION_ERROR',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}