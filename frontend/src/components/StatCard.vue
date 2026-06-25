<script setup lang="ts">
import type { Component } from 'vue'
import CountUp from './CountUp.vue'

const props = defineProps<{ label: string; value: number | string; note: string; icon: Component; tone: string }>()

// 数值型指标用滚动动效，文本型（如“—”、“5 间”）直接展示。
const isNumber = typeof props.value === 'number'
</script>

<template>
  <div class="admin-stat">
    <span class="stat-icon" :class="tone"><component :is="icon" /></span>
    <div>
      <small>{{ label }}</small>
      <strong><CountUp v-if="isNumber" :value="value as number" /><template v-else>{{ value }}</template></strong>
      <p>{{ note }}</p>
    </div>
  </div>
</template>
