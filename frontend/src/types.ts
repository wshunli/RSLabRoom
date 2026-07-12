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
  // 详情页跨多周选择时，记录该时段所属的周次及其显示标签；
  // 预约大厅为单周选择，可不提供，由调用方按当前周补充。
  week?: number
  weekLabel?: string
  dayLabel?: string
  dateLabel?: string
}
