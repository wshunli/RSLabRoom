<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  CalendarCheck2, CalendarDays, ChevronLeft, ChevronRight, Clock3, DoorOpen,
  Layers, Phone, Search, Sparkles, UserRound,
} from '@lucide/vue'
import BookingDrawer from '../components/BookingDrawer.vue'
import RoomRow from '../components/RoomRow.vue'
import SlotDetailDialog from '../components/SlotDetailDialog.vue'
import { api } from '../api'
import { isDayPast, periods, weekdays } from '../data'
import type { Room, SelectedSlot } from '../types'

const query = ref('')
const capacity = ref('全部容量')
const selected = ref<SelectedSlot[]>([])
const drawerOpen = ref(false)
const submitted = ref(false)
const lastAppId = ref('')

const loading = ref(true)
const error = ref('')
const roomList = ref<Room[]>([])
const busySlots = ref<Set<string>>(new Set())
const slotInfo = ref<Map<string, { courseName: string; teacher: string; date: string }>>(new Map())
const week = ref(1)
const totalWeeks = ref(0)
const rangeStart = ref('')
const rangeEnd = ref('')
const contact = ref({ name: '', phone: '' })

function addDays(date: string, n: number) {
  const [y, m, d] = date.split('-').map(Number)
  const next = new Date(y, m - 1, d + n)
  return next
}

// 由当前周的起始日期生成 7 天（含真实日期），与时段表对齐。
const days = computed(() => {
  if (!rangeStart.value) return weekdays.map((name) => ({ week: name, date: '', past: false }))
  return weekdays.map((name, i) => {
    const date = addDays(rangeStart.value, i)
    const md = `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
    return { week: name, date: md, past: isDayPast(rangeStart.value, i) }
  })
})

const weekLabel = computed(() =>
  rangeStart.value ? `${rangeStart.value.replace(/-/g, '.')} — ${rangeEnd.value.replace(/-/g, '.')}` : '')

const filteredRooms = computed(() => roomList.value.filter((room) => {
  const matchesQuery = `${room.name}${room.building}`.includes(query.value)
  const matchesCapacity = capacity.value === '全部容量' || room.seats >= Number(capacity.value)
  return matchesQuery && matchesCapacity
}))

const freeSlotCount = computed(() =>
  Math.max(roomList.value.length * 7 * periods.length - busySlots.value.size, 0))

async function loadAvailability(target: number) {
  const data = await api.getAvailability(target)
  week.value = data.week
  totalWeeks.value = data.totalWeeks
  rangeStart.value = data.range.start
  rangeEnd.value = data.range.end
  const busy = new Set<string>()
  const info = new Map<string, { courseName: string; teacher: string; date: string }>()
  for (const slot of data.slots) {
    busy.add(slot.key)
    info.set(slot.key, { courseName: slot.courseName, teacher: slot.teacher, date: slot.date })
  }
  busySlots.value = busy
  slotInfo.value = info
  selected.value = []
}

async function changeWeek(delta: number) {
  const next = week.value + delta
  if (next < 1 || (totalWeeks.value && next > totalWeeks.value)) return
  try {
    await loadAvailability(next)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载失败'
  }
}

onMounted(async () => {
  try {
    const [config, rooms] = await Promise.all([api.getConfig(), api.getRooms()])
    contact.value = config.contact
    totalWeeks.value = config.totalWeeks
    roomList.value = rooms
    await loadAvailability(config.currentWeek)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载失败'
  } finally {
    loading.value = false
  }
})

function toggleSlot(room: SelectedSlot['room'], day: number, period: number) {
  if (days.value[day]?.past) return
  const index = selected.value.findIndex((slot) => slot.room.id === room.id && slot.day === day && slot.period === period)
  if (index >= 0) selected.value.splice(index, 1)
  else selected.value.push({ room, day, period })
  submitted.value = false
}

interface SlotDetail {
  roomName: string
  building: string
  courseName: string
  teacher: string
  date: string
  dayLabel: string
  week: number
  period: number
}

const slotDetail = ref<SlotDetail | null>(null)

function openDetail(room: Room, day: number, period: number) {
  const info = slotInfo.value.get(`${room.id}-${day}-${period}`)
  if (!info) return
  slotDetail.value = {
    roomName: room.name,
    building: room.building,
    courseName: info.courseName,
    teacher: info.teacher,
    date: info.date || days.value[day]?.date || '',
    dayLabel: days.value[day]?.week || '',
    week: week.value,
    period,
  }
}

interface BookingForm {
  applicantName: string
  phone: string
  attendees: number
  courseName: string
  requiredSoftware: string
  remarks: string
}

const submitError = ref('')

async function handleSubmit(form: BookingForm) {
  submitError.value = ''
  const slots = selected.value.map((slot) => ({
    roomId: slot.room.id,
    week: week.value,
    day: slot.day,
    period: slot.period,
  }))
  try {
    const res = await api.submitApplication({ ...form, slots })
    lastAppId.value = res.id
    submitted.value = true
  } catch (err) {
    submitError.value = err instanceof Error ? err.message : '提交失败，请稍后再试'
  }
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
        <div><span class="stat-icon lilac"><Layers /></span><strong>{{ busySlots.size }}</strong><small>本周已排课程</small></div>
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
      <div v-if="loading" class="empty"><Clock3 /><h3>正在加载机房数据…</h3></div>
      <div v-else-if="error" class="empty"><Search /><h3>数据加载失败</h3><p>{{ error }}</p></div>
      <template v-else>
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
            @detail="(day, period) => openDetail(room, day, period)"
          />
        </div>
        <div v-if="!filteredRooms.length" class="empty"><Search /><h3>没有找到符合条件的机房</h3><p>试试调整关键词或容量筛选。</p></div>
      </template>
    </section>

    <div v-if="selected.length" class="selection-bar">
      <div><CalendarCheck2 /><span><strong>已选择 {{ selected.length }} 个时段</strong><small>可继续选择其他空闲时段</small></span></div>
      <button class="clear-selection" @click="selected = []">清空</button>
      <button class="primary" @click="drawerOpen = true">填写预约信息</button>
    </div>

    <aside v-if="contact.name" class="portal-contact" :class="{ raised: selected.length }" aria-label="联系人信息">
      <span class="portal-contact-icon"><Phone /></span>
      <div><small><UserRound />首页联系人</small><strong>{{ contact.name }}</strong><a :href="`tel:${contact.phone}`">{{ contact.phone }}</a></div>
    </aside>

    <BookingDrawer
      v-if="drawerOpen && selected.length"
      :values="selected"
      :days="days"
      :submitted="submitted"
      :application-id="lastAppId"
      :error="submitError"
      @close="drawerOpen = false"
      @submit="handleSubmit"
      @finish="finishBooking"
    />

    <SlotDetailDialog
      v-if="slotDetail"
      v-bind="slotDetail"
      @close="slotDetail = null"
    />
  </main>
</template>
