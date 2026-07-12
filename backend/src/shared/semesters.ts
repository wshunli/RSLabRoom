// 学期配置：按学年（如 2025-2026 学年）划分第 1/2/3 学期，
// 每个学期各自配置开始日期、教学周数和学期结束后的假期周数，持久化在 semesters 表中。
import { parseDate } from './time'

export interface Semester {
  startYear: number // 学年起始年份，2025 表示 2025-2026 学年
  term: number // 第几学期：1 / 2 / 3
  startDate: string // 开学日期 YYYY-MM-DD
  weeks: number // 教学周数
  extraWeeks: number // 学期结束后额外展示的周数
}

export function semesterLabel(semester: Semester): string {
  return `${semester.startYear}-${semester.startYear + 1}学年第${semester.term}学期`
}

export function sortSemesters(semesters: Semester[]): Semester[] {
  return [...semesters].sort((a, b) => a.startDate.localeCompare(b.startDate))
}

export function semesterTotalWeeks(semester: Semester): number {
  return semester.weeks + semester.extraWeeks
}

export function vacationLabel(semester: Semester): string {
  return semester.term === 1 ? '寒假' : '暑假'
}

export function semesterWeekLabel(semester: Semester, week: number): string {
  if (week > semester.weeks) return `${vacationLabel(semester)}第 ${week - semester.weeks} 周`
  return `第 ${week} 周`
}

export function isVacationWeek(semester: Semester, week: number): boolean {
  return week > semester.weeks && week <= semesterTotalWeeks(semester)
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
