<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { CalendarDays } from '@lucide/vue'
import { api } from '../../api'
import { periods, weekdays } from '../../data'
import { adminStore } from '../../stores/admin'
import SchedulePreview from '../../components/SchedulePreview.vue'
import WeekSelect from '../../components/WeekSelect.vue'

const semesterWeeks = ref(18)
const semesterName = ref('')
const currentTeachingWeek = ref(0)

// 排期方式标签页：按周重复 / 按天重复
const tab = ref<'weekly' | 'daily'>('weekly')

type Recurrence = 'weekly' | 'odd' | 'even'

// 排课公用信息，与首页预约大厅提交字段一致；提交后清空
const commonInfo = reactive({
  applicantName: '', phone: '', attendees: 30,
  courseName: '', requiredSoftware: '无', remarks: '',
})
function resetCommon() {
  commonInfo.applicantName = ''
  commonInfo.phone = ''
  commonInfo.attendees = 30
  commonInfo.courseName = ''
  commonInfo.requiredSoftware = '无'
  commonInfo.remarks = ''
}
function commonError() {
  if (!commonInfo.courseName.trim()) return '请填写课程名称'
  if (!commonInfo.applicantName.trim()) return '请填写申请姓名'
  if (!commonInfo.phone.trim()) return '请填写申请电话'
  if (!(commonInfo.attendees >= 1)) return '上课人数至少为 1'
  if (!commonInfo.requiredSoftware.trim()) return '请填写需用软件'
  return ''
}

const weeklyForm = reactive({
  roomId: 0, period: 0,
  weekday: 1, startWeek: 1, endWeek: 18, recurrence: 'weekly' as Recurrence,
})
const dailyForm = reactive({
  roomId: 0, period: 0,
  startWeek: 1, startWeekday: 0, endWeek: 18, endWeekday: 6,
})
const weeklyError = ref('')
const dailyError = ref('')
const weeklyNotice = ref('')
const dailyNotice = ref('')

const weekOptions = computed(() =>
  Array.from({ length: semesterWeeks.value || 0 }, (_, i) => i + 1))
// 开始周不做限制，可选全部教学周；结束周需大于等于开始周（开始周后移时由 watch 自动上调结束周）
const weeklyStartWeekOptions = computed(() => weekOptions.value)
const weeklyEndWeekOptions = computed(() =>
  weekOptions.value.filter((week) => week >= weeklyForm.startWeek))
const dailyStartWeekOptions = computed(() => weekOptions.value)
const dailyEndWeekOptions = computed(() =>
  weekOptions.value.filter((week) => week >= dailyForm.startWeek))
const dailyStartWeekdayOptions = computed(() =>
  weekdays.map((day, index) => ({ day, index })).filter(({ index }) =>
    dailyForm.startWeek !== dailyForm.endWeek || index <= dailyForm.endWeekday))
const dailyEndWeekdayOptions = computed(() =>
  weekdays.map((day, index) => ({ day, index })).filter(({ index }) =>
    dailyForm.startWeek !== dailyForm.endWeek || index >= dailyForm.startWeekday))

watch(() => adminStore.rooms, (rooms) => {
  if (!rooms.length) return
  if (!rooms.some((room) => room.id === weeklyForm.roomId)) weeklyForm.roomId = rooms[0].id
  if (!rooms.some((room) => room.id === dailyForm.roomId)) dailyForm.roomId = rooms[0].id
}, { immediate: true, deep: true })

watch(() => weeklyForm.startWeek, (week) => {
  if (week > weeklyForm.endWeek) weeklyForm.endWeek = week
})
watch(() => weeklyForm.endWeek, (week) => {
  if (week < weeklyForm.startWeek) weeklyForm.startWeek = week
})
watch(() => dailyForm.startWeek, (week) => {
  if (week > dailyForm.endWeek) dailyForm.endWeek = week
  if (dailyForm.startWeek === dailyForm.endWeek && dailyForm.startWeekday > dailyForm.endWeekday) {
    dailyForm.endWeekday = dailyForm.startWeekday
  }
})
watch(() => dailyForm.endWeek, (week) => {
  if (week < dailyForm.startWeek) dailyForm.startWeek = week
  if (dailyForm.startWeek === dailyForm.endWeek && dailyForm.startWeekday > dailyForm.endWeekday) {
    dailyForm.startWeekday = dailyForm.endWeekday
  }
})
watch(() => dailyForm.startWeekday, (day) => {
  if (dailyForm.startWeek === dailyForm.endWeek && day > dailyForm.endWeekday) dailyForm.endWeekday = day
})
watch(() => dailyForm.endWeekday, (day) => {
  if (dailyForm.startWeek === dailyForm.endWeek && day < dailyForm.startWeekday) dailyForm.startWeekday = day
})

