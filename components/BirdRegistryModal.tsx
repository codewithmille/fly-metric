'use client'

import { useState, useEffect, useRef } from 'react'
import { BirdIcon, PlusIcon, TagIcon, NotesIcon, NameIcon, DnaIcon, TrashIcon, CalendarIcon } from '@/components/icons'
import { getBirds, saveBird, deleteBird } from '@/lib/apiClient'

interface LoftBird {
  id: string
  ringNo: string
  color: string
  name: string | null
  gender: string | null
  birthdate?: string | null
  strain?: string | null
  status?: string | null
  notes?: string | null
  sire?: string | null
  dam?: string | null
  createdAt: string
}

interface BirdRegistryModalProps {
  isOpen: boolean
  onClose: () => void
  onBirdsUpdated?: () => void
  authToken?: string
  events?: any[]
}

export default function BirdRegistryModal({
  isOpen,
  onClose,
  onBirdsUpdated,
  authToken,
  events = [],
}: BirdRegistryModalProps) {
  const [birds, setBirds] = useState<LoftBird[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Sub-modal toggle states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedBird, setSelectedBird] = useState<LoftBird | null>(null)

  // Form states (Register)
  const [ringNo, setRingNo] = useState('')
  const [color, setColor] = useState('')
  const [name, setName] = useState('')
  const [gender, setGender] = useState('Unknown')
  const [birthdate, setBirthdate] = useState('')
  const [strain, setStrain] = useState('')
  const [status, setStatus] = useState('Active')
  const [notes, setNotes] = useState('')
  const [sire, setSire] = useState('')
  const [dam, setDam] = useState('')
  const [showPedigree, setShowPedigree] = useState(false)

  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Form states (Edit)
  const [editRingNo, setEditRingNo] = useState('')
  const [editColor, setEditColor] = useState('')
  const [editName, setEditName] = useState('')
  const [editGender, setEditGender] = useState('Unknown')
  const [editBirthdate, setEditBirthdate] = useState('')
  const [editStrain, setEditStrain] = useState('')
  const [editStatus, setEditStatus] = useState('Active')
  const [editNotes, setEditNotes] = useState('')
  const [editSire, setEditSire] = useState('')
  const [editDam, setEditDam] = useState('')

  const [editError, setEditError] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editSuccess, setEditSuccess] = useState(false)

  const modalRef = useRef<HTMLDivElement>(null)

  const fetchBirds = async () => {
    try {
      setLoading(true)
      const data = await getBirds(authToken)
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
      resetRegisterForm()
      setSelectedBird(null)
      setIsAddModalOpen(false)
      setError('')
      setSaveSuccess(false)
      modalRef.current?.focus()
    }
  }, [isOpen])

  // Sync edit form states when selected bird changes
  useEffect(() => {
    if (selectedBird) {
      setEditRingNo(selectedBird.ringNo || '')
      setEditColor(selectedBird.color || '')
      setEditName(selectedBird.name || '')
      setEditGender(selectedBird.gender || 'Unknown')
      setEditBirthdate(selectedBird.birthdate || '')
      setEditStrain(selectedBird.strain || '')
      setEditStatus(selectedBird.status || 'Active')
      setEditNotes(selectedBird.notes || '')
      setEditSire(selectedBird.sire || '')
      setEditDam(selectedBird.dam || '')
      setEditError('')
      setEditSuccess(false)
    }
  }, [selectedBird])

  const resetRegisterForm = () => {
    setRingNo('')
    setColor('')
    setName('')
    setGender('Unknown')
    setBirthdate('')
    setStrain('')
    setStatus('Active')
    setNotes('')
    setSire('')
    setDam('')
    setShowPedigree(false)
    setError('')
  }

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
      setError('Color is required.')
      return
    }

    setSaving(true)

    try {
      const res = await saveBird(authToken, {
        ringNo: ringNo.trim().toUpperCase(),
        color: color.trim(),
        name: name.trim() || undefined,
        gender,
        birthdate: birthdate || undefined,
        strain: strain.trim() || undefined,
        status: status,
        notes: notes.trim() || undefined,
        sire: sire.trim().toUpperCase() || undefined,
        dam: dam.trim().toUpperCase() || undefined,
      }, false)

      if (!res.success) {
        throw new Error('Failed to register bird')
      }

      setSaveSuccess(true)
      resetRegisterForm()
      
      // Refresh registry list
      fetchBirds()
      onBirdsUpdated?.()

      setTimeout(() => {
        setSaveSuccess(false)
        setIsAddModalOpen(false)
      }, 1200)

    } catch (err: any) {
      setError(err.message || 'An error occurred.')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateBird = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditError('')
    setEditSuccess(false)
    if (!selectedBird) return

    if (!editRingNo.trim()) {
      setEditError('Ring Number is required.')
      return
    }

    if (!editColor.trim()) {
      setEditError('Color is required.')
      return
    }

    setEditSaving(true)

    try {
      const res = await saveBird(authToken, {
        id: selectedBird.id,
        ringNo: editRingNo.trim().toUpperCase(),
        color: editColor.trim(),
        name: editName.trim() || null,
        gender: editGender,
        birthdate: editBirthdate || null,
        strain: editStrain.trim() || null,
        status: editStatus,
        notes: editNotes.trim() || null,
        sire: editSire.trim().toUpperCase() || null,
        dam: editDam.trim().toUpperCase() || null,
      }, true)

      if (!res.success) {
        throw new Error('Failed to update bird')
      }

      setEditSuccess(true)
      
      // Refresh registry list
      fetchBirds()
      onBirdsUpdated?.()

      // Update selected bird locally to refresh values in UI
      setSelectedBird(res.data)

      setTimeout(() => {
        setEditSuccess(false)
      }, 1200)

    } catch (err: any) {
      setEditError(err.message || 'An error occurred.')
    } finally {
      setEditSaving(false)
    }
  }

  const handleDeleteBird = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent selecting the bird row when deleting
    if (!confirm('Are you sure you want to remove this bird from your loft registry?')) return

    try {
      const res = await deleteBird(authToken, id)
      if (!res.success) {
        throw new Error('Failed to delete bird')
      }
      if (selectedBird?.id === id) {
        setSelectedBird(null)
      }
      fetchBirds()
      onBirdsUpdated?.()
    } catch (e: any) {
      alert(e.message || 'Error deleting bird')
    }
  }

  const getBirdHistory = (targetRing: string) => {
    const history: Array<{
      eventId: string
      date: string
      title: string
      type: 'Race' | 'Training'
      location: string
      distance: number
      clockInTime: string
      speed: number
      rank: number
      totalClocked: number
    }> = []

    if (!Array.isArray(events)) return history

    events.forEach((ev) => {
      try {
        const birdsList: any[] = JSON.parse(ev.extendedProps?.birds || '[]')
        birdsList.sort((a, b) => b.speed - a.speed)
        
        const idx = birdsList.findIndex(b => b.ringNo.toUpperCase() === targetRing.toUpperCase())
        if (idx !== -1) {
          const matchedBird = birdsList[idx]
          history.push({
            eventId: ev.id,
            date: ev.date,
            title: ev.title,
            type: (ev.extendedProps?.club as 'Race' | 'Training') || 'Race',
            location: ev.extendedProps?.location || 'No location',
            distance: ev.extendedProps?.distance || 0,
            clockInTime: matchedBird.clockInTime,
            speed: matchedBird.speed,
            rank: idx + 1,
            totalClocked: birdsList.length
          })
        }
      } catch (err) {
        console.error(err)
      }
    })

    return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  const filteredBirds = birds.filter((b) => {
    const query = searchQuery.toLowerCase()
    return (
      b.ringNo.toLowerCase().includes(query) ||
      b.color.toLowerCase().includes(query) ||
      (b.name && b.name.toLowerCase().includes(query)) ||
      (b.strain && b.strain.toLowerCase().includes(query))
    )
  })

  const historyLogs = selectedBird ? getBirdHistory(selectedBird.ringNo) : []

  return (
    <>
      <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
        <div
          className="modal-container"
          ref={modalRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="registry-title"
          style={{ maxWidth: '640px', width: '95vw', padding: 0 }}
        >
          {/* Header */}
          <div className="modal-header" style={{ background: 'linear-gradient(135deg, #4CAF50, #2E7D32)', padding: '0.9rem 1.2rem' }}>
            <div className="modal-header-left">
              <span className="modal-pigeon-icon" style={{ display: 'flex', alignItems: 'center', color: '#fff' }}>
                <BirdIcon size={24} />
              </span>
              <div>
                <h2 id="registry-title" className="modal-title" style={{ color: '#fff', fontSize: '1.1rem' }}>Loft Bird Registry</h2>
                <p className="modal-subtitle" style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.7rem' }}>View, manage, and edit your pigeon database</p>
              </div>
            </div>
            <button className="modal-close-btn" style={{ color: '#fff', background: 'rgba(255,255,255,0.15)', position: 'static', margin: 0 }} onClick={onClose} aria-label="Close modal">✕</button>
          </div>

          {/* Body — Simple List Layout */}
          <div className="modal-body modal-scroll-body" style={{ 
            maxHeight: '75dvh', 
            overflowY: 'auto', 
            display: 'flex', 
            flexDirection: 'column', 
            padding: '1.25rem', 
            gap: '1rem' 
          }}>
            
            {/* Search, Action row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.50rem' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                <BirdIcon size={16} /> Registered Birds ({birds.length})
              </h3>
              
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Search pigeons..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '150px',
                    height: '1.8rem',
                    fontSize: '0.75rem',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '0.375rem',
                    border: '1px solid var(--border-default)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-primary)'
                  }}
                />
                
                <button
                  type="button"
                  onClick={() => {
                    resetRegisterForm()
                    setIsAddModalOpen(true)
                  }}
                  style={{
                    background: '#4CAF50',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '0.375rem',
                    padding: '0.2rem 0.6rem',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    height: '1.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <PlusIcon size={12} /> Register Pigeon
                </button>
              </div>
            </div>

            {loading && birds.length === 0 ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                Loading registered birds…
              </div>
            ) : filteredBirds.length === 0 ? (
              <div style={{
                padding: '3rem 1rem',
                textAlign: 'center',
                background: 'var(--bg-surface)',
                borderRadius: '0.5rem',
                border: '1px dashed var(--border-default)',
                color: 'var(--text-secondary)',
                fontSize: '0.8rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <div>No birds found in registry. Add your first bird profile now!</div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  style={{
                    background: '#4CAF50',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '0.375rem',
                    padding: '0.35rem 0.88rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  + Register Your First Pigeon
                </button>
              </div>
            ) : (
              <div style={{
                border: '1px solid var(--border-default)',
                borderRadius: '0.5rem',
                background: 'var(--bg-card)',
                maxHeight: '420px',
                overflowY: 'auto'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-default)', color: 'var(--text-secondary)', position: 'sticky', top: 0, zIndex: 10 }}>
                      <th style={{ padding: '0.5rem 0.75rem', fontWeight: 700 }}>Ring Number</th>
                      <th style={{ padding: '0.5rem 0.75rem', fontWeight: 700 }}>Breed/Strain</th>
                      <th style={{ padding: '0.5rem 0.75rem', fontWeight: 700, width: '3.5rem', textAlign: 'center' }}>Sex</th>
                      <th style={{ padding: '0.5rem 0.75rem', fontWeight: 700, width: '4.5rem', textAlign: 'center' }}>Status</th>
                      <th style={{ padding: '0.5rem 0.75rem', fontWeight: 700, width: '2.5rem', textAlign: 'center' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBirds.map((bird) => (
                      <tr 
                        key={bird.id} 
                        onClick={() => setSelectedBird(bird)}
                        style={{ 
                          borderBottom: '1px solid var(--border-default)', 
                          cursor: 'pointer',
                          background: selectedBird?.id === bird.id ? 'rgba(33, 150, 243, 0.08)' : 'transparent',
                          transition: 'all 0.15s ease'
                        }}
                        className="table-row-hover"
                      >
                        <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-primary)' }}>
                          <div style={{ fontWeight: 700 }}>{bird.ringNo}</div>
                          {bird.name && <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{bird.name}</div>}
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-secondary)' }}>
                          {bird.strain || '—'}
                          <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)' }}>{bird.color}</div>
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                          <span style={{
                            padding: '0.08rem 0.3rem',
                            borderRadius: '3px',
                            fontSize: '0.65rem',
                            background: bird.gender === 'Hen' ? 'rgba(233, 30, 99, 0.12)' : bird.gender === 'Cock' ? 'rgba(33, 150, 243, 0.12)' : 'rgba(255,255,255,0.05)',
                            color: bird.gender === 'Hen' ? '#E91E63' : bird.gender === 'Cock' ? '#2196F3' : 'var(--text-muted)'
                          }}>
                            {bird.gender === 'Hen' ? 'Hen' : bird.gender === 'Cock' ? 'Cock' : '—'}
                          </span>
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                          <span style={{
                            padding: '0.08rem 0.3rem',
                            borderRadius: '3px',
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            background: bird.status === 'Active' ? 'rgba(76, 175, 80, 0.12)' : bird.status === 'Breeding' ? 'rgba(156, 39, 176, 0.12)' : 'rgba(255,255,255,0.06)',
                            color: bird.status === 'Active' ? '#4CAF50' : bird.status === 'Breeding' ? '#E040FB' : 'var(--text-secondary)'
                          }}>
                            {bird.status || 'Active'}
                          </span>
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteBird(bird.id, e)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'rgba(239, 68, 68, 0.6)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: 0
                            }}
                            title="Delete bird"
                          >
                            <TrashIcon size={14} />
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

      {/* Floating Sub-modal for Registering New Pigeon */}
      {isAddModalOpen && (
        <div 
          className="modal-backdrop modal-floating" 
          style={{ zIndex: 12000 }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsAddModalOpen(false) }}
        >
          <div 
            className="modal-container" 
            style={{ maxWidth: '480px', padding: 0 }}
          >
            <div className="modal-header" style={{ background: 'linear-gradient(135deg, #4CAF50, #2E7D32)', padding: '0.9rem 1.2rem' }}>
              <div className="modal-header-left">
                <span style={{ color: '#fff', display: 'flex', alignItems: 'center' }}>
                  <PlusIcon size={18} />
                </span>
                <h2 className="modal-title" style={{ color: '#fff', fontSize: '1rem', fontWeight: 800 }}>
                  Register New Pigeon
                </h2>
              </div>
              <button 
                type="button"
                className="modal-close-btn" 
                style={{ color: '#fff', background: 'rgba(255,255,255,0.15)', position: 'static', margin: 0 }} 
                onClick={() => setIsAddModalOpen(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-body modal-scroll-body" style={{ padding: '1.25rem', maxHeight: '72dvh', overflowY: 'auto' }}>
              <form onSubmit={handleRegisterBird} style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: '0.75rem',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="reg-ring" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem' }}>
                      <TagIcon size={12} /> Ring Number
                    </label>
                    <input
                      id="reg-ring"
                      type="text"
                      placeholder="e.g. PH-2026-1001"
                      className="form-input"
                      value={ringNo}
                      onChange={(e) => setRingNo(e.target.value)}
                      style={{ height: '2.2rem', fontSize: '0.8rem' }}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="reg-color" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem' }}>
                      <NotesIcon size={12} /> Color
                    </label>
                    <input
                      id="reg-color"
                      type="text"
                      placeholder="e.g. Blue Bar"
                      className="form-input"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      style={{ height: '2.2rem', fontSize: '0.8rem' }}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="reg-name" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem' }}>
                      <NameIcon size={12} /> Name / Alias (Optional)
                    </label>
                    <input
                      id="reg-name"
                      type="text"
                      placeholder="e.g. Super Fast"
                      className="form-input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      style={{ height: '2.2rem', fontSize: '0.8rem' }}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="reg-gender" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem' }}>
                      <DnaIcon size={12} /> Gender
                    </label>
                    <select
                      id="reg-gender"
                      className="form-input"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      style={{ height: '2.2rem', fontSize: '0.8rem', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                    >
                      <option value="Cock">Cock (Male)</option>
                      <option value="Hen">Hen (Female)</option>
                      <option value="Unknown">Unknown</option>
                    </select>
                  </div>
                </div>

                {/* Toggle Advanced pedigree */}
                <button
                  type="button"
                  onClick={() => setShowPedigree(!showPedigree)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--brand-gold)',
                    fontWeight: 600,
                    fontSize: '0.72rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    padding: '0.2rem 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    width: 'fit-content'
                  }}
                >
                  {showPedigree ? '▼ Hide Pedigree Details (Optional)' : '▶ Show Pedigree Details (Optional)'}
                </button>

                {showPedigree && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px dashed var(--border-default)', paddingTop: '0.75rem', marginTop: '0.1rem' }}>
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="reg-birthdate" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem' }}>
                          <CalendarIcon size={12} /> Hatch Date
                        </label>
                        <input
                          id="reg-birthdate"
                          type="date"
                          className="form-input"
                          value={birthdate}
                          onChange={(e) => setBirthdate(e.target.value)}
                          style={{ height: '2.2rem', fontSize: '0.8rem', colorScheme: 'dark' }}
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="reg-strain" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem' }}>
                          <DnaIcon size={12} /> Strain / Breed
                        </label>
                        <input
                          id="reg-strain"
                          type="text"
                          placeholder="e.g. Janssen / Arden"
                          className="form-input"
                          value={strain}
                          onChange={(e) => setStrain(e.target.value)}
                          style={{ height: '2.2rem', fontSize: '0.8rem' }}
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="reg-sire" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem' }}>
                          Sire (Father Ring)
                        </label>
                        <input
                          id="reg-sire"
                          type="text"
                          placeholder="e.g. PH-2024-5020"
                          className="form-input"
                          value={sire}
                          onChange={(e) => setSire(e.target.value)}
                          style={{ height: '2.2rem', fontSize: '0.8rem' }}
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="reg-dam" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem' }}>
                          Dam (Mother Ring)
                        </label>
                        <input
                          id="reg-dam"
                          type="text"
                          placeholder="e.g. PH-2024-3011"
                          className="form-input"
                          value={dam}
                          onChange={(e) => setDam(e.target.value)}
                          style={{ height: '2.2rem', fontSize: '0.8rem' }}
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="reg-status" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem' }}>
                          Loft Status
                        </label>
                        <select
                          id="reg-status"
                          className="form-input"
                          value={status}
                          onChange={(e) => setStatus(e.target.value)}
                          style={{ height: '2.2rem', fontSize: '0.8rem', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                        >
                          <option value="Active">Active Racer</option>
                          <option value="Breeding">Breeder</option>
                          <option value="Retired">Retired</option>
                          <option value="Lost">Lost</option>
                          <option value="Sold">Sold</option>
                          <option value="Deceased">Deceased</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="reg-notes" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem' }}>
                        <NotesIcon size={12} /> Notes & Lineage Details
                      </label>
                      <textarea
                        id="reg-notes"
                        placeholder="Pedigree details, achievements, temperament..."
                        className="form-input"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        style={{ height: '3.5rem', resize: 'vertical', fontSize: '0.8rem', padding: '0.4rem 0.5rem' }}
                      />
                    </div>
                  </div>
                )}

                {error && <div className="form-error" style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>{error}</div>}
                {saveSuccess && (
                  <div style={{
                    background: 'rgba(63, 185, 80, 0.1)',
                    border: '1px solid rgba(63, 185, 80, 0.3)',
                    borderRadius: '0.5rem',
                    padding: '0.4rem',
                    color: 'var(--color-success)',
                    textAlign: 'center',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    marginTop: '0.2rem'
                  }}>
                    Bird Registered Successfully!
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary"
                  style={{
                    marginTop: '0.4rem',
                    width: '100%',
                    height: '2.3rem',
                    background: '#4CAF50',
                    color: '#fff',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer'
                  }}
                >
                  {saving ? 'Registering Pigeon...' : 'Register New Pigeon'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Floating Sub-modal for detailed profile & pedigree editing */}
      {selectedBird && (
        <div 
          className="modal-backdrop modal-floating" 
          style={{ zIndex: 12000 }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedBird(null) }}
        >
          <div 
            className="modal-container" 
            style={{ maxWidth: '480px', padding: 0 }}
          >
            <div className="modal-header" style={{ background: 'linear-gradient(135deg, #2196F3, #1976D2)', padding: '0.9rem 1.2rem' }}>
              <div className="modal-header-left">
                <span style={{ color: '#fff', display: 'flex', alignItems: 'center' }}>
                  <BirdIcon size={18} />
                </span>
                <h2 className="modal-title" style={{ color: '#fff', fontSize: '1rem', fontWeight: 800 }}>
                  Profile: {selectedBird.ringNo}
                </h2>
              </div>
              <button 
                type="button"
                className="modal-close-btn" 
                style={{ color: '#fff', background: 'rgba(255,255,255,0.15)', position: 'static', margin: 0 }} 
                onClick={() => setSelectedBird(null)}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-body modal-scroll-body" style={{ padding: '1.25rem', maxHeight: '72dvh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <form onSubmit={handleUpdateBird} style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: '0.75rem',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="edit-ring" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem' }}>
                      <TagIcon size={12} /> Ring Number
                    </label>
                    <input
                      id="edit-ring"
                      type="text"
                      className="form-input"
                      value={editRingNo}
                      onChange={(e) => setEditRingNo(e.target.value)}
                      style={{ height: '2.2rem', fontSize: '0.8rem' }}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit-color" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem' }}>
                      <NotesIcon size={12} /> Color
                    </label>
                    <input
                      id="edit-color"
                      type="text"
                      className="form-input"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      style={{ height: '2.2rem', fontSize: '0.8rem' }}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="edit-name" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem' }}>
                      <NameIcon size={12} /> Name / Alias (Optional)
                    </label>
                    <input
                      id="edit-name"
                      type="text"
                      className="form-input"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      style={{ height: '2.2rem', fontSize: '0.8rem' }}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit-gender" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem' }}>
                      <DnaIcon size={12} /> Gender
                    </label>
                    <select
                      id="edit-gender"
                      className="form-input"
                      value={editGender}
                      onChange={(e) => setEditGender(e.target.value)}
                      style={{ height: '2.2rem', fontSize: '0.8rem', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                    >
                      <option value="Cock">Cock (Male)</option>
                      <option value="Hen">Hen (Female)</option>
                      <option value="Unknown">Unknown</option>
                    </select>
                  </div>
                </div>

                {/* Pedigree & Advanced details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid var(--border-default)', paddingTop: '0.75rem', marginTop: '0.2rem' }}>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="edit-birthdate" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem' }}>
                        <CalendarIcon size={12} /> Hatch Date
                      </label>
                      <input
                        id="edit-birthdate"
                        type="date"
                        className="form-input"
                        value={editBirthdate}
                        onChange={(e) => setEditBirthdate(e.target.value)}
                        style={{ height: '2.2rem', fontSize: '0.8rem', colorScheme: 'dark' }}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="edit-strain" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem' }}>
                        <DnaIcon size={12} /> Strain / Breed
                      </label>
                      <input
                        id="edit-strain"
                        type="text"
                        placeholder="e.g. Janssen / Arden"
                        className="form-input"
                        value={editStrain}
                        onChange={(e) => setEditStrain(e.target.value)}
                        style={{ height: '2.2rem', fontSize: '0.8rem' }}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="edit-sire" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem' }}>
                        Sire (Father Ring)
                      </label>
                      <input
                        id="edit-sire"
                        type="text"
                        placeholder="e.g. PH-2024-5020"
                        className="form-input"
                        value={editSire}
                        onChange={(e) => setEditSire(e.target.value)}
                        style={{ height: '2.2rem', fontSize: '0.8rem' }}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="edit-dam" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem' }}>
                        Dam (Mother Ring)
                      </label>
                      <input
                        id="edit-dam"
                        type="text"
                        placeholder="e.g. PH-2024-3011"
                        className="form-input"
                        value={editDam}
                        onChange={(e) => setEditDam(e.target.value)}
                        style={{ height: '2.2rem', fontSize: '0.8rem' }}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="edit-status" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem' }}>
                        Loft Status
                      </label>
                      <select
                        id="edit-status"
                        className="form-input"
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                        style={{ height: '2.2rem', fontSize: '0.8rem', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                      >
                        <option value="Active">Active Racer</option>
                        <option value="Breeding">Breeder</option>
                        <option value="Retired">Retired</option>
                        <option value="Lost">Lost</option>
                        <option value="Sold">Sold</option>
                        <option value="Deceased">Deceased</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit-notes" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem' }}>
                      <NotesIcon size={12} /> Notes & Lineage Details
                    </label>
                    <textarea
                      id="edit-notes"
                      placeholder="Pedigree details, achievements, temperament..."
                      className="form-input"
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      style={{ height: '3.5rem', resize: 'vertical', fontSize: '0.8rem', padding: '0.4rem 0.5rem' }}
                    />
                  </div>
                </div>

                {editError && <div className="form-error" style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>{editError}</div>}
                {editSuccess && (
                  <div style={{
                    background: 'rgba(63, 185, 80, 0.1)',
                    border: '1px solid rgba(63, 185, 80, 0.3)',
                    borderRadius: '0.5rem',
                    padding: '0.4rem',
                    color: 'var(--color-success)',
                    textAlign: 'center',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    marginTop: '0.2rem'
                  }}>
                    Changes saved successfully!
                  </div>
                )}

                <button
                  type="submit"
                  disabled={editSaving}
                  className="btn-primary"
                  style={{
                    marginTop: '0.4rem',
                    width: '100%',
                    height: '2.3rem',
                    background: '#2196F3',
                    color: '#fff',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer'
                  }}
                >
                  {editSaving ? 'Saving Changes...' : 'Save Profile Changes'}
                </button>
              </form>

              {/* Performance logs in sub-modal */}
              <div style={{ marginTop: '0.4rem' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
                  🕒 Flight Performance History ({historyLogs.length})
                </h4>
                {historyLogs.length === 0 ? (
                  <div style={{ 
                    padding: '1.25rem', 
                    background: 'rgba(255,255,255,0.01)', 
                    border: '1px solid var(--border-default)', 
                    borderRadius: '0.5rem', 
                    color: 'var(--text-secondary)',
                    fontSize: '0.74rem',
                    textAlign: 'center'
                  }}>
                    No logged flights found for this bird.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', border: '1px solid var(--border-default)', borderRadius: '0.5rem', maxHeight: '180px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.7rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-default)', color: 'var(--text-secondary)', position: 'sticky', top: 0 }}>
                          <th style={{ padding: '0.35rem 0.5rem' }}>Race / Event</th>
                          <th style={{ padding: '0.35rem 0.5rem' }}>Distance</th>
                          <th style={{ padding: '0.35rem 0.5rem' }}>Speed</th>
                          <th style={{ padding: '0.35rem 0.5rem', textAlign: 'center' }}>Rank</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyLogs.map((log) => (
                          <tr key={log.eventId} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                            <td style={{ padding: '0.35rem 0.5rem', color: 'var(--text-primary)' }}>
                              <div style={{ fontWeight: 700 }}>{log.title}</div>
                              <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>{log.date}</div>
                            </td>
                            <td style={{ padding: '0.35rem 0.5rem', color: 'var(--text-secondary)' }}>{log.distance.toFixed(2)} km</td>
                            <td style={{ padding: '0.35rem 0.5rem', fontWeight: 600, color: 'var(--brand-gold)' }}>{log.speed.toFixed(3)} m/m</td>
                            <td style={{ padding: '0.35rem 0.5rem', textAlign: 'center' }}>
                              <span style={{
                                padding: '0.05rem 0.25rem',
                                borderRadius: '3px',
                                background: log.rank === 1 ? 'rgba(255, 193, 7, 0.15)' : 'rgba(255,255,255,0.04)',
                                color: log.rank === 1 ? 'var(--brand-gold)' : 'var(--text-primary)',
                                fontWeight: log.rank === 1 ? 700 : 'normal'
                              }}>
                                {log.rank} / {log.totalClocked}
                              </span>
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
      )}
    </>
  )
}
