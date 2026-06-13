import api from './axios'
import type { Court, Schedule, CourtAvailability } from '../types/court'

export async function listCourts(params?: { active?: boolean; type?: string }): Promise<Court[]> {
  const res = await api.get<Court[]>('/courts', { params })
  return res.data
}

export async function getCourt(id: string): Promise<Court> {
  const res = await api.get<Court>(`/courts/${id}`)
  return res.data
}

export async function createCourt(data: Partial<Court>): Promise<Court> {
  const res = await api.post<Court>('/courts', data)
  return res.data
}

export async function updateCourt(id: string, data: Partial<Court>): Promise<Court> {
  const res = await api.put<Court>(`/courts/${id}`, data)
  return res.data
}

export async function deactivateCourt(id: string): Promise<Court> {
  const res = await api.delete<Court>(`/courts/${id}`)
  return res.data
}

export async function activateCourt(id: string): Promise<Court> {
  const res = await api.put<Court>(`/courts/${id}`, { active: true })
  return res.data
}

export async function getCourtSchedule(id: string): Promise<Schedule[]> {
  const res = await api.get<Schedule[]>(`/courts/${id}/schedule`)
  return res.data
}

export async function updateCourtSchedule(
  id: string,
  schedules: Omit<Schedule, 'id' | 'courtId'>[],
): Promise<void> {
  await api.put(`/courts/${id}/schedule`, { schedules })
}

export async function getCourtAvailability(
  id: string,
  date: string,
): Promise<CourtAvailability> {
  const res = await api.get<CourtAvailability>(`/courts/${id}/availability`, {
    params: { date },
  })
  return res.data
}

export async function getCurrentBooking(courtId: string): Promise<{
  booking: { id: string; customerName: string; startTime: string; endTime: string } | null
  currentTime: string
}> {
  const res = await api.get(`/courts/${courtId}/current-booking`)
  return res.data
}
