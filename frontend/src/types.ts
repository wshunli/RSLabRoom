export type PortalMode = 'user' | 'guide' | 'admin'
export type RequestState = 'pending' | 'approved' | 'rejected'

export interface AdminUser {
  username: string
  displayName: string
}

export interface Room {
  id: number
  name: string
  building: string
  seats: number
  audience: string
  equipment: string[]
  intro?: string
  administrator?: string
  phone?: string
}

export interface BookingRequest {
  id: string
  applicant: string
  phone: string
  requiredSoftware: string
  people: number
  details: string
  courseName: string
  remarks: string
  state: RequestState
}

export interface SelectedSlot {
  room: Room
  day: number
  period: number
}
