export const DURATIONS = [
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '60 min', value: 60 },
  { label: '90 min', value: 90 },
  { label: '120 min', value: 120 },
]

export const LOCATION_TYPES = [
  { label: 'Google Meet', value: 'google_meet' },
  { label: 'Zoom', value: 'zoom' },
  { label: 'Phone', value: 'phone' },
  { label: 'In Person', value: 'in_person' },
  { label: 'Custom', value: 'custom' },
]

export const PRESET_COLORS = [
  '#111827', '#4f46e5', '#0891b2', '#059669',
  '#d97706', '#dc2626', '#7c3aed', '#db2777',
  '#0369a1', '#047857', '#b45309', '#9333ea',
]

export const DAYS_OF_WEEK = [
  { label: 'Monday', short: 'Mon', value: 0 },
  { label: 'Tuesday', short: 'Tue', value: 1 },
  { label: 'Wednesday', short: 'Wed', value: 2 },
  { label: 'Thursday', short: 'Thu', value: 3 },
  { label: 'Friday', short: 'Fri', value: 4 },
  { label: 'Saturday', short: 'Sat', value: 5 },
  { label: 'Sunday', short: 'Sun', value: 6 },
]

export const TIMEZONE_OPTIONS = [
  'Asia/Kolkata', 'Asia/Kolkata',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
  'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Singapore', 'Asia/Dubai',
  'Australia/Sydney', 'Pacific/Auckland', 'America/Sao_Paulo',
  'Africa/Cairo', 'Africa/Johannesburg', 'UTC',
].filter((v, i, a) => a.indexOf(v) === i)

export const DEFAULT_USER = { name: 'John Doe', email: 'john@example.com', username: 'john' }
