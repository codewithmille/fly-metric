import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Helper: extract userId + userEmail from Supabase JWT
async function getUserFromRequest(request: Request): Promise<{ userId: string; userEmail: string } | null> {
  const authHeader = request.headers.get('authorization')
  const host = request.headers.get('host') || ''
  const isDev = process.env.NODE_ENV === 'development' || host.includes('localhost') || host.includes('127.0.0.1')

  if (!authHeader?.startsWith('Bearer ')) {
    if (isDev) {
      return { userId: 'local-dev-user-id', userEmail: 'dev@example.com' }
    }
    return null
  }
  const token = authHeader.slice(7)
  try {
    const base64 = token.split('.')[1]
    const decoded = JSON.parse(Buffer.from(base64, 'base64url').toString('utf-8'))
    const userId = decoded.sub
    const userEmail = decoded.email || ''
    if (!userId) {
      if (isDev) return { userId: 'local-dev-user-id', userEmail: 'dev@example.com' }
      return null
    }
    return { userId, userEmail }
  } catch {
    if (isDev) {
      return { userId: 'local-dev-user-id', userEmail: 'dev@example.com' }
    }
    return null
  }
}

export async function GET(request: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      console.warn('DATABASE_URL is not configured. Returning empty bird registry.')
      return NextResponse.json([])
    }

    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const data = await prisma.loftBird.findMany({
      where: { userId: user.userId },
      orderBy: { ringNo: 'asc' },
    })

    return NextResponse.json(data)
  } catch (err: any) {
    console.error('Error in GET /api/loft-birds:', err)
    return NextResponse.json([])
  }
}

export async function POST(request: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'DATABASE_URL env variable is not configured' }, { status: 500 })
    }

    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { ringNo, color, name, gender } = body

    if (!ringNo || !color) {
      return NextResponse.json({ error: 'Ring Number and Color are required' }, { status: 400 })
    }

    // Check if ring number is already registered for this user
    const existing = await prisma.loftBird.findFirst({
      where: { userId: user.userId, ringNo: ringNo.trim().toUpperCase() }
    })

    if (existing) {
      return NextResponse.json({ error: `Bird with Ring No. "${ringNo.trim().toUpperCase()}" is already registered in your loft.` }, { status: 400 })
    }

    const data = await prisma.loftBird.create({
      data: {
        userId: user.userId,
        userEmail: user.userEmail,
        ringNo: ringNo.trim().toUpperCase(),
        color: color.trim(),
        name: name ? name.trim() : null,
        gender: gender || 'Unknown',
      },
    })

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error('Error in POST /api/loft-birds:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'DATABASE_URL env variable is not configured' }, { status: 500 })
    }

    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Bird ID is required for deletion' }, { status: 400 })
    }

    // Only delete if it belongs to this user
    await prisma.loftBird.deleteMany({
      where: { id, userId: user.userId },
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Error in DELETE /api/loft-birds:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
