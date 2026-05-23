import { useState, useEffect, useRef } from 'react'
import { Plus, MoreHorizontal, Copy, Pencil, Trash2, Link as LinkIcon, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import * as api from '../../api/eventTypes'
import * as availApi from '../../api/availability'
import { DURATIONS, LOCATION_TYPES, PRESET_COLORS } from '../../utils/constants'
import { useEventTypes } from '../../context/EventTypesContext'

/* ─── Helpers ─── */
function slugify(str) {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/* ─── Color Picker ─── */
function ColorPicker({ value, onChange }) {
  return (
    <div className="color-picker">
      {PRESET_COLORS.map(c => (
        <button
          key={c}
          type="button"
          className={`color-swatch${value === c ? ' selected' : ''}`}
          style={{ background: c }}
          onClick={() => onChange(c)}
          title={c}
        />
      ))}
    </div>
  )
}

/* ─── Custom Questions Editor ─── */
function CustomQuestionsEditor({ questions, onChange }) {
  const [newQ, setNewQ] = useState('')
  const [required, setRequired] = useState(false)

  const add = () => {
    const q = newQ.trim()
    if (!q) return
    onChange([...questions, { label: q, required }])
    setNewQ('')
    setRequired(false)
  }

  const remove = (i) => onChange(questions.filter((_, idx) => idx !== i))

  return (
    <div>
      {questions.map((q, i) => (
        <div key={i} className="custom-question-item">
          <span className="custom-question-label">{q.label}</span>
          {q.required && <span className="custom-question-required">Required</span>}
          <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => remove(i)}>
            <Trash2 size={13} />
          </button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
        <input
          className="form-input"
          style={{ flex: 1 }}
          placeholder="Add a question..."
          value={newQ}
          onChange={e => setNewQ(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, whiteSpace: 'nowrap', cursor: 'pointer' }}>
          <input type="checkbox" checked={required} onChange={e => setRequired(e.target.checked)} />
          Required
        </label>
        <button type="button" className="btn btn-secondary btn-sm" onClick={add}>Add</button>
      </div>
    </div>
  )
}

/* ─── Event Type Form Modal ─── */
function EventTypeModal({ eventType, schedules, onSave, onClose }) {
  const isEdit = Boolean(eventType?.id)
  const [form, setForm] = useState({
    title: eventType?.title || '',
    slug: eventType?.slug || '',
    description: eventType?.description || '',
    duration_minutes: eventType?.duration_minutes || 30,
    location_type: eventType?.location_type || 'google_meet',
    location_value: eventType?.location_value || '',
    color: eventType?.color || '#111827',
    buffer_before: eventType?.buffer_before || 0,
    buffer_after: eventType?.buffer_after || 0,
    min_notice_minutes: eventType?.min_notice_minutes || 60,
    max_advance_days: eventType?.max_advance_days || 60,
    custom_questions: eventType?.custom_questions || [],
    schedule_id: eventType?.schedule_id || (schedules[0]?.id ?? null),
  })
  const [slugManual, setSlugManual] = useState(isEdit)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleTitleChange = (v) => {
    set('title', v)
    if (!slugManual) set('slug', slugify(v))
  }

  const handleSlugChange = (v) => {
    setSlugManual(true)
    set('slug', v.toLowerCase().replace(/[^a-z0-9-]/g, ''))
  }

  const validate = () => {
    const e = {}
    if (!form.title.trim()) e.title = 'Title is required'
    if (!form.slug.trim()) e.slug = 'Slug is required'
    else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) e.slug = 'Lowercase letters, numbers and hyphens only'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const payload = { ...form, schedule_id: form.schedule_id || null }
      const saved = isEdit
        ? await api.updateEventType(eventType.id, payload)
        : await api.createEventType(payload)
      toast.success(isEdit ? 'Event type updated!' : 'Event type created!')
      onSave(saved)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 580 }}>
        <div className="modal-header">
          <span className="modal-title">{isEdit ? 'Edit Event Type' : 'New Event Type'}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Title */}
            <div className="form-group">
              <label className="form-label">Title <span style={{ color: 'var(--cal-error)' }}>*</span></label>
              <input className={`form-input${errors.title ? ' error' : ''}`} value={form.title} onChange={e => handleTitleChange(e.target.value)} placeholder="30 Minute Meeting" />
              {errors.title && <div className="form-error">{errors.title}</div>}
            </div>

            {/* Slug */}
            <div className="form-group">
              <label className="form-label">URL Slug <span style={{ color: 'var(--cal-error)' }}>*</span> <span className="form-label-hint">(can be custom)</span></label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: '1px solid var(--cal-border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--cal-bg-default)' }}>
                <span style={{ padding: '8px 10px', background: 'var(--cal-bg-muted)', color: 'var(--cal-text-subtle)', fontSize: 13, borderRight: '1px solid var(--cal-border-default)', whiteSpace: 'nowrap' }}>
                  /john/
                </span>
                <input
                  className={errors.slug ? 'error' : ''}
                  style={{ flex: 1, border: 'none', padding: '8px 10px', fontSize: 14, outline: 'none', fontFamily: 'monospace' }}
                  value={form.slug}
                  onChange={e => handleSlugChange(e.target.value)}
                  placeholder="30min"
                />
              </div>
              {errors.slug && <div className="form-error">{errors.slug}</div>}
              <div className="form-hint">Custom URL slug for your booking page</div>
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="A brief description of this event..." />
            </div>

            <div className="form-row">
              {/* Duration */}
              <div className="form-group">
                <label className="form-label">Duration</label>
                <select className="form-select" value={form.duration_minutes} onChange={e => set('duration_minutes', Number(e.target.value))}>
                  {DURATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              {/* Location */}
              <div className="form-group">
                <label className="form-label">Location</label>
                <select className="form-select" value={form.location_type} onChange={e => set('location_type', e.target.value)}>
                  {LOCATION_TYPES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
            </div>

            {form.location_type === 'custom' && (
              <div className="form-group">
                <label className="form-label">Location Value</label>
                <input className="form-input" value={form.location_value} onChange={e => set('location_value', e.target.value)} placeholder="Meeting room, address, link..." />
              </div>
            )}

            {/* Color */}
            <div className="form-group">
              <label className="form-label">Color</label>
              <ColorPicker value={form.color} onChange={v => set('color', v)} />
            </div>

            {/* Schedule */}
            {schedules.length > 0 && (
              <div className="form-group">
                <label className="form-label">Availability Schedule</label>
                <select className="form-select" value={form.schedule_id || ''} onChange={e => set('schedule_id', e.target.value ? Number(e.target.value) : null)}>
                  <option value="">Use default schedule</option>
                  {schedules.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}

            {/* Advanced */}
            <details style={{ marginTop: 8 }}>
              <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--cal-text-subtle)', padding: '8px 0', userSelect: 'none' }}>
                Advanced Settings
              </summary>
              <div style={{ paddingTop: 16 }}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Buffer Before <span className="form-label-hint">(min)</span></label>
                    <input type="number" className="form-input" min={0} max={120} value={form.buffer_before} onChange={e => set('buffer_before', Number(e.target.value))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Buffer After <span className="form-label-hint">(min)</span></label>
                    <input type="number" className="form-input" min={0} max={120} value={form.buffer_after} onChange={e => set('buffer_after', Number(e.target.value))} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Min Notice <span className="form-label-hint">(min)</span></label>
                    <input type="number" className="form-input" min={0} value={form.min_notice_minutes} onChange={e => set('min_notice_minutes', Number(e.target.value))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Max Advance <span className="form-label-hint">(days)</span></label>
                    <input type="number" className="form-input" min={1} max={365} value={form.max_advance_days} onChange={e => set('max_advance_days', Number(e.target.value))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Custom Questions</label>
                  <CustomQuestionsEditor questions={form.custom_questions} onChange={v => set('custom_questions', v)} />
                </div>
              </div>
            </details>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="btn-spinner" /> : null}
              {isEdit ? 'Save Changes' : 'Create Event Type'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Delete Confirm Modal ─── */
function DeleteModal({ eventType, onConfirm, onClose }) {
  const [loading, setLoading] = useState(false)
  const handleDelete = async () => {
    setLoading(true)
    try {
      await api.deleteEventType(eventType.id)
      toast.success('Event type deleted')
      onConfirm(eventType.id)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <span className="modal-title">Delete Event Type</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 14, color: 'var(--cal-text-subtle)', lineHeight: 1.6 }}>
            Are you sure you want to delete <strong>"{eventType.title}"</strong>? This will also cancel any upcoming bookings for this event type.
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={handleDelete} disabled={loading}>
            {loading ? <span className="btn-spinner" /> : <Trash2 size={14} />}
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Event Type Card ─── */
function EventTypeCard({ et, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [active, setActive] = useState(et.is_active)
  const [copied, setCopied] = useState(false)
  const menuRef = useRef()

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleToggle = async () => {
    const newVal = !active
    setActive(newVal)
    try {
      await api.toggleEventType(et.id, newVal)
      toast.success(newVal ? 'Event type enabled' : 'Event type disabled')
    } catch {
      setActive(!newVal)
      toast.error('Failed to toggle')
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/john/${et.slug}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Link copied!')
  }

  return (
    <div className="event-type-card">
      <div className="event-type-color-dot" style={{ background: et.color }} />
      <div className="event-type-info" style={{ cursor: 'pointer' }} onClick={() => onEdit(et)}>
        <div className="event-type-title">{et.title}</div>
        <div className="event-type-slug">/{et.slug}</div>
      </div>
      <span className="event-type-duration">{et.duration_minutes} min</span>
      <div className="event-type-actions">
        <button
          className={`toggle${active ? ' on' : ''}`}
          onClick={handleToggle}
          title={active ? 'Disable' : 'Enable'}
        />
        <button className="btn btn-ghost btn-sm btn-icon" onClick={copyLink} title="Copy booking link">
          {copied ? <Check size={14} style={{ color: 'var(--cal-success)' }} /> : <Copy size={14} />}
        </button>
        <div className="dropdown-wrapper" ref={menuRef}>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setMenuOpen(o => !o)}>
            <MoreHorizontal size={16} />
          </button>
          {menuOpen && (
            <div className="dropdown-menu">
              <button className="dropdown-item" onClick={() => { onEdit(et); setMenuOpen(false) }}>
                <Pencil size={13} /> Edit
              </button>
              <a className="dropdown-item" href={`/john/${et.slug}`} target="_blank" rel="noreferrer">
                <LinkIcon size={13} /> View booking page
              </a>
              <div className="dropdown-divider" />
              <button className="dropdown-item danger" onClick={() => { onDelete(et); setMenuOpen(false) }}>
                <Trash2 size={13} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Skeleton ─── */
function EventTypeSkeleton() {
  return (
    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--cal-border-subtle)', display: 'flex', gap: 16, alignItems: 'center' }}>
      <div className="skeleton" style={{ width: 10, height: 10, borderRadius: '50%' }} />
      <div style={{ flex: 1 }}>
        <div className="skeleton" style={{ height: 14, width: '40%', marginBottom: 6 }} />
        <div className="skeleton" style={{ height: 11, width: '20%' }} />
      </div>
      <div className="skeleton" style={{ height: 22, width: 55, borderRadius: 20 }} />
    </div>
  )
}

/* ─── Main Page ─── */
export default function EventTypesPage() {
  const { eventTypes, loading: eventTypesLoading, refreshEventTypes } = useEventTypes()
  const [schedules, setSchedules] = useState([])
  const [loadingSchedules, setLoadingSchedules] = useState(true)
  const [modal, setModal] = useState(null) // null | { type: 'edit'|'delete', data }

  useEffect(() => {
    availApi.getSchedules()
      .then((sched) => setSchedules(sched))
      .catch(() => toast.error('Failed to load schedules'))
      .finally(() => setLoadingSchedules(false))
  }, [])

  const handleSaved = (saved) => {
    refreshEventTypes()
    setModal(null)
  }

  const handleDeleted = (id) => {
    refreshEventTypes()
    setModal(null)
  }

  const loading = eventTypesLoading || loadingSchedules

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Event Types</h1>
          <p>Create and manage your bookable events</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ type: 'create' })}>
          <Plus size={16} /> New Event Type
        </button>
      </div>

      {/* List */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <>{[1,2,3].map(i => <EventTypeSkeleton key={i} />)}</>
        ) : eventTypes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><LinkIcon size={22} /></div>
            <div className="empty-state-title">No event types yet</div>
            <div className="empty-state-desc">Create your first event type to start accepting bookings</div>
            <button className="btn btn-primary" onClick={() => setModal({ type: 'create' })}>
              <Plus size={14} /> Create event type
            </button>
          </div>
        ) : (
          eventTypes.map(et => (
            <EventTypeCard
              key={et.id}
              et={et}
              onEdit={data => setModal({ type: 'edit', data })}
              onDelete={data => setModal({ type: 'delete', data })}
            />
          ))
        )}
      </div>

      {/* Modals */}
      {(modal?.type === 'create' || modal?.type === 'edit') && (
        <EventTypeModal
          eventType={modal.data}
          schedules={schedules}
          onSave={handleSaved}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'delete' && (
        <DeleteModal
          eventType={modal.data}
          onConfirm={handleDeleted}
          onClose={() => setModal(null)}
        />
      )}
    </>
  )
}
