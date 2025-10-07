/**
 * User Address Individual API Route
 * Handles PUT and DELETE operations for specific addresses without authentication
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

// Helper function to add CORS headers to responses
function addCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3000');
  response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-User-Id, X-User-Email, X-User-Role');
  return response;
}

// Default user ID for demo purposes
const DEFAULT_USER_ID = 'demo-user-id';

const addressSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(10, "Enter a valid 10-digit phone number").max(10, "Enter a valid 10-digit phone number"),
  pincode: z.string().min(6, "Enter a valid 6-digit pincode").max(6, "Enter a valid 6-digit pincode"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  landmark: z.string().optional(),
  addressType: z.enum(["HOME", "WORK"]),
  isDefault: z.boolean(),
})

// PUT - Update a specific address
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Extract user information from headers (set by middleware)
    const userId = request.headers.get('X-User-Id');
    const userEmail = request.headers.get('X-User-Email');

    if (!userId || !userEmail) {
      return addCorsHeaders(NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ));
    }

    const { id } = await params

    console.log('Updating address for user:', userEmail, 'address ID:', id);

    // Check if address exists and belongs to user
    const existingAddress = await prisma.userAddress.findFirst({
      where: {
        id,
        userId: userId
      }
    })

    if (!existingAddress) {
      return addCorsHeaders(NextResponse.json(
        { error: 'Address not found' },
        { status: 404 }
      ));
    }

    const body = await request.json()

    // Validate input
    const validatedData = addressSchema.parse(body)

    // If this is being set as default, unset other default addresses
    if (validatedData.isDefault && !existingAddress.isDefault) {
      await prisma.userAddress.updateMany({
        where: {
          userId: userId,
          isDefault: true,
          id: { not: id }
        },
        data: { isDefault: false }
      })
    }

    const updatedAddress = await prisma.userAddress.update({
      where: { id },
      data: {
        ...validatedData,
        landmark: validatedData.landmark || "",
      }
    })

    return addCorsHeaders(NextResponse.json({
      address: updatedAddress,
      message: 'Address updated successfully'
    }));

  } catch (error) {
    if (error instanceof z.ZodError) {
      return addCorsHeaders(NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      ));
    }

    console.error('Address PUT error:', error);
    return addCorsHeaders(NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    ));
  }
}

// DELETE - Delete a specific address
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Extract user information from headers (set by middleware)
    const userId = request.headers.get('X-User-Id');
    const userEmail = request.headers.get('X-User-Email');

    if (!userId || !userEmail) {
      return addCorsHeaders(NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ));
    }

    const { id } = await params;

    console.log('Deleting address for user:', userEmail, 'address ID:', id);

    // Check if address exists and belongs to user
    const existingAddress = await prisma.userAddress.findFirst({
      where: {
        id,
        userId: userId
      }
    });

    if (!existingAddress) {
      return addCorsHeaders(NextResponse.json(
        { error: 'Address not found' },
        { status: 404 }
      ));
    }

    await prisma.userAddress.delete({
      where: { id }
    });

    return addCorsHeaders(NextResponse.json({
      message: 'Address deleted successfully'
    }));

  } catch (error) {
    console.error('Address DELETE error:', error);
    return addCorsHeaders(NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    ));
  }
}

// OPTIONS - Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'http://localhost:3000',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-User-Id, X-User-Email, X-User-Role',
      'Access-Control-Max-Age': '86400',
    },
  });
}