<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CalendarDays, MapPin, Users } from '@lucide/vue'
import { api, type AvailabilityResponse } from '../api'
import { periods, weekdays } from '../data'
import type { Room } from '../types'
import SlotDetailDialog from './SlotDetailDialog.vue'

// 排期预览：以首页（预约大厅）的单行机房样式，只读地展示「加入本次排期后」
// 该机房所有受影响教学周的占用情况；不含任何预约逻辑。
const props = defineProps<{
  roomId: number
  room: Room | null
  // 本次排期将占用的时段（绝对教学周 + 周内偏移 day + 时段 period）
  slots: Array<{ week: number; day: number; period: number }>
  /** 排期表单中的课程名称，未填写时显示为空 */
  courseName?: string
}>()

// 按周聚合待添加时段，键为 `${day}-${period}`。
const slotsByWeek = computed(() => {
  const map = new Map<number, Set<string>>()
  for (const s of props.slots) {
    if (!map.has(s.week)) map.set(s.week, new Set())
    map.get(s.week)!.add(`${s.day}-${s.period}`)
  }
  return map
})

// 受本次排期影响的教学周（升序）。
const weeks = computed(() => [...slotsByWeek.value.keys()].sort((a, b) => a - b))

// 以教学周为键缓存可用性响应（含全部机房），表单变化时只拉取新增周。
const cache = ref(new Map<number, AvailabilityResponse>())
const loading = ref(false)
const error = ref('')

async function ensureWeeks(list: number[]) {
  const missing = list.filter((week) => week && !cache.value.has(week))
  if (!missing.length) return
  loading.value = true
  error.value = ''
  try {
    const responses = await Promise.all(missing.map((week) => api.getAvailability(week)))
    const next = new Map(cache.value)
    for (const res of responses) next.set(res.week, res)
    cache.value = next
  } catch (err) {
    error.value = err instanceof Error ? err.message : '预览加载失败'
  } finally {
    loading.value = false
  }
}

watch(weeks, (list) => ensureWeeks(list), { immediate: true })

