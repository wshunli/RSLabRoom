export type PortalMode = 'user' | 'admin'
export type RequestState = 'pending' | 'approved' | 'rejected'

export interface Room {
  id: number
  name: string
  building: string
  seats: number
  audience: string
  equipment: string[]
}

export interface BookingRequest {
  id: string
  applicant: string
  unit: string
  room: string
  date: string
  period: string
  purpose: string
  people: number
  state: RequestState
}

export interface SelectedSlot {
  room: Room
  day: number
  period: number
}
