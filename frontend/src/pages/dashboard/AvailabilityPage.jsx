import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Clock, Save, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import * as api from '../../api/availability'
import { DAYS_OF_WEEK, TIMEZONE_OPTIONS } from '../../utils/constants'

function defaultRules() {
  return DAYS_OF_WEEK.map(d => ({
    day_of_week: d.value,
    enabled: d.value < 5,
    start_time: '09:00',
    end_time: '17:00',
  }))
}

/* ─── Add Override Modal ─── */
function AddOverrideModal({ scheduleId, onSaved, onClose }) {
  const [form, setForm] = useState({ override_date: '', is_blocked: true, start_time: '09:00', end_time: '17:00' })
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handle = async (e) => {
    e.preventDefault()
    if (!form.override_date) { toast.error('Please select a date'); return }
    setLoading(true)
    try {
      const payload = {
        override_date: form.override_date,
        is_blocked: form.is_blocked,
        start_time: form.is_blocked ? null : form.start_time,
        end_time: form.is_blocked ? null : form.end_time,
      }
      const saved = await api.addOverride(scheduleId, payload)
      toast.success('Date override added')
      onSaved(saved)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 360 }}>
        <div className="modal-header">
          <span className="modal-title">Add Date Override</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handle}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Date</label>
              <input type="date" className="form-input" value={form.override_date} onChange={e => set('override_date', e.target.value)} min={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className={`btn btn-sm${form.is_blocked ? ' btn-primary' : ' btn-secondary'}`}
                  style={{ flex: 1 }}
                  onClick={() => set('is_blocked', true)}
                >
                  🚫 Block Day
                </button>
                <button
                  type="button"
                  className={`btn btn-sm${!form.is_blocked ? ' btn-primary' : ' btn-secondary'}`}
                  style={{ flex: 1 }}
                  onClick={() => set('is_blocked', false)}
                >
                  🕐 Custom Hours
                </button>
              </div>
            </div>
            {!form.is_blocked && (
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Start Time</label>
                  <input type="time" className="form-input" value={form.start_time} onChange={e => set('start_time', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">End Time</label>
                  <input type="time" className="form-input" value={form.end_time} onChange={e => set('end_time', e.target.value)} />
                </div>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="btn-spinner" /> : null}
              Add Override
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Create Schedule Modal ─── */
function CreateScheduleModal({ onCreated, onClose }) {
  const [name, setName] = useState('Working Hours')
  const [timezone, setTimezone] = useState('Asia/Kolkata')
  const [loading, setLoading] = useState(false)

  const handle = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const rules = [0,1,2,3,4].map(d => ({ day_of_week: d, start_time: '09:00', end_time: '17:00' }))
      const s = await api.createSchedule({ name, timezone, rules })
      toast.success('Schedule created!')
      onCreated(s)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 360 }}>
        <div className="modal-header">
          <span className="modal-title">New Schedule</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handle}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Schedule Name</label>
              <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Working Hours" />
            </div>
            <div className="form-group">
              <label className="form-label">Timezone</label>
              <select className="form-select" value={timezone} onChange={e => setTimezone(e.target.value)}>
                {TIMEZONE_OPTIONS.map(tz => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="btn-spinner" /> : null}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Schedule Editor ─── */
function ScheduleEditor({ schedule, onUpdated, onSetDefault }) {
  const [rules, setRules] = useState(defaultRules())
  const [name, setName] = useState(schedule.name)
  const [timezone, setTimezone] = useState(schedule.timezone)
  // KEY FIX: local overrides state — independent from schedule prop to avoid wipe on save
  const [overrides, setOverrides] = useState(schedule.overrides || [])
  const [saving, setSaving] = useState(false)
  const [showOverrideModal, setShowOverrideModal] = useState(false)
  const scheduleIdRef = useRef(schedule.id)

  // Only reset overrides when the schedule ID changes (different schedule selected)
  useEffect(() => {
    if (schedule.id !== scheduleIdRef.current) {
      scheduleIdRef.current = schedule.id
      setOverrides(schedule.overrides || [])
    }
  }, [schedule.id])

  // Always sync rules/name/timezone when schedule changes
  useEffect(() => {
    const base = defaultRules()
    if (schedule.rules?.length) {
      const byDay = {}
      schedule.rules.forEach(r => { byDay[r.day_of_week] = r })
      base.forEach(r => {
        if (byDay[r.day_of_week]) {
          r.enabled = true
          r.start_time = (byDay[r.day_of_week].start_time || '09:00').toString().slice(0, 5)
          r.end_time = (byDay[r.day_of_week].end_time || '17:00').toString().slice(0, 5)
        }
      })
    }
    setRules(base)
    setName(schedule.name)
    setTimezone(schedule.timezone)
  }, [schedule.id, schedule.rules, schedule.name, schedule.timezone])

  const handleSave = async () => {
    setSaving(true)
    try {
      const activeRules = rules.filter(r => r.enabled).map(r => ({
        day_of_week: r.day_of_week,
        start_time: r.start_time,
        end_time: r.end_time,
      }))
      const updated = await api.updateSchedule(schedule.id, { name, timezone, rules: activeRules })
      toast.success('Schedule saved!')
      // KEY FIX: merge overrides from our local state into the update to preserve them
      onUpdated({ ...updated, overrides })
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleAddOverride = (override) => {
    // Add to local state immediately; don't call onUpdated (no save needed)
    setOverrides(prev => [...prev, override])
    setShowOverrideModal(false)
  }

  const removeOverride = async (id) => {
    try {
      await api.removeOverride(id)
      setOverrides(prev => prev.filter(o => o.id !== id))
      toast.success('Override removed')
    } catch { toast.error('Failed to remove override') }
  }

  const toggleDay = (i) => setRules(prev => prev.map((r, idx) => idx === i ? { ...r, enabled: !r.enabled } : r))
  const setDayTime = (i, field, val) => setRules(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r))

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--cal-text-default)', marginBottom: 2 }}>{name}</div>
          {schedule.is_default && (
            <span className="badge badge-success"><Star size={9} /> Default</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!schedule.is_default && (
            <button className="btn btn-secondary btn-sm" onClick={() => onSetDefault(schedule.id)}>
              Set as default
            </button>
          )}
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            {saving ? <span className="btn-spinner" /> : <Save size={13} />}
            Save Changes
          </button>
        </div>
      </div>

      {/* Name & TZ */}
      <div className="form-row" style={{ marginBottom: 20 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Schedule Name</label>
          <input className="form-input" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Timezone</label>
          <select className="form-select" value={timezone} onChange={e => setTimezone(e.target.value)}>
            {TIMEZONE_OPTIONS.map(tz => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </div>
      </div>

      <div className="divider" />

      {/* Day rules */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--cal-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
          Weekly Hours
        </div>
        {rules.map((rule, i) => {
          const day = DAYS_OF_WEEK[i]
          return (
            <div key={i} className="availability-day">
              <div className={`availability-day-label${!rule.enabled ? ' disabled' : ''}`}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12.5 }}>
                  <input type="checkbox" checked={rule.enabled} onChange={() => toggleDay(i)} style={{ accentColor: 'var(--cal-brand)', cursor: 'pointer' }} />
                  {day.label}
                </label>
              </div>
              {rule.enabled ? (
                <div className="availability-time-slots">
                  <div className="availability-time-row">
                    <input type="time" className="availability-time-input" value={rule.start_time} onChange={e => setDayTime(i, 'start_time', e.target.value)} />
                    <span className="availability-time-sep">–</span>
                    <input type="time" className="availability-time-input" value={rule.end_time} onChange={e => setDayTime(i, 'end_time', e.target.value)} />
                  </div>
                </div>
              ) : (
                <span style={{ fontSize: 12, color: 'var(--cal-text-muted)', paddingTop: 5 }}>Unavailable</span>
              )}
            </div>
          )
        })}
      </div>

      <div className="divider" />

      {/* Date Overrides */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--cal-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date Overrides</div>
            <div style={{ fontSize: 12, color: 'var(--cal-text-muted)', marginTop: 2 }}>Block days off or set custom hours for specific dates</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowOverrideModal(true)}>
            <Plus size={12} /> Add
          </button>
        </div>
        {overrides.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--cal-text-muted)', padding: '12px 0' }}>No date overrides added yet</p>
        ) : (
          overrides.map(o => (
            <div key={o.id} className="date-override-item">
              <div>
                <div className="date-override-date">{o.override_date}</div>
                <div className="date-override-type">
                  {o.is_blocked ? '🚫 Blocked day' : `🕐 ${(o.start_time || '').slice(0,5)} – ${(o.end_time || '').slice(0,5)}`}
                </div>
              </div>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => removeOverride(o.id)} title="Remove override">
                <Trash2 size={12} style={{ color: 'var(--cal-error)' }} />
              </button>
            </div>
          ))
        )}
      </div>

      {showOverrideModal && (
        <AddOverrideModal
          scheduleId={schedule.id}
          onSaved={handleAddOverride}
          onClose={() => setShowOverrideModal(false)}
        />
      )}
    </div>
  )
}

/* ─── Main Page ─── */
export default function AvailabilityPage() {
  const [schedules, setSchedules] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [createModal, setCreateModal] = useState(false)

  useEffect(() => {
    api.getSchedules()
      .then(data => {
        setSchedules(data)
        if (data.length > 0) setActiveId(data.find(s => s.is_default)?.id || data[0].id)
      })
      .catch(() => toast.error('Failed to load schedules'))
      .finally(() => setLoading(false))
  }, [])

  const activeSchedule = schedules.find(s => s.id === activeId)

  const handleUpdated = (updated) => {
    // KEY FIX: preserve overrides in parent state from the updated object (which now includes them)
    setSchedules(prev => prev.map(s => s.id === updated.id ? updated : s))
  }

  const handleSetDefault = async (id) => {
    try {
      await api.setDefaultSchedule(id)
      setSchedules(prev => prev.map(s => ({ ...s, is_default: s.id === id })))
      toast.success('Default schedule updated')
    } catch { toast.error('Failed to update default') }
  }

  const handleCreated = (s) => {
    setSchedules(prev => [...prev, { ...s, overrides: [] }])
    setActiveId(s.id)
    setCreateModal(false)
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Availability</h1>
          <p>Set your working hours and manage date overrides</p>
        </div>
        <button className="btn btn-secondary" onClick={() => setCreateModal(true)}>
          <Plus size={13} /> New Schedule
        </button>
      </div>

      <div style={{ display: 'flex', gap: 20 }}>
        {/* Schedule list sidebar */}
        {schedules.length > 1 && (
          <div style={{ width: 180, flexShrink: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--cal-text-muted)', textTransform: 'uppercase', letterSpacing: '0.7px', padding: '0 4px', marginBottom: 6 }}>
              Schedules
            </div>
            {schedules.map(s => (
              <button
                key={s.id}
                className={`sidebar-nav-item${activeId === s.id ? ' active' : ''}`}
                style={{ marginLeft: 0, width: '100%', fontSize: 12.5 }}
                onClick={() => setActiveId(s.id)}
              >
                <Clock size={13} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{s.name}</span>
                {s.is_default && <span style={{ fontSize: 8, background: 'var(--cal-success-bg)', color: 'var(--cal-success)', padding: '2px 4px', borderRadius: 3 }}>✓</span>}
              </button>
            ))}
          </div>
        )}

        {/* Editor card */}
        <div className="card" style={{ flex: 1, padding: '22px 24px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 40, borderRadius: 6 }} />)}
            </div>
          ) : !activeSchedule ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Clock size={20} /></div>
              <div className="empty-state-title">No schedules yet</div>
              <div className="empty-state-desc">Create an availability schedule to start accepting bookings</div>
              <button className="btn btn-primary" onClick={() => setCreateModal(true)}>
                <Plus size={13} /> Create Schedule
              </button>
            </div>
          ) : (
            <ScheduleEditor
              key={activeSchedule.id}
              schedule={activeSchedule}
              onUpdated={handleUpdated}
              onSetDefault={handleSetDefault}
            />
          )}
        </div>
      </div>

      {createModal && (
        <CreateScheduleModal onCreated={handleCreated} onClose={() => setCreateModal(false)} />
      )}
    </>
  )
}
