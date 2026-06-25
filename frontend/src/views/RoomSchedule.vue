<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft, CalendarCheck2, CalendarDays, Clock3, MapPin, Search, Users,
} from '@lucide/vue'
import BookingDrawer from '../components/BookingDrawer.vue'
import SlotDetailDialog from '../components/SlotDetailDialog.vue'
import { api, type AvailabilityResponse } from '../api'
import { isDayPast, periods, weekdays } from '../data'
import type { Room, SelectedSlot } from '../types'

const PAGE_SIZE = 5

const route = useRoute()
const router = useRouter()

const roomId = computed(() => Number(route.params.id))

const loading = ref(true)
const error = ref('')
const room = ref<Room | null>(null)
const totalWeeks = ref(0)

interface WeekSchedule {
  week: number
  rangeStart: string
  rangeEnd: string
  days: { week: string; date: string }[]
  busy: Set<string>
  info: Map<string, { courseName: string; teacher: string; phone: string; date: string }>
}

const loadedWeeks = ref<WeekSchedule[]>([])
const nextWeek = ref(1)
const loadingMore = ref(false)
const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

const hasMore = computed(() => nextWeek.value <= totalWeeks.value)

// ---- 预约选择（沿用预约大厅逻辑，跨周时记录每个时段所属教学周） ----
const selected = ref<SelectedSlot[]>([])
const drawerOpen = ref(false)
const submitted = ref(false)
const lastAppId = ref('')
const submitError = ref('')
const fallbackDays = weekdays.map((name) => ({ week: name, date: '' }))

function addDays(date: string, n: number) {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d + n)
}

