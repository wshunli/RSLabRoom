<script setup lang="ts">
import { computed } from 'vue'
import { CalendarDays } from '@lucide/vue'
import type { Semester } from '../api'

type CalendarSemester = Pick<Semester, 'term' | 'startDate' | 'weeks' | 'extraWeeks'>
type CalendarCell = {
  day: number | null
  key: string
  inMonth: boolean
  term: number | null
  kind: '' | 'start' | 'teaching' | 'vacation'
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const TERM_NAMES = ['第一学期', '第二学期', '第三学期']

const props = defineProps<{
  startYear: number
  semesters: CalendarSemester[]
}>()

const baseYear = computed(() => Number.isInteger(props.startYear) ? props.startYear : new Date().getFullYear())
const sortedSemesters = computed(() => [...props.semesters].sort((a, b) => a.term - b.term))

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function parseDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function formatDateLabel(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  return match ? `${Number(match[2])}月${Number(match[3])}日` : '待填写'
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

function semesterEndDate(semester: CalendarSemester | undefined): Date | null {
  if (!semester) return null
  const start = parseDate(semester.startDate)
  if (!start) return null
  const totalWeeks = Math.max(1, (Number(semester.weeks) || 0) + (Number(semester.extraWeeks) || 0))
  return addDays(start, totalWeeks * 7 - 1)
}

const markers = computed(() => {
  const result = new Map<string, { term: number; kind: CalendarCell['kind'] }>()
  for (const semester of sortedSemesters.value) {
    const start = parseDate(semester.startDate)
    if (!start) continue
    const teachingDays = Math.max(0, Number(semester.weeks) || 0) * 7
    const totalDays = Math.max(1, (Number(semester.weeks) || 0) + (Number(semester.extraWeeks) || 0)) * 7
    for (let offset = 0; offset < totalDays; offset += 1) {
      const date = addDays(start, offset)
      result.set(dateKey(date), {
        term: semester.term,
        kind: offset === 0 ? 'start' : offset < teachingDays ? 'teaching' : 'vacation',
      })
    }
  }
  return result
})

const calendarRange = computed(() => {
  const firstSemester = sortedSemesters.value.find((semester) => semester.term === 1)
  const thirdSemester = sortedSemesters.value.find((semester) => semester.term === 3)
  const start = parseDate(firstSemester?.startDate || '') || new Date(baseYear.value, 7, 1)
  const end = semesterEndDate(thirdSemester) || new Date(baseYear.value + 1, 6, 31)
  const startMonth = new Date(start.getFullYear(), start.getMonth(), 1)
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1)
  const monthCount = Math.min(24, Math.max(1, (endMonth.getFullYear() - startMonth.getFullYear()) * 12 + endMonth.getMonth() - startMonth.getMonth() + 1))
  return { start, end, startMonth, monthCount }
})

const months = computed(() => Array.from({ length: calendarRange.value.monthCount }, (_, index) => {
  const current = new Date(calendarRange.value.startMonth.getFullYear(), calendarRange.value.startMonth.getMonth() + index, 1)
  const year = current.getFullYear()
  const month = current.getMonth()
  const first = new Date(year, month, 1)
  const firstWeekday = first.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: CalendarCell[] = Array.from({ length: 42 }, (_, cellIndex) => {
    const day = cellIndex - firstWeekday + 1
    if (day < 1 || day > daysInMonth) return { day: null, key: '', inMonth: false, term: null, kind: '' }
    const key = dateKey(new Date(year, month, day))
    const marker = markers.value.get(key)
    return { day, key, inMonth: true, term: marker?.term ?? null, kind: marker?.kind ?? '' }
  })
  return { label: `${year}年${month + 1}月`, cells }
}))

function cellClass(cell: CalendarCell) {
  return {
    'calendar-day-outside': !cell.inMonth,
    'calendar-day-start': cell.kind === 'start',
    'calendar-day-teaching': cell.kind === 'teaching',
    'calendar-day-vacation': cell.kind === 'vacation',
    [`calendar-term-${cell.term}`]: Boolean(cell.term),
  }
}

function cellTitle(cell: CalendarCell): string | undefined {
  if (!cell.inMonth || !cell.term) return undefined
  const semester = sortedSemesters.value.find((item) => item.term === cell.term)
  if (!semester) return undefined
  if (cell.kind === 'start') return `${TERM_NAMES[cell.term - 1]} · ${formatDateLabel(semester.startDate)}开学`
  return `${TERM_NAMES[cell.term - 1]} · ${cell.kind === 'vacation' ? '假期' : '教学期'}`
}
</script>

<template>
  <aside class="panel semester-calendar-preview">
    <div class="semester-calendar-head">
      <div><span class="kicker">CALENDAR VIEW</span><h2>学期日历</h2><p>根据左侧配置实时更新。</p></div>
      <CalendarDays class="semester-calendar-icon" />
    </div>

    <div class="semester-calendar-year">
      <span>显示范围</span>
      <strong>{{ formatDate(calendarRange.start) }} — {{ formatDate(calendarRange.end) }}</strong>
    </div>

    <div class="semester-calendar-legend">
      <span><i class="calendar-legend-term term-1" />第一学期</span>
      <span><i class="calendar-legend-term term-2" />第二学期</span>
      <span><i class="calendar-legend-term term-3" />第三学期</span>
      <span><i class="calendar-legend-vacation" />假期</span>
    </div>

    <div class="semester-calendar-months">
      <div v-for="month in months" :key="month.label" class="semester-calendar-month">
        <strong>{{ month.label }}</strong>
        <div class="semester-calendar-weekdays">
          <span v-for="weekday in WEEKDAYS" :key="weekday">{{ weekday }}</span>
        </div>
        <div class="semester-calendar-days">
          <span
            v-for="cell in month.cells"
            :key="`${month.label}-${cell.key || cell.day}`"
            class="semester-calendar-day"
            :class="cellClass(cell)"
            :title="cellTitle(cell)"
          >{{ cell.day || '' }}</span>
        </div>
      </div>
    </div>

    <div class="semester-calendar-summary">
      <div v-for="semester in sortedSemesters" :key="semester.term">
        <b>{{ TERM_NAMES[semester.term - 1] }}</b>
        <span>{{ formatDateLabel(semester.startDate) }}开学 · 教学 {{ semester.weeks || 0 }} 周</span>
      </div>
    </div>
  </aside>
</template>
