<script setup lang="ts">
import { BookOpen, CalendarDays, Clock3, MapPin, UserRound, X } from '@lucide/vue'
import { periods } from '../data'

defineProps<{
  roomName: string
  building?: string
  courseName: string
  teacher?: string
  date?: string
  dayLabel?: string
  week?: number
  period: number
}>()
const emit = defineEmits<{ close: [] }>()

const periodTimes = ['08:00–12:00', '14:00–18:00', '18:00–22:00']
</script>

<template>
  <div class="overlay slot-detail-overlay" @mousedown.self="emit('close')">
    <div class="slot-detail">
      <div class="slot-detail-head">
        <div><span class="kicker">OCCUPIED</span><h3>{{ courseName }}</h3></div>
        <button class="icon-btn" aria-label="关闭" @click="emit('close')"><X /></button>
      </div>
      <ul class="slot-detail-list">
        <li><BookOpen :size="16" /><span>课程名称</span><strong>{{ courseName }}</strong></li>
        <li v-if="teacher"><UserRound :size="16" /><span>授课教师</span><strong>{{ teacher }}</strong></li>
        <li><MapPin :size="16" /><span>使用机房</span><strong>{{ roomName }}<template v-if="building"> · {{ building }}</template></strong></li>
        <li><CalendarDays :size="16" /><span>上课日期</span><strong><template v-if="week">第 {{ week }} 周　</template>{{ dayLabel }}<template v-if="date">　{{ date }}</template></strong></li>
        <li><Clock3 :size="16" /><span>上课时段</span><strong>{{ periods[period] }}　{{ periodTimes[period] }}</strong></li>
      </ul>
    </div>
  </div>
</template>
