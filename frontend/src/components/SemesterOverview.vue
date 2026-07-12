<script setup lang="ts">
import { computed } from 'vue'
import { CalendarRange, Check, Clock3 } from '@lucide/vue'
import type { Semester } from '../api'

const TERM_NAMES = ['第一学期', '第二学期', '第三学期']

const props = defineProps<{
  startYear: number
  semesters: Semester[]
  currentSemesterLabel?: string
}>()

const previewTerms = computed(() => [...props.semesters].sort((a, b) => a.term - b.term).map((semester) => ({
  ...semester,
  name: TERM_NAMES[semester.term - 1],
  dateLabel: formatDateLabel(semester.startDate),
})))
const totalTeachingWeeks = computed(() => props.semesters.reduce((total, semester) => total + (Number.isFinite(semester.weeks) ? semester.weeks : 0), 0))
const totalHolidayWeeks = computed(() => props.semesters.reduce((total, semester) => total + (Number.isFinite(semester.extraWeeks) ? semester.extraWeeks : 0), 0))

function formatDateLabel(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  return match ? `${Number(match[2])}月${Number(match[3])}日` : '待填写'
}

function teachingProgress(weeks: number): string {
  const value = Number.isFinite(weeks) ? weeks : 0
  return `${Math.min(100, Math.max(0, value / 30 * 100))}%`
}
</script>

<template>
  <section class="panel semester-preview">
    <div class="semester-preview-head">
      <div><span class="kicker">SEMESTER OVERVIEW</span><h2>学期安排总览</h2><p>当前学期配置与教学周安排。</p></div>
      <CalendarRange class="semester-preview-icon" />
    </div>

    <div class="semester-preview-year">
      <span>当前学年</span>
      <strong>{{ Number.isInteger(props.startYear) ? `${props.startYear} — ${props.startYear + 1}` : '待设置' }}</strong>
    </div>

    <div class="semester-preview-summary">
      <div><strong>{{ totalTeachingWeeks }}</strong><span>教学周</span></div>
      <div><strong>{{ totalHolidayWeeks }}</strong><span>假期周</span></div>
      <div><strong>{{ props.semesters.length }}</strong><span>个学期</span></div>
    </div>

    <div class="semester-preview-timeline">
      <div v-for="semester in previewTerms" :key="semester.term" class="semester-preview-term" :class="{ current: `${props.startYear}-${props.startYear + 1}学年第${semester.term}学期` === props.currentSemesterLabel }">
        <span class="semester-preview-marker">{{ semester.term }}</span>
        <div class="semester-preview-term-content">
          <div class="semester-preview-term-head">
            <strong>{{ semester.name }}</strong>
            <span>{{ semester.dateLabel }}开学</span>
          </div>
          <div class="semester-preview-bar" aria-hidden="true"><span :style="{ width: teachingProgress(semester.weeks) }"></span></div>
          <div class="semester-preview-meta">
            <span><Clock3 />教学 {{ semester.weeks || 0 }} 周</span>
            <span><CalendarRange />{{ semester.term === 1 ? '寒假' : '暑假' }} {{ semester.extraWeeks || 0 }} 周</span>
          </div>
        </div>
      </div>
    </div>

    <div class="semester-preview-note"><Check />配置结果来自学期设置。</div>
  </section>
</template>
