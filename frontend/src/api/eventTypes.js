import client from './client'

export const getEventTypes = () => client.get('/event-types').then(r => r.data)
export const getEventType = (id) => client.get(`/event-types/${id}`).then(r => r.data)
export const createEventType = (data) => client.post('/event-types', data).then(r => r.data)
export const updateEventType = (id, data) => client.put(`/event-types/${id}`, data).then(r => r.data)
export const deleteEventType = (id) => client.delete(`/event-types/${id}`)
export const toggleEventType = (id, is_active) => client.patch(`/event-types/${id}/toggle`, { is_active }).then(r => r.data)
