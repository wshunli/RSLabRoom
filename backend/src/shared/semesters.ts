// 学期配置：按学年（如 2025-2026 学年）划分第 1/2/3 学期，
// 每个学期各自配置开始日期与教学周数，整体以 JSON 存在 console 表的 semesters 键。
import { parseDate } from './time'

export interface Semester {
  startYear: number // 学年起始年份，2025 表示 2025-2026 学年
  term: number // 第几学期：1 / 2 / 3
  startDate: string // 开学日期 YYYY-MM-DD
  weeks: number // 教学周数
}

export function semesterLabel(semester: Semester): string {
  return `${semester.startYear}-${semester.startYear + 1}学年第${semester.term}学期`
}

function isValidSemester(value: unknown): value is Semester {
  if (!value || typeof value !== 'object') return false
  const s = value as Record<string, unknown>
  return Number.isInteger(s.startYear) && Number.isInteger(s.term) && Number.isInteger(s.weeks)
    && typeof s.startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.startDate)
}

export function sortSemesters(semesters: Semester[]): Semester[] {
  return [...semesters].sort((a, b) => a.startDate.localeCompare(b.startDate))
}

// 学年和学期均以后台保存的 semesters 配置为准，不再根据日期或旧配置猜测。
export function semestersFromConfig(config: Record<string, string>): Semester[] {
  if (config.semesters) {
    try {
      const parsed = JSON.parse(config.semesters)
      if (Array.isArray(parsed)) {
        const list = parsed.filter(isValidSemester)
        if (list.length) return sortSemesters(list)
      }
    } catch { /* 配置损坏时按未配置处理 */ }
  }
  return []
}

// 当前学期只依据已配置的开学日期选择，不额外猜测或提前切换学期。
export function currentSemester(semesters: Semester[], now = new Date()): Semester | null {
  const sorted = sortSemesters(semesters)
  let active: Semester | null = null
  for (const semester of sorted) {
    if (parseDate(semester.startDate).getTime() > now.getTime()) break
    active = semester
  }
  return active
}
