<script setup lang="ts">
import { Check, ChevronRight, Monitor, X } from '@lucide/vue'
import { days, periods } from '../data'
import type { SelectedSlot } from '../types'

const props = defineProps<{ values: SelectedSlot[]; submitted: boolean }>()
const emit = defineEmits<{ close: []; submit: []; finish: [] }>()

const periodTimes = ['08:00–12:00', '14:00–18:00', '18:00–22:00']
</script>

<template>
  <div class="overlay" @mousedown.self="emit('close')">
    <aside class="drawer">
      <div class="drawer-head">
        <div><span class="kicker">NEW REQUEST</span><h2>提交机房借用申请</h2></div>
        <button class="icon-btn" aria-label="关闭" @click="emit('close')"><X /></button>
      </div>
      <div v-if="submitted" class="success">
        <span><Check /></span><h2>申请已提交</h2>
        <p>申请编号 AP2026062409，管理员审核后会通过站内消息通知你。</p>
        <button class="primary" @click="emit('finish')">完成</button>
      </div>
      <form v-else @submit.prevent="emit('submit')">
        <div class="chosen-slots">
          <div class="selection-title"><Monitor /><strong>已选择 {{ values.length }} 个预约时段</strong></div>
          <div v-for="value in values" :key="`${value.room.id}-${value.day}-${value.period}`" class="chosen-slot">
            <div>
              <strong>{{ value.room.name }} · {{ days[value.day].week }} {{ periods[value.period] }}</strong>
              <span>{{ value.room.building }}　{{ days[value.day].date }}　{{ periodTimes[value.period] }}</span>
            </div>
          </div>
        </div>
        <label>借用事由<textarea required value="课程实验与小组实践" /></label>
        <div class="form-grid">
          <label>使用人数<input type="number" min="1" :max="Math.min(...props.values.map((value) => value.room.seats))" value="30" required></label>
          <label>联系电话<input type="tel" value="138 0000 0000" required></label>
        </div>
        <label>指导教师<input value="王老师" required></label>
        <label class="checkline"><input type="checkbox" required>我已阅读并同意《实验教学中心机房使用规范》</label>
        <button class="primary submit" type="submit">确认提交申请 <ChevronRight :size="18" /></button>
      </form>
    </aside>
  </div>
</template>
