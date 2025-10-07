import { NextRequest, NextResponse } from 'next/server'

// Proxy to /api/user/profile
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  url.pathname = '/api/user/profile'
  return fetch(url.toString(), {
    method: 'GET',
    headers: request.headers
  })
}

export async function PUT(request: NextRequest) {
  const url = new URL(request.url)
  url.pathname = '/api/user/profile'
  return fetch(url.toString(), {
    method: 'PUT',
    headers: request.headers,
    body: request.body,
    duplex: 'half'
  } as any)
}