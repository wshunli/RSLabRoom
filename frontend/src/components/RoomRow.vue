<script setup lang="ts">
import { MapPin, Users } from '@lucide/vue'
import { busySlots, days, periods } from '../data'
import type { Room, SelectedSlot } from '../types'

const props = defineProps<{ room: Room; selected: SelectedSlot[] }>()
const emit = defineEmits<{ toggle: [day: number, period: number] }>()

function isBusy(day: number, period: number) {
  return busySlots.has(`${props.room.id}-${day}-${period}`)
}

function isSelected(day: number, period: number) {
  return props.selected.some((slot) => slot.room.id === props.room.id && slot.day === day && slot.period === period)
}
</script>

<template>
  <article class="room-row">
    <div class="room-meta">
      <div class="room-number">{{ String(room.id).padStart(2, '0') }}</div>
      <div>
        <h3>{{ room.name }}</h3>
        <p><MapPin :size="14" />{{ room.building }}</p>
        <div class="room-tags"><span><Users :size="13" />{{ room.seats }} 座</span><span>{{ room.audience }}</span></div>
      </div>
    </div>
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
          :disabled="isBusy(dayIndex, periodIndex)"
          :class="[isBusy(dayIndex, periodIndex) ? 'busy' : 'free', { selected: isSelected(dayIndex, periodIndex) }]"
          :aria-pressed="isSelected(dayIndex, periodIndex)"
          @click="emit('toggle', dayIndex, periodIndex)"
        >
          <template v-if="isBusy(dayIndex, periodIndex)"><span>课程</span><small>遥感原理</small></template>
          <template v-else-if="isSelected(dayIndex, periodIndex)"><span>已选择</span><small>再次点击取消</small></template>
          <template v-else><span>空闲</span><small>可预约</small></template>
        </button>
      </div>
    </div>
  </article>
</template>
