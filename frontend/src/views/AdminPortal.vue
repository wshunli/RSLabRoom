<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  CalendarDays, Check, CircleHelp, Clock3, DoorOpen,
  LayoutDashboard, ListChecks, LogOut, MapPin, Phone, Save, Settings2,
  Trash2, UserRound, Users, X,
} from '@lucide/vue'
import { api } from '../api'
import { days, initialRequests, periods, rooms } from '../data'
import type { BookingRequest, RequestState } from '../types'

defineProps<{ admin: { displayName: string } }>()
const emit = defineEmits<{ logout: [] }>()

// 以本地占位数据初始化，挂载后尝试用后端真实数据覆盖。
const requests = ref<BookingRequest[]>(initialRequests.map((request) => ({ ...request })))
const managedUsers = ref([
  { id: 1, name: '陈雨欣', phone: '138 0000 1208', unit: '遥感学院', role: '教师', enabled: true },
  { id: 2, name: '李明泽', phone: '139 0000 2107', unit: '测绘学院', role: '教师', enabled: true },
  { id: 3, name: '王老师', phone: '136 0000 2006', unit: '空间信息工程系', role: '管理员', enabled: true },
])

onMounted(async () => {
  try {
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
  } catch { /* 后端不可用：保留占位申请数据。 */ }

  try {
    const s = await api.getSettings()
    systemSettings.value = {
      startYear: s.startYear,
      startMonth: s.startMonth,
      startDay: s.startDay,
      semesterWeeks: s.semesterWeeks,
      contactName: s.contactName,
      contactPhone: s.contactPhone,
    }
  } catch { /* 后端不可用：保留占位系统设置。 */ }

  try {
    const users = await api.getUsers()
    if (users.length) managedUsers.value = users
  } catch { /* 后端不可用：保留占位用户数据。 */ }
})
const systemSettings = ref({
  startYear: 2026,
  startMonth: 3,
  startDay: null as number | null,
  semesterWeeks: 24,
  contactName: '王顺利',
  contactPhone: '15538087393',
})
const settingsSaved = ref(false)
type Recurrence = 'weekly' | 'odd' | 'even'
interface ScheduleRule {
  id: number
  courseName: string
  roomId: number
  weekday: number
  period: number
  startWeek: number
  endWeek: number
  recurrence: Recurrence
}
const scheduleRules = ref<ScheduleRule[]>([
  { id: 1, courseName: '遥感原理与应用', roomId: 1, weekday: 1, period: 0, startWeek: 1, endWeek: 16, recurrence: 'weekly' },
  { id: 2, courseName: '数字摄影测量', roomId: 2, weekday: 2, period: 1, startWeek: 1, endWeek: 16, recurrence: 'weekly' },
  { id: 3, courseName: '空间数据分析', roomId: 3, weekday: 3, period: 1, startWeek: 1, endWeek: 18, recurrence: 'odd' },
  { id: 4, courseName: 'GIS 开发课程', roomId: 5, weekday: 4, period: 0, startWeek: 2, endWeek: 18, recurrence: 'even' },
])
const scheduleForm = reactive<Omit<ScheduleRule, 'id'>>({
  courseName: '', roomId: rooms[0].id, weekday: 1, period: 0,
  startWeek: 1, endWeek: 18, recurrence: 'weekly',
})
const nextScheduleId = ref(5)
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

async function updateRequest(id: string, state: RequestState) {
  const request = requests.value.find((item) => item.id === id)
  if (!request) return
  try {
    if (state === 'approved') await api.approveApplication(id)
    else if (state === 'rejected') await api.rejectApplication(id)
  } catch (err) {
    // 审批冲突等后端校验失败时提示并中止；网络不可用则按占位继续。
    if (!(err instanceof TypeError)) {
      alert(err instanceof Error ? err.message : '操作失败')
      return
    }
  }
  request.state = state
}

async function deleteRequest(id: string) {
  try {
    await api.deleteApplication(id)
  } catch { /* 网络不可用：按占位删除本地记录。 */ }
  requests.value = requests.value.filter((request) => request.id !== id)
}

function deleteUser(id: number) {
  managedUsers.value = managedUsers.value.filter((user) => user.id !== id)
}

async function saveSystemSettings() {
  try {
    await api.updateSettings(systemSettings.value)
  } catch { /* 网络不可用：仅本地标记已保存。 */ }
  settingsSaved.value = true
}

async function addScheduleRule() {
  if (scheduleForm.startWeek > scheduleForm.endWeek) return
  // 历史库无排期规则表，后端为占位接口；本地仍维护规则列表用于展示。
  try { await api.addSchedule({ ...scheduleForm }) } catch { /* 占位接口，忽略失败 */ }
  scheduleRules.value.push({ id: nextScheduleId.value++, ...scheduleForm })
  scheduleForm.courseName = ''
}

async function deleteScheduleRule(id: number) {
  try { await api.deleteSchedule(id) } catch { /* 占位接口，忽略失败 */ }
  scheduleRules.value = scheduleRules.value.filter((rule) => rule.id !== id)
}

function roomName(roomId: number) {
  return rooms.find((room) => room.id === roomId)?.name || '未知机房'
}