// ---- 排期预览：把表单参数推导成将占用的时段，与后端生成逻辑保持一致 ----
const weeklyRoom = computed(() => adminStore.rooms.find((r) => r.id === weeklyForm.roomId) ?? null)
const dailyRoom = computed(() => adminStore.rooms.find((r) => r.id === dailyForm.roomId) ?? null)

const weeklyPreviewSlots = computed(() => {
  const slots: Array<{ week: number; day: number; period: number }> = []
  if (weeklyForm.startWeek > weeklyForm.endWeek) return slots
  for (let week = weeklyForm.startWeek; week <= weeklyForm.endWeek; week++) {
    if (weeklyForm.recurrence === 'odd' && week % 2 === 0) continue
    if (weeklyForm.recurrence === 'even' && week % 2 === 1) continue
    slots.push({ week, day: weeklyForm.weekday, period: weeklyForm.period })
  }
  return slots
})

const dailyPreviewSlots = computed(() => {
  const slots: Array<{ week: number; day: number; period: number }> = []
  const startAbs = dailyForm.startWeek * 7 + dailyForm.startWeekday
  const endAbs = dailyForm.endWeek * 7 + dailyForm.endWeekday
  if (startAbs > endAbs) return slots
  for (let abs = startAbs; abs <= endAbs; abs++) {
    slots.push({ week: Math.floor(abs / 7), day: abs % 7, period: dailyForm.period })
  }
  return slots
})

async function submitSchedule(payload: Parameters<typeof api.addSchedule>[0], errorRef: typeof weeklyError, noticeRef: typeof weeklyError) {
  errorRef.value = ''
  noticeRef.value = ''
  try {
    const res = await api.addSchedule(payload)
    if (res.weeks === 0) {
      errorRef.value = '所选时段均与已通过预约冲突，未生成任何排期'
      return
    }
    noticeRef.value = `已提交 ${res.weeks} 个时段到「预约审批」，等待审批${res.skipped ? `；${res.skipped} 个时段因冲突跳过` : ''}`
    resetCommon()
  } catch (err) {
    errorRef.value = err instanceof Error ? err.message : '排期失败'
  }
}

function addWeeklyRule() {
  const ce = commonError()
  if (ce) { weeklyError.value = ce; weeklyNotice.value = ''; return }
  if (weeklyForm.startWeek > weeklyForm.endWeek) {
    weeklyError.value = '结束周不能早于开始周'
    weeklyNotice.value = ''
    return
  }
  submitSchedule({ ...commonInfo, ...weeklyForm, mode: 'weekly' }, weeklyError, weeklyNotice)
}

function addDailyRule() {
  const ce = commonError()
  if (ce) { dailyError.value = ce; dailyNotice.value = ''; return }
  if (dailyForm.startWeek * 7 + dailyForm.startWeekday > dailyForm.endWeek * 7 + dailyForm.endWeekday) {
    dailyError.value = '结束时间不能早于开始时间'
    dailyNotice.value = ''
    return
  }
  submitSchedule({ ...commonInfo, ...dailyForm, mode: 'daily' }, dailyError, dailyNotice)
}

onMounted(async () => {
  try {
    const config = await api.getConfig()
    // 假期周只用于查看与预约，批量排课仍限制在正式教学周内。
    semesterWeeks.value = config.teachingWeeks || config.totalWeeks || 1
    semesterName.value = config.semesterLabel
    currentTeachingWeek.value = config.currentWeek
    // 以当前教学周为起点，限制在 [1, 学期周数] 之间
    const current = Math.min(Math.max(config.currentWeek || 1, 1), semesterWeeks.value)
    // 按周重复：开始周为当前周，向后最多 12 周（含当前周），不超过学期周数
    weeklyForm.startWeek = current
    weeklyForm.endWeek = Math.min(current + 11, semesterWeeks.value)
    // 按天重复：开始周与结束周均为当前周
    dailyForm.startWeek = current
    dailyForm.endWeek = current
  } catch { /* ignore */ }
})
</script>

