<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  CalendarDays, Check, CircleHelp, Clock3, DoorOpen,
  LayoutDashboard, ListChecks, LogOut, MapPin, Phone, Save, Settings2,
  Trash2, UserRound, Users, X,
} from '@lucide/vue'
import { api, type ScheduleView } from '../api'
import { periods, weekdays } from '../data'
import type { BookingRequest, RequestState, Room } from '../types'

defineProps<{ admin: { displayName: string } }>()
const emit = defineEmits<{ logout: [] }>()

const requests = ref<BookingRequest[]>([])
const rooms = ref<Room[]>([])
const managedUsers = ref<Array<{ id: number; name: string; phone: string; applications: number; lastCourse: string }>>([])
const scheduleRules = ref<ScheduleView[]>([])

const systemSettings = ref({
  startYear: new Date().getFullYear(),
  startMonth: 1,
  startDay: 1 as number | null,
  semesterWeeks: 0,
  contactName: '',
  contactPhone: '',
})
const settingsSaved = ref(false)
const scheduleError = ref('')

type Recurrence = 'weekly' | 'odd' | 'even'
const scheduleForm = reactive({
  courseName: '', roomId: 0, weekday: 1, period: 0,
  startWeek: 1, endWeek: 18, recurrence: 'weekly' as Recurrence,
})

const active = ref('申请审批')
const pending = computed(() => requests.value.filter((request) => request.state === 'pending').length)
const scheduledRoomCount = computed(() => new Set(scheduleRules.value.map((rule) => rule.roomId)).size)
const navigation = computed(() => [
  { name: '概览', icon: LayoutDashboard },
  { name: '申请审批', icon: ListChecks, badge: pending.value },
  { name: '机房排期', icon: CalendarDays },
  { name: '机房管理', icon: DoorOpen },
  { name: '用户管理', icon: Users },
  { name: '系统设置', icon: Settings2 },
])

async function loadApplications() {
  const list = await api.getApplications('all')
  requests.value = list.map((item) => ({
    id: item.id,
    applicant: item.applicant,
    phone: item.phone,
    requiredSoftware: item.requiredSoftware,
    people: item.people,
    details: item.details,
    courseName: item.courseName,
    remarks: item.remarks,
    state: item.state,
  }))
}

onMounted(async () => {
  try {
    rooms.value = await api.getRooms()
    if (rooms.value.length) scheduleForm.roomId = rooms.value[0].id
  } catch { /* 机房加载失败，机房相关区块将为空。 */ }

  await Promise.allSettled([
    loadApplications(),
    api.getSettings().then((s) => { systemSettings.value = { ...s, startDay: s.startDay } }),
    api.getUsers().then((u) => { managedUsers.value = u }),
    api.getSchedules().then((r) => { scheduleRules.value = r }),
  ])
})

async function updateRequest(id: string, state: RequestState) {
  const request = requests.value.find((item) => item.id === id)
  if (!request) return
  try {
    if (state === 'approved') await api.approveApplication(id)
    else if (state === 'rejected') await api.rejectApplication(id)
    request.state = state
  } catch (err) {
    alert(err instanceof Error ? err.message : '操作失败')
  }
}

async function deleteRequest(id: string) {
  try {
    await api.deleteApplication(id)
    requests.value = requests.value.filter((request) => request.id !== id)
  } catch (err) {
    alert(err instanceof Error ? err.message : '删除失败')
  }
}

