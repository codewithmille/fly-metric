import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''

const isLocalhost = (typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) ||
  process.env.NODE_ENV === 'development'

const initialMockSession = {
  access_token: 'mock-token-local-dev',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: 'mock-refresh-token',
  user: {
    id: 'local-dev-user-id',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'dev@example.com',
    email_confirmed_at: new Date().toISOString(),
    phone: '',
    confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    app_metadata: { provider: 'google', providers: ['google'] },
    user_metadata: {
      avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
      full_name: 'Local Dev Fancier',
      loft_name: 'Local Dev Loft',
      loft_latitude: 14.5995,
      loft_longitude: 120.9842,
    },
    identities: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

let mockSession: any = null
if (isLocalhost) {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('supabase_mock_session')
    if (stored) {
      try {
        mockSession = JSON.parse(stored)
      } catch {
        mockSession = { ...initialMockSession }
      }
    } else {
      mockSession = { ...initialMockSession }
      localStorage.setItem('supabase_mock_session', JSON.stringify(mockSession))
    }
  } else {
    mockSession = { ...initialMockSession }
  }
}

const listeners = new Set<(event: string, session: any) => void>()

const mockAuth = {
  async getSession() {
    return { data: { session: mockSession }, error: null }
  },
  async getUser() {
    return { data: { user: mockSession?.user || null }, error: null }
  },
  onAuthStateChange(callback: (event: string, session: any) => void) {
    listeners.add(callback)
    callback(mockSession ? 'SIGNED_IN' : 'SIGNED_OUT', mockSession)
    return {
      data: {
        subscription: {
          unsubscribe() {
            listeners.delete(callback)
          }
        }
      }
    }
  },
  async signInWithOAuth(options?: any) {
    mockSession = { ...initialMockSession }
    if (typeof window !== 'undefined') {
      localStorage.setItem('supabase_mock_session', JSON.stringify(mockSession))
    }
    listeners.forEach(cb => cb('SIGNED_IN', mockSession))
    return { data: { provider: options?.provider || 'google', url: '/' }, error: null }
  },
  async signOut() {
    mockSession = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('supabase_mock_session')
    }
    listeners.forEach(cb => cb('SIGNED_OUT', null))
    return { error: null }
  },
  async updateUser(attributes: { data?: any }) {
    if (mockSession && mockSession.user) {
      mockSession.user.user_metadata = {
        ...mockSession.user.user_metadata,
        ...attributes.data
      }
      mockSession.user.updated_at = new Date().toISOString()
      if (typeof window !== 'undefined') {
        localStorage.setItem('supabase_mock_session', JSON.stringify(mockSession))
      }
      listeners.forEach(cb => cb('USER_UPDATED', mockSession))
    }
    return { data: { user: mockSession?.user || null }, error: null }
  }
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase env variables are missing. Falling back to mock data.')
}

const realClient = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : {} as any

export const supabase: SupabaseClient = new Proxy(realClient, {
  get(target, prop, receiver) {
    if (prop === 'auth' && isLocalhost) {
      return mockAuth as any
    }
    return Reflect.get(target, prop, receiver)
  }
}) as unknown as SupabaseClient