function buildDays(rangeStart: string) {
  if (!rangeStart) return fallbackDays
  return weekdays.map((name, i) => {
    const date = addDays(rangeStart, i)
    const md = `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
    return { week: name, date: md }
  })
}

function mapWeek(data: AvailabilityResponse): WeekSchedule {
  const busy = new Set<string>()
  const info = new Map<string, { courseName: string; teacher: string; phone: string; date: string }>()
  for (const slot of data.slots) {
    if (slot.roomId !== roomId.value) continue
    busy.add(slot.key)
    info.set(slot.key, { courseName: slot.courseName, teacher: slot.teacher, phone: slot.phone, date: slot.date })
  }
  return {
    week: data.week,
    rangeStart: data.range.start,
    rangeEnd: data.range.end,
    days: buildDays(data.range.start),
    busy,
    info,
  }
}

function isBusy(w: WeekSchedule, day: number, period: number) {
  return w.busy.has(`${roomId.value}-${day}-${period}`)
}

function isPast(w: WeekSchedule, day: number) {
  return isDayPast(w.rangeStart, day)
}

function courseName(w: WeekSchedule, day: number, period: number) {
  return w.info.get(`${roomId.value}-${day}-${period}`)?.courseName || '已占用'
}

function isSelected(w: WeekSchedule, day: number, period: number) {
  return selected.value.some((s) => s.week === w.week && s.day === day && s.period === period)
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
  period: number
}

const slotDetail = ref<SlotDetail | null>(null)

function onSlotClick(w: WeekSchedule, day: number, period: number) {
  if (isBusy(w, day, period)) openDetail(w, day, period)
  else toggleSlot(w, day, period)
}

function openDetail(w: WeekSchedule, day: number, period: number) {
  if (!room.value) return
  const info = w.info.get(`${roomId.value}-${day}-${period}`)
  if (!info) return
  slotDetail.value = {
    roomName: room.value.name,
    building: room.value.building,
    courseName: info.courseName,
    teacher: info.teacher,
    phone: info.phone,
    date: info.date || w.days[day].date,
    dayLabel: w.days[day].week,
    week: w.week,
    period,
  }
}

function toggleSlot(w: WeekSchedule, day: number, period: number) {
  if (!room.value || isPast(w, day)) return
  const index = selected.value.findIndex((s) => s.week === w.week && s.day === day && s.period === period)
  if (index >= 0) {
    selected.value.splice(index, 1)
  } else {
    selected.value.push({
      room: room.value,
      day,
      period,
      week: w.week,
      dayLabel: w.days[day].week,
      dateLabel: w.days[day].date,
    })
  }
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
  submitError.value = ''
  const slots = selected.value.map((s) => ({
    roomId: s.room.id,
    week: s.week ?? 1,
    day: s.day,
    period: s.period,
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

// 加载下一页（PAGE_SIZE 周），用于滚动到底部时的渐进式加载。
async function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  try {
    const start = nextWeek.value
    const end = Math.min(start + PAGE_SIZE - 1, totalWeeks.value)
    const responses = await Promise.all(
      Array.from({ length: end - start + 1 }, (_, i) => api.getAvailability(start + i)),
    )
    loadedWeeks.value.push(...responses.map(mapWeek))
    nextWeek.value = end + 1
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载失败'
  } finally {
    loadingMore.value = false
  }
  // 若加载后内容仍未填满视口，继续加载，保证哨兵元素可再次触发。
  await nextTick()
  const el = sentinel.value
  if (!error.value && hasMore.value && el && el.getBoundingClientRect().top < window.innerHeight) {
    loadMore()
  }
}

async function init() {
  loading.value = true
  error.value = ''
  loadedWeeks.value = []
  selected.value = []
  nextWeek.value = 1
  try {
    const [config, rooms] = await Promise.all([api.getConfig(), api.getRooms()])
    room.value = rooms.find((r) => r.id === roomId.value) ?? null
    if (!room.value) {
      error.value = '未找到该机房'
      return
    }
    totalWeeks.value = Math.max(config.totalWeeks, 1)
    await loadMore()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => { if (entries[0]?.isIntersecting) loadMore() },
    { rootMargin: '200px' },
  )
  init()
})

onBeforeUnmount(() => observer?.disconnect())

// 哨兵元素随分页出现/消失，动态挂载观察器。
watch(sentinel, (el, prev) => {
  if (prev) observer?.unobserve(prev)
  if (el) observer?.observe(el)
})

watch(roomId, init)
</script>

<template>
  <main>
    <section class="content-section">
      <button class="back-link" @click="router.back()"><ArrowLeft :size="16" />返回预约大厅</button>

      <div v-if="loading" class="empty"><Clock3 /><h3>正在加载机房数据…</h3></div>
      <div v-else-if="error && !loadedWeeks.length" class="empty"><Search /><h3>{{ error }}</h3></div>

      <template v-else-if="room">
        <div class="section-heading">
          <div>
            <span class="kicker">ROOM SCHEDULE</span>
            <h2>{{ room.name }} · 本学期预约情况</h2>
            <p>
              <MapPin :size="13" />{{ room.building }}
              <span class="dot">·</span><Users :size="13" />{{ room.seats }} 座
              <span class="dot">·</span>共 {{ totalWeeks }} 周（已显示 {{ loadedWeeks.length }} 周）
            </p>
          </div>
          <div class="legend"><span><i class="free" />空闲</span><span><i class="busy" />已占用</span></div>
        </div>

        <div class="week-schedule-list">
          <article v-for="w in loadedWeeks" :key="w.week" class="week-card">
            <header class="week-card-head">
              <CalendarDays :size="16" />
              <strong>第 {{ w.week }} 周</strong>
              <small>{{ w.rangeStart.replace(/-/g, '.') }} — {{ w.rangeEnd.replace(/-/g, '.') }}</small>
            </header>
            <div class="schedule">
              <div class="schedule-head">
                <span class="period-label">时段</span>
                <span v-for="day in w.days" :key="day.week"><b>{{ day.week }}</b><small>{{ day.date }}</small></span>
              </div>
              <div v-for="(period, periodIndex) in periods" :key="period" class="schedule-line">
                <span class="period-label">{{ period }}</span>
                <button
                  v-for="(_, dayIndex) in w.days"
                  :key="dayIndex"
                  :disabled="isPast(w, dayIndex) && !isBusy(w, dayIndex, periodIndex)"
                  :title="isPast(w, dayIndex) && !isBusy(w, dayIndex, periodIndex) ? '该时段已过期，无法预约' : undefined"
                  :class="[isBusy(w, dayIndex, periodIndex) ? 'busy' : 'free', { selected: isSelected(w, dayIndex, periodIndex), past: isPast(w, dayIndex) }]"
                  :aria-pressed="isSelected(w, dayIndex, periodIndex)"
                  @click="onSlotClick(w, dayIndex, periodIndex)"
                >
                  <template v-if="isBusy(w, dayIndex, periodIndex)"><span>{{ courseName(w, dayIndex, periodIndex) }}</span></template>
                  <template v-else-if="isPast(w, dayIndex)"></template>
                  <template v-else-if="isSelected(w, dayIndex, periodIndex)"><span>已选择</span><small>再次点击取消</small></template>
                  <template v-else><span>空闲</span><small>可预约</small></template>
                </button>
              </div>
            </div>
          </article>
        </div>

        <div v-if="hasMore" ref="sentinel" class="load-more">
          <Clock3 :size="15" /><span>{{ loadingMore ? '正在加载…' : '下滑加载更多' }}</span>
        </div>
        <p v-else class="load-end">已显示全部 {{ totalWeeks }} 周</p>
      </template>

      <div v-if="selected.length" class="selection-bar">
        <div><CalendarCheck2 /><span><strong>已选择 {{ selected.length }} 个时段</strong><small>可继续选择其他空闲时段</small></span></div>
        <button class="clear-selection" @click="selected = []">清空</button>
        <button class="primary" @click="drawerOpen = true">填写预约信息</button>
      </div>

      <BookingDrawer
        v-if="drawerOpen && selected.length"
        :values="selected"
        :days="fallbackDays"
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
    </section>
  </main>
</template>
