<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { MapPin, Users } from '@lucide/vue'
import { periods } from '../data'
import type { Room, SelectedSlot } from '../types'

const props = defineProps<{
  room: Room
  selected: SelectedSlot[]
  busySlots: Set<string>
  slotInfo: Map<string, { courseName: string; teacher?: string; date?: string }>
  days: { week: string; date: string; past?: boolean }[]
}>()
const emit = defineEmits<{
  toggle: [day: number, period: number]
  detail: [day: number, period: number]
}>()

function isBusy(day: number, period: number) {
  return props.busySlots.has(`${props.room.id}-${day}-${period}`)
}

function isPast(day: number) {
  return !!props.days[day]?.past
}

function courseName(day: number, period: number) {
  return props.slotInfo.get(`${props.room.id}-${day}-${period}`)?.courseName || '已占用'
}

function onClick(day: number, period: number) {
  if (isBusy(day, period)) emit('detail', day, period)
  else emit('toggle', day, period)
}

function isSelected(day: number, period: number) {
  return props.selected.some((slot) => slot.room.id === props.room.id && slot.day === day && slot.period === period)
}
</script>

<template>
  <article class="room-row">
    <RouterLink class="room-meta" :to="`/room/${room.id}`" title="查看本学期完整预约情况">
      <div class="room-number">{{ String(room.id).padStart(2, '0') }}</div>
      <div>
        <h3>{{ room.name }}</h3>
        <p><MapPin :size="14" />{{ room.building }}</p>
        <div class="room-tags"><span><Users :size="13" />{{ room.seats }} 座</span><span>{{ room.audience }}</span></div>
      </div>
    </RouterLink>
    <div class="schedule">
      <div class="schedule-head">
        <span class="period-label">时段</span>
        <span v-for="day in days" :key="day.date"><b>{{ day.week }}</b><small>{{ day.date }}</small></span>
      </div>
      <div v-for="(period, periodIndex) in periods" :key="period" class="schedule-line">
        <span class="period-label">{{ period }}</span>
        <button
          v-for="(_, dayIndex) in days"
          :key="dayIndex"
          :disabled="isPast(dayIndex) && !isBusy(dayIndex, periodIndex)"
          :title="isPast(dayIndex) && !isBusy(dayIndex, periodIndex) ? '该时段已过期，无法预约' : undefined"
          :class="[isBusy(dayIndex, periodIndex) ? 'busy' : 'free', { selected: isSelected(dayIndex, periodIndex), past: isPast(dayIndex) }]"
          :aria-pressed="isSelected(dayIndex, periodIndex)"
          @click="onClick(dayIndex, periodIndex)"
        >
          <template v-if="isBusy(dayIndex, periodIndex)"><span>{{ courseName(dayIndex, periodIndex) }}</span></template>
          <template v-else-if="isPast(dayIndex)"></template>
          <template v-else-if="isSelected(dayIndex, periodIndex)"><span>已选择</span><small>再次点击取消</small></template>
          <template v-else><span>空闲</span><small>可预约</small></template>
        </button>
      </div>
    </div>
  </article>
</template>
