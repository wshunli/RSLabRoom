// 前端 API 客户端：集中声明与后端 /api 的接口及参数。
//
// 设计原则：
// - 所有接口的参数在此完整声明（即使后端暂以占位实现，参数也保留）。
// - 调用方（视图）负责在请求失败时回退到本地占位数据，保证离线/未接后端时界面可用。

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

export interface SiteConfig {
  semesterStart: string
  totalWeeks: number
  currentWeek: number
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
  date: string
}

export interface AvailabilityResponse {
  week: number
  totalWeeks: number
  range: { start: string; end: string }
  busySlots: string[]
  slots: AvailabilitySlot[]
}

export const api = {
  getConfig: () => request<SiteConfig>('/config'),

  getRooms: () => request<Room[]>('/rooms'),

  // week 省略时后端返回当前教学周。
  getAvailability: (week?: number) =>
    request<AvailabilityResponse>(`/availability${week ? `?week=${week}` : ''}`),

  // ---- 提交申请 -------------------------------------------------------------
  submitApplication: (payload: {
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

  // ---- 管理员认证 -----------------------------------------------------------
  adminLogin: (username: string, password: string) =>
    request<{ token: string; user: AdminUser }>('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  adminLogout: () => request<{ ok: boolean }>('/admin/logout', { method: 'POST' }),

  // ---- 申请审批 -------------------------------------------------------------
  getApplications: (status: 'pending' | 'approved' | 'all' = 'all') =>
    request<Array<BookingRequest & { sid: number; detailList: string[] }>>(
      `/admin/applications?status=${status}`,
    ),

  approveApplication: (id: string) =>
    request<{ id: string; state: string }>(`/admin/applications/${id}/approve`, { method: 'POST' }),

  rejectApplication: (id: string) =>
    request<{ id: string; state: string }>(`/admin/applications/${id}/reject`, { method: 'POST' }),

  deleteApplication: (id: string) =>
    request<{ id: string; deleted: boolean }>(`/admin/applications/${id}`, { method: 'DELETE' }),

  // ---- 系统设置 -------------------------------------------------------------
  getSettings: () => request<{
    startYear: number
    startMonth: number
    startDay: number
    semesterWeeks: number
    contactName: string
    contactPhone: string
  }>('/admin/settings'),

  updateSettings: (payload: {
    startYear: number
    startMonth: number
    startDay: number | null
    semesterWeeks: number
    contactName: string
    contactPhone: string
  }) => request<{ ok: boolean }>('/admin/settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),

  // ---- 占位接口（后端暂未持久化，参数已保留） -------------------------------
  getUsers: () => request<Array<{
    id: number; name: string; phone: string; unit: string; role: string; enabled: boolean
  }>>('/admin/users'),

  getSchedules: () => request<{ rules: unknown[]; placeholder?: boolean; note?: string }>('/admin/schedules'),

  addSchedule: (payload: {
    courseName: string; roomId: number; weekday: number; period: number
    startWeek: number; endWeek: number; recurrence: 'weekly' | 'odd' | 'even'
  }) => request<{ accepted: boolean; persisted: boolean }>('/admin/schedules', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  deleteSchedule: (id: number) =>
    request<{ accepted: boolean; persisted: boolean }>(`/admin/schedules/${id}`, { method: 'DELETE' }),
}

export type Api = typeof api