function daysFor(start: string) {
  if (!start) return weekdays.map((name) => ({ week: name, date: '' }))
  const [y, m, d] = start.split('-').map(Number)
  return weekdays.map((name, i) => {
    const date = new Date(y, m - 1, d + i)
    const md = `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
    return { week: name, date: md }
  })
}

interface SlotInfo { courseName: string; teacher: string; phone: string; date: string }
function busyFor(week: number) {
  const map = new Map<string, SlotInfo>()
  const dd = cache.value.get(week)
  if (dd) {
    for (const slot of dd.slots) {
      if (slot.roomId !== props.roomId) continue
      map.set(`${slot.day}-${slot.period}`, {
        courseName: slot.courseName || '已占用',
        teacher: slot.teacher,
        phone: slot.phone,
        date: slot.date,
      })
    }
  }
  return map
}

type CellState = 'free' | 'busy' | 'add' | 'conflict'
function cellState(week: number, day: number, period: number): CellState {
  const key = `${day}-${period}`
  const a = (slotsByWeek.value.get(week) ?? new Set<string>()).has(key)
  const b = busyFor(week).has(key)
  if (a && b) return 'conflict'
  if (a) return 'add'
  if (b) return 'busy'
  return 'free'
}
function busyCourseName(week: number, day: number, period: number) {
  return busyFor(week).get(`${day}-${period}`)?.courseName || '已占用'
}

type WeekItem = { week: number; weekLabel: string; label: string; days: { week: string; date: string }[] }
const weekItems = computed<WeekItem[]>(() => weeks.value.map((week) => {
  const data = cache.value.get(week)
  return {
    week,
    weekLabel: data?.weekLabel ?? `第 ${week} 周`,
    label: data ? `${data.range.start.replace(/-/g, '.')} — ${data.range.end.replace(/-/g, '.')}` : '加载中...',
    days: daysFor(data?.range.start ?? ''),
  }
}))

const allLoaded = computed(() => weeks.value.every((week) => cache.value.has(week)))

// 点击已占用（含与本次排期冲突）的单元格，弹出课程详情
const slotDetail = ref<{
  roomName: string; building: string; courseName: string; teacher: string
  phone: string; date: string; dayLabel: string; week: number; weekLabel?: string; period: number
} | null>(null)

function onCellClick(item: WeekItem, day: number, period: number) {
  const state = cellState(item.week, day, period)
  if (state !== 'busy' && state !== 'conflict') return
  const info = busyFor(item.week).get(`${day}-${period}`)
  if (!info) return
  slotDetail.value = {
    roomName: props.room?.name ?? '',
    building: props.room?.building ?? '',
    courseName: info.courseName,
    teacher: info.teacher,
    phone: info.phone,
    date: info.date || item.days[day]?.date || '',
    dayLabel: item.days[day]?.week ?? '',
    week: item.week,
    weekLabel: item.weekLabel,
    period,
  }
}
</script>

<template>
  <section class="schedule-preview">
    <div class="schedule-preview-bar">
      <strong><CalendarDays :size="15" />排期预览<small v-if="weeks.length">共 {{ weeks.length }} 周占用</small></strong>
      <div class="legend">
        <span><i class="free" />空闲</span>
        <span><i class="busy" />已占用</span>
        <span><i class="add" />待添加</span>
        <span><i class="conflict" />冲突</span>
      </div>
    </div>

    <div class="preview-schedule-layout">
      <div class="preview-room-col">
        <div class="room-meta">
          <div class="room-number">{{ String(room?.id ?? 0).padStart(2, '0') }}</div>
          <div>
            <h3>{{ room?.name || '未选择机房' }}</h3>
            <p><MapPin :size="14" />{{ room?.building }}</p>
            <div class="room-tags">
              <span><Users :size="13" />{{ room?.seats }} 座</span>
              <span v-if="room?.audience">{{ room.audience }}</span>
            </div>
          </div>
        </div>
        <slot name="actions" />
      </div>
      <div class="preview-week-area">
        <p v-if="!slots.length" class="schedule-preview-empty">填写排期参数后，这里会以首页样式展示加入排期后的机房占用情况。</p>
        <p v-else-if="error" class="schedule-preview-empty error">{{ error }}</p>
        <p v-else-if="loading && !allLoaded" class="schedule-preview-empty">正在加载排期预览...</p>
        <div v-else class="week-schedule-list preview-week-list">
          <article v-for="w in weekItems" :key="w.week" class="week-card">
          <header class="week-card-head">
            <CalendarDays :size="16" />
            <strong>{{ w.weekLabel }}</strong>
            <small>{{ w.label }}</small>
          </header>
          <div class="schedule">
            <div class="schedule-head">
              <span class="period-label">时段</span>
              <span v-for="day in w.days" :key="day.week"><b>{{ day.week }}</b><small>{{ day.date }}</small></span>
            </div>
            <div v-for="(period, pi) in periods" :key="period" class="schedule-line">
              <span class="period-label">{{ period }}</span>
              <div
                v-for="(_, di) in w.days"
                :key="di"
                class="cell"
                :class="[cellState(w.week, di, pi), { clickable: cellState(w.week, di, pi) === 'busy' || cellState(w.week, di, pi) === 'conflict' }]"
                @click="onCellClick(w, di, pi)"
              >
                <template v-if="cellState(w.week, di, pi) === 'conflict'"><span>冲突</span><small>{{ busyCourseName(w.week, di, pi) }}</small></template>
                <template v-else-if="cellState(w.week, di, pi) === 'add'"><span>待添加</span><small>{{ courseName || '' }}</small></template>
                <template v-else-if="cellState(w.week, di, pi) === 'busy'"><span>{{ busyCourseName(w.week, di, pi) }}</span></template>
                <template v-else><span>空闲</span></template>
              </div>
            </div>
          </div>
        </article>
        </div>
      </div>
    </div>

    <SlotDetailDialog v-if="slotDetail" v-bind="slotDetail" @close="slotDetail = null" />
  </section>
</template>

<style scoped>
.schedule-preview-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.schedule-preview-bar > strong {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 14px;
  color: #1d2b26;
}
.schedule-preview-bar > strong svg { color: var(--green); }
.schedule-preview-bar > strong small {
  color: var(--muted);
  font-size: 11px;
  font-weight: 500;
}
.schedule-preview-bar .legend { margin-left: 0; }
.legend i.add { background: var(--green); border: 0; }
.legend i.conflict { background: #f3b8ac; border: 0; }

.schedule-preview-empty {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--muted);
  font-size: 13px;
  margin: 6px 0 0;
}
.schedule-preview-empty.error { color: #a64231; }

.preview-schedule-layout {
  display: grid;
  grid-template-columns: 250px 1fr;
  gap: 14px;
  align-items: start;
}
.preview-room-col {
  position: sticky;
  top: 88px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}
.preview-schedule-layout .room-meta {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 16px;
}
/* 机房卡片下方的「添加排期」按钮与提示，跟随左列宽度铺满 */
.preview-room-col :deep(.tool-submit) { width: 100%; align-self: stretch; }
.preview-week-area { min-width: 0; }
.preview-week-list { min-width: 0; }
.preview-week-list .week-card { border-radius: 12px; }
.schedule-line .cell {
  height: 39px;
  border-radius: 7px;
  border: 1px solid transparent;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-width: 0;
}
.schedule-line .cell span { font-size: 12px; font-weight: 600; max-width: 94%; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.schedule-line .cell small {
  font-size: 10px;
  opacity: .75;
  overflow: hidden;
  white-space: normal;
  text-align: center;
  line-height: 1.15;
  max-width: 92%;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}
/* 与预约大厅一致：空闲薄荷绿、已占用琥珀黄 */
.schedule-line .cell.free { background: #e3f2ec; color: #21634e; border-color: #c4e1d5; }
.schedule-line .cell.busy { background: #fff0d7; color: #a66b17; border-color: #f3dcae; }
/* 待添加沿用首页「已选择」的实心绿；冲突用警示红 */
.schedule-line .cell.add { background: var(--green); color: #fff; border-color: var(--green); box-shadow: 0 0 0 2px #cce3da; }
.schedule-line .cell.conflict { background: #fff0ed; color: #a64231; border-color: #f0c4bb; }
/* 已占用 / 冲突可点击查看课程详情 */
.schedule-line .cell.clickable { cursor: pointer; transition: .15s; }
.schedule-line .cell.busy.clickable:hover { background: #ffe6bd; color: #8a560f; }
.schedule-line .cell.conflict.clickable:hover { background: #ffe4dd; }
@media(max-width:900px){
  .preview-schedule-layout { grid-template-columns: 1fr; }
  .preview-room-col { position: static; }
}
</style>
