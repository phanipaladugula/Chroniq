import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { getBookingConfirmation, getAvailableSlots, rescheduleBookingPublic } from '../../api/public'
import { generateCalendarDays, toDateString, isSameDay, MONTH_NAMES, DAY_NAMES, formatSlot } from '../../utils/dateUtils'

function Calendar({ selectedDate, onSelect, minDate, maxDate }) {
  const today = new Date()
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const days = generateCalendarDays(view.year, view.month)
  const prevMonth = () => setView(v => v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 })
  const nextMonth = () => setView(v => v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 })
  const isDisabled = (d) => { const dt = new Date(d); dt.setHours(0,0,0,0); return dt < minDate || dt > maxDate }

  return (
    <div>
      <div className="calendar-header">
        <button className="calendar-nav-btn" onClick={prevMonth}><ChevronLeft size={14} /></button>
        <span className="calendar-month-label">{MONTH_NAMES[view.month]} {view.year}</span>
        <button className="calendar-nav-btn" onClick={nextMonth}><ChevronRight size={14} /></button>
      </div>
      <div className="calendar-grid">
        {DAY_NAMES.map(d => <div key={d} className="calendar-day-header">{d}</div>)}
        {days.map(({ date, currentMonth }, i) => (
          <button
            key={i}
            className={`calendar-day${selectedDate && isSameDay(date, selectedDate) ? ' selected' : ''}${isSameDay(date, today) && !(selectedDate && isSameDay(date, selectedDate)) ? ' today' : ''}${!currentMonth ? ' outside' : ''}`}
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

export default function ReschedulePage() {
  const { uid } = useParams()
  const navigate = useNavigate()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(null)
  const [slots, setSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [rescheduling, setRescheduling] = useState(false)

  const today = new Date()
  today.setHours(0,0,0,0)
  const maxDate = new Date(); maxDate.setDate(maxDate.getDate() + 60)

  useEffect(() => {
    getBookingConfirmation(uid)
      .then(setBooking)
      .catch(() => toast.error('Booking not found'))
      .finally(() => setLoading(false))
  }, [uid])

  useEffect(() => {
    if (!selectedDate || !booking) return
    const username = 'john'
    const slug = booking.event_type?.slug
    if (!slug) return
    setSlotsLoading(true)
    getAvailableSlots(username, slug, toDateString(selectedDate), booking.booker_timezone)
      .then(data => setSlots(data.slots || []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false))
  }, [selectedDate, booking])

  const handleReschedule = async (slot) => {
    setRescheduling(true)
    try {
      const updated = await rescheduleBookingPublic(uid, slot.start_time)
      toast.success('Booking rescheduled!')
      // Navigate to the (possibly same) uid — in-place update keeps uid stable
      window.location.href = `/booking/${updated.uid}`
    } catch (err) {
      toast.error(err.message)
    } finally {
      setRescheduling(false)
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

  const tz = booking?.booker_timezone || 'Asia/Kolkata'

  return (
    <div className="booking-page-bg">
      <div className="booking-page-card" style={{ flexDirection: 'column', maxWidth: 680 }}>
        <div style={{ padding: '28px 28px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, background: 'var(--cal-bg-muted)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RefreshCw size={16} style={{ color: 'var(--cal-text-subtle)' }} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Reschedule Meeting</div>
              <div style={{ fontSize: 13, color: 'var(--cal-text-subtle)' }}>{booking?.event_type?.title}</div>
            </div>
          </div>
          <div className="divider" />
        </div>
        <div style={{ padding: '24px 28px', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 260 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Select a new date</div>
            <Calendar selectedDate={selectedDate} onSelect={setSelectedDate} minDate={today} maxDate={maxDate} />
          </div>
          {selectedDate && (
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>
              {slotsLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 38 }} />)}
                </div>
              ) : slots.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--cal-text-muted)' }}>No available slots</p>
              ) : (
                <div className="time-slots-list">
                  {slots.map((slot, i) => (
                    <button key={i} className="time-slot-btn" onClick={() => handleReschedule(slot)} disabled={rescheduling}>
                      {rescheduling ? <span className="btn-spinner" style={{ display: 'inline-block', marginRight: 6 }} /> : null}
                      {formatSlot(slot.start_time, tz)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div style={{ padding: '0 28px 24px' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>← Back</button>
        </div>
      </div>
    </div>
  )
}
