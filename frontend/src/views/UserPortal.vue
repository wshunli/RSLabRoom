<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  CalendarCheck2, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock3, DoorOpen,
  Layers, Search, Sparkles,
} from '@lucide/vue'
import BookingDrawer from '../components/BookingDrawer.vue'
import RoomRow from '../components/RoomRow.vue'
import SlotDetailDialog from '../components/SlotDetailDialog.vue'
import CountUp from '../components/CountUp.vue'
import { api } from '../api'
import type { Semester } from '../api'
import { isDayPast, periods, weekdays } from '../data'
import type { Room, SelectedSlot } from '../types'

// 首页顶部三个指标的滚动动效组件引用，悬停时重新播放。
const heroStat = ref<InstanceType<typeof CountUp>[]>([])

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
const slotInfo = ref<Map<string, { courseName: string; teacher: string; phone: string; date: string }>>(new Map())
const week = ref(1)
const totalWeeks = ref(0)
const teachingWeeks = ref(0)
const semesterName = ref('')
const vacationLabel = ref('')
const currentWeekLabel = ref('')
const semesters = ref<Semester[]>([])
const selectedTerm = ref<number | null>(null)
const currentTeachingWeek = ref(0)
const weekPickerOpen = ref(false)
const rangeStart = ref('')
const rangeEnd = ref('')

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

const weekOptions = computed(() => Array.from({ length: totalWeeks.value }, (_, index) => {
  const weekNumber = index + 1
  return {
    week: weekNumber,
    label: weekNumber <= teachingWeeks.value
      ? String(weekNumber)
      : vacationLabel.value.slice(0, 1),
  }
}))

const filteredRooms = computed(() => roomList.value.filter((room) => {
  const matchesQuery = `${room.name}${room.building}`.includes(query.value)
  const matchesCapacity = capacity.value === '全部容量' || room.seats >= Number(capacity.value)
  return matchesQuery && matchesCapacity
}))

const freeSlotCount = computed(() =>
  Math.max(roomList.value.length * 7 * periods.length - busySlots.value.size, 0))

