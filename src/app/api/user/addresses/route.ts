/**
 * User Addresses API Route
 * Handles CRUD operations for user addresses without authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Helper function to add CORS headers to responses
function addCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3000');
  response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-User-Id, X-User-Email, X-User-Role');
  return response;
}

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
});

// Default user ID for demo purposes
const DEFAULT_USER_ID = 'demo-user-id';

// GET - Fetch all addresses for a specific user
export async function GET(request: NextRequest) {
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

    console.log('Fetching addresses for user:', userEmail);

    const addresses = await prisma.$queryRaw`
      SELECT * FROM "UserAddress"
      WHERE "userId" = ${userId}
      ORDER BY "isDefault" DESC, "createdAt" DESC
    `;

    return addCorsHeaders(NextResponse.json({ addresses, message: 'Addresses retrieved successfully' }));
  } catch (error) {
    console.error('Addresses GET error:', error);
    return addCorsHeaders(NextResponse.json({ error: 'Internal server error' }, { status: 500 }));
  }
}

// POST - Create a new address
export async function POST(request: NextRequest) {
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

    const body = await request.json();

    // Validate body
    let validated: any;
    try {
      validated = addressSchema.parse(body);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return addCorsHeaders(NextResponse.json({ error: 'Validation failed', details: err.errors }, { status: 400 }));
      }
      throw err;
    }

    console.log('Creating address for user:', userEmail);

    // If isDefault is true, unset other defaults for this user
    if (validated.isDefault) {
      await prisma.$executeRaw`
        UPDATE "UserAddress"
        SET "isDefault" = false, "updatedAt" = NOW()
        WHERE "userId" = ${userId} AND "isDefault" = true
      `;
    }

    // Insert new address and return the created row
    const created = await prisma.$queryRaw`
      INSERT INTO "UserAddress" (
        "id", "userId", "name", "phone", "pincode", "address", "city", "state", "landmark", "addressType", "isDefault", "createdAt", "updatedAt"
      ) VALUES (
        ${`addr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`}, ${userId}, ${validated.name}, ${validated.phone}, ${validated.pincode}, ${validated.address}, ${validated.city}, ${validated.state}, ${validated.landmark || ''}, ${validated.addressType}::"AddressType", ${validated.isDefault}, NOW(), NOW()
      ) RETURNING *
    ` as any;

    const newAddress = Array.isArray(created) ? created[0] : created;

    return addCorsHeaders(NextResponse.json({ address: newAddress, message: 'Address created successfully' }, { status: 201 }));

  } catch (error) {
    console.error('❌ POST error:', error);
    return addCorsHeaders(NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    ));
  }
}

// DELETE - Delete an address
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const addressId = searchParams.get('id');

    if (!addressId) {
      return addCorsHeaders(NextResponse.json(
        { error: 'Address ID is required' },
        { status: 400 }
      ));
    }

    console.log('Deleting address for user:', userEmail, 'address ID:', addressId);

    // Check if address exists and belongs to user
    const address = await prisma.$queryRaw`
      SELECT * FROM "UserAddress"
      WHERE "id" = ${addressId} AND "userId" = ${userId}
    ` as any[];

    if (!address || address.length === 0) {
      return addCorsHeaders(NextResponse.json(
        { error: 'Address not found' },
        { status: 404 }
      ));
    }

    // Delete the address
    await prisma.$executeRaw`
      DELETE FROM "UserAddress"
      WHERE "id" = ${addressId} AND "userId" = ${userId}
    `;

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
      'Access-Control-Max-Age': '0',
      'Vary': 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers',
    },
  });
}