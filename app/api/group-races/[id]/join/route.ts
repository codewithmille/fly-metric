import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  formatGroupRaceResponse,
  parseGroupRaceMeta,
  serializeGroupRacePayload,
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
    const { loftName, fancierName, birdRings, loftDistance } = body

    if (!loftName) {
      return NextResponse.json({ error: 'Loft name is required' }, { status: 400 })
    }

    // Find the master group race
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

    if (meta.raceStatus === 'completed' || meta.raceStatus === 'cut_off') {
      return NextResponse.json({ error: 'Basketing is closed for this race' }, { status: 400 })
    }

    const sanitizedBirds = Array.isArray(birdRings) ? birdRings : []
    const lofts = [...meta.loftEntries]

    // Upsert participant loft
    const existingIndex = lofts.findIndex((l) => l.loftId === user.userId)
    const loftEntry = {
      loftId: user.userId,
      loftName,
      fancierName: fancierName || user.userEmail.split('@')[0],
      fancierEmail: user.userEmail,
      birdRings: sanitizedBirds,
      loftDistance: Number(loftDistance) || groupRace.distance,
      joinedAt: new Date().toISOString(),
    }

    if (existingIndex >= 0) {
      lofts[existingIndex] = { ...lofts[existingIndex], ...loftEntry }
    } else {
      lofts.push(loftEntry)
    }

    // Calculate total entered birds across all lofts
    const totalEnrolledBirds = lofts.reduce((acc, curr) => acc + (curr.birdRings?.length || 0), 0)

    const updatedPayload = serializeGroupRacePayload({
      isGroupRace: true,
      joinCode: meta.joinCode,
      raceStatus: meta.raceStatus,
      loftEntries: lofts,
    })

    const updated = await prisma.raceEvent.update({
      where: { id: raceId },
      data: {
        participatingBirds: updatedPayload,
        totalBirds: totalEnrolledBirds,
      },
    })

    // Also sync/create a linked local race event for the participant's calendar if not organizer
    if (groupRace.userId !== user.userId && meta.joinCode) {
      const existingUserEvent = await prisma.raceEvent.findFirst({
        where: {
          userId: user.userId,
          participatingBirds: { contains: meta.joinCode },
        },
      })

      if (existingUserEvent) {
        await prisma.raceEvent.update({
          where: { id: existingUserEvent.id },
          data: {
            title: groupRace.title,
            date: groupRace.date,
            location: groupRace.location,
            distance: Number(loftDistance) || groupRace.distance,
            releaseTime: groupRace.releaseTime,
            participatingBirds: updatedPayload,
            totalBirds: sanitizedBirds.length,
          },
        })
      } else {
        await prisma.raceEvent.create({
          data: {
            userId: user.userId,
            userEmail: user.userEmail,
            title: groupRace.title,
            date: groupRace.date,
            location: groupRace.location,
            club: `${groupRace.club || 'Group'} [Joined]`,
            distance: Number(loftDistance) || groupRace.distance,
            releaseTime: groupRace.releaseTime,
            clockInTime: '09:30',
            winner: 'TBD',
            totalBirds: sanitizedBirds.length,
            maxSpeed: 0,
            avgSpeed: 0,
            backgroundColor: '#FFC107',
            borderColor: '#FF8F00',
            birds: '[]',
            participatingBirds: updatedPayload,
            isRfidActive: true,
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Enrolled ${sanitizedBirds.length} birds into ${groupRace.title}`,
      data: formatGroupRaceResponse(updated),
    })
  } catch (err: any) {
    console.error('Error in POST /api/group-races/[id]/join:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