async function loadAvailability(target?: number, term = selectedTerm.value ?? undefined) {
  const data = await api.getAvailability(target, term)
  week.value = data.week
  totalWeeks.value = data.totalWeeks
  teachingWeeks.value = data.teachingWeeks
  currentTeachingWeek.value = data.currentWeek
  selectedTerm.value = data.term
  semesterName.value = data.semesterLabel
  currentWeekLabel.value = data.weekLabel
  vacationLabel.value = data.vacationLabel
  rangeStart.value = data.range.start
  rangeEnd.value = data.range.end
  const busy = new Set<string>()
  const info = new Map<string, { courseName: string; teacher: string; phone: string; date: string }>()
  for (const slot of data.slots) {
    busy.add(slot.key)
    info.set(slot.key, { courseName: slot.courseName, teacher: slot.teacher, phone: slot.phone, date: slot.date })
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

async function selectWeek(target: number) {
  weekPickerOpen.value = false
  if (target === week.value) return
  try {
    await loadAvailability(target)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载失败'
  }
}

async function changeSemester(term: number) {
  if (term === selectedTerm.value) return
  selectedTerm.value = term
  weekPickerOpen.value = false
  try {
    // 切换学期后由后端返回该学期适用的当前教学周；未来学期会从第 1 周开始。
    await loadAvailability(undefined, term)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载失败'
  }
}

function onSemesterChange(event: Event) {
  changeSemester(Number((event.target as HTMLSelectElement).value))
}

onMounted(async () => {
  try {
    const [config, rooms] = await Promise.all([api.getConfig(), api.getRooms()])
    semesters.value = config.semesters
      .filter((semester) => [1, 2, 3].includes(semester.term))
      .sort((a, b) => a.term - b.term)
    selectedTerm.value = config.currentTerm ?? semesters.value[0]?.term ?? null
    roomList.value = rooms
    await loadAvailability(config.currentTerm === selectedTerm.value ? config.currentWeek : undefined)
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
  else selected.value.push({ room, day, period, week: week.value, weekLabel: currentWeekLabel.value })
  submitted.value = false
}

interface SlotDetail {
  roomName: string
  building: string
  courseName: string
  teacher: string
  phone: string
  date: string
  dayLabel: string
  week: number
  weekLabel?: string
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
    phone: info.phone,
    date: info.date || days.value[day]?.date || '',
    dayLabel: days.value[day]?.week || '',
    week: week.value,
    weekLabel: currentWeekLabel.value,
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
    const res = await api.submitApplication({ ...form, semesterTerm: selectedTerm.value ?? undefined, slots })
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
        <div @mouseenter="heroStat[0]?.play()"><span class="stat-icon mint"><DoorOpen /></span><strong><CountUp :ref="(el: any) => (heroStat[0] = el)" :value="roomList.length" /></strong><small>开放机房</small></div>
        <div @mouseenter="heroStat[1]?.play()"><span class="stat-icon amber"><Clock3 /></span><strong><CountUp :ref="(el: any) => (heroStat[1] = el)" :value="freeSlotCount" /></strong><small>本周空闲时段</small></div>
        <div @mouseenter="heroStat[2]?.play()"><span class="stat-icon lilac"><Layers /></span><strong><CountUp :ref="(el: any) => (heroStat[2] = el)" :value="busySlots.size" /></strong><small>本周已排课程</small></div>
      </div>
    </section>

    <section class="content-section">
      <div class="section-heading">
        <div><span class="kicker">ROOM AVAILABILITY</span><h2>本周机房安排</h2><p>{{ semesterName ? `${semesterName} · ` : '' }}点击空闲时段即可发起预约申请</p></div>
        <div class="schedule-switches">
          <label v-if="semesters.length" class="semester-switch">
            <select :value="selectedTerm ?? undefined" aria-label="选择学期" @change="onSemesterChange">
              <option v-for="semester in semesters" :key="semester.term" :value="semester.term">第 {{ semester.term }} 学期</option>
            </select>
            <ChevronDown :size="14" />
          </label>
          <div class="week-switch">
          <button aria-label="上一周" @click="changeWeek(-1)"><ChevronLeft :size="17" /></button>
          <button
            type="button"
            class="week-current"
            aria-haspopup="listbox"
            :aria-expanded="weekPickerOpen"
            @click="weekPickerOpen = !weekPickerOpen"
          >
            <CalendarDays :size="17" />{{ weekLabel }} <b>{{ currentWeekLabel }}</b>
            <ChevronDown :size="14" class="week-caret" :class="{ open: weekPickerOpen }" />
          </button>
          <button aria-label="下一周" @click="changeWeek(1)"><ChevronRight :size="17" /></button>
          <template v-if="weekPickerOpen">
            <div class="week-pop-backdrop" @click="weekPickerOpen = false" />
            <div class="week-pop" role="listbox" aria-label="选择教学周">
              <div class="week-pop-grid">
                <button
                  v-for="option in weekOptions"
                  :key="option.week"
                  type="button"
                  role="option"
                  :aria-selected="option.week === week"
                  :class="{ active: option.week === week, current: option.week === currentTeachingWeek }"
                  :title="option.week === currentTeachingWeek ? '本周' : ''"
                  @click="selectWeek(option.week)"
                >{{ option.label }}</button>
              </div>
            </div>
          </template>
        </div>
      </div>
      </div>
      <div class="filters">
        <label><Search :size="18" /><input v-model="query" placeholder="搜索机房或楼宇"></label>
        <select v-model="capacity">
          <option>全部容量</option><option value="30">30 人以上</option><option value="45">45 人以上</option>
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
            :semester-term="selectedTerm"
            :selected="selected"
            :busy-slots="busySlots"
            :slot-info="slotInfo"
            :days="days"
            @toggle="(day, period) => toggleSlot(room, day, period)"
            @detail="(day, period) => openDetail(room, day, period)"
          />
        </div>
        <div v-if="!filteredRooms.length" class="empty"><Search /><h3>没有找到符合条件的机房</h3><p>试试调整关键词或容量筛选。</p></div>
        <p class="room-time-note">备注：上午时间：8:00-12:00 下午时间：14:00-18:00 晚上时间：18:00-22:00</p>
      </template>
    </section>

    <div v-if="selected.length" class="selection-bar">
      <div><CalendarCheck2 /><span><strong>已选择 {{ selected.length }} 个时段</strong><small>可继续选择其他空闲时段</small></span></div>
      <button class="clear-selection" @click="selected = []">清空</button>
      <button class="primary" @click="drawerOpen = true">填写预约信息</button>
    </div>

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
