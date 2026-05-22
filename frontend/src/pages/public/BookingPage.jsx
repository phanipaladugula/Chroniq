import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Clock, MapPin, Video, Phone, Globe, ChevronLeft, ChevronRight, ArrowLeft, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import * as api from '../../api/public'
import { generateCalendarDays, toDateString, isSameDay, MONTH_NAMES, DAY_NAMES, formatSlot } from '../../utils/dateUtils'
import { TIMEZONE_OPTIONS } from '../../utils/constants'

/* ─── Location label ─── */
function LocationLabel({ type, value }) {
  const map = { google_meet: { icon: Video, label: 'Google Meet' }, zoom: { icon: Video, label: 'Zoom' }, phone: { icon: Phone, label: 'Phone Call' }, in_person: { icon: MapPin, label: 'In Person' }, custom: { icon: Globe, label: value || 'Custom Location' } }
  const { icon: Icon, label } = map[type] || map.custom
  return (
    <div className="booking-meta-item">
      <Icon size={14} style={{ color: 'var(--cal-text-muted)' }} />
      <span>{label}</span>
    </div>
  )
}

/* ─── Calendar ─── */
function Calendar({ selectedDate, onSelect, minDate, maxDate }) {
  const today = new Date()
  const [view, setView] = useState(() => {
    const d = selectedDate || today
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const days = generateCalendarDays(view.year, view.month)
  const prevM = () => setView(v => v.month === 0 ? { year: v.year-1, month: 11 } : { ...v, month: v.month-1 })
  const nextM = () => setView(v => v.month === 11 ? { year: v.year+1, month: 0 } : { ...v, month: v.month+1 })
  const isDisabled = (d) => {
    const dt = new Date(d); dt.setHours(0,0,0,0)
    const min = new Date(minDate); min.setHours(0,0,0,0)
    const max = new Date(maxDate); max.setHours(23,59,59,999)
    return dt < min || dt > max
  }
  return (
    <div>
      <div className="calendar-header">
        <button className="calendar-nav-btn" onClick={prevM}><ChevronLeft size={14} /></button>
        <span className="calendar-month-label">{MONTH_NAMES[view.month]} {view.year}</span>
        <button className="calendar-nav-btn" onClick={nextM}><ChevronRight size={14} /></button>
      </div>
      <div className="calendar-grid">
        {DAY_NAMES.map(d => <div key={d} className="calendar-day-header">{d}</div>)}
        {days.map(({ date, currentMonth }, i) => {
          const sel = selectedDate && isSameDay(date, selectedDate)
          const isToday = isSameDay(date, today)
          const disabled = isDisabled(date) || !currentMonth
          return (
            <button
              key={i}
              className={`calendar-day${sel ? ' selected' : ''}${isToday && !sel ? ' today' : ''}${!currentMonth ? ' outside' : ''}`}
              disabled={disabled}
              onClick={() => !disabled && onSelect(date)}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Booking Form ─── */
function BookingForm({ eventType, slot, timezone, onBack, onBooked }) {
  const { username, slug } = useParams()
  const [form, setForm] = useState({ booker_name: '', booker_email: '', notes: '', custom_responses: {} })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setCustom = (k, v) => setForm(f => ({ ...f, custom_responses: { ...f.custom_responses, [k]: v } }))

  const validate = () => {
    const e = {}
    if (!form.booker_name.trim()) e.booker_name = 'Name is required'
    if (!form.booker_email.trim()) e.booker_email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.booker_email)) e.booker_email = 'Invalid email address'
    eventType.custom_questions?.forEach(q => {
      if (q.required && !form.custom_responses[q.label]?.trim()) e[`cq_${q.label}`] = `${q.label} is required`
    })
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const booking = await api.createBooking(username, slug, {
        booker_name: form.booker_name,
        booker_email: form.booker_email,
        booker_timezone: timezone,
        start_time: slot.start_time,
        custom_responses: form.custom_responses,
        notes: form.notes || null,
      })
      onBooked(booking)
    } catch (err) {
      toast.error(err.message)
      setLoading(false)
    }
  }

  const slotTime = formatSlot(slot.start_time, timezone)
  const slotDate = new Date(slot.start_time).toLocaleDateString('en-US', {
    timeZone: timezone, weekday: 'long', month: 'long', day: 'numeric'
  })

  return (
    <div style={{ animation: 'slideUp 0.2s ease' }}>
      <button className="booking-back-btn" onClick={onBack}>
        <ArrowLeft size={13} /> Back to slots
      </button>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.4, marginBottom: 3 }}>Enter your details</h2>
        <p style={{ fontSize: 12.5, color: 'var(--cal-text-subtle)' }}>Confirm your booking below</p>
      </div>
      <div className="booking-form-selected-time">
        <strong>{slotTime}</strong> · {slotDate} · {eventType.duration_minutes} min
      </div>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Your Name <span style={{ color: 'var(--cal-error)' }}>*</span></label>
          <input className={`form-input${errors.booker_name ? ' error' : ''}`} value={form.booker_name} onChange={e => set('booker_name', e.target.value)} placeholder="Jane Smith" autoFocus />
          {errors.booker_name && <div className="form-error">{errors.booker_name}</div>}
        </div>
        <div className="form-group">
          <label className="form-label">Email Address <span style={{ color: 'var(--cal-error)' }}>*</span></label>
          <input type="email" className={`form-input${errors.booker_email ? ' error' : ''}`} value={form.booker_email} onChange={e => set('booker_email', e.target.value)} placeholder="jane@company.com" />
          {errors.booker_email && <div className="form-error">{errors.booker_email}</div>}
        </div>
        {eventType.custom_questions?.map((q, i) => (
          <div key={i} className="form-group">
            <label className="form-label">{q.label} {q.required && <span style={{ color: 'var(--cal-error)' }}>*</span>}</label>
            <input className={`form-input${errors[`cq_${q.label}`] ? ' error' : ''}`} value={form.custom_responses[q.label] || ''} onChange={e => setCustom(q.label, e.target.value)} />
            {errors[`cq_${q.label}`] && <div className="form-error">{errors[`cq_${q.label}`]}</div>}
          </div>
        ))}
        <div className="form-group">
          <label className="form-label">Additional Notes <span className="form-label-hint">(optional)</span></label>
          <textarea className="form-textarea" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Anything you'd like us to know..." />
        </div>
        <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading} style={{ width: '100%', marginTop: 4 }}>
          {loading ? <span className="btn-spinner" /> : <CheckCircle size={15} />}
          Confirm Booking
        </button>
      </form>
    </div>
  )
}

/* ─── Time Slots ─── */
function TimeSlotList({ slots, timezone, onSelect }) {
  const [selectedSlot, setSelectedSlot] = useState(null)
  if (slots.length === 0) {
    return <p style={{ fontSize: 12, color: 'var(--cal-text-muted)', textAlign: 'center', padding: '28px 0' }}>No available slots for this date</p>
  }
  return (
    <div className="time-slots-list">
      {slots.map((slot, i) => {
        const isSelected = selectedSlot?.start_time === slot.start_time
        return (
          <div key={i} className="time-slot-row">
            <button className={`time-slot-btn${isSelected ? ' selected' : ''}`} onClick={() => setSelectedSlot(isSelected ? null : slot)}>
              {formatSlot(slot.start_time, timezone)}
            </button>
            {isSelected && (
              <button className="time-slot-confirm" onClick={() => onSelect(slot)}>
                Next →
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ─── Main Booking Page ─── */
export default function BookingPage() {
  const { username, slug } = useParams()
  const [eventType, setEventType] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const today = new Date()
  const [selectedDate, setSelectedDate] = useState(null)
  const [slots, setSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata')

  const maxDate = new Date()
  maxDate.setDate(today.getDate() + (eventType?.max_advance_days || 60))

  useEffect(() => {
    api.getPublicEventType(username, slug)
      .then(et => setEventType(et))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [username, slug])

  useEffect(() => {
    if (!selectedDate || !eventType) return
    setSlotsLoading(true)
    setSlots([])
    api.getAvailableSlots(username, slug, toDateString(selectedDate), timezone)
      .then(data => setSlots(data.slots || []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false))
  }, [selectedDate, timezone, username, slug])

  const handleBooked = (booking) => {
    // Navigate immediately via window.location to avoid route mismatch
    window.location.href = `/booking/${booking.uid}`
  }

  if (loading) return (
    <div className="booking-page-bg">
      <div style={{ textAlign: 'center', marginTop: 100 }}>
        <div className="loading-spinner" />
      </div>
    </div>
  )

  if (error) return (
    <div className="booking-page-bg">
      <div className="confirmation-card" style={{ marginTop: 40 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>😕</div>
        <div className="confirmation-title">Not Found</div>
        <div className="confirmation-subtitle">{error}</div>
      </div>
    </div>
  )

  return (
    <div className="booking-page-bg">
      <div className="booking-page-card">
        {/* Left: Event Info */}
        <div className="booking-info-panel">
          <div className="booking-host-avatar">
            {eventType.host_name?.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="booking-host-name">{eventType.host_name}</div>
          <div className="booking-event-title">{eventType.title}</div>
          <div className="booking-meta">
            <div className="booking-meta-item">
              <Clock size={14} style={{ color: 'var(--cal-text-muted)' }} />
              <span>{eventType.duration_minutes} minutes</span>
            </div>
            <LocationLabel type={eventType.location_type} value={eventType.location_value} />
          </div>
          {eventType.description && (
            <p className="booking-description">{eventType.description}</p>
          )}
          <div className="divider" />
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--cal-text-muted)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 6 }}>
              Timezone
            </div>
            <select className="form-select" value={timezone} onChange={e => { setTimezone(e.target.value); setSlots([]); setSelectedDate(null) }} style={{ fontSize: 11.5 }}>
              {TIMEZONE_OPTIONS.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
        </div>

        {/* Right: Interactive Panel */}
        <div className="booking-interactive-panel">
          {selectedSlot ? (
            <BookingForm
              eventType={eventType}
              slot={selectedSlot}
              timezone={timezone}
              onBack={() => setSelectedSlot(null)}
              onBooked={handleBooked}
            />
          ) : (
            <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 256 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Select a date</div>
                <Calendar
                  selectedDate={selectedDate}
                  onSelect={(d) => { setSelectedDate(d); setSelectedSlot(null) }}
                  minDate={today}
                  maxDate={maxDate}
                />
              </div>
              {selectedDate && (
                <div style={{ flex: 1, minWidth: 150 }}>
                  <div className="time-slots-header">
                    {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' })}
                  </div>
                  {slotsLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 36 }} />)}
                    </div>
                  ) : (
                    <TimeSlotList slots={slots} timezone={timezone} onSelect={setSelectedSlot} />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
