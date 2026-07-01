'use client'

import { useState, useEffect, useRef } from 'react'
import { BirdIcon, PlusIcon, TagIcon, NotesIcon, NameIcon, DnaIcon, TrashIcon } from '@/components/icons'

interface LoftBird {
  id: string
  ringNo: string
  color: string
  name: string | null
  gender: string | null
  createdAt: string
}

interface BirdRegistryModalProps {
  isOpen: boolean
  onClose: () => void
  onBirdsUpdated?: () => void
  authToken?: string
}

export default function BirdRegistryModal({
  isOpen,
  onClose,
  onBirdsUpdated,
  authToken,
}: BirdRegistryModalProps) {
  const [birds, setBirds] = useState<LoftBird[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Form states
  const [ringNo, setRingNo] = useState('')
  const [color, setColor] = useState('')
  const [name, setName] = useState('')
  const [gender, setGender] = useState('Unknown')

  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const modalRef = useRef<HTMLDivElement>(null)

  const fetchBirds = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/loft-birds', {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      })
      const data = await res.json()
      if (Array.isArray(data)) {
        setBirds(data)
      }
    } catch (e) {
      console.error('Error fetching birds:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchBirds()
      setRingNo('')
      setColor('')
      setName('')
      setGender('Unknown')
      setError('')
      setSaveSuccess(false)
      modalRef.current?.focus()
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (!isOpen) return null

  const handleRegisterBird = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaveSuccess(false)

    if (!ringNo.trim()) {
      setError('Ring Number is required.')
      return
    }

    if (!color.trim()) {
      setError('Color is required (e.g. Blue Bar, Red Checker).')
      return
    }

    setSaving(true)

    try {
      const response = await fetch('/api/loft-birds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          ringNo: ringNo.trim(),
          color: color.trim(),
          name: name.trim() || undefined,
          gender,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to register bird')
      }

      setSaveSuccess(true)
      setRingNo('')
      setColor('')
      setName('')
      setGender('Unknown')
      
      // Refresh registry list
      fetchBirds()
      onBirdsUpdated?.()

      setTimeout(() => {
        setSaveSuccess(false)
      }, 1500)

    } catch (err: any) {
      setError(err.message || 'An error occurred.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteBird = async (id: string) => {
    if (!confirm('Are you sure you want to remove this bird from your loft registry?')) return

    try {
      const response = await fetch(`/api/loft-birds?id=${id}`, {
        method: 'DELETE',
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      })
      if (!response.ok) {
        throw new Error('Failed to delete bird')
      }
      fetchBirds()
      onBirdsUpdated?.()
    } catch (e: any) {
      alert(e.message || 'Error deleting bird')
    }
  }

  const filteredBirds = birds.filter((b) => {
    const query = searchQuery.toLowerCase()
    return (
      b.ringNo.toLowerCase().includes(query) ||
      b.color.toLowerCase().includes(query) ||
      (b.name && b.name.toLowerCase().includes(query))
    )
  })

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div
        className="modal-container"
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="registry-title"
        style={{ maxWidth: '640px' }}
      >
        {/* Header */}
        <div className="modal-header" style={{ background: 'linear-gradient(135deg, #4CAF50, #2E7D32)' }}>
          <div className="modal-header-left">
            <span className="modal-pigeon-icon" style={{ display: 'flex', alignItems: 'center', color: '#fff' }}>
              <BirdIcon size={24} />
            </span>
            <div>
              <h2 id="registry-title" className="modal-title" style={{ color: '#fff' }}>Loft Bird Registry</h2>
              <p className="modal-subtitle" style={{ color: 'rgba(255,255,255,0.75)' }}>Manage your pigeons and colors</p>
            </div>
          </div>
          <button className="modal-close-btn" style={{ color: '#fff', background: 'rgba(255,255,255,0.15)' }} onClick={onClose} aria-label="Close modal">✕</button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
          
          {/* Add Bird Form */}
          <form onSubmit={handleRegisterBird} style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: '0.75rem',
            padding: '1rem',
            marginBottom: '1.25rem'
          }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <PlusIcon size={16} /> Register New Bird
            </h3>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="reg-ring" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <TagIcon size={14} /> Ring Number
                </label>
                <input
                  id="reg-ring"
                  type="text"
                  placeholder="e.g. PH-2026-1001"
                  className="form-input"
                  value={ringNo}
                  onChange={(e) => setRingNo(e.target.value)}
                  style={{ height: '2.3rem', fontSize: '0.82rem' }}
                />
              </div>
              <div className="form-group">
                <label htmlFor="reg-color" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <NotesIcon size={14} /> Color
                </label>
                <input
                  id="reg-color"
                  type="text"
                  placeholder="e.g. Blue Bar / Red Checker"
                  className="form-input"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  style={{ height: '2.3rem', fontSize: '0.82rem' }}
                />
              </div>
            </div>

            <div className="form-row" style={{ marginTop: '0.5rem' }}>
              <div className="form-group">
                <label htmlFor="reg-name" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <NameIcon size={14} /> Name / Alias (Optional)
                </label>
                <input
                  id="reg-name"
                  type="text"
                  placeholder="e.g. Super Fast"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ height: '2.3rem', fontSize: '0.82rem' }}
                />
              </div>
              <div className="form-group">
                <label htmlFor="reg-gender" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <DnaIcon size={14} /> Gender
                </label>
                <select
                  id="reg-gender"
                  className="form-input"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  style={{ height: '2.3rem', fontSize: '0.82rem', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                >
                  <option value="Cock">Cock (Male)</option>
                  <option value="Hen">Hen (Female)</option>
                  <option value="Unknown">Unknown</option>
                </select>
              </div>
            </div>

            {error && <div className="form-error" style={{ marginTop: '0.5rem' }}>{error}</div>}
            {saveSuccess && (
              <div style={{
                background: 'rgba(63, 185, 80, 0.1)',
                border: '1px solid rgba(63, 185, 80, 0.3)',
                borderRadius: '0.5rem',
                padding: '0.5rem',
                color: 'var(--color-success)',
                textAlign: 'center',
                fontSize: '0.82rem',
                fontWeight: 600,
                marginTop: '0.5rem'
              }}>
                Bird Registered Successfully!
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="btn-primary"
              style={{
                marginTop: '0.75rem',
                width: '100%',
                height: '2.3rem',
                background: '#4CAF50',
                color: '#fff',
                fontSize: '0.82rem',
                fontWeight: 700,
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer'
              }}
            >
              {saving ? 'Registering...' : 'Register Bird'}
            </button>
          </form>

          {/* Search & List */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <BirdIcon size={16} /> Registered Birds ({birds.length})
              </h3>
              <input
                type="text"
                placeholder="Search ring, color, name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '180px',
                  height: '1.8rem',
                  fontSize: '0.75rem',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '0.375rem',
                  border: '1px solid var(--border-default)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            {loading && birds.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Loading registered birds…
              </div>
            ) : filteredBirds.length === 0 ? (
              <div style={{
                padding: '2rem',
                textAlign: 'center',
                background: 'var(--bg-surface)',
                borderRadius: '0.5rem',
                border: '1px dashed var(--border-default)',
                color: 'var(--text-secondary)',
                fontSize: '0.82rem'
              }}>
                No birds found in registry. Add your first bird above!
              </div>
            ) : (
              <div style={{
                border: '1px solid var(--border-default)',
                borderRadius: '0.5rem',
                background: 'var(--bg-card)',
                maxHeight: '220px',
                overflowY: 'auto'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '0.5rem 0.75rem', fontWeight: 700 }}>Ring Number</th>
                      <th style={{ padding: '0.5rem 0.75rem', fontWeight: 700 }}>Color</th>
                      <th style={{ padding: '0.5rem 0.75rem', fontWeight: 700 }}>Name</th>
                      <th style={{ padding: '0.5rem 0.75rem', fontWeight: 700, textAlign: 'center', width: '4rem' }}>Gender</th>
                      <th style={{ padding: '0.5rem 0.75rem', fontWeight: 700, textAlign: 'center', width: '3rem' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBirds.map((bird) => (
                      <tr key={bird.id} style={{ borderBottom: '1px solid var(--border-default)' }}>
                        <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{bird.ringNo}</td>
                        <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-secondary)' }}>{bird.color}</td>
                        <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-secondary)' }}>{bird.name || '—'}</td>
                        <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                          {bird.gender === 'Cock' ? 'Cock' : bird.gender === 'Hen' ? 'Hen' : '—'}
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleDeleteBird(bird.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--color-error)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: 0
                            }}
                            title="Delete bird"
                          >
                            <TrashIcon size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
