// Date formatting utilities

export function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

export function formatTime(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export function formatDateTime(dateStr, tz) {
  const d = new Date(dateStr)
  return d.toLocaleString('en-US', {
    timeZone: tz,
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true
  })
}

export function formatSlot(dateStr, tz) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()
}

export function getRelativeTime(dateStr) {
  const now = new Date()
  const d = new Date(dateStr)
  const diffMs = d - now
  const diffMins = Math.round(diffMs / 60000)
  const diffHours = Math.round(diffMs / 3600000)
  const diffDays = Math.round(diffMs / 86400000)

  if (Math.abs(diffMins) < 1) return 'just now'
  if (diffMins > 0) {
    if (diffMins < 60) return `in ${diffMins}m`
    if (diffHours < 24) return `in ${diffHours}h`
    if (diffDays === 1) return 'tomorrow'
    return `in ${diffDays} days`
  } else {
    if (Math.abs(diffMins) < 60) return `${Math.abs(diffMins)}m ago`
    if (Math.abs(diffHours) < 24) return `${Math.abs(diffHours)}h ago`
    if (Math.abs(diffDays) === 1) return 'yesterday'
    return `${Math.abs(diffDays)} days ago`
  }
}

export function generateCalendarDays(year, month) {
  // month is 0-indexed
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const days = []

  // Days from previous month to fill week start (Monday-based)
  let startDow = firstDay.getDay() // 0=Sun
  startDow = startDow === 0 ? 6 : startDow - 1 // convert to Mon=0
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month, -i)
    days.push({ date: d, currentMonth: false })
  }

  // Current month days
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({ date: new Date(year, month, d), currentMonth: true })
  }

  // Fill remaining slots to complete last row
  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    days.push({ date: new Date(year, month + 1, i), currentMonth: false })
  }

  return days
}

export function toDateString(date) {
  // Returns YYYY-MM-DD in local time
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

export const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
export const DAY_NAMES = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
