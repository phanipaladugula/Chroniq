import { useState, useEffect } from 'react'
import { Calendar, Video, Phone, MapPin, Globe, Clock, X } from 'lucide-react'
import toast from 'react-hot-toast'
import * as api from '../../api/bookings'
import { formatDateTime, formatDate, getRelativeTime, formatTime } from '../../utils/dateUtils'

const TABS = ['upcoming', 'past', 'cancelled']

function LocationIcon({ type, size = 14 }) {
  const icons = { google_meet: Video, zoom: Video, phone: Phone, in_person: MapPin, custom: Globe }
  const Icon = icons[type] || Globe
  return <Icon size={size} style={{ color: 'var(--cal-text-muted)' }} />
}

function StatusBadge({ status }) {
  const map = {
    confirmed: <span className="badge badge-success"><span className="badge-dot" />Confirmed</span>,
    cancelled: <span className="badge badge-error"><span className="badge-dot" />Cancelled</span>,
    rescheduled: <span className="badge badge-warning"><span className="badge-dot" />Rescheduled</span>,
  }
  return map[status] || <span className="badge badge-default">{status}</span>
}

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
          <p style={{ fontSize: 14, color: 'var(--cal-text-subtle)', marginBottom: 16 }}>
            Cancel booking with <strong>{booking.booker_name}</strong>?
          </p>
          <div className="form-group">
            <label className="form-label">Reason <span className="form-label-hint">(optional)</span></label>
            <textarea className="form-textarea" rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for cancellation..." />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Keep</button>
          <button className="btn btn-danger" onClick={handle} disabled={loading}>
            {loading ? <span className="btn-spinner" /> : <X size={14} />}
            Cancel Booking
          </button>
        </div>
      </div>
    </div>
  )
}

function BookingCard({ booking, tab, onCancelled }) {
  const [showCancel, setShowCancel] = useState(false)
  const tz = booking.booker_timezone || 'Asia/Kolkata'
  const start = new Date(booking.start_time)

  return (
    <>
      <div className="booking-card">
        {/* Time */}
        <div className="booking-time">
          <div className="booking-time-main">{formatTime(booking.start_time)}</div>
          <div className="booking-time-relative" style={{ fontSize: 11 }}>
            {formatDate(booking.start_time).split(',')[0]}, {start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
          <div className="booking-time-relative">{getRelativeTime(booking.start_time)}</div>
        </div>

        {/* Event info */}
        <div className="booking-event">
          <div className="booking-event-name">
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: booking.event_type?.color || '#111827', flexShrink: 0 }} />
            <span style={{ fontWeight: 600 }}>{booking.event_type?.title || 'Meeting'}</span>
            <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--cal-text-muted)' }}>
              · {booking.event_type?.duration_minutes}min
            </span>
          </div>
          <div className="booking-booker">
            with <strong>{booking.booker_name}</strong>
            <span style={{ margin: '0 6px', opacity: 0.4 }}>·</span>
            <span style={{ fontSize: 12 }}>{booking.booker_email}</span>
          </div>
          {booking.meeting_url && (
            <div style={{ marginTop: 4 }}>
              <a href={booking.meeting_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--cal-info)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <LocationIcon type={booking.event_type?.location_type} />
                Join meeting
              </a>
            </div>
          )}
        </div>

        {/* Status + actions */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <StatusBadge status={booking.status} />
          {tab === 'upcoming' && booking.status === 'confirmed' && (
            <button className="btn btn-ghost btn-sm" onClick={() => setShowCancel(true)} style={{ color: 'var(--cal-error)', fontSize: 12 }}>
              Cancel
            </button>
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
    </>
  )
}

function BookingSkeleton() {
  return (
    <div style={{ display: 'flex', gap: 20, padding: '16px 20px', borderBottom: '1px solid var(--cal-border-subtle)' }}>
      <div style={{ minWidth: 120 }}>
        <div className="skeleton" style={{ height: 14, width: 80, marginBottom: 6 }} />
        <div className="skeleton" style={{ height: 11, width: 60 }} />
      </div>
      <div style={{ flex: 1 }}>
        <div className="skeleton" style={{ height: 14, width: '50%', marginBottom: 6 }} />
        <div className="skeleton" style={{ height: 11, width: '30%' }} />
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
    if (tab === 'upcoming') setBookings(prev => prev.filter(b => b.uid !== uid))
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Bookings</h1>
          <p>Manage your scheduled meetings</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {TABS.map(t => (
          <button
            key={t}
            className={`tab-btn${tab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {!loading && bookings.length > 0 && tab === t && (
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
            <div className="empty-state-icon"><Calendar size={22} /></div>
            <div className="empty-state-title">No {tab} bookings</div>
            <div className="empty-state-desc">
              {tab === 'upcoming' ? 'Share your booking link to get started.' : `No ${tab} bookings to show.`}
            </div>
          </div>
        ) : (
          bookings.map(b => (
            <BookingCard key={b.id} booking={b} tab={tab} onCancelled={handleCancelled} />
          ))
        )}
      </div>
    </>
  )
}
