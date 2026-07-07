'use client'

const CACHE_KEYS = {
  EVENTS: 'flymetric_events_cache',
  BIRDS: 'flymetric_birds_cache',
  SYNC_QUEUE: 'flymetric_sync_queue',
}

interface SyncItem {
  id: string
  action: 'POST' | 'PUT' | 'DELETE'
  endpoint: 'events' | 'birds'
  body?: any
}

// Check network status
export function isOnline(): boolean {
  if (typeof window === 'undefined') return true
  return navigator.onLine
}

// Custom ID generator (random UUID-like string)
export function generateLocalId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'local_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
}

// Get items from cache
function getCache(key: string): any[] {
  if (typeof window === 'undefined') return []
  const cached = localStorage.getItem(key)
  return cached ? JSON.parse(cached) : []
}

// Set items to cache
function setCache(key: string, data: any[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(data))
}

// Queue sync action
function queueSync(item: SyncItem) {
  if (typeof window === 'undefined') return
  const queue = getCache(CACHE_KEYS.SYNC_QUEUE)
  // Remove duplicates for same item to avoid double operations
  const filteredQueue = queue.filter(q => !(q.id === item.id && q.action === item.action))
  filteredQueue.push(item)
  setCache(CACHE_KEYS.SYNC_QUEUE, filteredQueue)
}

// API get events
export async function getEvents(authToken?: string): Promise<any[]> {
  const headers: HeadersInit = {}
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }

  if (isOnline()) {
    try {
      const res = await fetch('/api/race-events', { headers })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setCache(CACHE_KEYS.EVENTS, data)
          return data
        }
      }
    } catch (e) {
      console.warn('GET /api/race-events failed, loading from local database cache:', e)
    }
  }

  return getCache(CACHE_KEYS.EVENTS)
}

// API save event (create or update)
export async function saveEvent(authToken: string | undefined, eventData: any, isEdit: boolean): Promise<{ success: boolean; data: any }> {
  const localEvent = {
    ...eventData,
    id: eventData.id || generateLocalId(),
  }

  // Adjust structure to match what UI expects for display
  if (!localEvent.extendedProps && (eventData.totalBirds !== undefined || eventData.location !== undefined)) {
    localEvent.extendedProps = {
      totalBirds: eventData.totalBirds || 0,
      maxSpeed: eventData.maxSpeed || 0,
      avgSpeed: eventData.avgSpeed || 0,
      location: eventData.location || 'Direct Input',
      club: eventData.club || 'Race',
      distance: eventData.distance || 0,
      winner: eventData.winner || 'TBD',
      releaseTime: eventData.releaseTime || '06:00',
      clockInTime: eventData.clockInTime || '09:30',
      birds: eventData.birds || '[]',
    }
  }

  if (!isOnline()) {
    // Save to local cache immediately
    const cachedEvents = getCache(CACHE_KEYS.EVENTS)
    if (isEdit) {
      const idx = cachedEvents.findIndex((e: any) => e.id === localEvent.id)
      if (idx !== -1) cachedEvents[idx] = localEvent
    } else {
      cachedEvents.push(localEvent)
    }
    setCache(CACHE_KEYS.EVENTS, cachedEvents)

    // Add to sync queue
    queueSync({
      id: localEvent.id,
      action: isEdit ? 'PUT' : 'POST',
      endpoint: 'events',
      body: eventData,
    })

    return { success: true, data: localEvent }
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
  }

  try {
    const res = await fetch('/api/race-events', {
      method: isEdit ? 'PUT' : 'POST',
      headers,
      body: JSON.stringify(eventData),
    })

    const result = await res.json()
    if (!res.ok) throw new Error(result.error || 'Failed to save event')

    // Update local cache
    const savedData = result.data || localEvent
    const cachedEvents = getCache(CACHE_KEYS.EVENTS)
    if (isEdit) {
      const idx = cachedEvents.findIndex((e: any) => e.id === savedData.id)
      if (idx !== -1) cachedEvents[idx] = savedData
    } else {
      cachedEvents.push(savedData)
    }
    setCache(CACHE_KEYS.EVENTS, cachedEvents)

    return { success: true, data: savedData }
  } catch (e) {
    console.warn('Online save event failed, queuing for sync:', e)
    const cachedEvents = getCache(CACHE_KEYS.EVENTS)
    if (isEdit) {
      const idx = cachedEvents.findIndex((e: any) => e.id === localEvent.id)
      if (idx !== -1) cachedEvents[idx] = localEvent
    } else {
      cachedEvents.push(localEvent)
    }
    setCache(CACHE_KEYS.EVENTS, cachedEvents)

    queueSync({
      id: localEvent.id,
      action: isEdit ? 'PUT' : 'POST',
      endpoint: 'events',
      body: eventData,
    })

    return { success: true, data: localEvent }
  }
}

// API get birds
export async function getBirds(authToken?: string): Promise<any[]> {
  const headers: HeadersInit = {}
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }

  if (isOnline()) {
    try {
      const res = await fetch('/api/loft-birds', { headers })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setCache(CACHE_KEYS.BIRDS, data)
          return data
        }
      }
    } catch (e) {
      console.warn('GET /api/loft-birds failed, loading from local database cache:', e)
    }
  }

  return getCache(CACHE_KEYS.BIRDS)
}

