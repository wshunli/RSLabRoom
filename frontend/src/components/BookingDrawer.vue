<script setup lang="ts">
import { reactive } from 'vue'
import { Check, ChevronRight, Monitor, X } from '@lucide/vue'
import { periods } from '../data'
import type { SelectedSlot } from '../types'

const props = defineProps<{
  values: SelectedSlot[]
  days: { week: string; date: string }[]
  submitted: boolean
  applicationId: string
  error: string
}>()
const emit = defineEmits<{
  close: []
  submit: [form: BookingForm]
  finish: []
}>()

interface BookingForm {
  applicantName: string
  phone: string
  attendees: number
  courseName: string
  requiredSoftware: string
  remarks: string
}

const form = reactive<BookingForm>({
  applicantName: '',
  phone: '',
  attendees: 1,
  courseName: '',
  requiredSoftware: '',
  remarks: '',
})

const periodTimes = ['08:00–12:00', '14:00–18:00', '18:00–22:00']

function submitForm() {
  emit('submit', { ...form })
}
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
        <p>申请编号 {{ applicationId }}，管理员审核后会通过站内消息通知你。</p>
        <button class="primary" @click="emit('finish')">完成</button>
      </div>
      <form v-else @submit.prevent="submitForm">
        <div class="chosen-slots">
          <div class="selection-title"><Monitor /><strong>已选择 {{ values.length }} 个预约时段</strong></div>
          <div v-for="value in values" :key="`${value.room.id}-${value.week ?? ''}-${value.day}-${value.period}`" class="chosen-slot">
            <div>
              <strong>{{ value.room.name }} · <template v-if="value.week">第 {{ value.week }} 周 </template>{{ value.dayLabel ?? days[value.day].week }} {{ periods[value.period] }}</strong>
              <span>{{ value.room.building }}　{{ value.dateLabel ?? days[value.day].date }}　{{ periodTimes[value.period] }}</span>
            </div>
          </div>
        </div>
        <div class="form-grid">
          <label>申请姓名<input v-model.trim="form.applicantName" name="applicantName" autocomplete="name" required></label>
          <label>申请电话<input v-model.trim="form.phone" name="phone" type="tel" autocomplete="tel" required></label>
          <label>上课人数<input v-model.number="form.attendees" name="attendees" type="number" min="1" :max="Math.min(...props.values.map((value) => value.room.seats))" required></label>
          <label>课程名称<input v-model.trim="form.courseName" name="courseName" required></label>
        </div>
        <label>需用软件<input v-model.trim="form.requiredSoftware" name="requiredSoftware" placeholder="请填写课程所需软件" required></label>
        <label>备注信息（上课时间段）<textarea v-model.trim="form.remarks" name="remarks" placeholder="可补充具体上课时间、特殊设备需求等信息" /></label>
        <p v-if="error" class="login-error">{{ error }}</p>
        <button class="primary submit" type="submit">确认提交申请 <ChevronRight :size="18" /></button>
      </form>
    </aside>
  </div>
</template>
