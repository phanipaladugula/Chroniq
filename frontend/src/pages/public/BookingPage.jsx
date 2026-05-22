import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Clock, MapPin, Video, Phone, Globe, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import * as api from '../../api/public'
import { generateCalendarDays, toDateString, isSameDay, MONTH_NAMES, DAY_NAMES, formatSlot } from '../../utils/dateUtils'
import { TIMEZONE_OPTIONS } from '../../utils/constants'

/* ─── Location Label ─── */
function LocationLabel({ type, value }) {
  const map = { google_meet: { icon: Video, label: 'Google Meet' }, zoom: { icon: Video, label: 'Zoom' }, phone: { icon: Phone, label: 'Phone Call' }, in_person: { icon: MapPin, label: 'In Person' }, custom: { icon: Globe, label: value || 'Custom' } }
  const { icon: Icon, label } = map[type] || map.custom
  return (
    <div className="booking-meta-item">
      <Icon size={14} />
      <span>{label}</span>
    </div>
  )
}

/* ─── Mini Calendar ─── */
function Calendar({ selectedDate, onSelect, minDate, maxDate }) {
  const today = new Date()
  const [view, setView] = useState(() => {
    const d = selectedDate || today
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  const days = generateCalendarDays(view.year, view.month)
  const prevMonth = () => {
    setView(v => v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 })
  }
  const nextMonth = () => {
    setView(v => v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 })
  }

  const isDisabled = (date) => {
    const d = new Date(date)
    d.setHours(0,0,0,0)
    const min = new Date(minDate); min.setHours(0,0,0,0)
    const max = new Date(maxDate); max.setHours(23,59,59,999)
    return d < min || d > max
  }

  return (
    <div>
      <div className="calendar-header">
        <button className="calendar-nav-btn" onClick={prevMonth}><ChevronLeft size={14} /></button>
        <span className="calendar-month-label">{MONTH_NAMES[view.month]} {view.year}</span>
        <button className="calendar-nav-btn" onClick={nextMonth}><ChevronRight size={14} /></button>
      </div>
      <div className="calendar-grid">
        {DAY_NAMES.map(d => <div key={d} className="calendar-day-header">{d}</div>)}
        {days.map(({ date, currentMonth }, i) => {
          const selected = selectedDate && isSameDay(date, selectedDate)
          const isToday = isSameDay(date, today)
          const disabled = isDisabled(date)
          return (
            <button
              key={i}
              className={`calendar-day${selected ? ' selected' : ''}${isToday && !selected ? ' today' : ''}${!currentMonth ? ' outside' : ''}`}
              disabled={disabled || !currentMonth}
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
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.booker_email)) e.booker_email = 'Invalid email'
    // Validate required custom questions
    eventType.custom_questions?.forEach(q => {
      if (q.required && !form.custom_responses[q.label]?.trim()) {
        e[`cq_${q.label}`] = `${q.label} is required`
      }
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
    } finally {
      setLoading(false)
    }
  }

  const slotTime = formatSlot(slot.start_time, timezone)
  const slotDate = new Date(slot.start_time).toLocaleDateString('en-US', {
    timeZone: timezone, weekday: 'long', month: 'long', day: 'numeric'
  })

  return (
    <div>
      <button className="booking-back-btn" onClick={onBack}>
        <ArrowLeft size={14} /> Back
      </button>
      <div className="booking-form-header">
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Enter your details</h2>
        <p style={{ fontSize: 13, color: 'var(--cal-text-subtle)' }}>Fill in the form to confirm your booking</p>
      </div>
      <div className="booking-form-selected-time">
        <strong>{slotTime}</strong> · {slotDate} · {eventType.duration_minutes} min
      </div>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Your Name <span style={{ color: 'var(--cal-error)' }}>*</span></label>
          <input className={`form-input${errors.booker_name ? ' error' : ''}`} value={form.booker_name} onChange={e => set('booker_name', e.target.value)} placeholder="John Doe" />
          {errors.booker_name && <div className="form-error">{errors.booker_name}</div>}
        </div>
        <div className="form-group">
          <label className="form-label">Email Address <span style={{ color: 'var(--cal-error)' }}>*</span></label>
          <input type="email" className={`form-input${errors.booker_email ? ' error' : ''}`} value={form.booker_email} onChange={e => set('booker_email', e.target.value)} placeholder="you@example.com" />
          {errors.booker_email && <div className="form-error">{errors.booker_email}</div>}
        </div>

        {/* Custom questions */}
        {eventType.custom_questions?.map((q, i) => (
          <div key={i} className="form-group">
            <label className="form-label">{q.label} {q.required && <span style={{ color: 'var(--cal-error)' }}>*</span>}</label>
            <input className={`form-input${errors[`cq_${q.label}`] ? ' error' : ''}`} value={form.custom_responses[q.label] || ''} onChange={e => setCustom(q.label, e.target.value)} />
            {errors[`cq_${q.label}`] && <div className="form-error">{errors[`cq_${q.label}`]}</div>}
          </div>
        ))}

        <div className="form-group">
          <label className="form-label">Additional Notes <span className="form-label-hint">(optional)</span></label>
          <textarea className="form-textarea" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Anything you'd like to share..." />
        </div>

        <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading}>
          {loading ? <span className="btn-spinner" /> : null}
          Confirm Booking
        </button>
      </form>
    </div>
  )
}

/* ─── Time Slot List ─── */
function TimeSlotList({ slots, timezone, onSelect }) {
  const [selectedSlot, setSelectedSlot] = useState(null)

  if (slots.length === 0) {
    return <p style={{ fontSize: 13, color: 'var(--cal-text-muted)', textAlign: 'center', padding: '32px 0' }}>No available slots for this date</p>
  }

  return (
    <div className="time-slots-list">
      {slots.map((slot, i) => {
        const isSelected = selectedSlot?.start_time === slot.start_time
        return (
          <div key={i} className="time-slot-row">
            <button
              className={`time-slot-btn${isSelected ? ' selected' : ''}`}
              onClick={() => setSelectedSlot(isSelected ? null : slot)}
            >
              {formatSlot(slot.start_time, timezone)}
            </button>
            {isSelected && (
              <button className="time-slot-confirm" onClick={() => onSelect(slot)}>
                Confirm →
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ─── Main Public Booking Page ─── */
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
  const [booking, setBooking] = useState(null)
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata')

  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + (eventType?.max_advance_days || 60))

  useEffect(() => {
    api.getPublicEventType(username, slug)
      .then(et => setEventType(et))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [username, slug])

  useEffect(() => {
    if (!selectedDate || !eventType) return
    setSlotsLoading(true)
    api.getAvailableSlots(username, slug, toDateString(selectedDate), timezone)
      .then(data => setSlots(data.slots || []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false))
  }, [selectedDate, timezone, username, slug])

  if (loading) return (
    <div className="booking-page-bg">
      <div className="booking-page-card" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ width: 32, height: 32, border: '3px solid var(--cal-border-default)', borderTopColor: 'var(--cal-brand)', borderRadius: '50%', animation: 'spin 0.6s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--cal-text-subtle)', fontSize: 14 }}>Loading...</p>
        </div>
      </div>
    </div>
  )

  if (error) return (
    <div className="booking-page-bg">
      <div className="booking-page-card" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>😕</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Event not found</div>
          <div style={{ fontSize: 14, color: 'var(--cal-text-subtle)' }}>{error}</div>
        </div>
      </div>
    </div>
  )

  if (booking) {
    window.location.href = `/booking/${booking.uid}`
    return null
  }

  return (
    <div className="booking-page-bg">
      <div className="booking-page-card">
        {/* Left panel: event info */}
        <div className="booking-info-panel">
          <div className="booking-host-avatar">
            {eventType.host_name?.charAt(0).toUpperCase()}
          </div>
          <div className="booking-host-name">{eventType.host_name}</div>
          <div className="booking-event-title">{eventType.title}</div>
          <div className="booking-meta">
            <div className="booking-meta-item">
              <Clock size={14} />
              <span>{eventType.duration_minutes} minutes</span>
            </div>
            <LocationLabel type={eventType.location_type} value={eventType.location_value} />
          </div>
          {eventType.description && (
            <div className="booking-description">{eventType.description}</div>
          )}
          <div className="divider" />
          {/* Timezone selector */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--cal-text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Timezone</div>
            <select
              className="form-select"
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              style={{ fontSize: 12 }}
            >
              {TIMEZONE_OPTIONS.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
        </div>

        {/* Right panel: calendar + slots or form */}
        <div className="booking-interactive-panel">
          {selectedSlot ? (
            <BookingForm
              eventType={eventType}
              slot={selectedSlot}
              timezone={timezone}
              onBack={() => setSelectedSlot(null)}
              onBooked={(b) => setBooking(b)}
            />
          ) : (
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 260 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
                  Select a date
                </div>
                <Calendar
                  selectedDate={selectedDate}
                  onSelect={setSelectedDate}
                  minDate={today}
                  maxDate={maxDate}
                />
              </div>
              {selectedDate && (
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div className="time-slots-header">
                    {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </div>
                  {slotsLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 38 }} />)}
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
