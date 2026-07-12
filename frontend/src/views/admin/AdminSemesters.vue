<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { CalendarDays, CalendarRange, Check, Clock3, GraduationCap, Save } from '@lucide/vue'
import { api, type Semester } from '../../api'

type EditableSemester = Pick<Semester, 'term' | 'startDate' | 'weeks'>

const TERM_NAMES = ['第一学期', '第二学期', '第三学期']
const defaultYear = new Date().getFullYear()

const startYear = ref(defaultYear)
// 学期固定为第一、二、三学期，只需配置各自的开学日期与周数
const terms = ref<EditableSemester[]>(defaultTerms(defaultYear))
const currentSemesterLabel = ref('')
// 学年与学期两个表单各自显示保存结果
const feedback = ref<{ target: 'year' | 'terms'; ok: boolean; text: string } | null>(null)

function defaultTerms(year: number): EditableSemester[] {
  return [
    { term: 1, startDate: `${year}-09-01`, weeks: 18 },
    { term: 2, startDate: `${year + 1}-03-01`, weeks: 18 },
    { term: 3, startDate: `${year + 1}-07-01`, weeks: 6 },
  ]
}

function label(term: number): string {
  return `${startYear.value}-${startYear.value + 1}学年第${term}学期`
}

// 学年调整时，各学期开学日期的年份跟随平移（月/日保持不变）；
// 从接口回填数据时不平移（syncing 期间跳过）。
let syncing = false
watch(startYear, (year, previous) => {
  feedback.value = null
  if (syncing) return
  if (!Number.isInteger(year) || !Number.isInteger(previous)) return
  const delta = year - previous
  if (!delta) return
  for (const semester of terms.value) {
    const [y, m, d] = semester.startDate.split('-')
    if (y && m && d) semester.startDate = `${Number(y) + delta}-${m}-${d}`
  }
})

// ---- 校验与保存 ----
function validate(): string {
  if (!Number.isInteger(startYear.value) || startYear.value < 2000 || startYear.value > 2100) return '请填写有效的学年'
  const rangeStart = `${startYear.value}-08-01`
  const rangeEnd = `${startYear.value + 1}-07-31`
  for (const semester of terms.value) {
    const name = TERM_NAMES[semester.term - 1]
    if (!semester.startDate) return `${name}未填写开学日期`
    if (!(semester.weeks >= 1)) return `${name}的周数无效`
    if (semester.startDate < rangeStart || semester.startDate > rangeEnd) {
      return `${name}的开学日期不在 ${startYear.value}-${startYear.value + 1} 学年内（${startYear.value} 年 8 月 — ${startYear.value + 1} 年 7 月）`
    }
  }
  return ''
}

function applyResponse(res: { startYear: number; semesters: Semester[]; currentSemesterLabel: string }) {
  syncing = true
  startYear.value = res.startYear
  terms.value = defaultTerms(res.startYear).map((fallback) => {
    const stored = res.semesters.find((s) => s.term === fallback.term)
    return stored ? { term: stored.term, startDate: stored.startDate, weeks: stored.weeks } : fallback
  })
  currentSemesterLabel.value = res.currentSemesterLabel
  void nextTick(() => { syncing = false })
}

// 学年与学期保存的是同一份配置：保存学年时会连同（已随学年平移的）学期日期一起提交
async function save(target: 'year' | 'terms') {
  feedback.value = null
  const error = validate()
  if (error) { feedback.value = { target, ok: false, text: error }; return }
  try {
    applyResponse(await api.updateSemesters(startYear.value, terms.value))
    feedback.value = { target, ok: true, text: '设置已保存' }
  } catch (err) {
    feedback.value = { target, ok: false, text: err instanceof Error ? err.message : '保存失败' }
  }
}

onMounted(async () => {
  try {
    applyResponse(await api.getSemesters())
  } catch (err) {
    feedback.value = { target: 'terms', ok: false, text: err instanceof Error ? err.message : '加载失败' }
  }
})
</script>

<template>
  <section class="admin-main semesters-page">
    <div class="admin-title">
      <div><span class="kicker">SEMESTER SETTINGS</span><h1>学期设置</h1><p>维护学年、开学日期和教学周数，当前学期将由系统自动识别。</p></div>
      <span class="date-card"><CalendarRange /><b>{{ currentSemesterLabel || '未配置学期' }}</b><small>当前学期</small></span>
    </div>

    <div class="semesters-layout">
      <div class="semesters-side">
        <form class="panel semesters-form" @submit.prevent="save('year')">
          <div class="panel-head"><div><h2><GraduationCap />选择学年</h2><p>切换学年后，各学期日期会同步调整年份。</p></div></div>
          <label class="semester-year-row">
            <span>起始年份</span>
            <span class="setting-suffix">
              <input v-model.number="startYear" type="number" min="2000" max="2100" required>
              <span>至 {{ Number.isInteger(startYear) ? startYear + 1 : '' }} 年</span>
            </span>
          </label>
          <div class="settings-footer">
            <span v-if="feedback && feedback.target === 'year' && !feedback.ok" class="semester-error">{{ feedback.text }}</span>
            <span v-else-if="feedback && feedback.target === 'year'" class="settings-saved"><Check />{{ feedback.text }}</span>
            <button class="primary" type="submit"><Save />保存学年</button>
          </div>
        </form>

        <form class="panel semesters-form" @submit.prevent="save('terms')">
          <div class="panel-head"><div><h2>{{ Number.isInteger(startYear) ? `${startYear}-${startYear + 1} 学年` : '' }}学期安排</h2><p>设置每个学期的开学日期与实际教学周数。</p></div></div>

          <div v-for="semester in terms" :key="semester.term" class="semester-row" :class="{ current: label(semester.term) === currentSemesterLabel }">
            <div class="semester-row-title">
              <b>{{ TERM_NAMES[semester.term - 1] }}</b>
              <span v-if="label(semester.term) === currentSemesterLabel" class="semester-current-tag">当前学期</span>
            </div>
            <div class="semester-fields">
              <label class="semester-field">
                <span><CalendarDays />开学日期</span>
                <input v-model="semester.startDate" type="date" required :aria-label="`${TERM_NAMES[semester.term - 1]}开学日期`">
              </label>
              <label class="semester-field">
                <span><Clock3 />教学周数</span>
                <span class="setting-suffix"><input v-model.number="semester.weeks" type="number" min="1" max="30" required :aria-label="`${TERM_NAMES[semester.term - 1]}教学周数`"><span>周</span></span>
              </label>
            </div>
          </div>

          <div class="settings-footer">
            <span v-if="feedback && feedback.target === 'terms' && !feedback.ok" class="semester-error">{{ feedback.text }}</span>
            <span v-else-if="feedback && feedback.target === 'terms'" class="settings-saved"><Check />{{ feedback.text }}</span>
            <button class="primary" type="submit"><Save />保存学期设置</button>
          </div>
        </form>
      </div>

    </div>
  </section>
</template>
