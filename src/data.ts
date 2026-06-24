import type { BookingRequest, Room } from './types'

export const days = [
  { week: '周一', date: '06/22' },
  { week: '周二', date: '06/23' },
  { week: '周三', date: '06/24' },
  { week: '周四', date: '06/25' },
  { week: '周五', date: '06/26' },
  { week: '周六', date: '06/27' },
]

export const periods = ['上午', '下午', '晚上']

export const rooms: Room[] = [
  { id: 1, name: '318 机房', building: '信息学部 5 号楼', seats: 52, audience: '遥感学院', equipment: ['图形工作站', '投影', '空调'] },
  { id: 2, name: '325 机房', building: '信息学部 5 号楼', seats: 48, audience: '遥感学院', equipment: ['高性能电脑', '投影', '空调'] },
  { id: 3, name: '221 机房', building: '信息学部 5 号楼', seats: 48, audience: '遥感学院', equipment: ['双屏工位', '投影', '空调'] },
  { id: 4, name: '220 机房', building: '信息学部 5 号楼', seats: 48, audience: '本科生院', equipment: ['教学终端', '投影', '空调'] },
  { id: 5, name: '201 机房', building: '附 3 楼', seats: 81, audience: '本科生院', equipment: ['大容量机房', '电子白板', '空调'] },
  { id: 6, name: '202 机房', building: '附 3 楼', seats: 42, audience: '本科生院', equipment: ['教学终端', '投影', '空调'] },
]

export const busySlots = new Set([
  '1-0-0', '1-0-1', '1-1-0', '1-1-1', '1-2-1', '1-2-2', '1-3-0', '1-3-1', '1-4-0', '1-4-1', '1-5-0', '1-5-1',
  '2-0-1', '2-1-1', '2-2-1', '2-3-1', '2-4-1', '2-5-1', '3-0-0', '3-0-1', '3-1-0', '3-1-1', '3-2-1', '3-2-2',
  '3-3-0', '3-3-1', '3-4-0', '3-4-1', '3-5-0', '3-5-1', '5-0-0', '5-0-1', '5-1-0', '5-1-1', '5-2-2', '5-3-0',
  '5-3-1', '5-4-0', '5-4-1', '5-5-0', '5-5-1',
])

export const initialRequests: BookingRequest[] = [
  { id: 'AP2026062108', applicant: '陈雨欣', unit: '遥感科学与技术系', room: '318 机房', date: '2026-06-25', period: '晚上 18:00–22:00', purpose: '遥感影像处理课程小组实验', people: 36, state: 'pending' },
  { id: 'AP2026062107', applicant: '李明泽', unit: '测绘工程系', room: '202 机房', date: '2026-06-26', period: '下午 14:00–18:00', purpose: '本科生创新项目数据处理', people: 28, state: 'pending' },
  { id: 'AP2026062006', applicant: '王老师', unit: '空间信息工程系', room: '201 机房', date: '2026-06-23', period: '上午 08:00–12:00', purpose: 'GIS 开发课程补充实验', people: 64, state: 'approved' },
]
