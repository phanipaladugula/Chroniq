import client from './client'

export const getPublicEventType = (username, slug) =>
  client.get(`/public/${username}/${slug}`).then(r => r.data)

export const getAvailableSlots = (username, slug, date, timezone) =>
  client.get(`/public/${username}/${slug}/slots`, { params: { date, timezone } }).then(r => r.data)

export const createBooking = (username, slug, data) =>
  client.post(`/public/${username}/${slug}/book`, data).then(r => r.data)

export const getBookingConfirmation = (uid) =>
  client.get(`/public/booking/${uid}`).then(r => r.data)

export const cancelBookingPublic = (uid, reason) =>
  client.post(`/public/booking/${uid}/cancel`, { reason }).then(r => r.data)

export const rescheduleBookingPublic = (uid, new_start_time) =>
  client.post(`/public/booking/${uid}/reschedule`, { new_start_time }).then(r => r.data)
