<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  CalendarCheck2, CalendarDays, ChevronLeft, ChevronRight, Clock3, DoorOpen,
  ListChecks, Search, Sparkles,
} from '@lucide/vue'
import BookingDrawer from '../components/BookingDrawer.vue'
import RoomRow from '../components/RoomRow.vue'
import { rooms } from '../data'
import type { SelectedSlot } from '../types'

const query = ref('')
const capacity = ref('全部容量')
const selected = ref<SelectedSlot[]>([])
const drawerOpen = ref(false)
const submitted = ref(false)

const filteredRooms = computed(() => rooms.filter((room) => {
  const matchesQuery = `${room.name}${room.building}`.includes(query.value)
  const matchesCapacity = capacity.value === '全部容量' || room.seats >= Number(capacity.value)
  return matchesQuery && matchesCapacity
}))

function toggleSlot(room: SelectedSlot['room'], day: number, period: number) {
  const index = selected.value.findIndex((slot) => slot.room.id === room.id && slot.day === day && slot.period === period)
  if (index >= 0) selected.value.splice(index, 1)
  else selected.value.push({ room, day, period })
  submitted.value = false
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
        <div><span class="stat-icon mint"><DoorOpen /></span><strong>7</strong><small>开放机房</small></div>
        <div><span class="stat-icon amber"><Clock3 /></span><strong>36</strong><small>本周空闲时段</small></div>
        <div><span class="stat-icon lilac"><ListChecks /></span><strong>2</strong><small>进行中的申请</small></div>
      </div>
    </section>

    <section class="content-section">
      <div class="section-heading">
        <div><span class="kicker">ROOM AVAILABILITY</span><h2>本周机房安排</h2><p>点击空闲时段即可发起预约申请</p></div>
        <div class="week-switch">
          <button aria-label="上一周"><ChevronLeft :size="17" /></button>
          <span><CalendarDays :size="17" />2026.06.21 — 06.27 <b>第 17 周</b></span>
          <button aria-label="下一周"><ChevronRight :size="17" /></button>
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

    <BookingDrawer
      v-if="drawerOpen && selected.length"
      :values="selected"
      :submitted="submitted"
      @close="drawerOpen = false"
      @submit="submitted = true"
      @finish="finishBooking"
    />
  </main>
</template>
