// 前端 API 客户端：集中声明与后端 /api 的接口及参数。
//
// 所有数据均来自后端真实接口；请求失败时由调用方（视图）展示错误/空状态，
// 不再使用本地模拟数据。

import type { AdminUser, BookingRequest, Room } from './types'

const BASE = import.meta.env.VITE_API_BASE ?? '/api'

function authHeaders(): Record<string, string> {
  const token = sessionStorage.getItem('room-admin-token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(init.headers || {}),
    },
  })
  if (!res.ok) {
    // 已登录状态下收到 401，说明 token 失效：清理会话并通知 App 回到登录。
    if (res.status === 401 && sessionStorage.getItem('room-admin-token')) {
      sessionStorage.removeItem('room-admin-token')
      sessionStorage.removeItem('room-admin')
      window.dispatchEvent(new CustomEvent('admin-unauthorized'))
    }
    let message = `请求失败 (${res.status})`
    try {
      const body = await res.json()
      if (body?.error) message = body.error
    } catch { /* 非 JSON 响应 */ }
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

// ---- 公共数据 ---------------------------------------------------------------

// 学期配置：学年、学期序号、开学日期、教学周数和假期周数均以后端保存值为准。
export interface Semester {
  startYear: number
  term: number
  startDate: string
  weeks: number
  extraWeeks: number
}

export interface SiteConfig {
  semesterStart: string
  totalWeeks: number
  teachingWeeks: number
  currentWeek: number
  weekLabel: string
  isVacation: boolean
  vacationLabel: string
  semesterLabel: string
  currentTerm: number | null
  semesters: Semester[]
  contact: { name: string; phone: string }
}

export interface AvailabilitySlot {
  key: string
  bid: number
  roomId: number
  day: number
  period: number
  courseName: string
  teacher: string
  phone: string
  date: string
}

export interface AvailabilityResponse {
  week: number
  totalWeeks: number
  teachingWeeks: number
  currentWeek: number
  term: number | null
  semesterLabel: string
  weekLabel: string
  isVacation: boolean
  vacationLabel: string
  range: { start: string; end: string }
  busySlots: string[]
  slots: AvailabilitySlot[]
}

export interface RangeStat { count: number; hours: number; rooms: number; days: number }
export interface TodayOccupancy {
  roomId: number
  period: number
  courseName: string
  teacher: string
  people: number
  software: string
}
export interface AdminStats {
  today: RangeStat
  week: RangeStat
  month: RangeStat
  topRoom: { name: string; count: number } | null
  busiestPeriod: string
  monthLabel: string
  weekRange: { start: string; end: string }
  todayList: TodayOccupancy[]
  applications: { total: number; pending: number }
  users: number
}

export const api = {
  getConfig: () => request<SiteConfig>('/config'),

  getRooms: () => request<Room[]>('/rooms'),

  // week 省略时后端返回当前教学周。
  getAvailability: (week?: number, term?: number) => {
    const params = new URLSearchParams()
    if (week !== undefined) params.set('week', String(week))
    if (term !== undefined) params.set('term', String(term))
    const query = params.toString()
    return request<AvailabilityResponse>(`/availability${query ? `?${query}` : ''}`)
  },

  // ---- 提交申请 -------------------------------------------------------------
  submitApplication: (payload: {
    semesterTerm?: number
    applicantName: string
    phone: string
    attendees: number
    courseName: string
    requiredSoftware: string
    remarks: string
    slots: Array<{ roomId: number; week: number; day: number; period: number; date?: string }>
  }) => request<{ id: string; slots: number; state: string }>('/applications', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  // ---- 概览统计 -------------------------------------------------------------
  getStats: () => request<AdminStats>('/admin/stats'),

  // ---- 管理员认证 -----------------------------------------------------------
  adminLogin: (username: string, password: string) =>
    request<{ token: string; user: AdminUser }>('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  adminLogout: () => request<{ ok: boolean }>('/admin/logout', { method: 'POST' }),

  // ---- 申请审批（分页 + 多条件筛选） ----------------------------------------
  getApplications: (
    status: 'pending' | 'approved' | 'rejected' | 'all' = 'all',
    page = 1,
    pageSize = 15,
    filters: { date?: string; courseName?: string; teacher?: string } = {},
  ) => {
    const params = new URLSearchParams({
      status,
      page: String(page),
      pageSize: String(pageSize),
    })
    if (filters.date) params.set('date', filters.date)
    if (filters.courseName) params.set('courseName', filters.courseName)
    if (filters.teacher) params.set('teacher', filters.teacher)
    return request<{
      items: Array<BookingRequest & { sid: number; detailList: string[] }>
      total: number
      page: number
      pageSize: number
      pendingTotal: number
    }>(`/admin/applications?${params.toString()}`)
  },

  approveApplication: (id: string) =>
    request<{ id: string; state: string }>(`/admin/applications/${id}/approve`, { method: 'POST' }),

  rejectApplication: (id: string) =>
    request<{ id: string; state: string }>(`/admin/applications/${id}/reject`, { method: 'POST' }),

  deleteApplication: (id: string) =>
    request<{ id: string; deleted: boolean }>(`/admin/applications/${id}`, { method: 'DELETE' }),

  // ---- 学期设置（一个学年固定三个学期） ---------------------------------------
  getSemesters: () =>
    request<{ startYear: number; semesters: Semester[]; currentSemesterLabel: string }>('/admin/semesters'),

  updateSemesters: (startYear: number, semesters: Array<Pick<Semester, 'term' | 'startDate' | 'weeks' | 'extraWeeks'>>) =>
    request<{ startYear: number; semesters: Semester[]; currentSemesterLabel: string }>('/admin/semesters', {
      method: 'PUT',
      body: JSON.stringify({ startYear, semesters: semesters.map(({ term, startDate, weeks, extraWeeks }) => ({ term, startDate, weeks, extraWeeks })) }),
    }),

  // ---- 系统设置 -------------------------------------------------------------
  getSettings: () => request<{
    contactName: string
    contactPhone: string
    smtpEnabled: boolean
    smtpHost: string
    smtpPort: number
    smtpSecure: boolean
    smtpUser: string
    smtpPassword: string
    smtpPasswordSet: boolean
    smtpFrom: string
    adminEmail: string
    siteUrl: string
  }>('/admin/settings'),

  updateSettings: (payload: {
    contactName: string
    contactPhone: string
    smtpEnabled: boolean
    smtpHost: string
    smtpPort: number
    smtpSecure: boolean
    smtpUser: string
    smtpPassword?: string
    smtpFrom: string
    adminEmail: string
    siteUrl: string
  }) => {
    // GET 响应中包含 smtpPasswordSet 这类只读状态；保存时只发送 DTO 接受的字段，
    // 避免 NestJS 的严格白名单把响应辅助字段判定为非法属性。
    const body = {
      contactName: payload.contactName, contactPhone: payload.contactPhone,
      smtpEnabled: payload.smtpEnabled, smtpHost: payload.smtpHost, smtpPort: payload.smtpPort,
      smtpSecure: payload.smtpSecure, smtpUser: payload.smtpUser, smtpPassword: payload.smtpPassword,
      smtpFrom: payload.smtpFrom, adminEmail: payload.adminEmail, siteUrl: payload.siteUrl,
    }
    return request<{ ok: boolean }>('/admin/settings', { method: 'PUT', body: JSON.stringify(body) })
  },

  testEmail: () => request<{ ok: boolean }>('/admin/settings/test-email', { method: 'POST' }),

  getMailApproval: (token: string) => request<{
    id: string; applicant: string; phone: string; people: number; courseName: string
    remarks: string; state: 'pending' | 'approved' | 'rejected'; detailList: string[]
  }>(`/mail-approval/${encodeURIComponent(token)}`),

  approveByMail: (token: string) => request<{ id: string; state: string }>(
    `/mail-approval/${encodeURIComponent(token)}/approve`, { method: 'POST' },
  ),

  // ---- 用户管理 -------------------------------------------------------------
  getUsers: () => request<ManagedUser[]>('/admin/users'),

  createUser: (payload: UserInput & { password: string }) =>
    request<ManagedUser>('/admin/users', { method: 'POST', body: JSON.stringify(payload) }),

  updateUser: (username: string, payload: UserInput & { password?: string }) =>
    request<ManagedUser>(`/admin/users/${encodeURIComponent(username)}`, { method: 'PUT', body: JSON.stringify(payload) }),

  deleteUser: (username: string) =>
    request<{ id: string; deleted: boolean }>(`/admin/users/${encodeURIComponent(username)}`, { method: 'DELETE' }),

  // ---- 机房管理 -------------------------------------------------------------
  getAdminRooms: () => request<Room[]>('/admin/rooms'),

  createRoom: (payload: RoomInput) =>
    request<Room>('/admin/rooms', { method: 'POST', body: JSON.stringify(payload) }),

  updateRoom: (id: number, payload: RoomInput) =>
    request<Room>(`/admin/rooms/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),

  deleteRoom: (id: number) =>
    request<{ id: number; deleted: boolean }>(`/admin/rooms/${id}`, { method: 'DELETE' }),

  // ---- 批量排期（生成普通申请：borrow + submit，进入「预约审批」流程） ---------
  addSchedule: (payload: {
    applicantName: string; phone: string; attendees: number
    courseName: string; requiredSoftware: string; remarks: string
    roomId: number; period: number; mode: 'weekly' | 'daily'
    startWeek: number; endWeek: number
    weekday?: number; recurrence?: 'weekly' | 'odd' | 'even'
    startWeekday?: number; endWeekday?: number
  }) => request<{ id: string; weeks: number; skipped: number; state: string }>('/admin/schedules', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
}

export interface ManagedUser {
  id: string
  username: string
  name: string
  email: string
  phone: string
  role: string
}

export interface UserInput {
  username: string
  name: string
  email: string
  phone: string
}

export type RoomInput = Omit<Room, 'id' | 'equipment'> & {
  intro: string
  administrator: string
  phone: string
}

export type Api = typeof api
