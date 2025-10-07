/**
 * User Profile API Route
 * Handles profile retrieval and updates without authentication
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// OPTIONS handler for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    // Support both authenticated users (from headers) and direct userId query
    const { searchParams } = new URL(request.url);
    const queryUserId = searchParams.get('userId');
    
    // Extract user information from headers (set by middleware)
    const headerUserId = request.headers.get('X-User-Id');
    const userEmail = request.headers.get('X-User-Email');

    const userId = queryUserId || headerUserId;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId required (as query param or in headers)' },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }

    console.log('Fetching profile for userId:', userId);

    // Try FrontendUser first (for frontend shop users)
    let user = await prisma.frontendUser.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
      }
    });

    // If not found in FrontendUser, try User table (for admin users)
    if (!user) {
      user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
        }
      }) as any;
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        {
          status: 404,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }

    return NextResponse.json({
      ...user,
      message: 'Profile retrieved successfully'
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
      }
    })

  } catch (error) {
    console.error('Profile GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': 'true',
        }
      }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('PUT request received')

    // Parse request body
    const contentType = request.headers.get('content-type')
    console.log('Content-Type:', contentType)

    if (!contentType?.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type must be application/json' },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': 'http://localhost:3000',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      )
    }

    // Extract user information from headers (set by middleware)
    const userId = request.headers.get('X-User-Id');
    const userEmail = request.headers.get('X-User-Email');

    if (!userId || !userEmail) {
      return NextResponse.json(
        { error: 'Authentication required' },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': 'http://localhost:3000',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }

    const body = await request.json()
    console.log('Request body:', body)
    const { name } = body

    // Validate input
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      console.log('Validation failed for name:', name)
      return NextResponse.json(
        { error: 'Name must be at least 2 characters long' },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': 'http://localhost:3000',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      )
    }

    console.log('Updating profile for user:', userEmail, 'with name:', name.trim())

    // Update user in database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { name: name.trim() },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        updatedAt: true
      }
    });

    console.log('Profile update successful:', updatedUser)

    return NextResponse.json({
      user: updatedUser,
      message: 'Profile updated successfully'
    }, {
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:3000',
        'Access-Control-Allow-Credentials': 'true',
      }
    })

  } catch (error) {
    console.error('Profile PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': 'http://localhost:3000',
          'Access-Control-Allow-Credentials': 'true',
        }
      }
    )
  }
}

// Only allow GET and PUT methods
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    {
      status: 405,
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:3000',
        'Access-Control-Allow-Credentials': 'true',
      }
    }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    {
      status: 405,
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:3000',
        'Access-Control-Allow-Credentials': 'true',
      }
    }
  )
}