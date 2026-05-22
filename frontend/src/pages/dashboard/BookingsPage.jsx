import { useState, useEffect } from 'react'
import { Calendar, Video, Phone, MapPin, Globe, X, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import * as api from '../../api/bookings'
import * as pubApi from '../../api/public'
import { formatDate, formatTime, getRelativeTime, generateCalendarDays, toDateString, isSameDay, MONTH_NAMES, DAY_NAMES, formatSlot } from '../../utils/dateUtils'

const TABS = ['upcoming', 'past', 'cancelled']

/* ─── Mini Calendar (inline) ─── */
function MiniCalendar({ selectedDate, onSelect }) {
  const today = new Date()
  today.setHours(0,0,0,0)
  const maxDate = new Date(); maxDate.setDate(today.getDate() + 60)
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const days = generateCalendarDays(view.year, view.month)

  const isDisabled = (d) => {
    const dt = new Date(d); dt.setHours(0,0,0,0)
    return dt < today || dt > maxDate
  }
  const prevM = () => setView(v => v.month === 0 ? { year: v.year-1, month: 11 } : { ...v, month: v.month-1 })
  const nextM = () => setView(v => v.month === 11 ? { year: v.year+1, month: 0 } : { ...v, month: v.month+1 })

  return (
    <div>
      <div className="calendar-header">
        <button className="calendar-nav-btn" onClick={prevM}><ChevronLeft size={12} /></button>
        <span className="calendar-month-label" style={{ fontSize: 12 }}>{MONTH_NAMES[view.month]} {view.year}</span>
        <button className="calendar-nav-btn" onClick={nextM}><ChevronRight size={12} /></button>
      </div>
      <div className="calendar-grid">
        {DAY_NAMES.map(d => <div key={d} className="calendar-day-header" style={{ fontSize: 9 }}>{d}</div>)}
        {days.map(({ date, currentMonth }, i) => (
          <button
            key={i}
            className={`calendar-day${selectedDate && isSameDay(date, selectedDate) ? ' selected' : ''}${isSameDay(date, today) && !(selectedDate && isSameDay(date, selectedDate)) ? ' today' : ''}${!currentMonth ? ' outside' : ''}`}
            style={{ fontSize: 11 }}
            disabled={isDisabled(date) || !currentMonth}
            onClick={() => !isDisabled(date) && onSelect(date)}
          >
            {date.getDate()}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ─── Reschedule Modal ─── */
function RescheduleModal({ booking, onRescheduled, onClose }) {
  const [selectedDate, setSelectedDate] = useState(null)
  const [slots, setSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [rescheduling, setRescheduling] = useState(false)

  const slug = booking.event_type?.slug
  const username = 'john'

  useEffect(() => {
    if (!selectedDate || !slug) return
    setSlotsLoading(true)
    pubApi.getAvailableSlots(username, slug, toDateString(selectedDate), booking.booker_timezone || 'Asia/Kolkata')
      .then(data => setSlots(data.slots || []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false))
  }, [selectedDate, slug])

  const handleReschedule = async (slot) => {
    setRescheduling(true)
    try {
      const updated = await api.rescheduleBooking(booking.uid, slot.start_time)
      toast.success('Booking rescheduled!')
      onRescheduled(updated)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setRescheduling(false)
    }
  }

  const tz = booking.booker_timezone || 'Asia/Kolkata'

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 680 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Reschedule Booking</div>
            <div style={{ fontSize: 11, color: 'var(--cal-text-muted)', marginTop: 1 }}>
              with {booking.booker_name} · {booking.event_type?.title}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {/* Current time */}
          <div style={{ background: 'var(--cal-bg-muted)', border: '1px solid var(--cal-border-default)', borderRadius: 6, padding: '10px 12px', marginBottom: 20, fontSize: 12 }}>
            <span style={{ color: 'var(--cal-text-muted)' }}>Current: </span>
            <span style={{ fontWeight: 600, textDecoration: 'line-through', color: 'var(--cal-text-subtle)' }}>
              {formatTime(booking.start_time)} · {new Date(booking.start_time).toLocaleDateString('en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {/* Calendar */}
            <div style={{ minWidth: 230 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--cal-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Select New Date</div>
              <MiniCalendar selectedDate={selectedDate} onSelect={setSelectedDate} />
            </div>

            {/* Slots */}
            {selectedDate && (
              <div style={{ flex: 1, minWidth: 140 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--cal-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
                  {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </div>
                {slotsLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 34 }} />)}
                  </div>
                ) : slots.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--cal-text-muted)' }}>No available slots for this date</p>
                ) : (
                  <div className="time-slots-list" style={{ maxHeight: 280 }}>
                    {slots.map((slot, i) => (
                      <button
                        key={i}
                        className="time-slot-btn"
                        style={{ fontSize: 12 }}
                        onClick={() => handleReschedule(slot)}
                        disabled={rescheduling}
                      >
                        {rescheduling ? <span className="btn-spinner" style={{ display: 'inline-block', marginRight: 5 }} /> : null}
                        {formatSlot(slot.start_time, tz)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!selectedDate && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cal-text-muted)', fontSize: 12 }}>
                ← Select a date to see slots
              </div>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

/* ─── Cancel Modal ─── */
function CancelModal({ booking, onConfirm, onClose }) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const handle = async () => {
    setLoading(true)
    try {
      await api.cancelBooking(booking.uid, reason || null)
      toast.success('Booking cancelled')
      onConfirm(booking.uid)
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
          <span className="modal-title">Cancel Booking</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 13, color: 'var(--cal-text-subtle)', marginBottom: 16 }}>
            Cancel booking with <strong style={{ color: 'var(--cal-text-default)' }}>{booking.booker_name}</strong>?
            They will receive a cancellation email.
          </p>
          <div className="form-group">
            <label className="form-label">Reason <span className="form-label-hint">(optional)</span></label>
            <textarea className="form-textarea" rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for cancellation..." />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Keep</button>
          <button className="btn btn-danger" onClick={handle} disabled={loading}>
            {loading ? <span className="btn-spinner" /> : <X size={13} />}
            Cancel Booking
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Status Badge ─── */
function StatusBadge({ status }) {
  const map = {
    confirmed: <span className="badge badge-success"><span className="badge-dot" />Confirmed</span>,
    cancelled:  <span className="badge badge-error"><span className="badge-dot" />Cancelled</span>,
    rescheduled:<span className="badge" style={{ background: 'rgba(96,165,250,.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,.3)' }}><span className="badge-dot" />Rescheduled</span>,
  }
  return map[status] || <span className="badge badge-default">{status}</span>
}

/* ─── Booking Card ─── */
function BookingCard({ booking, tab, onCancelled, onRescheduled }) {
  const [showCancel, setShowCancel] = useState(false)
  const [showReschedule, setShowReschedule] = useState(false)
  const tz = booking.booker_timezone || 'Asia/Kolkata'
  const start = new Date(booking.start_time)
  const isUpcomingConfirmed = tab === 'upcoming' && booking.status === 'confirmed'

  return (
    <>
      <div className="booking-card">
        {/* Time Column */}
        <div className="booking-time">
          <div className="booking-time-main">{formatTime(booking.start_time)}</div>
          <div className="booking-time-relative" style={{ marginTop: 2 }}>
            {start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
          <div className="booking-time-relative" style={{ marginTop: 2, color: 'var(--cal-info)', fontWeight: 500 }}>
            {getRelativeTime(booking.start_time)}
          </div>
        </div>

        {/* Event Info */}
        <div className="booking-event">
          <div className="booking-event-name">
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: booking.event_type?.color || '#fff', flexShrink: 0, display: 'inline-block' }} />
            <span style={{ fontWeight: 600, fontSize: 13.5 }}>{booking.event_type?.title || 'Meeting'}</span>
            <span style={{ color: 'var(--cal-text-muted)', fontSize: 11 }}>·  {booking.event_type?.duration_minutes}min</span>
          </div>
          <div className="booking-booker">
            with <strong style={{ color: 'var(--cal-text-default)' }}>{booking.booker_name}</strong>
            <span style={{ margin: '0 6px', opacity: 0.3 }}>·</span>
            <span style={{ fontSize: 11 }}>{booking.booker_email}</span>
          </div>
          {booking.meeting_url && (
            <div style={{ marginTop: 4 }}>
              <a href={booking.meeting_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--cal-info)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Video size={11} /> Join meeting
              </a>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="booking-actions">
          <StatusBadge status={booking.status} />
          {isUpcomingConfirmed && (
            <>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowReschedule(true)}
                title="Reschedule"
                style={{ display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <RefreshCw size={11} /> Reschedule
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowCancel(true)}
                style={{ color: 'var(--cal-error)', fontSize: 11 }}
              >
                <X size={11} /> Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {showCancel && (
        <CancelModal
          booking={booking}
          onConfirm={(uid) => { onCancelled(uid); setShowCancel(false) }}
          onClose={() => setShowCancel(false)}
        />
      )}
      {showReschedule && (
        <RescheduleModal
          booking={booking}
          onRescheduled={(updated) => { onRescheduled(updated); setShowReschedule(false) }}
          onClose={() => setShowReschedule(false)}
        />
      )}
    </>
  )
}

function BookingSkeleton() {
  return (
    <div style={{ display: 'flex', gap: 18, padding: '14px 18px', borderBottom: '1px solid var(--cal-border-subtle)' }}>
      <div style={{ minWidth: 130 }}>
        <div className="skeleton" style={{ height: 14, width: 80, marginBottom: 6 }} />
        <div className="skeleton" style={{ height: 11, width: 60 }} />
      </div>
      <div style={{ flex: 1 }}>
        <div className="skeleton" style={{ height: 14, width: '50%', marginBottom: 6 }} />
        <div className="skeleton" style={{ height: 11, width: '35%' }} />
      </div>
      <div style={{ width: 80 }}>
        <div className="skeleton" style={{ height: 20, borderRadius: 99 }} />
      </div>
    </div>
  )
}

export default function BookingsPage() {
  const [tab, setTab] = useState('upcoming')
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)

  const load = (status) => {
    setLoading(true)
    api.getBookings(status)
      .then(data => setBookings(Array.isArray(data) ? data : []))
      .catch(() => toast.error('Failed to load bookings'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(tab) }, [tab])

  const handleCancelled = (uid) => {
    setBookings(prev => prev.filter(b => b.uid !== uid))
  }

  const handleRescheduled = (updated) => {
    // Remove from upcoming (it will reappear at new time on reload)
    setBookings(prev => prev.filter(b => b.uid !== updated.uid))
    toast.success('Booking rescheduled successfully')
    // Reload to get fresh data
    setTimeout(() => load(tab), 500)
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Bookings</h1>
          <p>Manage all your scheduled meetings</p>
        </div>
      </div>

      <div className="tabs">
        {TABS.map(t => (
          <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {!loading && tab === t && bookings.length > 0 && (
              <span className="tab-count">{bookings.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <>{[1,2,3].map(i => <BookingSkeleton key={i} />)}</>
        ) : bookings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Calendar size={20} /></div>
            <div className="empty-state-title">No {tab} bookings</div>
            <div className="empty-state-desc">
              {tab === 'upcoming'
                ? 'Share your booking link to get started.'
                : `No ${tab} bookings to display.`}
            </div>
          </div>
        ) : (
          bookings.map(b => (
            <BookingCard
              key={b.id}
              booking={b}
              tab={tab}
              onCancelled={handleCancelled}
              onRescheduled={handleRescheduled}
            />
          ))
        )}
      </div>
    </>
  )
}
