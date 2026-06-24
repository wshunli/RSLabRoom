<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { CalendarDays } from '@lucide/vue'
import { api } from '../../api'
import { periods, weekdays } from '../../data'
import { adminStore } from '../../stores/admin'

const semesterWeeks = ref(18)

type Recurrence = 'weekly' | 'odd' | 'even'

// 排课公用信息，与首页预约大厅提交字段一致；提交后清空
const commonInfo = reactive({
  applicantName: '', phone: '', attendees: 1,
  courseName: '', requiredSoftware: '', remarks: '',
})
function resetCommon() {
  commonInfo.applicantName = ''
  commonInfo.phone = ''
  commonInfo.attendees = 1
  commonInfo.courseName = ''
  commonInfo.requiredSoftware = ''
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

watch(() => adminStore.rooms, (rooms) => {
  if (!rooms.length) return
  if (!rooms.some((room) => room.id === weeklyForm.roomId)) weeklyForm.roomId = rooms[0].id
  if (!rooms.some((room) => room.id === dailyForm.roomId)) dailyForm.roomId = rooms[0].id
}, { immediate: true, deep: true })

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
    const s = await api.getSettings()
    semesterWeeks.value = s.semesterWeeks
  } catch { /* ignore */ }
})
</script>

<template>
  <section class="admin-main schedule-management-page">
    <div class="admin-title">
      <div><span class="kicker">BATCH RESERVATION</span><h1>批量预约（排期）</h1><p>一次生成多条预约，统一进入「预约审批」流程；冲突时段自动跳过。</p></div>
      <span class="date-card"><CalendarDays /><b>当前学期</b><small>共 {{ semesterWeeks }} 周</small></span>
    </div>

    <section class="panel schedule-common-panel">
      <div class="panel-head"><div><h2>课程信息</h2><p>排课公用信息，与首页预约大厅一致；提交排课后自动清空。</p></div></div>
      <div class="schedule-common-form">
        <label class="course-field">课程名称<input v-model.trim="commonInfo.courseName" placeholder="请输入课程名称" required></label>
        <label>申请姓名<input v-model.trim="commonInfo.applicantName" autocomplete="name" placeholder="请输入申请人姓名" required></label>
        <label>申请电话<input v-model.trim="commonInfo.phone" type="tel" autocomplete="tel" placeholder="请输入联系电话" required></label>
        <label>上课人数<input v-model.number="commonInfo.attendees" type="number" min="1" max="9999" required></label>
        <label>需用软件<input v-model.trim="commonInfo.requiredSoftware" placeholder="请填写课程所需软件" required></label>
        <label class="remarks-field">备注信息<input v-model.trim="commonInfo.remarks" placeholder="可补充具体上课时间、特殊设备需求等信息"></label>
      </div>
    </section>

    <section class="panel schedule-rule-form-panel">
      <div class="panel-head"><div><h2>按周重复</h2><p>设置一次，自动在所选教学周生成机房占用。</p></div></div>
      <form class="schedule-tool-form" @submit.prevent="addWeeklyRule">
        <div class="tool-fields">
          <label>机房<select v-model.number="weeklyForm.roomId"><option v-for="room in adminStore.rooms" :key="room.id" :value="room.id">{{ room.name }}（{{ room.seats }} 座）</option></select></label>
          <label>时段<select v-model.number="weeklyForm.period"><option v-for="(period, index) in periods" :key="period" :value="index">{{ period }}</option></select></label>
          <label>星期<select v-model.number="weeklyForm.weekday"><option v-for="(day, index) in weekdays" :key="day" :value="index">{{ day }}</option></select></label>
          <label>开始周<input v-model.number="weeklyForm.startWeek" type="number" min="1" :max="semesterWeeks || 30" required></label>
          <label>结束周<input v-model.number="weeklyForm.endWeek" type="number" min="1" :max="semesterWeeks || 30" required></label>
          <label>重复方式<select v-model="weeklyForm.recurrence"><option value="weekly">每周</option><option value="odd">单周</option><option value="even">双周</option></select></label>
        </div>
        <button class="primary tool-submit" type="submit" :disabled="!adminStore.rooms.length">添加排期</button>
        <p v-if="weeklyError" class="schedule-form-error">{{ weeklyError }}</p>
        <p v-else-if="weeklyNotice" class="schedule-form-notice">{{ weeklyNotice }}</p>
      </form>
    </section>

    <section class="panel schedule-rule-form-panel">
      <div class="panel-head"><div><h2>按天重复</h2><p>指定起止周次，在周次范围内每天都生成机房占用。</p></div></div>
      <form class="schedule-tool-form" @submit.prevent="addDailyRule">
        <div class="tool-fields">
          <label>机房<select v-model.number="dailyForm.roomId"><option v-for="room in adminStore.rooms" :key="room.id" :value="room.id">{{ room.name }}（{{ room.seats }} 座）</option></select></label>
          <label>时段<select v-model.number="dailyForm.period"><option v-for="(period, index) in periods" :key="period" :value="index">{{ period }}</option></select></label>
          <label>开始周<input v-model.number="dailyForm.startWeek" type="number" min="1" :max="semesterWeeks || 30" required></label>
          <label>开始周几<select v-model.number="dailyForm.startWeekday"><option v-for="(day, index) in weekdays" :key="day" :value="index">{{ day }}</option></select></label>
          <label>结束周<input v-model.number="dailyForm.endWeek" type="number" min="1" :max="semesterWeeks || 30" required></label>
          <label>结束周几<select v-model.number="dailyForm.endWeekday"><option v-for="(day, index) in weekdays" :key="day" :value="index">{{ day }}</option></select></label>
        </div>
        <button class="primary tool-submit" type="submit" :disabled="!adminStore.rooms.length">添加排期</button>
        <p v-if="dailyError" class="schedule-form-error">{{ dailyError }}</p>
        <p v-else-if="dailyNotice" class="schedule-form-notice">{{ dailyNotice }}</p>
      </form>
    </section>
  </section>
</template>
