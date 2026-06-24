// 教学周与日期换算，逻辑对齐历史系统 hall/table.php、hall/config/conn.php。
//
// 约定：开学时间 begtime 当天为某一周的第 1 天（第 0 天 = 周日，与前端 days 对齐）。
// period 索引 0/1/2 对应历史 tag 字段的 1/2/3（上午/下午/晚上）。

const DAY_MS = 24 * 60 * 60 * 1000
const WEEK_MS = 7 * DAY_MS

export const PERIOD_NAMES = ['上午', '下午', '晚上']
export const PERIOD_TIMES = ['08:00–12:00', '14:00–18:00', '18:00–22:00']

// 把 'YYYY-M-D' 解析为本地 0 点的 Date。
export function parseDate(value) {
  const [y, m, d] = String(value).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function formatDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// 当前教学周（从 1 开始）。
export function currentWeek(begtime, now = new Date()) {
  const beg = parseDate(begtime)
  return Math.floor((now.getTime() - beg.getTime()) / WEEK_MS) + 1
}

// 指定周第 0 天（周日）的 Date。
export function weekStart(begtime, week) {
  const beg = parseDate(begtime)
  return new Date(beg.getTime() + (week - 1) * WEEK_MS)
}

// 指定周内某一天的日期字符串。day: 0..6。
export function slotDate(begtime, week, day) {
  return formatDate(new Date(weekStart(begtime, week).getTime() + day * DAY_MS))
}

// 给定一周的起止日期字符串（含），用于按 btime 过滤 borrow。
export function weekRange(begtime, week) {
  const start = weekStart(begtime, week)
  const end = new Date(start.getTime() + 6 * DAY_MS)
  return { start: formatDate(start), end: formatDate(end) }
}

// 由 btime 反推该周内的天索引 0..6。
export function dayIndexOf(begtime, week, btime) {
  const start = weekStart(begtime, week)
  const date = parseDate(String(btime).slice(0, 10))
  return Math.round((date.getTime() - start.getTime()) / DAY_MS)
}

export function periodToTag(period) {
  return Number(period) + 1
}

export function tagToPeriod(tag) {
  return Number(tag) - 1
}
