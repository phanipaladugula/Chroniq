import client from './client'

export const getBookings = (status, page = 1, limit = 20) =>
  client.get('/bookings', { params: { status, page, limit } }).then(r => r.data)
export const getBooking = (uid) => client.get(`/bookings/${uid}`).then(r => r.data)
export const cancelBooking = (uid, reason) => client.patch(`/bookings/${uid}/cancel`, { reason }).then(r => r.data)
export const rescheduleBooking = (uid, new_start_time) => client.patch(`/bookings/${uid}/reschedule`, { new_start_time }).then(r => r.data)
