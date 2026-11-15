import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  formatGroupRaceResponse,
  parseGroupRaceMeta,
  GroupArrival,
} from '@/lib/groupRaces'

// Helper: extract userId + userEmail
async function getUserFromRequest(request: Request): Promise<{ userId: string; userEmail: string } | null> {
  const authHeader = request.headers.get('authorization')
  const host = request.headers.get('host') || ''
  const isDev = process.env.NODE_ENV === 'development' || host.includes('localhost') || host.includes('127.0.0.1')

  if (!authHeader?.startsWith('Bearer ')) {
    if (isDev) return { userId: 'local-dev-user-id', userEmail: 'dev@example.com' }
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
    if (isDev) return { userId: 'local-dev-user-id', userEmail: 'dev@example.com' }
    return null
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'DATABASE_URL env variable is not configured' }, { status: 500 })
    }

    const { id: raceId } = await params
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { ringNo, clockInTime, speed, loftName, fancierName, birdName, color, method } = body

    if (!ringNo || !clockInTime || speed === undefined) {
      return NextResponse.json({ error: 'Ring number, clock-in time, and speed are required' }, { status: 400 })
    }

    const groupRace = await prisma.raceEvent.findUnique({
      where: { id: raceId },
    })

    if (!groupRace) {
      return NextResponse.json({ error: 'Race not found' }, { status: 404 })
    }

    const meta = parseGroupRaceMeta(groupRace)
    if (!meta.isGroupRace) {
      return NextResponse.json({ error: 'Not a group race' }, { status: 404 })
    }

    const arrivals: GroupArrival[] = [...meta.groupArrivals]
    const normalizedRing = ringNo.trim().toUpperCase()

    // Prevent duplicate clock-in for the same bird
    const existing = arrivals.find((a) => a.ringNo.toUpperCase() === normalizedRing)
    if (existing) {
      return NextResponse.json({
        error: `Bird ${normalizedRing} is already clocked in at ${existing.clockInTime} (${existing.speed} m/min)`,
        alreadyClocked: true,
      }, { status: 409 })
    }

    const numSpeed = Number(speed) || 0
    const newArrival: GroupArrival = {
      ringNo: normalizedRing,
      birdName: birdName || '',
      color: color || '',
      clockInTime,
      speed: numSpeed,
      kph: Number((numSpeed * 0.06).toFixed(1)),
      loftId: user.userId,
      loftName: loftName || 'Participant Loft',
      fancierName: fancierName || user.userEmail.split('@')[0],
      method: method || 'Manual Clock-in',
      clockedAt: new Date().toISOString(),
    }

    arrivals.push(newArrival)

    // Sort by speed descending
    arrivals.sort((a, b) => b.speed - a.speed)

    const topSpeed = arrivals[0]?.speed || 0
    const winnerRing = arrivals[0]?.ringNo || 'TBD'

    const updated = await prisma.raceEvent.update({
      where: { id: raceId },
      data: {
        birds: JSON.stringify(arrivals),
        maxSpeed: topSpeed,
        winner: winnerRing,
      },
    })

    const formattedRace = formatGroupRaceResponse(updated)

    return NextResponse.json({
      success: true,
      message: `Clocked in ${normalizedRing} at ${numSpeed.toLocaleString()} m/min`,
      arrival: newArrival,
      leaderboard: arrivals,
      race: formattedRace,
    })
  } catch (err: any) {
    console.error('Error in POST /api/group-races/[id]/clock:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
