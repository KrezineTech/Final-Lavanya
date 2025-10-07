import { NextRequest, NextResponse } from 'next/server'
import { auth, signOut } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Sign out using NextAuth
    await signOut({ redirect: false })

    return NextResponse.json({
      message: 'Logged out successfully'
    })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}