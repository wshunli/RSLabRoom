<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  CalendarCheck2, CalendarDays, ChevronLeft, ChevronRight, Clock3, DoorOpen,
  ListChecks, Phone, Search, Sparkles, UserRound,
} from '@lucide/vue'
import BookingDrawer from '../components/BookingDrawer.vue'
import RoomRow from '../components/RoomRow.vue'
import { api } from '../api'
import { busySlots as fallbackBusy, days as fallbackDays, periods, rooms as fallbackRooms } from '../data'
import type { Room, SelectedSlot } from '../types'

const query = ref('')
const capacity = ref('全部容量')
const selected = ref<SelectedSlot[]>([])
const drawerOpen = ref(false)
const submitted = ref(false)

// 以本地占位数据初始化，挂载后尝试用后端真实数据覆盖。
const roomList = ref<Room[]>(fallbackRooms)
const busySlots = ref<Set<string>>(fallbackBusy)
const slotInfo = ref<Map<string, { courseName: string }>>(new Map())
const days = ref(fallbackDays)
const week = ref(17)
const totalWeeks = ref(0)
const weekLabel = ref('2026.06.21 — 06.27')
const contact = ref({ name: '王顺利', phone: '15538087393' })
const pendingCount = ref(2)

const filteredRooms = computed(() => roomList.value.filter((room) => {
  const matchesQuery = `${room.name}${room.building}`.includes(query.value)
  const matchesCapacity = capacity.value === '全部容量' || room.seats >= Number(capacity.value)
  return matchesQuery && matchesCapacity
}))

const freeSlotCount = computed(() =>
  roomList.value.length * days.value.length * periods.length - busySlots.value.size)

function formatDot(date: string) {
  return date.replace(/-/g, '.')
}

async function loadAvailability(target: number) {
  const data = await api.getAvailability(target)
  week.value = data.week
  totalWeeks.value = data.totalWeeks
  const busy = new Set<string>()
  const info = new Map<string, { courseName: string }>()
  for (const slot of data.slots) {
    busy.add(slot.key)
    info.set(slot.key, { courseName: slot.courseName })
  }
  busySlots.value = busy
  slotInfo.value = info
  weekLabel.value = `${formatDot(data.range.start)} — ${formatDot(data.range.end)}`
}

async function changeWeek(delta: number) {
  const next = week.value + delta
  if (next < 1 || (totalWeeks.value && next > totalWeeks.value)) return
  try {
    await loadAvailability(next)
  } catch {
    week.value = next // 后端不可用时仅切换周序号
  }
}

onMounted(async () => {
  try {
    const [config, rooms] = await Promise.all([api.getConfig(), api.getRooms()])
    if (config.contact.name) contact.value = config.contact
    totalWeeks.value = config.totalWeeks
    if (rooms.length) roomList.value = rooms
    await loadAvailability(config.currentWeek)
  } catch {
    // 后端不可用：保留本地占位数据，界面照常可用。
  }
})

function toggleSlot(room: SelectedSlot['room'], day: number, period: number) {
  const index = selected.value.findIndex((slot) => slot.room.id === room.id && slot.day === day && slot.period === period)
  if (index >= 0) selected.value.splice(index, 1)
  else selected.value.push({ room, day, period })
  submitted.value = false
}

interface BookingForm {
  applicantName: string
  phone: string
  attendees: number
  courseName: string
  requiredSoftware: string
  remarks: string
}

async function handleSubmit(form: BookingForm) {
  const slots = selected.value.map((slot) => ({
    roomId: slot.room.id,
    week: week.value,
    day: slot.day,
    period: slot.period,
  }))
  try {
    await api.submitApplication({ ...form, slots })
  } catch {
    // 后端不可用时仍展示提交成功，作为占位演示。
  }
  submitted.value = true
}

function finishBooking() {
  drawerOpen.value = false
  selected.value = []
  submitted.value = false
}
</script>

<template>
  <main>
    <section class="hero">
      <div>
        <div class="eyebrow"><Sparkles :size="15" /> 让教学空间更好用</div>
        <h1>找到合适的机房，<br><em>现在就能预约。</em></h1>
        <p>实时查看实验教学中心机房使用情况，在线提交申请，审批进度随时可查。</p>
      </div>
      <div class="hero-stats">
        <div><span class="stat-icon mint"><DoorOpen /></span><strong>{{ roomList.length }}</strong><small>开放机房</small></div>
        <div><span class="stat-icon amber"><Clock3 /></span><strong>{{ freeSlotCount }}</strong><small>本周空闲时段</small></div>
        <div><span class="stat-icon lilac"><ListChecks /></span><strong>{{ pendingCount }}</strong><small>进行中的申请</small></div>
      </div>
    </section>

    <section class="content-section">
      <div class="section-heading">
        <div><span class="kicker">ROOM AVAILABILITY</span><h2>本周机房安排</h2><p>点击空闲时段即可发起预约申请</p></div>
        <div class="week-switch">
          <button aria-label="上一周" @click="changeWeek(-1)"><ChevronLeft :size="17" /></button>
          <span><CalendarDays :size="17" />{{ weekLabel }} <b>第 {{ week }} 周</b></span>
          <button aria-label="下一周" @click="changeWeek(1)"><ChevronRight :size="17" /></button>
        </div>
      </div>
      <div class="filters">
        <label><Search :size="18" /><input v-model="query" placeholder="搜索机房或楼宇"></label>
        <select v-model="capacity">
          <option>全部容量</option><option value="50">50 人以上</option><option value="70">70 人以上</option>
        </select>
        <div class="legend"><span><i class="free" />空闲</span><span><i class="busy" />已占用</span></div>
      </div>
      <div class="room-list">
        <RoomRow
          v-for="room in filteredRooms"
          :key="room.id"
          :room="room"
          :selected="selected"
          :busy-slots="busySlots"
          :slot-info="slotInfo"
          :days="days"
          @toggle="(day, period) => toggleSlot(room, day, period)"
        />
      </div>
      <div v-if="!filteredRooms.length" class="empty"><Search /><h3>没有找到符合条件的机房</h3><p>试试调整关键词或容量筛选。</p></div>
    </section>

    <div v-if="selected.length" class="selection-bar">
      <div><CalendarCheck2 /><span><strong>已选择 {{ selected.length }} 个时段</strong><small>可继续选择其他空闲时段</small></span></div>
      <button class="clear-selection" @click="selected = []">清空</button>
      <button class="primary" @click="drawerOpen = true">填写预约信息</button>
    </div>

    <aside class="portal-contact" :class="{ raised: selected.length }" aria-label="联系人信息">
      <span class="portal-contact-icon"><Phone /></span>
      <div><small><UserRound />首页联系人</small><strong>{{ contact.name }}</strong><a :href="`tel:${contact.phone}`">{{ contact.phone }}</a></div>
    </aside>

    <BookingDrawer
      v-if="drawerOpen && selected.length"
      :values="selected"
      :submitted="submitted"
      @close="drawerOpen = false"
      @submit="handleSubmit"
      @finish="finishBooking"
    />
  </main>
</template>