<template>
  <section class="admin-main schedule-management-page">
    <div class="admin-title">
      <div><span class="kicker">BATCH RESERVATION</span><h1>批量预约（排期）</h1><p>一次生成多条预约，统一进入「预约审批」流程；冲突时段自动跳过。</p></div>
      <span class="date-card"><CalendarDays /><b>{{ semesterName || '当前学期' }}</b><small>共 {{ semesterWeeks }} 周</small></span>
    </div>

    <section class="panel schedule-common-panel">
      <div class="panel-head"><div><h2>课程信息</h2><p>排课公用信息，与首页预约大厅一致；提交排课后自动清空。</p></div></div>
      <div class="schedule-common-form">
        <label class="course-field">课程名称<input v-model.trim="commonInfo.courseName" placeholder="请输入课程名称" required></label>
        <label>申请姓名<input v-model.trim="commonInfo.applicantName" autocomplete="name" placeholder="请输入申请人姓名" required></label>
        <label>申请电话<input v-model.trim="commonInfo.phone" type="tel" autocomplete="tel" placeholder="请输入联系电话" required></label>
        <label>上课人数<input v-model.number="commonInfo.attendees" type="number" min="1" max="9999" required></label>
        <label>常用软件<input v-model.trim="commonInfo.requiredSoftware" placeholder="无" required></label>
        <label class="remarks-field">备注信息<input v-model.trim="commonInfo.remarks" placeholder="可补充具体上课时间、特殊设备需求等信息"></label>
      </div>
    </section>

    <section class="panel schedule-rule-form-panel">
      <div class="schedule-tabs" role="tablist">
        <button type="button" role="tab" :aria-selected="tab === 'weekly'" :class="{ active: tab === 'weekly' }" @click="tab = 'weekly'">按周重复</button>
        <button type="button" role="tab" :aria-selected="tab === 'daily'" :class="{ active: tab === 'daily' }" @click="tab = 'daily'">按天重复</button>
      </div>

      <form v-if="tab === 'weekly'" class="schedule-tool-form" @submit.prevent="addWeeklyRule">
        <p class="schedule-tab-desc">设置一次，自动在所选教学周生成机房占用。</p>
        <div class="tool-fields">
          <div class="tool-row weekly-main-row">
            <label>机房<select v-model.number="weeklyForm.roomId"><option v-for="room in adminStore.rooms" :key="room.id" :value="room.id">{{ room.name }}（{{ room.seats }} 座）</option></select></label>
            <label>星期<select v-model.number="weeklyForm.weekday"><option v-for="(day, index) in weekdays" :key="day" :value="index">{{ day }}</option></select></label>
            <label>时段<select v-model.number="weeklyForm.period"><option v-for="(period, index) in periods" :key="period" :value="index">{{ period }}</option></select></label>
          </div>
          <div class="tool-row weekly-repeat-row">
            <WeekSelect v-model="weeklyForm.startWeek" label="开始周" :options="weeklyStartWeekOptions" :current-week="currentTeachingWeek" />
            <WeekSelect v-model="weeklyForm.endWeek" label="结束周" :options="weeklyEndWeekOptions" :current-week="currentTeachingWeek" />
            <label>重复方式<select v-model="weeklyForm.recurrence"><option value="weekly">每周</option><option value="odd">单周</option><option value="even">双周</option></select></label>
          </div>
        </div>
        <SchedulePreview :room-id="weeklyForm.roomId" :room="weeklyRoom" :slots="weeklyPreviewSlots" :course-name="commonInfo.courseName">
          <template #actions>
            <button class="primary tool-submit" type="submit" :disabled="!adminStore.rooms.length">添加排期</button>
            <p v-if="weeklyError" class="schedule-form-error">{{ weeklyError }}</p>
            <p v-else-if="weeklyNotice" class="schedule-form-notice">{{ weeklyNotice }}</p>
          </template>
        </SchedulePreview>
      </form>

      <form v-else class="schedule-tool-form" @submit.prevent="addDailyRule">
        <p class="schedule-tab-desc">指定起止周次，在周次范围内每天都生成机房占用。</p>
        <div class="tool-fields">
          <div class="tool-row daily-main-row">
            <label>机房<select v-model.number="dailyForm.roomId"><option v-for="room in adminStore.rooms" :key="room.id" :value="room.id">{{ room.name }}（{{ room.seats }} 座）</option></select></label>
            <label>时段<select v-model.number="dailyForm.period"><option v-for="(period, index) in periods" :key="period" :value="index">{{ period }}</option></select></label>
          </div>
          <div class="tool-row daily-range-row">
            <WeekSelect v-model="dailyForm.startWeek" label="开始周" :options="dailyStartWeekOptions" :current-week="currentTeachingWeek" />
            <label>周几<select v-model.number="dailyForm.startWeekday"><option v-for="{ day, index } in dailyStartWeekdayOptions" :key="day" :value="index">{{ day }}</option></select></label>
            <WeekSelect v-model="dailyForm.endWeek" label="结束周" :options="dailyEndWeekOptions" :current-week="currentTeachingWeek" />
            <label>周几<select v-model.number="dailyForm.endWeekday"><option v-for="{ day, index } in dailyEndWeekdayOptions" :key="day" :value="index">{{ day }}</option></select></label>
          </div>
        </div>
        <SchedulePreview :room-id="dailyForm.roomId" :room="dailyRoom" :slots="dailyPreviewSlots" :course-name="commonInfo.courseName">
          <template #actions>
            <button class="primary tool-submit" type="submit" :disabled="!adminStore.rooms.length">添加排期</button>
            <p v-if="dailyError" class="schedule-form-error">{{ dailyError }}</p>
            <p v-else-if="dailyNotice" class="schedule-form-notice">{{ dailyNotice }}</p>
          </template>
        </SchedulePreview>
      </form>
    </section>
  </section>
</template>
