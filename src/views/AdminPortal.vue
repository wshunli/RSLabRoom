<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  CalendarDays, Check, ChevronRight, CircleHelp, Clock3, DoorOpen,
  LayoutDashboard, ListChecks, LogOut, Monitor, Settings2, ShieldCheck,
  Users, X,
} from '@lucide/vue'
import StatCard from '../components/StatCard.vue'
import { initialRequests, rooms } from '../data'
import type { BookingRequest, RequestState } from '../types'

const requests = ref<BookingRequest[]>(initialRequests.map((request) => ({ ...request })))
const active = ref('概览')
const pending = computed(() => requests.value.filter((request) => request.state === 'pending').length)
const navigation = computed(() => [
  { name: '概览', icon: LayoutDashboard },
  { name: '申请审批', icon: ListChecks, badge: pending.value },
  { name: '机房排期', icon: CalendarDays },
  { name: '机房管理', icon: DoorOpen },
  { name: '系统设置', icon: Settings2 },
])

function updateRequest(id: string, state: RequestState) {
  const request = requests.value.find((item) => item.id === id)
  if (request) request.state = state
}
</script>

<template>
  <div class="admin-layout">
    <aside class="admin-side">
      <div class="admin-label">管理控制台</div>
      <button
        v-for="item in navigation"
        :key="item.name"
        :class="{ active: active === item.name }"
        @click="active = item.name"
      >
        <component :is="item.icon" :size="18" />{{ item.name }}<b v-if="item.badge">{{ item.badge }}</b>
      </button>
      <div class="side-bottom"><button><CircleHelp :size="18" />帮助与反馈</button><button><LogOut :size="18" />退出管理端</button></div>
    </aside>

    <section class="admin-main">
      <div class="admin-title">
        <div><span class="kicker">ADMIN CONSOLE</span><h1>下午好，王老师</h1><p>这里是实验教学中心今天的运行概况。</p></div>
        <span class="date-card"><CalendarDays /><b>2026 年 6 月 24 日</b><small>星期三 · 第 17 周</small></span>
      </div>
      <div class="admin-stats">
        <StatCard label="待审批申请" :value="pending" note="较昨日新增 2 条" :icon="ListChecks" tone="orange" />
        <StatCard label="今日使用机房" value="5 / 7" note="71% 使用率" :icon="Monitor" tone="blue" />
        <StatCard label="今日课程" value="12" note="涉及 436 名学生" :icon="Users" tone="green" />
        <StatCard label="本周异常" value="0" note="全部设备运行正常" :icon="ShieldCheck" tone="purple" />
      </div>

      <div class="admin-grid">
        <section class="panel requests-panel">
          <div class="panel-head">
            <div><h2>最新借用申请</h2><p>按提交时间倒序</p></div>
            <button class="text-btn">查看全部 <ChevronRight :size="16" /></button>
          </div>
          <div class="request-list">
            <div v-for="request in requests" :key="request.id" class="request">
              <span class="request-avatar">{{ request.applicant[0] }}</span>
              <div class="request-main">
                <div><strong>{{ request.applicant }}</strong><small>{{ request.unit }} · {{ request.id }}</small></div>
                <p>{{ request.purpose }}</p>
                <div class="request-meta">
                  <span><DoorOpen />{{ request.room }}</span><span><CalendarDays />{{ request.date }}</span>
                  <span><Clock3 />{{ request.period }}</span><span><Users />{{ request.people }} 人</span>
                </div>
              </div>
              <div class="request-actions">
                <template v-if="request.state === 'pending'">
                  <button class="approve" @click="updateRequest(request.id, 'approved')"><Check />通过</button>
                  <button class="reject" @click="updateRequest(request.id, 'rejected')"><X />驳回</button>
                </template>
                <span v-else class="status" :class="request.state">{{ request.state === 'approved' ? '已通过' : '已驳回' }}</span>
              </div>
            </div>
          </div>
        </section>

        <section class="panel today-panel">
          <div class="panel-head"><div><h2>今日机房动态</h2><p>当前使用状态</p></div><span class="live"><i />实时</span></div>
          <div v-for="(room, index) in rooms.slice(0, 5)" :key="room.id" class="today-room">
            <span class="room-state" :class="index < 3 ? 'using' : 'idle'"><Monitor /></span>
            <div><strong>{{ room.name }}</strong><small>{{ index < 3 ? '遥感原理与应用课程设计' : '当前空闲' }}</small></div>
            <span>{{ index < 3 ? (index === 2 ? '18:00 结束' : '12:00 结束') : '可预约' }}</span>
          </div>
        </section>
      </div>
    </section>
  </div>
</template>
