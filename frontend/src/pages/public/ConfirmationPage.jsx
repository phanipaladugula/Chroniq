import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { CheckCircle, Calendar, Clock, MapPin, Video, Phone, Globe, User } from 'lucide-react'
import { getBookingConfirmation } from '../../api/public'
import { formatDateTime } from '../../utils/dateUtils'

function LocationText({ type, value }) {
  const labels = { google_meet: 'Google Meet', zoom: 'Zoom', phone: 'Phone Call', in_person: 'In Person', custom: value || 'Custom' }
  return labels[type] || type
}

export default function ConfirmationPage() {
  const { uid } = useParams()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getBookingConfirmation(uid)
      .then(setBooking)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [uid])

  if (loading) return (
    <div className="confirmation-page">
      <div className="confirmation-card">
        <div style={{ textAlign: 'center', padding: 20 }}>
          <div style={{ width: 32, height: 32, border: '3px solid var(--cal-border-default)', borderTopColor: 'var(--cal-brand)', borderRadius: '50%', animation: 'spin 0.6s linear infinite', margin: '0 auto' }} />
        </div>
      </div>
    </div>
  )

  if (error || !booking) return (
    <div className="confirmation-page">
      <div className="confirmation-card">
        <div style={{ fontSize: 32, marginBottom: 12, textAlign: 'center' }}>😕</div>
        <div style={{ fontSize: 16, fontWeight: 600, textAlign: 'center', marginBottom: 8 }}>Booking not found</div>
        <div style={{ fontSize: 14, color: 'var(--cal-text-subtle)', textAlign: 'center' }}>{error}</div>
      </div>
    </div>
  )

  const tz = booking?.booker_timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
  const isCancelled = booking.status === 'cancelled'

  return (
    <div className="confirmation-page">
      <div className="confirmation-card">
        {/* Icon */}
        <div className={`confirmation-icon`} style={{ background: isCancelled ? 'var(--cal-error-bg)' : 'var(--cal-success-bg)', color: isCancelled ? 'var(--cal-error)' : 'var(--cal-success)' }}>
          {isCancelled ? '✕' : <CheckCircle size={28} />}
        </div>

        <div className="confirmation-title">
          {isCancelled ? 'Booking Cancelled' : 'Booking Confirmed!'}
        </div>
        <div className="confirmation-subtitle">
          {isCancelled
            ? `This meeting has been cancelled.${booking.cancellation_reason ? ` Reason: ${booking.cancellation_reason}` : ''}`
            : `A confirmation email has been sent to ${booking.booker_email}`
          }
        </div>

        {/* Details */}
        <div className="confirmation-details">
          <div className="confirmation-detail-row">
            <div className="confirmation-detail-icon"><Calendar size={14} /></div>
            <div>
              <div className="confirmation-detail-label">Event</div>
              <div className="confirmation-detail-value">{booking.event_type?.title}</div>
            </div>
          </div>
          <div className="confirmation-detail-row">
            <div className="confirmation-detail-icon"><Clock size={14} /></div>
            <div>
              <div className="confirmation-detail-label">When</div>
              <div className="confirmation-detail-value">{formatDateTime(booking.start_time, tz)}</div>
            </div>
          </div>
          <div className="confirmation-detail-row">
            <div className="confirmation-detail-icon"><User size={14} /></div>
            <div>
              <div className="confirmation-detail-label">With</div>
              <div className="confirmation-detail-value">{booking.booker_name}</div>
            </div>
          </div>
          {booking.meeting_url && (
            <div className="confirmation-detail-row">
              <div className="confirmation-detail-icon"><Video size={14} /></div>
              <div>
                <div className="confirmation-detail-label">Meeting Link</div>
                <div className="confirmation-detail-value">
                  <a href={booking.meeting_url} target="_blank" rel="noreferrer" style={{ color: 'var(--cal-info)' }}>
                    Join meeting
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {!isCancelled && (
          <div className="confirmation-actions">
            <Link to={`/booking/${uid}/reschedule`} className="btn btn-secondary">Reschedule</Link>
            <Link to={`/booking/${uid}/cancel`} className="btn btn-ghost" style={{ color: 'var(--cal-error)' }}>Cancel</Link>
          </div>
        )}
        {isCancelled && booking.event_type && (
          <div className="confirmation-actions">
            <Link to={`/john/${booking.event_type.slug}`} className="btn btn-primary">Book Again</Link>
          </div>
        )}
      </div>
    </div>
  )
}
