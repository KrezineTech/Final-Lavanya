// Admin API endpoints - No Authentication Required
// Simple proxy to main API without auth protection

import { NextRequest, NextResponse } from 'next/server';

// Simple GET endpoint
export const GET = async (request: NextRequest) => {
  const { searchParams, pathname } = new URL(request.url);

  // Extract the admin path and convert to main API path
  const apiPath = pathname.replace('/api/admin', '/api');

  // Forward all query parameters
  const forwardUrl = new URL(apiPath, request.url);
  forwardUrl.search = searchParams.toString();

  try {
    // Forward request to main API
    const response = await fetch(forwardUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Request': 'true'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        {
          error: errorData.error || 'Request failed',
          code: 'PROXY_REQUEST_FAILED',
          status: response.status,
          timestamp: new Date().toISOString()
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Add basic metadata to response
    return NextResponse.json({
      ...data,
      _meta: {
        timestamp: new Date().toISOString(),
        apiPath: apiPath
      }
    });

  } catch (error) {
    console.error('Admin API proxy error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
};

// Simple POST endpoint
export const POST = async (request: NextRequest) => {
  const { pathname } = new URL(request.url);
  const apiPath = pathname.replace('/api/admin', '/api');

  try {
    const body = await request.text();

    const response = await fetch(new URL(apiPath, request.url).toString(), {
      method: 'POST',
      headers: {
        'Content-Type': request.headers.get('Content-Type') || 'application/json',
        'X-Admin-Request': 'true'
      },
      body
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        {
          error: errorData.error || 'Request failed',
          code: 'PROXY_REQUEST_FAILED',
          status: response.status,
          timestamp: new Date().toISOString()
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      ...data,
      _meta: {
        timestamp: new Date().toISOString(),
        apiPath: apiPath
      }
    });

  } catch (error) {
    console.error('Admin API proxy error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
};

// Simple PATCH endpoint
export const PATCH = async (request: NextRequest) => {
  const { pathname } = new URL(request.url);
  const apiPath = pathname.replace('/api/admin', '/api');

  try {
    const body = await request.text();

    const response = await fetch(new URL(apiPath, request.url).toString(), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Request': 'true'
      },
      body
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        {
          error: errorData.error || 'Request failed',
          code: 'PROXY_REQUEST_FAILED',
          status: response.status,
          timestamp: new Date().toISOString()
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      ...data,
      _meta: {
        timestamp: new Date().toISOString(),
        apiPath: apiPath
      }
    });

  } catch (error) {
    console.error('Admin API proxy error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
};

// Simple DELETE endpoint
export const DELETE = async (request: NextRequest) => {
  const { pathname } = new URL(request.url);
  const apiPath = pathname.replace('/api/admin', '/api');

  try {
    const body = await request.text();

    const response = await fetch(new URL(apiPath, request.url).toString(), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Request': 'true'
      },
      body: body || undefined
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        {
          error: errorData.error || 'Request failed',
          code: 'PROXY_REQUEST_FAILED',
          status: response.status,
          timestamp: new Date().toISOString()
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      ...data,
      _meta: {
        timestamp: new Date().toISOString(),
        apiPath: apiPath
      }
    });

  } catch (error) {
    console.error('Admin API proxy error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
};