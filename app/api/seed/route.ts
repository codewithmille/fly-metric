import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get('userId') || 'local-dev-user-id'
    const targetUserEmail = searchParams.get('email') || 'dev@example.com'

    // 1. Seed 10 Birds with authentic hatch dates & ages
    const birds = [
      {
        ringNo: 'PH-2026-88001',
        color: 'Blue Bar',
        name: 'Sky King',
        gender: 'Cock',
        strain: 'Janssen / Aarden',
        birthdate: '2026-10-06', // 1 month and 2 weeks
        status: 'Active',
        notes: 'Ace pigeon candidate. 1st place Dagupan Beach release.',
        rfidTag: '0007070841',
      },
      {
        ringNo: 'PH-2026-88002',
        color: 'Red Checker',
        name: 'Wind Racer',
        gender: 'Hen',
        strain: 'Van den Bulck',
        birthdate: '2026-10-27', // 3 weeks and 3 days
        status: 'Active',
        notes: 'Consistent top 5 clocked racer.',
        rfidTag: '0007070842',
      },
      {
        ringNo: 'PH-2026-88003',
        color: 'Silver Grizzle',
        name: 'Silver Arrow',
        gender: 'Cock',
        strain: 'Koopman',
        birthdate: '2026-11-15', // 5 days
        status: 'Active',
        notes: '1st place winner in Aparri Grand Classic 2026.',
        rfidTag: '0007070843',
      },
      {
        ringNo: 'PH-2026-88004',
        color: 'Pencil',
        name: 'Gold Wing',
        gender: 'Cock',
        strain: 'De Rauw-Sablon',
        birthdate: '2026-08-20', // 3 months
        status: 'Active',
        notes: 'High velocity specialist in long distance.',
        rfidTag: '0007070844',
      },
      {
        ringNo: 'PH-2026-88005',
        color: 'Dark Cheq',
        name: 'Dark Shadow',
        gender: 'Hen',
        strain: 'Heremans-Ceusters',
        birthdate: '2026-05-10', // 6 months
        status: 'Active',
        notes: 'Fast recovery and excellent navigation instincts.',
        rfidTag: '0007070845',
      },
      {
        ringNo: 'PH-2026-88006',
        color: 'Black',
        name: 'Storm Bringer',
        gender: 'Cock',
        strain: 'Bricoux',
        birthdate: '2026-02-14', // 9 months
        status: 'Active',
        notes: 'Headwind specialist in stormy weather conditions.',
        rfidTag: '0007070846',
      },
      {
        ringNo: 'PH-2026-88007',
        color: 'Blue Bar Pied',
        name: 'Lightning Jet',
        gender: 'Hen',
        strain: 'Gaby Vandenabeele',
        birthdate: '2025-08-10', // 1 year and 3 months
        status: 'Active',
        notes: 'Quick trapper on landing board pad sensor.',
        rfidTag: '0007070847',
      },
      {
        ringNo: 'PH-2026-88008',
        color: 'Pure White',
        name: 'White Cloud',
        gender: 'Hen',
        strain: 'Sion',
        birthdate: '2025-03-01', // 1 year and 8 months
        status: 'Active',
        notes: 'Strong homing endurance in tossing sessions.',
        rfidTag: '0007070848',
      },
      {
        ringNo: 'PH-2026-88009',
        color: 'Red Bar',
        name: 'Sonic Speed',
        gender: 'Cock',
        strain: 'Meulemans',
        birthdate: '2024-11-15', // 2 years
        status: 'Active',
        notes: 'High velocity sprinter for short to mid tosses.',
        rfidTag: '0007070849',
      },
      {
        ringNo: 'PH-2026-88010',
        color: 'Mealy',
        name: 'Alpha Leader',
        gender: 'Cock',
        strain: 'Stichelbaut',
        birthdate: '2026-11-01', // 2 weeks and 5 days
        status: 'Active',
        notes: 'Experienced veteran racer and breeding sire.',
        rfidTag: '0007070850',
      },
    ]

    for (const b of birds) {
      await prisma.loftBird.upsert({
        where: {
          userId_ringNo: {
            userId: targetUserId,
            ringNo: b.ringNo,
          },
        },
        update: {
          ...b,
          userEmail: targetUserEmail,
        },
        create: {
          ...b,
          userId: targetUserId,
          userEmail: targetUserEmail,
        },
      })
    }

    // 2. Seed Flight Events & Races
    const events = [
      {
        title: 'Aparri Grand Classic',
        date: '2026-07-07',
        backgroundColor: '#FFC107',
        borderColor: '#FF8F00',
        totalBirds: 8,
        maxSpeed: 1339,
        avgSpeed: 1255,
        location: 'Aparri Port, Cagayan',
        club: 'Race',
        distance: 520,
        winner: 'PH-2026-88003',
        releaseTime: '06:00',
        clockInTime: '12:28',
        isRfidActive: true,
        participatingBirds: JSON.stringify(birds.map(b => b.ringNo)),
        birds: JSON.stringify([
          { ringNo: 'PH-2026-88003', clockInTime: '11:58:10', speed: 1339 },
          { ringNo: 'PH-2026-88001', clockInTime: '12:02:15', speed: 1325 },
          { ringNo: 'PH-2026-88002', clockInTime: '12:08:30', speed: 1305 },
          { ringNo: 'PH-2026-88004', clockInTime: '12:15:00', speed: 1284 },
          { ringNo: 'PH-2026-88005', clockInTime: '12:22:45', speed: 1260 },
          { ringNo: 'PH-2026-88006', clockInTime: '12:35:00', speed: 1223 },
          { ringNo: 'PH-2026-88008', clockInTime: '12:52:15', speed: 1176 },
          { ringNo: 'PH-2026-88010', clockInTime: '13:10:00', speed: 1130 },
        ]),
      },
      {
        title: 'Vigan Club Race 1',
        date: '2026-06-28',
        backgroundColor: '#FFC107',
        borderColor: '#FF8F00',
        totalBirds: 6,
        maxSpeed: 1238,
        avgSpeed: 1164,
        location: 'Vigan Historic Plaza, Ilocos Sur',
        club: 'Race',
        distance: 320,
        winner: 'PH-2026-88002',
        releaseTime: '06:00',
        clockInTime: '10:55',
        isRfidActive: false,
        participatingBirds: JSON.stringify(birds.slice(0, 7).map(b => b.ringNo)),
        birds: JSON.stringify([
          { ringNo: 'PH-2026-88002', clockInTime: '10:18:20', speed: 1238 },
          { ringNo: 'PH-2026-88005', clockInTime: '10:24:40', speed: 1209 },
          { ringNo: 'PH-2026-88001', clockInTime: '10:31:10', speed: 1180 },
          { ringNo: 'PH-2026-88007', clockInTime: '10:42:00', speed: 1134 },
          { ringNo: 'PH-2026-88003', clockInTime: '10:55:30', speed: 1083 },
        ]),
      },
      {
        title: 'Dagupan Beach Training Toss',
        date: '2026-06-20',
        backgroundColor: '#2196F3',
        borderColor: '#0d47a1',
        totalBirds: 5,
        maxSpeed: 1301,
        avgSpeed: 1237,
        location: 'Dagupan Beach, Pangasinan',
        club: 'Training',
        distance: 180,
        winner: 'PH-2026-88001',
        releaseTime: '06:30',
        clockInTime: '09:05',
        isRfidActive: false,
        participatingBirds: JSON.stringify(birds.slice(0, 6).map(b => b.ringNo)),
        birds: JSON.stringify([
          { ringNo: 'PH-2026-88001', clockInTime: '08:48:15', speed: 1301 },
          { ringNo: 'PH-2026-88006', clockInTime: '08:52:00', speed: 1267 },
          { ringNo: 'PH-2026-88003', clockInTime: '08:56:45', speed: 1226 },
          { ringNo: 'PH-2026-88007', clockInTime: '09:05:30', speed: 1157 },
        ]),
      },
      {
        title: 'Tarlac Speed Toss 2',
        date: '2026-06-14',
        backgroundColor: '#2196F3',
        borderColor: '#0d47a1',
        totalBirds: 6,
        maxSpeed: 1275,
        avgSpeed: 1210,
        location: 'Tarlac City Release Point',
        club: 'Training',
        distance: 120,
        winner: 'PH-2026-88009',
        releaseTime: '07:00',
        clockInTime: '08:34',
        isRfidActive: false,
        participatingBirds: JSON.stringify(birds.slice(0, 8).map(b => b.ringNo)),
        birds: JSON.stringify([
          { ringNo: 'PH-2026-88009', clockInTime: '08:34:00', speed: 1275 },
          { ringNo: 'PH-2026-88004', clockInTime: '08:37:15', speed: 1234 },
          { ringNo: 'PH-2026-88001', clockInTime: '08:40:00', speed: 1200 },
        ]),
      },
      {
        title: 'Midseason Conditioning Toss',
        date: '2026-06-10',
        backgroundColor: '#2196F3',
        borderColor: '#0d47a1',
        totalBirds: 10,
        maxSpeed: 1190,
        avgSpeed: 1145,
        location: 'Urdaneta Bypass Road',
        club: 'Training',
        distance: 85,
        winner: 'PH-2026-88007',
        releaseTime: '07:30',
        clockInTime: '08:41',
        isRfidActive: false,
        participatingBirds: JSON.stringify(birds.map(b => b.ringNo)),
        birds: JSON.stringify([
          { ringNo: 'PH-2026-88007', clockInTime: '08:41:25', speed: 1190 },
          { ringNo: 'PH-2026-88002', clockInTime: '08:43:00', speed: 1164 },
          { ringNo: 'PH-2026-88008', clockInTime: '08:45:10', speed: 1130 },
        ]),
      },
    ]

    for (const ev of events) {
      const existing = await prisma.raceEvent.findFirst({
        where: {
          userId: targetUserId,
          title: ev.title,
          date: ev.date,
        },
      })
      if (existing) {
        await prisma.raceEvent.update({
          where: { id: existing.id },
          data: ev,
        })
      } else {
        await prisma.raceEvent.create({
          data: {
            ...ev,
            userId: targetUserId,
            userEmail: targetUserEmail,
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${birds.length} birds and ${events.length} flight events for ${targetUserId}!`,
      birdsCount: birds.length,
      eventsCount: events.length,
    })
  } catch (err: any) {
    console.error('Error in /api/seed:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
