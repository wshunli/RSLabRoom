import type { BookingRequest, Room } from './types'

export const days = [
  { week: '周日', date: '06/21' },
  { week: '周一', date: '06/22' },
  { week: '周二', date: '06/23' },
  { week: '周三', date: '06/24' },
  { week: '周四', date: '06/25' },
  { week: '周五', date: '06/26' },
  { week: '周六', date: '06/27' },
]

export const periods = ['上午', '下午', '晚上']

export const rooms: Room[] = [
  { id: 1, name: '318 机房', building: '5 号楼', seats: 52, audience: '遥感学院', equipment: ['图形工作站', '投影', '空调'], intro: '地理信息与国情监测实验室', administrator: '孙朝晖', phone: '13707145509' },
  { id: 2, name: '325 机房', building: '5 号楼', seats: 48, audience: '遥感学院', equipment: ['高性能电脑', '投影', '空调'], intro: '全数字摄影测量实验室', administrator: '徐宏平', phone: '13971404255' },
  { id: 3, name: '221 机房', building: '5 号楼', seats: 48, audience: '遥感学院', equipment: ['双屏工位', '投影', '空调'], intro: '遥感大数据高性能处理机房', administrator: '徐宏平', phone: '13971404255' },
  { id: 4, name: '220 机房', building: '5 号楼', seats: 48, audience: '本科生院', equipment: ['教学终端', '投影', '空调'] },
  { id: 5, name: '201 机房', building: '附 3 楼', seats: 81, audience: '本科生院', equipment: ['大容量机房', '电子白板', '空调'] },
  { id: 6, name: '202 机房', building: '附 3 楼', seats: 42, audience: '本科生院', equipment: ['教学终端', '投影', '空调'] },
  { id: 7, name: '203 机房', building: '附 3 楼', seats: 62, audience: '本科生院', equipment: ['教学终端', '投影', '空调'] },
]

const mondayFirstBusySlots = [
  '1-0-0', '1-0-1', '1-1-0', '1-1-1', '1-2-1', '1-2-2', '1-3-0', '1-3-1', '1-4-0', '1-4-1', '1-5-0', '1-5-1',
  '2-0-1', '2-1-1', '2-2-1', '2-3-1', '2-4-1', '2-5-1', '3-0-0', '3-0-1', '3-1-0', '3-1-1', '3-2-1', '3-2-2',
  '3-3-0', '3-3-1', '3-4-0', '3-4-1', '3-5-0', '3-5-1', '5-0-0', '5-0-1', '5-1-0', '5-1-1', '5-2-2', '5-3-0',
  '5-3-1', '5-4-0', '5-4-1', '5-5-0', '5-5-1',
]

// 原排期数据以周一为第 0 天；增加周日后统一后移一列。
export const busySlots = new Set(mondayFirstBusySlots.map((slot) => {
  const [room, day, period] = slot.split('-').map(Number)
  return `${room}-${day + 1}-${period}`
}))

export const initialRequests: BookingRequest[] = [
  { id: 'AP2026062108', applicant: '陈雨欣', phone: '138 0000 1208', requiredSoftware: 'ENVI、ArcGIS Pro', people: 36, details: '318 机房 · 2026-06-25 · 晚上 18:00–22:00', courseName: '遥感影像处理', remarks: '需要提前安装课程数据包', state: 'pending' },
  { id: 'AP2026062107', applicant: '李明泽', phone: '139 0000 2107', requiredSoftware: 'Python、PyCharm', people: 28, details: '202 机房 · 2026-06-26 · 下午 14:00–18:00', courseName: '空间数据分析', remarks: '本科生创新项目课程', state: 'pending' },
  { id: 'AP2026062006', applicant: '王老师', phone: '136 0000 2006', requiredSoftware: 'QGIS、PostgreSQL', people: 64, details: '201 机房 · 2026-06-23 · 上午 08:00–12:00', courseName: 'GIS 开发课程', remarks: '请开放教师机投屏权限', state: 'approved' },
]
