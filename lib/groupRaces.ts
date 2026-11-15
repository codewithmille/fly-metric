export interface LoftEntry {
  loftId: string
  loftName: string
  fancierName?: string
  fancierEmail?: string
  birdRings: string[]
  loftDistance?: number
  joinedAt: string
  isOrganizer?: boolean
}

export interface GroupArrival {
  ringNo: string
  birdName?: string
  color?: string
  clockInTime: string
  speed: number
  kph: number
  loftId: string
  loftName: string
  fancierName?: string
  method?: string
  clockedAt: string
}

export interface GroupRaceMeta {
  isGroupRace: boolean
  joinCode?: string
  raceStatus: 'basketing' | 'racing' | 'completed' | 'cut_off'
  loftEntries: LoftEntry[]
  groupArrivals: GroupArrival[]
}

export function parseGroupRaceMeta(row: any): GroupRaceMeta {
  let isGroupRace = false
  let joinCode: string | undefined = undefined
  let raceStatus: 'basketing' | 'racing' | 'completed' | 'cut_off' = 'basketing'
  let loftEntries: LoftEntry[] = []
  let groupArrivals: GroupArrival[] = []

  // 1. Check participatingBirds column
  if (row?.participatingBirds) {
    try {
      const parsed = JSON.parse(row.participatingBirds)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        if (parsed.isGroupRace) {
          isGroupRace = true
          joinCode = parsed.joinCode || joinCode
          raceStatus = parsed.raceStatus || raceStatus
          if (Array.isArray(parsed.loftEntries)) {
            loftEntries = parsed.loftEntries
          }
        }
      }
    } catch {}
  }

  // 2. Fallbacks if legacy or passed directly
  if (row?.isGroupRace) isGroupRace = true
  if (row?.joinCode) joinCode = row.joinCode
  if (row?.raceStatus) raceStatus = row.raceStatus
  if (row?.loftEntries) {
    try {
      const parsed = typeof row.loftEntries === 'string' ? JSON.parse(row.loftEntries) : row.loftEntries
      if (Array.isArray(parsed)) loftEntries = parsed
    } catch {}
  }

  // 3. Arrivals from row.birds or row.groupArrivals
  if (row?.birds) {
    try {
      const parsed = typeof row.birds === 'string' ? JSON.parse(row.birds) : row.birds
      if (Array.isArray(parsed)) groupArrivals = parsed
    } catch {}
  }
  if (row?.groupArrivals) {
    try {
      const parsed = typeof row.groupArrivals === 'string' ? JSON.parse(row.groupArrivals) : row.groupArrivals
      if (Array.isArray(parsed) && parsed.length > 0) groupArrivals = parsed
    } catch {}
  }

  return {
    isGroupRace,
    joinCode,
    raceStatus,
    loftEntries,
    groupArrivals,
  }
}

export function serializeGroupRacePayload(meta: {
  isGroupRace?: boolean
  joinCode?: string
  raceStatus?: string
  loftEntries?: LoftEntry[]
}) {
  return JSON.stringify({
    isGroupRace: meta.isGroupRace ?? true,
    joinCode: meta.joinCode,
    raceStatus: meta.raceStatus || 'basketing',
    loftEntries: meta.loftEntries || [],
  })
}

export function formatGroupRaceResponse(row: any) {
  const meta = parseGroupRaceMeta(row)
  return {
    ...row,
    isGroupRace: meta.isGroupRace,
    joinCode: meta.joinCode,
    raceStatus: meta.raceStatus,
    loftEntries: JSON.stringify(meta.loftEntries),
    groupArrivals: JSON.stringify(meta.groupArrivals),
    extendedProps: {
      ...(row.extendedProps || {}),
      totalBirds: row.totalBirds,
      maxSpeed: row.maxSpeed,
      avgSpeed: row.avgSpeed,
      location: row.location,
      club: row.club,
      distance: row.distance || 0,
      winner: row.winner || 'TBD',
      releaseTime: row.releaseTime || '06:00',
      clockInTime: row.clockInTime || '09:30',
      birds: row.birds || '[]',
      participatingBirds: row.participatingBirds || '[]',
      isRfidActive: !!row.isRfidActive,
      isGroupRace: meta.isGroupRace,
      joinCode: meta.joinCode,
      raceStatus: meta.raceStatus,
      loftEntries: JSON.stringify(meta.loftEntries),
      groupArrivals: JSON.stringify(meta.groupArrivals),
    },
  }
}
