import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  formatGroupRaceResponse,
  parseGroupRaceMeta,
  serializeGroupRacePayload,
  LoftEntry,
} from '@/lib/groupRaces'

// Helper: extract userId + userEmail from request
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

// Generate unique 6-character Join Code (e.g. FLY-749)
function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let random = ''
  for (let i = 0; i < 3; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `FLY-${random}`
}

// GET: List active/all group races, or lookup by ?code=FLY-XXX
export async function GET(request: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json([])
    }

    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')?.trim().toUpperCase()

    if (code) {
      // Find race containing this join code in participatingBirds or club
      const races = await prisma.raceEvent.findMany({
        where: {
          OR: [
            { participatingBirds: { contains: code } },
            { club: { contains: code } },
          ],
        },
        take: 1,
      })

      const matched = races.find((r) => {
        const meta = parseGroupRaceMeta(r)
        return meta.joinCode?.toUpperCase() === code
      }) || races[0]

      if (!matched) {
        return NextResponse.json({ error: 'Group race not found with this code' }, { status: 404 })
      }
      return NextResponse.json(formatGroupRaceResponse(matched))
    }

    // Find all group races
    const races = await prisma.raceEvent.findMany({
      where: {
        OR: [
          { participatingBirds: { contains: '"isGroupRace":true' } },
          { participatingBirds: { contains: 'isGroupRace' } },
          { club: { contains: 'FLY-' } },
        ],
      },
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 50,
    })

    const groupRaces = races
      .map((r) => formatGroupRaceResponse(r))
      .filter((r) => r.isGroupRace)

    return NextResponse.json(groupRaces)
  } catch (err: any) {
    console.error('Error in GET /api/group-races:', err)
    return NextResponse.json([])
  }
}

// POST: Create a new Group Activity Race as Admin / Organizer
export async function POST(request: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'DATABASE_URL env variable is not configured' }, { status: 500 })
    }

    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { title, date, location, club, distance, releaseTime, organizerLoftName } = body

    if (!title || !date) {
      return NextResponse.json({ error: 'Title and Date are required' }, { status: 400 })
    }

    // Generate unique code and check collision
    let joinCode = generateJoinCode()
    let existing = await prisma.raceEvent.findFirst({
      where: {
        participatingBirds: { contains: joinCode },
      },
    }).catch(() => null)

    let attempts = 0
    while (existing && attempts < 5) {
      joinCode = generateJoinCode()
      existing = await prisma.raceEvent.findFirst({
        where: {
          participatingBirds: { contains: joinCode },
        },
      }).catch(() => null)
      attempts++
    }

    const initialLofts: LoftEntry[] = organizerLoftName
      ? [
          {
            loftId: user.userId,
            loftName: organizerLoftName,
            fancierEmail: user.userEmail,
            birdRings: [],
            joinedAt: new Date().toISOString(),
            isOrganizer: true,
          },
        ]
      : []

    const participatingBirdsPayload = serializeGroupRacePayload({
      isGroupRace: true,
      joinCode,
      raceStatus: 'basketing',
      loftEntries: initialLofts,
    })

    const groupRace = await prisma.raceEvent.create({
      data: {
        userId: user.userId,
        userEmail: user.userEmail,
        title,
        date,
        location: location || 'Club Release Point',
        club: club ? `${club} [${joinCode}]` : `Group Derby [${joinCode}]`,
        distance: Number(distance) || 0,
        releaseTime: releaseTime || '06:00',
        clockInTime: '09:30',
        winner: 'TBD',
        totalBirds: 0,
        maxSpeed: 0,
        avgSpeed: 0,
        backgroundColor: '#FFC107',
        borderColor: '#FF8F00',
        birds: '[]',
        participatingBirds: participatingBirdsPayload,
        isRfidActive: true,
      },
    })

    const formatted = formatGroupRaceResponse(groupRace)
    return NextResponse.json({ success: true, data: formatted })
  } catch (err: any) {
    console.error('Error in POST /api/group-races:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
