<script setup lang="ts">
import { CalendarCheck2, CircleHelp, ClipboardCheck, MousePointerClick, Search, ShieldCheck } from '@lucide/vue'

const steps = [
  { icon: Search, title: '查找机房', text: '在预约大厅按名称、楼宇或容量筛选合适的机房。' },
  { icon: MousePointerClick, title: '选择时段', text: '点击绿色的空闲时段，打开预约申请表。' },
  { icon: ClipboardCheck, title: '提交申请', text: '填写申请人、联系电话、人数和用途后提交。' },
  { icon: CalendarCheck2, title: '等待审批', text: '审批通过后，该时段将更新为已占用状态。' },
]
</script>

<template>
  <main class="guide-page">
    <section class="guide-hero">
      <span class="guide-icon"><CircleHelp /></span>
      <div><span class="kicker">USER GUIDE</span><h1>使用指南</h1><p>无需注册或登录，几步即可完成机房预约申请。</p></div>
    </section>
    <section class="guide-content">
      <div class="guide-steps">
        <article v-for="(step, index) in steps" :key="step.title">
          <span class="step-number">0{{ index + 1 }}</span>
          <component :is="step.icon" />
          <h2>{{ step.title }}</h2>
          <p>{{ step.text }}</p>
        </article>
      </div>
      <aside class="guide-note">
        <ShieldCheck />
        <div><h2>预约须知</h2><p>请如实填写使用人数与用途；预约结果以管理员审批为准。如需变更或取消，请及时联系实验教学中心。</p></div>
      </aside>
    </section>
  </main>
</template>
