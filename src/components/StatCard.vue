<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{ label: string; value: number | string; note: string; icon: Component; tone: string }>()
</script>

<template>
  <div class="admin-stat">
    <span class="stat-icon" :class="tone"><component :is="icon" /></span>
    <div><small>{{ label }}</small><strong>{{ value }}</strong><p>{{ note }}</p></div>
  </div>
</template>
