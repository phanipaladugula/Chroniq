import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { getBookingConfirmation, cancelBookingPublic } from '../../api/public'
import { formatDateTime } from '../../utils/dateUtils'

export default function CancelPage() {
  const { uid } = useParams()
  const navigate = useNavigate()
  const [booking, setBooking] = useState(null)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    getBookingConfirmation(uid)
      .then(setBooking)
      .catch(() => toast.error('Booking not found'))
      .finally(() => setLoading(false))
  }, [uid])

  const handleCancel = async () => {
    setCancelling(true)
    try {
      await cancelBookingPublic(uid, reason || null)
      toast.success('Booking cancelled')
      navigate(`/booking/${uid}`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setCancelling(false)
    }
  }

  if (loading) return (
    <div className="confirmation-page">
      <div className="confirmation-card">
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 28, height: 28, border: '3px solid var(--cal-border-default)', borderTopColor: 'var(--cal-brand)', borderRadius: '50%', animation: 'spin 0.6s linear infinite', margin: '0 auto' }} />
        </div>
      </div>
    </div>
  )

  const tz = booking?.booker_timezone || Intl.DateTimeFormat().resolvedOptions().timeZone

  return (
    <div className="confirmation-page">
      <div className="confirmation-card">
        <div className="confirmation-icon" style={{ background: 'var(--cal-error-bg)', color: 'var(--cal-error)' }}>
          <AlertTriangle size={24} />
        </div>
        <div className="confirmation-title">Cancel Booking</div>
        <div className="confirmation-subtitle">
          Are you sure you want to cancel this meeting?
        </div>

        {booking && (
          <div className="confirmation-details">
            <div className="confirmation-detail-row">
              <div>
                <div className="confirmation-detail-label">Event</div>
                <div className="confirmation-detail-value">{booking.event_type?.title}</div>
              </div>
            </div>
            <div className="confirmation-detail-row">
              <div>
                <div className="confirmation-detail-label">Scheduled for</div>
                <div className="confirmation-detail-value">{formatDateTime(booking.start_time, tz)}</div>
              </div>
            </div>
          </div>
        )}

        <div className="form-group" style={{ textAlign: 'left', marginBottom: 20 }}>
          <label className="form-label">Reason for cancellation <span className="form-label-hint">(optional)</span></label>
          <textarea className="form-textarea" rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="Let them know why you're cancelling..." />
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>Keep Meeting</button>
          <button className="btn btn-danger" onClick={handleCancel} disabled={cancelling}>
            {cancelling ? <span className="btn-spinner" /> : null}
            Cancel Booking
          </button>
        </div>
      </div>
    </div>
  )
}