async function saveSystemSettings() {
  settingsSaved.value = false
  try {
    await api.updateSettings(systemSettings.value)
    settingsSaved.value = true
  } catch (err) {
    alert(err instanceof Error ? err.message : '保存失败')
  }
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

function roomName(roomId: number) {
  return rooms.value.find((room) => room.id === roomId)?.name || '未知机房'
}
</script>

<template>
  <div class="admin-layout">
    <aside class="admin-side">
      <div class="admin-label">管理后台</div>
      <button
        v-for="item in navigation"
        :key="item.name"
        :class="{ active: active === item.name }"
        @click="active = item.name"
      >
        <component :is="item.icon" :size="18" />{{ item.name }}<b v-if="item.badge">{{ item.badge }}</b>
      </button>
      <div class="side-bottom"><button><CircleHelp :size="18" />帮助与反馈</button><button @click="emit('logout')"><LogOut :size="18" />退出管理端</button></div>
    </aside>

    <section v-if="active === '申请审批'" class="admin-main">
      <div class="admin-title">
        <div><span class="kicker">REQUEST REVIEW</span><h1>申请审批</h1><p>共 {{ requests.length }} 条申请，{{ pending }} 条待处理。</p></div>
        <span class="date-card"><CalendarDays /><b>审批管理员</b><small>{{ admin.displayName }}</small></span>
      </div>

      <section class="panel approval-panel">
        <div class="approval-table-wrap">
          <table class="approval-table">
            <thead><tr><th>ID</th><th>姓名</th><th>电话</th><th>需要软件</th><th>学生人数</th><th>详细信息</th><th>课程名称</th><th>备注</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="request in requests" :key="request.id">
                <td class="request-id">{{ request.id }}</td>
                <td><strong>{{ request.applicant }}</strong></td>
                <td class="nowrap">{{ request.phone }}</td>
                <td>{{ request.requiredSoftware }}</td>
                <td class="people-count">{{ request.people }}</td>
                <td class="request-detail">{{ request.details }}</td>
                <td>{{ request.courseName }}</td>
                <td class="request-note">{{ request.remarks || '—' }}</td>
                <td>
                  <div class="approval-actions">
                    <template v-if="request.state === 'pending'">
                      <button class="approve" title="通过" @click="updateRequest(request.id, 'approved')"><Check />通过</button>
                      <button class="reject" title="驳回" @click="updateRequest(request.id, 'rejected')"><X />驳回</button>
                    </template>
                    <span v-else class="status" :class="request.state">{{ request.state === 'approved' ? '已通过' : '已驳回' }}</span>
                    <button class="delete" title="删除" @click="deleteRequest(request.id)"><Trash2 />删除</button>
                  </div>
                </td>
              </tr>
              <tr v-if="!requests.length"><td colspan="9" class="approval-empty">暂无申请记录</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </section>

    <section v-else-if="active === '机房排期'" class="admin-main schedule-management-page">
      <div class="admin-title">
        <div><span class="kicker">SEMESTER SCHEDULE</span><h1>机房排期</h1><p>按教学周生成机房占用，一条规则可覆盖多周课程。</p></div>
        <span class="date-card"><CalendarDays /><b>当前学期</b><small>共 {{ systemSettings.semesterWeeks }} 周</small></span>
      </div>

      <div class="schedule-summary">
        <article><span class="summary-icon occupied"><Clock3 /></span><div><small>排期条数</small><strong>{{ scheduleRules.length }}</strong></div></article>
        <article><span class="summary-icon available"><DoorOpen /></span><div><small>已使用机房</small><strong>{{ scheduledRoomCount }} / {{ rooms.length }}</strong></div></article>
        <div class="schedule-guidance"><strong>说明</strong><span>排期会直接生成已通过的机房占用，与预约共用占用检测；冲突的时段会自动跳过。</span></div>
      </div>

      <section class="panel schedule-rule-form-panel">
        <div class="panel-head"><div><h2>新增排期</h2><p>设置一次，自动在所选教学周生成机房占用。</p></div></div>
        <form class="schedule-rule-form" @submit.prevent="addScheduleRule">
          <label class="course-field">课程名称<input v-model.trim="scheduleForm.courseName" placeholder="请输入课程名称" required></label>
          <label>机房<select v-model.number="scheduleForm.roomId"><option v-for="room in rooms" :key="room.id" :value="room.id">{{ room.name }}（{{ room.seats }} 座）</option></select></label>
          <label>星期<select v-model.number="scheduleForm.weekday"><option v-for="(day, index) in weekdays" :key="day" :value="index">{{ day }}</option></select></label>
          <label>时段<select v-model.number="scheduleForm.period"><option v-for="(period, index) in periods" :key="period" :value="index">{{ period }}</option></select></label>
          <label>开始周<input v-model.number="scheduleForm.startWeek" type="number" min="1" :max="systemSettings.semesterWeeks || 30" required></label>
          <label>结束周<input v-model.number="scheduleForm.endWeek" type="number" min="1" :max="systemSettings.semesterWeeks || 30" required></label>
          <label>重复方式<select v-model="scheduleForm.recurrence"><option value="weekly">每周</option><option value="odd">单周</option><option value="even">双周</option></select></label>
          <button class="primary" type="submit" :disabled="!rooms.length">添加排期</button>
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

    <section v-else-if="active === '机房管理'" class="admin-main">
      <div class="admin-title">
        <div><span class="kicker">ROOM MANAGEMENT</span><h1>机房管理</h1><p>共 {{ rooms.length }} 间机房，展示机房基本信息与管理人员联系方式。</p></div>
        <span class="date-card"><DoorOpen /><b>{{ rooms.length }} 间机房</b><small>实验教学中心</small></span>
      </div>

      <div class="room-management-grid">
        <article v-for="room in rooms" :key="room.id" class="managed-room-card">
          <div class="managed-room-head">
            <span class="managed-room-id">{{ String(room.id).padStart(2, '0') }}</span>
            <div><h2>{{ room.name }}</h2><p><MapPin />{{ room.building }}</p></div>
            <span class="room-capacity"><Users />{{ room.seats }} 座</span>
          </div>
          <div class="managed-room-body">
            <span class="room-owner">{{ room.audience }}</span>
            <p class="room-intro" :class="{ muted: !room.intro }">{{ room.intro || '暂无机房简介' }}</p>
            <div class="room-contact">
              <span><UserRound />管理员：{{ room.administrator || '暂未设置' }}</span>
              <span><Phone />联系电话：{{ room.phone || '暂未设置' }}</span>
            </div>
          </div>
        </article>
        <div v-if="!rooms.length" class="empty"><DoorOpen /><h3>暂无机房数据</h3></div>
      </div>
    </section>

    <section v-else-if="active === '用户管理'" class="admin-main">
      <div class="admin-title">
        <div><span class="kicker">USER MANAGEMENT</span><h1>用户管理</h1><p>共 {{ managedUsers.length }} 位申请人，按历史申请记录聚合。</p></div>
        <span class="date-card"><Users /><b>{{ managedUsers.length }} 位用户</b><small>申请人</small></span>
      </div>

      <section class="panel approval-panel">
        <div class="approval-table-wrap">
          <table class="approval-table user-table">
            <thead><tr><th>ID</th><th>姓名</th><th>电话</th><th>申请次数</th><th>最近课程</th></tr></thead>
            <tbody>
              <tr v-for="user in managedUsers" :key="user.id">
                <td class="request-id">{{ user.id }}</td>
                <td><strong>{{ user.name }}</strong></td>
                <td class="nowrap">{{ user.phone }}</td>
                <td class="people-count">{{ user.applications }}</td>
                <td>{{ user.lastCourse || '—' }}</td>
              </tr>
              <tr v-if="!managedUsers.length"><td colspan="5" class="approval-empty">暂无用户记录</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </section>

    <section v-else-if="active === '系统设置'" class="admin-main settings-page">
      <div class="admin-title">
        <div><span class="kicker">SYSTEM SETTINGS</span><h1>系统设置</h1><p>配置当前学期和预约大厅首页的联系信息。</p></div>
        <span class="date-card"><Settings2 /><b>基础设置</b><small>管理后台</small></span>
      </div>

      <form class="panel settings-form" @submit.prevent="saveSystemSettings">
        <div class="settings-section-head"><CalendarDays /><div><h2>学期设置</h2><p>用于生成机房预约日历和教学周信息。</p></div></div>
        <div class="setting-row">
          <label>设置开学时间</label>
          <div class="date-fields">
            <span><input v-model.number="systemSettings.startYear" type="number" min="2000" max="2100" required>年</span>
            <span><input v-model.number="systemSettings.startMonth" type="number" min="1" max="12" required>月</span>
            <span><input v-model.number="systemSettings.startDay" type="number" min="1" max="31" required>日</span>
          </div>
        </div>
        <div class="setting-row">
          <label for="semesterWeeks">设置本学期周数</label>
          <div class="setting-suffix"><input id="semesterWeeks" v-model.number="systemSettings.semesterWeeks" type="number" min="1" max="30" required><span>周</span></div>
        </div>

        <div class="settings-divider" />
        <div class="settings-section-head"><Phone /><div><h2>首页联系信息</h2><p>联系方式将展示在预约大厅首页。</p></div></div>
        <div class="setting-row">
          <label for="contactName">设置首页联系人姓名</label>
          <input id="contactName" v-model.trim="systemSettings.contactName" type="text" required>
        </div>
        <div class="setting-row">
          <label for="contactPhone">设置首页联系人电话</label>
          <input id="contactPhone" v-model.trim="systemSettings.contactPhone" type="tel" required>
        </div>

        <div class="settings-footer">
          <span v-if="settingsSaved" class="settings-saved"><Check />设置已保存</span>
          <button class="primary" type="submit"><Save />提交修改</button>
        </div>
      </form>
    </section>

    <section v-else class="admin-main admin-placeholder">
      <DoorOpen />
      <h2>{{ active }}</h2>
      <p>该模块暂未配置。</p>
    </section>
  </div>
</template>
