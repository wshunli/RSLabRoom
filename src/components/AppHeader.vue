<script setup lang="ts">
import { Bell, Building2, Menu, X } from '@lucide/vue'
import type { PortalMode } from '../types'

const mode = defineModel<PortalMode>('mode', { required: true })
const mobileNav = defineModel<boolean>('mobileNav', { required: true })

function selectMode(value: PortalMode) {
  mode.value = value
  mobileNav.value = false
}
</script>

<template>
  <header class="topbar">
    <div class="brand-mark"><Building2 :size="24" /></div>
    <div class="brand-copy"><strong>实验教学中心</strong><span>机房预约与管理平台</span></div>
    <nav :class="{ open: mobileNav }">
      <button :class="{ active: mode === 'user' }" @click="selectMode('user')">预约大厅</button>
      <button :class="{ active: mode === 'admin' }" @click="selectMode('admin')">管理工作台</button>
      <button>使用指南</button>
    </nav>
    <div class="top-actions">
      <button class="icon-btn" aria-label="通知"><Bell :size="19" /><i /></button>
      <span class="avatar">珞</span><span class="user-name">张同学</span>
    </div>
    <button class="menu-btn" aria-label="菜单" @click="mobileNav = !mobileNav">
      <X v-if="mobileNav" /><Menu v-else />
    </button>
  </header>
</template>
