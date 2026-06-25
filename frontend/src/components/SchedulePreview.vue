<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, Users } from '@lucide/vue'
import { api, type AvailabilityResponse } from '../api'
import { periods, weekdays } from '../data'
import type { Room } from '../types'

// 排期预览：以首页（预约大厅）的单行机房样式，只读地展示「加入本次排期后」
// 该机房某一教学周的占用情况。可在受影响的教学周之间切换；不含任何预约逻辑。
const props = defineProps<{
  roomId: number
  room: Room | null
  // 本次排期将占用的时段（绝对教学周 + 周内偏移 day + 时段 period）
  slots: Array<{ week: number; day: number; period: number }>
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

// 当前展示第几个受影响周。周次范围变化时把游标夹在有效区间内。
const index = ref(0)
watch(weeks, (list) => {
  if (index.value >= list.length) index.value = Math.max(0, list.length - 1)
}, { immediate: true })

const currentWeek = computed(() => weeks.value[index.value] ?? 0)

// 以教学周为键缓存可用性响应（含全部机房），切换机房无需重新拉取。
const cache = ref(new Map<number, AvailabilityResponse>())
const loading = ref(false)
const error = ref('')

async function ensureWeek(week: number) {
  if (!week || cache.value.has(week)) return
  loading.value = true
  error.value = ''
  try {
    const res = await api.getAvailability(week)
    const next = new Map(cache.value)
    next.set(week, res)
    cache.value = next
  } catch (err) {
    error.value = err instanceof Error ? err.message : '预览加载失败'
  } finally {
    loading.value = false
  }
}

watch(currentWeek, (w) => ensureWeek(w), { immediate: true })

const data = computed(() => cache.value.get(currentWeek.value) ?? null)

const days = computed(() => {
  const start = data.value?.range.start ?? ''
  if (!start) return weekdays.map((name) => ({ week: name, date: '' }))
  const [y, m, d] = start.split('-').map(Number)
  return weekdays.map((name, i) => {
    const date = new Date(y, m - 1, d + i)
    const md = `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
    return { week: name, date: md }
  })
})

const weekLabel = computed(() => {
  const dd = data.value
  return dd ? `${dd.range.start.replace(/-/g, '.')} — ${dd.range.end.replace(/-/g, '.')}` : ''
})

// 当前周该机房已有占用：键 `${day}-${period}` -> 课程名。
const busy = computed(() => {
  const map = new Map<string, string>()
  const dd = data.value
  if (dd) {
    for (const slot of dd.slots) {
      if (slot.roomId !== props.roomId) continue
      map.set(`${slot.day}-${slot.period}`, slot.courseName || '已占用')
    }
  }
  return map
})

const addSet = computed(() => slotsByWeek.value.get(currentWeek.value) ?? new Set<string>())

type CellState = 'free' | 'busy' | 'add' | 'conflict'
function cellState(day: number, period: number): CellState {
  const key = `${day}-${period}`
  const a = addSet.value.has(key)
  const b = busy.value.has(key)
  if (a && b) return 'conflict'
  if (a) return 'add'
  if (b) return 'busy'
  return 'free'
}
function courseName(day: number, period: number) {
  return busy.value.get(`${day}-${period}`) || '已占用'
}

function step(delta: number) {
  const next = index.value + delta
  if (next < 0 || next >= weeks.value.length) return
  index.value = next
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
      <div v-if="weeks.length" class="week-switch">
        <button type="button" aria-label="上一周" :disabled="index === 0" @click="step(-1)"><ChevronLeft :size="17" /></button>
        <span><CalendarDays :size="17" />{{ weekLabel || '加载中…' }} <b>第 {{ currentWeek }} 周</b></span>
        <button type="button" aria-label="下一周" :disabled="index >= weeks.length - 1" @click="step(1)"><ChevronRight :size="17" /></button>
      </div>
    </div>

    <p v-if="!slots.length" class="schedule-preview-empty">填写排期参数后，这里会以首页样式展示加入排期后的机房占用情况。</p>
    <p v-else-if="error" class="schedule-preview-empty error">{{ error }}</p>
    <article v-else class="room-row preview-room-row">
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
      <div class="schedule">
        <div class="schedule-head">
          <span class="period-label">时段</span>
          <span v-for="day in days" :key="day.week"><b>{{ day.week }}</b><small>{{ day.date }}</small></span>
        </div>
        <div v-for="(period, pi) in periods" :key="period" class="schedule-line">
          <span class="period-label">{{ period }}</span>
          <div v-for="(_, di) in days" :key="di" class="cell" :class="cellState(di, pi)">
            <template v-if="cellState(di, pi) === 'conflict'"><span>冲突</span><small>已占用</small></template>
            <template v-else-if="cellState(di, pi) === 'add'"><span>待添加</span><small>本次排期</small></template>
            <template v-else-if="cellState(di, pi) === 'busy'"><span>课程</span><small>{{ courseName(di, pi) }}</small></template>
            <template v-else><span>空闲</span></template>
          </div>
        </div>
      </div>
    </article>
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
.schedule-preview-bar .week-switch { margin-left: auto; }
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

/* 复用全局 .room-row / .schedule 网格，仅自定义只读格子（不可点击、无 hover 反馈） */
.preview-room-row:hover { box-shadow: none; border-color: var(--line); }
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
.schedule-line .cell span { font-size: 11px; font-weight: 600; }
.schedule-line .cell small {
  font-size: 8px;
  opacity: .75;
  overflow: hidden;
  white-space: nowrap;
  max-width: 92%;
}
/* 与首页一致：空闲薄荷绿、已占用灰 */
.schedule-line .cell.free { background: #e3f2ec; color: #21634e; border-color: #c4e1d5; }
.schedule-line .cell.busy { background: #eef1ef; color: #8a958f; }
/* 待添加沿用首页「已选择」的实心绿；冲突用警示红 */
.schedule-line .cell.add { background: var(--green); color: #fff; border-color: var(--green); box-shadow: 0 0 0 2px #cce3da; }
.schedule-line .cell.conflict { background: #fff0ed; color: #a64231; border-color: #f0c4bb; }
</style>
