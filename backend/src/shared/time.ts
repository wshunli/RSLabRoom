const DAY_MS = 24 * 60 * 60 * 1000
const WEEK_MS = 7 * DAY_MS

export const PERIOD_NAMES = ['上午', '下午', '晚上']

// 各时段的近似课时数（用于工作量统计），索引与 period 一致：上午/下午/晚上。
export const PERIOD_HOURS = [4, 4, 3]

export function parseDate(value: string): Date {
  const [year, month, day] = String(value).split('-').map(Number)
  return new Date(year, (month || 1) - 1, day || 1)
}

export function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function currentWeek(semesterStart: string, now = new Date()): number {
  return Math.floor((now.getTime() - parseDate(semesterStart).getTime()) / WEEK_MS) + 1
}

export function weekStart(semesterStart: string, week: number): Date {
  return new Date(parseDate(semesterStart).getTime() + (week - 1) * WEEK_MS)
}

export function slotDate(semesterStart: string, week: number, day: number): string {
  return formatDate(new Date(weekStart(semesterStart, week).getTime() + day * DAY_MS))
}

export function weekRange(semesterStart: string, week: number): { start: string; end: string } {
  const start = weekStart(semesterStart, week)
  return { start: formatDate(start), end: formatDate(new Date(start.getTime() + 6 * DAY_MS)) }
}

export function dayIndexOf(semesterStart: string, week: number, value: string): number {
  return Math.round((parseDate(String(value).slice(0, 10)).getTime() - weekStart(semesterStart, week).getTime()) / DAY_MS)
}

export function periodToTag(period: number): number {
  return period + 1
}
