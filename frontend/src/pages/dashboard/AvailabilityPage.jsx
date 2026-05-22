import { useState, useEffect } from 'react'
import { Plus, Trash2, Clock, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import * as api from '../../api/availability'
import { DAYS_OF_WEEK, TIMEZONE_OPTIONS } from '../../utils/constants'

/* ─── Default rules helper ─── */
function defaultRules() {
  return DAYS_OF_WEEK.map(d => ({
    day_of_week: d.value,
    enabled: d.value < 5, // Mon-Fri
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
    if (!form.override_date) { toast.error('Date required'); return }
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
      <div className="modal" style={{ maxWidth: 380 }}>
        <div className="modal-header">
          <span className="modal-title">Add Date Override</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handle}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Date</label>
              <input type="date" className="form-input" value={form.override_date} onChange={e => set('override_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className={`btn${form.is_blocked ? ' btn-primary' : ' btn-secondary'} btn-sm`} onClick={() => set('is_blocked', true)}>Block Day</button>
                <button type="button" className={`btn${!form.is_blocked ? ' btn-primary' : ' btn-secondary'} btn-sm`} onClick={() => set('is_blocked', false)}>Custom Hours</button>
              </div>
            </div>
            {!form.is_blocked && (
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Start</label>
                  <input type="time" className="form-input" value={form.start_time} onChange={e => set('start_time', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">End</label>
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

/* ─── Schedule Editor Panel ─── */
function ScheduleEditor({ schedule, onUpdated, onSetDefault }) {
  const [rules, setRules] = useState(defaultRules())
  const [name, setName] = useState(schedule.name)
  const [timezone, setTimezone] = useState(schedule.timezone)
  const [overrides, setOverrides] = useState(schedule.overrides || [])
  const [saving, setSaving] = useState(false)
  const [showOverrideModal, setShowOverrideModal] = useState(false)

  // Parse rules from schedule
  useEffect(() => {
    const base = defaultRules()
    if (schedule.rules?.length) {
      const byDay = {}
      schedule.rules.forEach(r => { byDay[r.day_of_week] = r })
      base.forEach(r => {
        if (byDay[r.day_of_week]) {
          r.enabled = true
          r.start_time = byDay[r.day_of_week].start_time.slice(0, 5)
          r.end_time = byDay[r.day_of_week].end_time.slice(0, 5)
        } else {
          r.enabled = r.day_of_week < 5
        }
      })
    }
    setRules(base)
    setName(schedule.name)
    setTimezone(schedule.timezone)
    setOverrides(schedule.overrides || [])
  }, [schedule])

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
      onUpdated(updated)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const removeOverride = async (id) => {
    try {
      await api.removeOverride(id)
      setOverrides(prev => prev.filter(o => o.id !== id))
      toast.success('Override removed')
    } catch { toast.error('Failed to remove') }
  }

  const toggleDay = (i) => setRules(prev => prev.map((r, idx) => idx === i ? { ...r, enabled: !r.enabled } : r))
  const setDayTime = (i, field, val) => setRules(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r))

  return (
    <div>
      {/* Schedule name & timezone */}
      <div className="form-row" style={{ marginBottom: 24 }}>
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

      {/* Day rules */}
      <div className="divider" />
      <div style={{ marginBottom: 24 }}>
        {rules.map((rule, i) => {
          const day = DAYS_OF_WEEK[i]
          return (
            <div key={i} className="availability-day">
              <div className={`availability-day-label${!rule.enabled ? ' disabled' : ''}`}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={rule.enabled} onChange={() => toggleDay(i)} />
                  {day.short}
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
                <span style={{ fontSize: 13, color: 'var(--cal-text-muted)', paddingTop: 6 }}>Unavailable</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Date overrides */}
      <div className="divider" />
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Date Overrides</div>
            <div style={{ fontSize: 12, color: 'var(--cal-text-subtle)' }}>Block days off or set custom hours for specific dates</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowOverrideModal(true)}>
            <Plus size={13} /> Add Override
          </button>
        </div>
        {overrides.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--cal-text-muted)' }}>No overrides added yet</p>
        ) : (
          overrides.map(o => (
            <div key={o.id} className="date-override-item">
              <div>
                <div className="date-override-date">{o.override_date}</div>
                <div className="date-override-type">
                  {o.is_blocked ? '🚫 Blocked' : `🕐 ${o.start_time?.slice(0,5)} – ${o.end_time?.slice(0,5)}`}
                </div>
              </div>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => removeOverride(o.id)}>
                <Trash2 size={13} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
        {!schedule.is_default && (
          <button className="btn btn-secondary btn-sm" onClick={() => onSetDefault(schedule.id)}>
            Set as default
          </button>
        )}
        {schedule.is_default && <span className="badge badge-success">Default schedule</span>}
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? <span className="btn-spinner" /> : <Save size={14} />}
          Save Changes
        </button>
      </div>

      {showOverrideModal && (
        <AddOverrideModal
          scheduleId={schedule.id}
          onSaved={o => { setOverrides(prev => [...prev, o]); setShowOverrideModal(false) }}
          onClose={() => setShowOverrideModal(false)}
        />
      )}
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
      <div className="modal" style={{ maxWidth: 380 }}>
        <div className="modal-header">
          <span className="modal-title">New Schedule</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handle}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Name</label>
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
    setSchedules(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } : s))
  }

  const handleSetDefault = async (id) => {
    try {
      const updated = await api.setDefaultSchedule(id)
      setSchedules(prev => prev.map(s => ({ ...s, is_default: s.id === id })))
      toast.success('Default schedule updated')
    } catch { toast.error('Failed to update') }
  }

  const handleCreated = (s) => {
    setSchedules(prev => [...prev, s])
    setActiveId(s.id)
    setCreateModal(false)
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Availability</h1>
          <p>Manage when you're available for bookings</p>
        </div>
        <button className="btn btn-secondary" onClick={() => setCreateModal(true)}>
          <Plus size={14} /> New Schedule
        </button>
      </div>

      <div style={{ display: 'flex', gap: 0 }}>
        {/* Schedule list */}
        {schedules.length > 1 && (
          <div style={{ width: 200, marginRight: 24, flexShrink: 0 }}>
            {schedules.map(s => (
              <button
                key={s.id}
                className={`sidebar-nav-item${activeId === s.id ? ' active' : ''}`}
                style={{ marginLeft: 0, width: '100%' }}
                onClick={() => setActiveId(s.id)}
              >
                <Clock size={14} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                {s.is_default && <span className="badge badge-success" style={{ marginLeft: 'auto', fontSize: 10, padding: '1px 5px' }}>Default</span>}
              </button>
            ))}
          </div>
        )}

        {/* Editor */}
        <div className="card" style={{ flex: 1, padding: '24px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 40 }} />)}
            </div>
          ) : !activeSchedule ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Clock size={22} /></div>
              <div className="empty-state-title">No schedules yet</div>
              <div className="empty-state-desc">Create an availability schedule to start accepting bookings</div>
              <button className="btn btn-primary" onClick={() => setCreateModal(true)}>
                <Plus size={14} /> Create Schedule
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
