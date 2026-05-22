import client from './client'

export const getSchedules = () => client.get('/availability/schedules').then(r => r.data)
export const getSchedule = (id) => client.get(`/availability/schedules/${id}`).then(r => r.data)
export const createSchedule = (data) => client.post('/availability/schedules', data).then(r => r.data)
export const updateSchedule = (id, data) => client.put(`/availability/schedules/${id}`, data).then(r => r.data)
export const deleteSchedule = (id) => client.delete(`/availability/schedules/${id}`)
export const setDefaultSchedule = (id) => client.patch(`/availability/schedules/${id}/default`).then(r => r.data)
export const addOverride = (scheduleId, data) => client.post(`/availability/schedules/${scheduleId}/overrides`, data).then(r => r.data)
export const removeOverride = (overrideId) => client.delete(`/availability/overrides/${overrideId}`)
