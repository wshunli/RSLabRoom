<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { CalendarDays, Clock3, DoorOpen, Trash2 } from '@lucide/vue'
import { api, type ScheduleView } from '../../api'
import { periods, weekdays } from '../../data'
import { adminStore } from '../../stores/admin'

const scheduleRules = ref<ScheduleView[]>([])
const scheduleError = ref('')
const semesterWeeks = ref(18)

type Recurrence = 'weekly' | 'odd' | 'even'
const scheduleForm = reactive({
  courseName: '', roomId: 0, weekday: 1, period: 0,
  startWeek: 1, endWeek: 18, recurrence: 'weekly' as Recurrence,
})

const scheduledRoomCount = computed(() => new Set(scheduleRules.value.map((rule) => rule.roomId)).size)

function roomName(roomId: number) {
  return adminStore.rooms.find((room) => room.id === roomId)?.name || '未知机房'
}

async function addScheduleRule() {
  scheduleError.value = ''
  if (scheduleForm.startWeek > scheduleForm.endWeek) {
    scheduleError.value = '结束周不能早于开始周'
    return
  }
  try {
    const created = await api.addSchedule({ ...scheduleForm })
    scheduleRules.value.push(created)
    if (created.skipped) scheduleError.value = `已生成 ${created.weeks} 个时段，${created.skipped} 个时段因冲突跳过`
    scheduleForm.courseName = ''
  } catch (err) {
    scheduleError.value = err instanceof Error ? err.message : '排期失败'
  }
}

async function deleteScheduleRule(id: string) {
  try {
    await api.deleteSchedule(id)
    scheduleRules.value = scheduleRules.value.filter((rule) => rule.id !== id)
  } catch (err) {
    alert(err instanceof Error ? err.message : '删除失败')
  }
}

onMounted(async () => {
  try {
    const s = await api.getSettings()
    semesterWeeks.value = s.semesterWeeks
  } catch { /* ignore */ }

  try {
    scheduleRules.value = await api.getSchedules()
  } catch { /* ignore */ }
})
</script>

<template>
  <section class="admin-main schedule-management-page">
    <div class="admin-title">
      <div><span class="kicker">SEMESTER SCHEDULE</span><h1>机房排期</h1><p>按教学周生成机房占用，一条规则可覆盖多周课程。</p></div>
      <span class="date-card"><CalendarDays /><b>当前学期</b><small>共 {{ semesterWeeks }} 周</small></span>
    </div>

    <div class="schedule-summary">
      <article><span class="summary-icon occupied"><Clock3 /></span><div><small>排期条数</small><strong>{{ scheduleRules.length }}</strong></div></article>
      <article><span class="summary-icon available"><DoorOpen /></span><div><small>已使用机房</small><strong>{{ scheduledRoomCount }} / {{ adminStore.rooms.length }}</strong></div></article>
      <div class="schedule-guidance"><strong>说明</strong><span>排期会直接生成已通过的机房占用，与预约共用占用检测；冲突的时段会自动跳过。</span></div>
    </div>

    <section class="panel schedule-rule-form-panel">
      <div class="panel-head"><div><h2>新增排期</h2><p>设置一次，自动在所选教学周生成机房占用。</p></div></div>
      <form class="schedule-rule-form" @submit.prevent="addScheduleRule">
        <label class="course-field">课程名称<input v-model.trim="scheduleForm.courseName" placeholder="请输入课程名称" required></label>
        <label>机房<select v-model.number="scheduleForm.roomId"><option v-for="room in adminStore.rooms" :key="room.id" :value="room.id">{{ room.name }}（{{ room.seats }} 座）</option></select></label>
        <label>星期<select v-model.number="scheduleForm.weekday"><option v-for="(day, index) in weekdays" :key="day" :value="index">{{ day }}</option></select></label>
        <label>时段<select v-model.number="scheduleForm.period"><option v-for="(period, index) in periods" :key="period" :value="index">{{ period }}</option></select></label>
        <label>开始周<input v-model.number="scheduleForm.startWeek" type="number" min="1" :max="semesterWeeks || 30" required></label>
        <label>结束周<input v-model.number="scheduleForm.endWeek" type="number" min="1" :max="semesterWeeks || 30" required></label>
        <label>重复方式<select v-model="scheduleForm.recurrence"><option value="weekly">每周</option><option value="odd">单周</option><option value="even">双周</option></select></label>
        <button class="primary" type="submit" :disabled="!adminStore.rooms.length">添加排期</button>
        <p v-if="scheduleError" class="schedule-form-error">{{ scheduleError }}</p>
      </form>
    </section>

    <section class="panel schedule-rules-panel">
      <div class="panel-head"><div><h2>学期排期</h2><p>当前共 {{ scheduleRules.length }} 条排期。</p></div></div>
      <div class="approval-table-wrap">
        <table class="approval-table schedule-rules-table">
          <thead><tr><th>课程名称</th><th>机房</th><th>上课时间</th><th>占用周数</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="rule in scheduleRules" :key="rule.id">
              <td><strong>{{ rule.courseName }}</strong></td>
              <td>{{ roomName(rule.roomId) }}</td>
              <td>{{ weekdays[rule.weekday] }} · {{ periods[rule.period] }}</td>
              <td><span class="week-range">{{ rule.weeks }} 周</span></td>
              <td><div class="approval-actions"><button class="delete" @click="deleteScheduleRule(rule.id)"><Trash2 />删除</button></div></td>
            </tr>
            <tr v-if="!scheduleRules.length"><td colspan="5" class="approval-empty">暂无排期</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>