function recurrenceText(recurrence: Recurrence) {
  return recurrence === 'weekly' ? '每周' : recurrence === 'odd' ? '单周' : '双周'
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
        <div><span class="kicker">SEMESTER SCHEDULE</span><h1>机房排期</h1><p>按教学周设置重复课程，一条规则即可覆盖整个学期。</p></div>
        <span class="date-card"><CalendarDays /><b>2025—2026 学年</b><small>第二学期 · 共 {{ systemSettings.semesterWeeks }} 周</small></span>
      </div>

      <div class="schedule-summary">
        <article><span class="summary-icon occupied"><Clock3 /></span><div><small>排期规则</small><strong>{{ scheduleRules.length }}</strong></div></article>
        <article><span class="summary-icon available"><DoorOpen /></span><div><small>已使用机房</small><strong>{{ scheduledRoomCount }} / {{ rooms.length }}</strong></div></article>
        <div class="schedule-guidance"><strong>推荐设置</strong><span>普通课程通常安排第 1–16 或 1–18 周；隔周课程请选择单周或双周。</span></div>
      </div>

      <section class="panel schedule-rule-form-panel">
        <div class="panel-head"><div><h2>新增排期规则</h2><p>设置一次，自动应用到指定教学周。</p></div></div>
        <form class="schedule-rule-form" @submit.prevent="addScheduleRule">
          <label class="course-field">课程名称<input v-model.trim="scheduleForm.courseName" placeholder="请输入课程名称" required></label>
          <label>机房<select v-model.number="scheduleForm.roomId"><option v-for="room in rooms" :key="room.id" :value="room.id">{{ room.name }}（{{ room.seats }} 座）</option></select></label>
          <label>星期<select v-model.number="scheduleForm.weekday"><option v-for="(day, index) in days" :key="day.week" :value="index">{{ day.week }}</option></select></label>
          <label>时段<select v-model.number="scheduleForm.period"><option v-for="(period, index) in periods" :key="period" :value="index">{{ period }}</option></select></label>
          <label>开始周<input v-model.number="scheduleForm.startWeek" type="number" min="1" :max="systemSettings.semesterWeeks" required></label>
          <label>结束周<input v-model.number="scheduleForm.endWeek" type="number" min="1" :max="systemSettings.semesterWeeks" required></label>
          <label>重复方式<select v-model="scheduleForm.recurrence"><option value="weekly">每周</option><option value="odd">单周</option><option value="even">双周</option></select></label>
          <button class="primary" type="submit">添加排期</button>
          <p v-if="scheduleForm.startWeek > scheduleForm.endWeek" class="schedule-form-error">结束周不能早于开始周</p>
        </form>
      </section>

      <section class="panel schedule-rules-panel">
        <div class="panel-head"><div><h2>学期排期</h2><p>当前共 {{ scheduleRules.length }} 条重复排期规则。</p></div></div>
        <div class="approval-table-wrap">
          <table class="approval-table schedule-rules-table">
            <thead><tr><th>课程名称</th><th>机房</th><th>上课时间</th><th>教学周</th><th>重复方式</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="rule in scheduleRules" :key="rule.id">
                <td><strong>{{ rule.courseName }}</strong></td>
                <td>{{ roomName(rule.roomId) }}</td>
                <td>{{ days[rule.weekday].week }} · {{ periods[rule.period] }}</td>
                <td><span class="week-range">第 {{ rule.startWeek }}–{{ rule.endWeek }} 周</span></td>
                <td><span class="recurrence-tag" :class="rule.recurrence">{{ recurrenceText(rule.recurrence) }}</span></td>
                <td><div class="approval-actions"><button class="delete" @click="deleteScheduleRule(rule.id)"><Trash2 />删除</button></div></td>
              </tr>
              <tr v-if="!scheduleRules.length"><td colspan="6" class="approval-empty">暂无排期规则</td></tr>
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
      </div>
    </section>

    <section v-else-if="active === '用户管理'" class="admin-main">
      <div class="admin-title">
        <div><span class="kicker">USER MANAGEMENT</span><h1>用户管理</h1><p>共 {{ managedUsers.length }} 位用户，可管理账号的启用状态。</p></div>
        <span class="date-card"><Users /><b>{{ managedUsers.length }} 位用户</b><small>平台账号</small></span>
      </div>

      <section class="panel approval-panel">
        <div class="approval-table-wrap">
          <table class="approval-table user-table">
            <thead><tr><th>ID</th><th>姓名</th><th>电话</th><th>所属单位</th><th>角色</th><th>状态</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="user in managedUsers" :key="user.id">
                <td class="request-id">{{ user.id }}</td>
                <td><strong>{{ user.name }}</strong></td>
                <td class="nowrap">{{ user.phone }}</td>
                <td>{{ user.unit }}</td>
                <td>{{ user.role }}</td>
                <td><span class="user-state" :class="{ disabled: !user.enabled }">{{ user.enabled ? '已启用' : '已停用' }}</span></td>
                <td>
                  <div class="approval-actions">
                    <button class="user-toggle" @click="user.enabled = !user.enabled">{{ user.enabled ? '停用' : '启用' }}</button>
                    <button class="delete" @click="deleteUser(user.id)"><Trash2 />删除</button>
                  </div>
                </td>
              </tr>
              <tr v-if="!managedUsers.length"><td colspan="7" class="approval-empty">暂无用户记录</td></tr>
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
