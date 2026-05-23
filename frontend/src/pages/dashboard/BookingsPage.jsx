import { useState, useEffect, useCallback, useMemo } from 'react'
import { Calendar, X, RefreshCw, ChevronLeft, ChevronRight, Bell, Send, Clock, ExternalLink, Search, Filter, SlidersHorizontal } from 'lucide-react'
import toast from 'react-hot-toast'
import * as api from '../../api/bookings'
import * as pubApi from '../../api/public'
import { useEventTypes } from '../../context/EventTypesContext'
import { formatTime, getRelativeTime, generateCalendarDays, toDateString, isSameDay, MONTH_NAMES, DAY_NAMES, formatSlot } from '../../utils/dateUtils'

const TABS = ['upcoming', 'past', 'cancelled']

/* ─── Mini Calendar ─── */
function MiniCalendar({ selectedDate, onSelect }) {
  const today = new Date(); today.setHours(0,0,0,0)
  const maxDate = new Date(); maxDate.setDate(today.getDate() + 60)
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const days = generateCalendarDays(view.year, view.month)
  const isDisabled = (d) => { const dt = new Date(d); dt.setHours(0,0,0,0); return dt < today || dt > maxDate }
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
          <button key={i} className={`calendar-day${selectedDate && isSameDay(date, selectedDate) ? ' selected' : ''}${isSameDay(date, today) && !(selectedDate && isSameDay(date, selectedDate)) ? ' today' : ''}${!currentMonth ? ' outside' : ''}`} style={{ fontSize: 11 }}
            disabled={isDisabled(date) || !currentMonth} onClick={() => !isDisabled(date) && onSelect(date)}>
            {date.getDate()}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ─── Admin Reschedule Modal ─── */
function RescheduleModal({ booking, onRescheduled, onClose }) {
  const [selectedDate, setSelectedDate] = useState(null)
  const [slots, setSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [rescheduling, setRescheduling] = useState(false)
  const slug = booking.event_type?.slug
  const tz = booking.booker_timezone || 'Asia/Kolkata'

  useEffect(() => {
    if (!selectedDate || !slug) return
    setSlotsLoading(true)
    pubApi.getAvailableSlots('john', slug, toDateString(selectedDate), tz)
      .then(data => setSlots(data.slots || []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false))
  }, [selectedDate, slug, tz])

  const handleReschedule = async (slot) => {
    setRescheduling(true)
    try {
      const updated = await api.rescheduleBooking(booking.uid, slot.start_time)
      toast.success('Booking rescheduled!')
      onRescheduled(updated)
    } catch (err) { toast.error(err.message) }
    finally { setRescheduling(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 680 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Reschedule Booking</div>
            <div style={{ fontSize: 11, color: 'var(--cal-text-muted)', marginTop: 2 }}>
              {booking.booker_name} · {booking.event_type?.title}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ background: 'var(--cal-bg-muted)', borderRadius: 6, padding: '10px 12px', marginBottom: 18, fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={13} style={{ color: 'var(--cal-text-muted)' }} />
            <span style={{ color: 'var(--cal-text-muted)' }}>Current: </span>
            <span style={{ fontWeight: 600, textDecoration: 'line-through', color: 'var(--cal-text-subtle)' }}>
              {new Date(booking.start_time).toLocaleString('en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 230 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--cal-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Select New Date</div>
              <MiniCalendar selectedDate={selectedDate} onSelect={setSelectedDate} />
            </div>
            {selectedDate ? (
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
                      <button key={i} className="time-slot-btn" style={{ fontSize: 12 }} onClick={() => handleReschedule(slot)} disabled={rescheduling}>
                        {rescheduling && <span className="btn-spinner" style={{ display: 'inline-block', marginRight: 5, width: 10, height: 10 }} />}
                        {formatSlot(slot.start_time, tz)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cal-text-muted)', fontSize: 12 }}>
                ← Pick a date to see available slots
              </div>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
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
    } catch (err) { toast.error(err.message) }
    finally { setLoading(false) }
  }
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 380 }}>
        <div className="modal-header"><span className="modal-title">Cancel Booking</span><button className="modal-close" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          <p style={{ fontSize: 13, color: 'var(--cal-text-subtle)', marginBottom: 16 }}>
            Cancel booking with <strong style={{ color: 'var(--cal-text-default)' }}>{booking.booker_name}</strong>? They will receive a cancellation email.
          </p>
          <div className="form-group">
            <label className="form-label">Reason <span className="form-label-hint">(optional)</span></label>
            <textarea className="form-textarea" rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for cancellation..." />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Keep</button>
          <button className="btn btn-danger" onClick={handle} disabled={loading}>
            {loading ? <span className="btn-spinner" /> : <X size={13} />} Cancel Booking
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Request Modal (reschedule/cancel request to client) ─── */
function RequestModal({ booking, type, onClose }) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const isReschedule = type === 'reschedule'

  const handle = async () => {
    setLoading(true)
    try {
      if (isReschedule) {
        await api.requestReschedule(booking.uid, message || null)
        toast.success(`Reschedule request sent to ${booking.booker_email}`)
      } else {
        await api.requestCancel(booking.uid, message || null)
        toast.success(`Cancel request sent to ${booking.booker_email}`)
      }
      onClose()
    } catch (err) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <span className="modal-title">{isReschedule ? '📅 Request Reschedule' : '⚠️ Request Cancellation'}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ background: 'var(--cal-bg-muted)', borderRadius: 6, padding: '10px 12px', marginBottom: 16, fontSize: 12 }}>
            Sending email to <strong style={{ color: 'var(--cal-text-default)' }}>{booking.booker_name}</strong> ({booking.booker_email})
          </div>
          <div className="form-group">
            <label className="form-label">
              {isReschedule ? 'Why do you need to reschedule?' : 'Why do you need to cancel?'}
              <span className="form-label-hint">(optional)</span>
            </label>
            <textarea className="form-textarea" rows={3} value={message} onChange={e => setMessage(e.target.value)}
              placeholder={isReschedule ? "I have a conflict at the scheduled time..." : "Unfortunately something came up..."} />
            <div className="form-hint">This message will be included in the email to the client.</div>
          </div>
          <div style={{ background: isReschedule ? 'rgba(251,191,36,.06)' : 'rgba(248,113,113,.06)', border: `1px solid ${isReschedule ? 'rgba(251,191,36,.15)' : 'rgba(248,113,113,.15)'}`, borderRadius: 6, padding: '10px 12px', fontSize: 12, color: 'var(--cal-text-subtle)' }}>
            ℹ️ The client will receive an email with a link to {isReschedule ? 'pick a new time' : 'confirm the cancellation'}. The meeting will NOT be automatically changed.
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handle} disabled={loading}>
            {loading ? <span className="btn-spinner" /> : <Send size={13} />}
            Send Request Email
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Recent Bookings Notification Panel ─── */
function RecentPanel({ onClose }) {
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getRecentBookings(8)
      .then(data => setRecent(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 320, background: 'var(--cal-bg-card)', border: '1px solid var(--cal-border-default)', borderRadius: 12, boxShadow: 'var(--shadow-lg)', zIndex: 100, overflow: 'hidden', animation: 'fadeIn .15s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--cal-border-subtle)' }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--cal-text-default)' }}>Recent Bookings</span>
        <button className="modal-close" onClick={onClose} style={{ width: 22, height: 22, fontSize: 12 }}>✕</button>
      </div>
      {loading ? (
        <div style={{ padding: 14 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 44, marginBottom: 6, borderRadius: 6 }} />)}
        </div>
      ) : recent.length === 0 ? (
        <div style={{ padding: '20px 14px', textAlign: 'center', fontSize: 12, color: 'var(--cal-text-muted)' }}>No bookings yet</div>
      ) : (
        <div style={{ maxHeight: 340, overflowY: 'auto' }}>
          {recent.map(b => (
            <div key={b.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--cal-border-subtle)' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: b.event_type?.color || '#fff', flexShrink: 0, marginTop: 5 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--cal-text-default)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {b.booker_name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--cal-text-muted)' }}>{b.event_type?.title}</div>
                <div style={{ fontSize: 10.5, color: 'var(--cal-info)', marginTop: 2 }}>
                  {new Date(b.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </div>
              </div>
              <div style={{ fontSize: 10, color: 'var(--cal-text-muted)', flexShrink: 0, marginTop: 2 }}>
                {getRelativeTime(b.created_at || b.start_time)}
              </div>
            </div>
          ))}
        </div>
      )}
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
  const [showReqReschedule, setShowReqReschedule] = useState(false)
  const [showReqCancel, setShowReqCancel] = useState(false)
  const tz = booking.booker_timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
  const start = new Date(booking.start_time)
  const isUpcomingConfirmed = tab === 'upcoming' && booking.status === 'confirmed'

  return (
    <>
      <div className="booking-card">
        {/* Time */}
        <div className="booking-time">
          <div className="booking-time-main">
            {start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short' })}
          </div>
          <div className="booking-time-relative" style={{ marginTop: 2 }}>
            {start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
          {/* Booker's timezone badge */}
          {booking.booker_timezone && (
            <div style={{ marginTop: 6, fontSize: 10, color: 'var(--cal-text-muted)', background: 'var(--cal-bg-muted)', padding: '2px 6px', borderRadius: 4, display: 'inline-block' }}>
              Booked as: {start.toLocaleTimeString('en-US', { timeZone: booking.booker_timezone, hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short' })}
            </div>
          )}
          <div className="booking-time-relative" style={{ marginTop: 2, color: 'var(--cal-info)', fontWeight: 500 }}>
            {getRelativeTime(booking.start_time)}
          </div>
        </div>

        {/* Event */}
        <div className="booking-event">
          <div className="booking-event-name">
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: booking.event_type?.color || '#fff', flexShrink: 0, display: 'inline-block' }} />
            <span style={{ fontWeight: 600, fontSize: 13.5 }}>{booking.event_type?.title || 'Meeting'}</span>
            <span style={{ color: 'var(--cal-text-muted)', fontSize: 11 }}>· {booking.event_type?.duration_minutes}min</span>
          </div>
          <div className="booking-booker">
            with <strong style={{ color: 'var(--cal-text-default)' }}>{booking.booker_name}</strong>
            <span style={{ margin: '0 5px', opacity: 0.3 }}>·</span>
            <a href={`mailto:${booking.booker_email}`} style={{ fontSize: 11, color: 'var(--cal-text-muted)' }}>{booking.booker_email}</a>
          </div>
          {/* Action buttons row */}
          {isUpcomingConfirmed && (
            <div className="booking-card-actions">
              {/* Admin direct actions */}
              <button className="btn btn-secondary btn-sm" style={{ fontSize: 11 }} onClick={() => setShowReschedule(true)}>
                <RefreshCw size={10} /> Reschedule
              </button>
              <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--cal-error)' }} onClick={() => setShowCancel(true)}>
                <X size={10} /> Cancel
              </button>
              {/* Request from client */}
              <span style={{ width: 1, background: 'var(--cal-border-default)', margin: '0 3px', alignSelf: 'stretch' }} />
              <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--cal-warning)' }} onClick={() => setShowReqReschedule(true)} title="Send email asking client to reschedule">
                <Send size={10} /> Req. Reschedule
              </button>
              <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--cal-text-subtle)' }} onClick={() => setShowReqCancel(true)} title="Send email asking client to cancel">
                <Send size={10} /> Req. Cancel
              </button>
            </div>
          )}
        </div>

        {/* Status + public link */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
          <StatusBadge status={booking.status} />
          <a href={`/booking/${booking.uid}`} target="_blank" rel="noreferrer" style={{ fontSize: 10.5, color: 'var(--cal-text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
            <ExternalLink size={10} /> View
          </a>
        </div>
      </div>

      {showCancel && <CancelModal booking={booking} onConfirm={(uid) => { onCancelled(uid); setShowCancel(false) }} onClose={() => setShowCancel(false)} />}
      {showReschedule && <RescheduleModal booking={booking} onRescheduled={(upd) => { onRescheduled(upd); setShowReschedule(false) }} onClose={() => setShowReschedule(false)} />}
      {showReqReschedule && <RequestModal booking={booking} type="reschedule" onClose={() => setShowReqReschedule(false)} />}
      {showReqCancel && <RequestModal booking={booking} type="cancel" onClose={() => setShowReqCancel(false)} />}
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
        <div className="skeleton" style={{ height: 14, width: '55%', marginBottom: 6 }} />
        <div className="skeleton" style={{ height: 11, width: '38%' }} />
      </div>
      <div style={{ width: 80 }}><div className="skeleton" style={{ height: 20, borderRadius: 99 }} /></div>
    </div>
  )
}

/* ─── Filter Bar ─── */
function FilterBar({ query, onQueryChange, eventTypeFilter, onEventTypeChange, eventTypes }) {
  return (
    <div className="bookings-filter-bar">
      <div className="bookings-search-wrap">
        <Search size={13} className="bookings-search-icon" />
        <input
          className="bookings-search-input"
          type="text"
          placeholder="Search by name, email…"
          value={query}
          onChange={e => onQueryChange(e.target.value)}
        />
        {query && (
          <button className="bookings-search-clear" onClick={() => onQueryChange('')}>
            <X size={11} />
          </button>
        )}
      </div>
        <div className="bookings-filter-select-wrap">
          <SlidersHorizontal size={12} style={{ color: 'var(--cal-text-muted)' }} />
          <select
            className="bookings-filter-select"
            value={eventTypeFilter}
            onChange={e => onEventTypeChange(e.target.value)}
          >
            <option value="">All event types</option>
            {eventTypes.map(et => (
              <option key={et.id} value={et.title}>{et.title}</option>
            ))}
          </select>
        </div>
    </div>
  )
}

/* ─── Main Page ─── */
export default function BookingsPage() {
  const [tab, setTab] = useState('upcoming')
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNotif, setShowNotif] = useState(false)
  const [recentCount, setRecentCount] = useState(0)
  const [query, setQuery] = useState('')
  const [eventTypeFilter, setEventTypeFilter] = useState('')
  const { eventTypes } = useEventTypes()

  const load = useCallback((status) => {
    setLoading(true)
    api.getBookings(status)
      .then(data => setBookings(Array.isArray(data) ? data : []))
      .catch(() => toast.error('Failed to load bookings'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    setQuery('')
    setEventTypeFilter('')
    load(tab)
  }, [tab, load])

  // Fetch & auto-poll recent count every 30 s so new bookings show up without refresh
  const refreshRecent = useCallback(() => {
    api.getRecentBookings(5)
      .then(data => setRecentCount(Array.isArray(data) ? data.length : 0))
      .catch(() => {})
  }, [])

  useEffect(() => {
    refreshRecent()
    const id = setInterval(refreshRecent, 30_000)
    return () => clearInterval(id)
  }, [refreshRecent])

  const handleCancelled = (uid) => {
    setBookings(prev => prev.filter(b => b.uid !== uid))
    refreshRecent()
  }

  const handleRescheduled = (updated) => {
    setBookings(prev => {
      const next = prev.map(b => b.uid === updated.uid ? { ...b, ...updated } : b)
      // Re-sort: upcoming → asc, past/cancelled → desc
      const isUpcoming = tab === 'upcoming'
      next.sort((a, b) => {
        const ta = new Date(a.start_time).getTime()
        const tb = new Date(b.start_time).getTime()
        return isUpcoming ? ta - tb : tb - ta
      })
      return next
    })
    refreshRecent()
  }

  // Filtered bookings
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return bookings.filter(b => {
      const matchQuery = !q || (
        b.booker_name?.toLowerCase().includes(q) ||
        b.booker_email?.toLowerCase().includes(q) ||
        b.event_type?.title?.toLowerCase().includes(q)
      )
      const matchEventType = !eventTypeFilter || b.event_type?.title === eventTypeFilter
      return matchQuery && matchEventType
    })
  }, [bookings, query, eventTypeFilter])

  const hasFilters = query || eventTypeFilter
  const showFilterBar = !loading && bookings.length > 0

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Bookings</h1>
          <p>Manage all your scheduled meetings</p>
        </div>
        {/* Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setShowNotif(s => !s)}
            style={{ position: 'relative' }}
            title="Recent bookings"
          >
            <Bell size={14} />
            <span className="btn-label-hide-xs">Recent</span>
            {recentCount > 0 && (
              <span style={{ position: 'absolute', top: -6, right: -6, background: 'var(--cal-success)', color: '#111', width: 16, height: 16, borderRadius: '50%', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {recentCount}
              </span>
            )}
          </button>
          {showNotif && <RecentPanel onClose={() => setShowNotif(false)} />}
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

      {/* Filter bar */}
      {showFilterBar && (
        <FilterBar
          query={query}
          onQueryChange={setQuery}
          eventTypeFilter={eventTypeFilter}
          onEventTypeChange={setEventTypeFilter}
          eventTypes={eventTypes}
        />
      )}

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <>{[1,2,3].map(i => <BookingSkeleton key={i} />)}</>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              {hasFilters ? <Search size={20} /> : <Calendar size={20} />}
            </div>
            <div className="empty-state-title">
              {hasFilters ? 'No matches found' : `No ${tab} bookings`}
            </div>
            <div className="empty-state-desc">
              {hasFilters
                ? 'Try adjusting your search or filter.'
                : tab === 'upcoming' ? 'Share your booking link to get started.' : `No ${tab} bookings to display.`}
            </div>
            {hasFilters && (
              <button className="btn btn-secondary btn-sm" onClick={() => { setQuery(''); setEventTypeFilter('') }}>
                <X size={12} /> Clear filters
              </button>
            )}
          </div>
        ) : (
          filtered.map(b => (
            <BookingCard key={b.id} booking={b} tab={tab}
              onCancelled={handleCancelled} onRescheduled={handleRescheduled} />
          ))
        )}
      </div>
    </>
  )
}