// API save bird
export async function saveBird(authToken: string | undefined, birdData: any, isEdit: boolean): Promise<{ success: boolean; data: any }> {
  const localBird = {
    ...birdData,
    id: birdData.id || generateLocalId(),
  }

  if (!isOnline()) {
    const cachedBirds = getCache(CACHE_KEYS.BIRDS)
    if (isEdit) {
      const idx = cachedBirds.findIndex((b: any) => b.id === localBird.id)
      if (idx !== -1) cachedBirds[idx] = localBird
    } else {
      cachedBirds.push(localBird)
    }
    setCache(CACHE_KEYS.BIRDS, cachedBirds)

    queueSync({
      id: localBird.id,
      action: isEdit ? 'PUT' : 'POST',
      endpoint: 'birds',
      body: birdData,
    })

    return { success: true, data: localBird }
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
  }

  try {
    const res = await fetch('/api/loft-birds', {
      method: isEdit ? 'PUT' : 'POST',
      headers,
      body: JSON.stringify(birdData),
    })

    const result = await res.json()
    if (!res.ok) throw new Error(result.error || 'Failed to save bird')

    const savedData = result.data || localBird
    const cachedBirds = getCache(CACHE_KEYS.BIRDS)
    if (isEdit) {
      const idx = cachedBirds.findIndex((b: any) => b.id === savedData.id)
      if (idx !== -1) cachedBirds[idx] = savedData
    } else {
      cachedBirds.push(savedData)
    }
    setCache(CACHE_KEYS.BIRDS, cachedBirds)

    return { success: true, data: savedData }
  } catch (e) {
    console.warn('Online save bird failed, queuing for sync:', e)
    const cachedBirds = getCache(CACHE_KEYS.BIRDS)
    if (isEdit) {
      const idx = cachedBirds.findIndex((b: any) => b.id === localBird.id)
      if (idx !== -1) cachedBirds[idx] = localBird
    } else {
      cachedBirds.push(localBird)
    }
    setCache(CACHE_KEYS.BIRDS, cachedBirds)

    queueSync({
      id: localBird.id,
      action: isEdit ? 'PUT' : 'POST',
      endpoint: 'birds',
      body: birdData,
    })

    return { success: true, data: localBird }
  }
}

// API delete bird
export async function deleteBird(authToken: string | undefined, birdId: string): Promise<{ success: boolean }> {
  if (!isOnline()) {
    const cachedBirds = getCache(CACHE_KEYS.BIRDS)
    const filteredBirds = cachedBirds.filter((b: any) => b.id !== birdId)
    setCache(CACHE_KEYS.BIRDS, filteredBirds)

    queueSync({
      id: birdId,
      action: 'DELETE',
      endpoint: 'birds',
    })

    return { success: true }
  }

  const headers = {
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
  }

  try {
    const res = await fetch(`/api/loft-birds?id=${birdId}`, {
      method: 'DELETE',
      headers,
    })

    if (!res.ok) {
      const result = await res.json()
      throw new Error(result.error || 'Failed to delete bird')
    }

    const cachedBirds = getCache(CACHE_KEYS.BIRDS)
    const filteredBirds = cachedBirds.filter((b: any) => b.id !== birdId)
    setCache(CACHE_KEYS.BIRDS, filteredBirds)

    return { success: true }
  } catch (e) {
    console.warn('Online delete bird failed, queuing for sync:', e)
    const cachedBirds = getCache(CACHE_KEYS.BIRDS)
    const filteredBirds = cachedBirds.filter((b: any) => b.id !== birdId)
    setCache(CACHE_KEYS.BIRDS, filteredBirds)

    queueSync({
      id: birdId,
      action: 'DELETE',
      endpoint: 'birds',
    })

    return { success: true }
  }
}

// Synchronize queue
export async function syncOfflineQueue(authToken?: string): Promise<boolean> {
  if (!isOnline() || !authToken) return false
  const queue = getCache(CACHE_KEYS.SYNC_QUEUE)
  if (queue.length === 0) return true

  console.log(`Starting sync of ${queue.length} items to database…`)
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`,
  }

  const failedItems: SyncItem[] = []

  for (const item of queue) {
    try {
      if (item.endpoint === 'events') {
        const url = '/api/race-events'
        if (item.action === 'DELETE') {
          await fetch(`${url}?id=${item.id}`, { method: 'DELETE', headers })
        } else {
          const res = await fetch(url, {
            method: item.action,
            headers,
            body: JSON.stringify(item.body),
          })
          if (!res.ok) {
            const data = await res.json()
            throw new Error(data.error || 'Sync event failed')
          }
        }
      } else if (item.endpoint === 'birds') {
        const url = '/api/loft-birds'
        if (item.action === 'DELETE') {
          await fetch(`${url}?id=${item.id}`, { method: 'DELETE', headers })
        } else {
          const res = await fetch(url, {
            method: item.action,
            headers,
            body: JSON.stringify(item.body),
          })
          if (!res.ok) {
            const data = await res.json()
            const errText = data.error || ''
            if (res.status === 409 || errText.toLowerCase().includes('already registered')) {
              console.log(`Bird with Ring No. "${item.body?.ringNo}" is already registered, resolving sync queue entry successfully.`)
            } else {
              throw new Error(errText || 'Sync bird failed')
            }
          }
        }
      }
    } catch (e) {
      console.error(`Failed to sync item ${item.id}:`, e)
      failedItems.push(item)
    }
  }

  setCache(CACHE_KEYS.SYNC_QUEUE, failedItems)
  return failedItems.length === 0
}
