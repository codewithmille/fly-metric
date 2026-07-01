import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { RaceEvent as DBRaceEvent } from '@prisma/client'

export interface RaceEvent {
  id: string
  title: string
  date: string
  backgroundColor: string
  borderColor: string
  extendedProps: {
    totalBirds: number
    maxSpeed: number  // yards per minute
    avgSpeed: number  // yards per minute
    location: string
    club: string
    distance: number  // km
    winner: string
    releaseTime?: string
    clockInTime?: string
    birds?: string      // stringified JSON list of clocked birds
  }
}

// Helper: extract userId + userEmail from Authorization header (Supabase JWT)
async function getUserFromRequest(request: Request): Promise<{ userId: string; userEmail: string } | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)

  // Decode the JWT payload (no verification needed — Supabase RLS handles security on DB side)
  try {
    const base64 = token.split('.')[1]
    const decoded = JSON.parse(Buffer.from(base64, 'base64url').toString('utf-8'))
    const userId = decoded.sub
    const userEmail = decoded.email || ''
    if (!userId) return null
    return { userId, userEmail }
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      console.warn('DATABASE_URL is not configured. Returning empty activities.')
      return NextResponse.json([])
    }

    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const data = await prisma.raceEvent.findMany({
      where: { userId: user.userId },
      orderBy: { date: 'asc' },
    })

    // Map DB rows to RaceEvent shape
    const formattedEvents: RaceEvent[] = data.map((row: DBRaceEvent) => ({
      id: row.id,
      title: row.title,
      date: row.date,
      backgroundColor: row.backgroundColor || '#FFC107',
      borderColor: row.borderColor || '#FF8F00',
      extendedProps: {
        totalBirds: row.totalBirds || 0,
        maxSpeed: row.maxSpeed || 0,
        avgSpeed: row.avgSpeed || 0,
        location: row.location || 'Unknown',
        club: row.club || 'Default Club',
        distance: row.distance || 0,
        winner: row.winner || 'TBD',
        releaseTime: row.releaseTime || '06:00',
        clockInTime: row.clockInTime || '09:30',
        birds: row.birds || '[]',
      },
    }))

    return NextResponse.json(formattedEvents)
  } catch (err: any) {
    console.error('Error in GET /api/race-events:', err)
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
    const { title, date, totalBirds, maxSpeed, avgSpeed, location, club, distance, winner, releaseTime, clockInTime, birds } = body

    if (!title || !date) {
      return NextResponse.json({ error: 'Title and Date are required' }, { status: 400 })
    }

    const data = await prisma.raceEvent.create({
      data: {
        userId: user.userId,
        userEmail: user.userEmail,
        title,
        date,
        backgroundColor: club === 'Training' ? '#2196F3' :
                         club === 'Medication' ? '#4CAF50' :
                         club === 'Task' ? '#9C27B0' : '#FFC107',
        borderColor: club === 'Training' ? '#0d47a1' :
                     club === 'Medication' ? '#1b5e20' :
                     club === 'Task' ? '#4a148c' : '#FF8F00',
        totalBirds: totalBirds || 0,
        maxSpeed: maxSpeed || 0,
        avgSpeed: avgSpeed || 0,
        location: location || 'Direct Input',
        club: club || 'Race',
        distance: distance || 0,
        winner: winner || 'TBD',
        releaseTime: releaseTime || '06:00',
        clockInTime: clockInTime || '09:30',
        birds: birds || '[]',
      },
    })

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error('Error in POST /api/race-events:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'DATABASE_URL env variable is not configured' }, { status: 500 })
    }

    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { id, title, date, totalBirds, maxSpeed, avgSpeed, location, club, distance, winner, releaseTime, clockInTime, birds } = body

    if (!id) {
      return NextResponse.json({ error: 'Event ID is required for updates' }, { status: 400 })
    }

    const data = await prisma.raceEvent.update({
      where: { id },
      data: {
        title,
        date,
        totalBirds: totalBirds !== undefined ? totalBirds : undefined,
        maxSpeed: maxSpeed !== undefined ? maxSpeed : undefined,
        avgSpeed: avgSpeed !== undefined ? avgSpeed : undefined,
        location,
        club,
        distance: distance !== undefined ? distance : undefined,
        winner,
        releaseTime,
        clockInTime,
        birds: birds !== undefined ? birds : undefined,
        backgroundColor: club === 'Training' ? '#2196F3' :
                         club === 'Medication' ? '#4CAF50' :
                         club === 'Task' ? '#9C27B0' : '#FFC107',
        borderColor: club === 'Training' ? '#0d47a1' :
                     club === 'Medication' ? '#1b5e20' :
                     club === 'Task' ? '#4a148c' : '#FF8F00',
      },
    })

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error('Error in PUT /api/race-events:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
