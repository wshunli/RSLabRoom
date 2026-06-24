<script setup lang="ts">
import { Bell, Building2, LogIn, LogOut, Menu, X } from '@lucide/vue'
import type { AdminUser, PortalMode } from '../types'

defineProps<{ admin: AdminUser | null }>()
const emit = defineEmits<{ login: []; logout: [] }>()

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
      <button :class="{ active: mode === 'guide' }" @click="selectMode('guide')">使用指南</button>
      <button v-if="admin" :class="{ active: mode === 'admin' }" @click="selectMode('admin')">管理工作台</button>
    </nav>
    <div class="top-actions">
      <template v-if="admin">
        <button class="icon-btn" aria-label="通知"><Bell :size="19" /><i /></button>
        <span class="avatar">{{ admin.displayName[0] }}</span><span class="user-name">{{ admin.displayName }}</span>
        <button class="session-btn" @click="emit('logout')"><LogOut :size="16" />退出</button>
      </template>
      <button v-else class="login-btn" @click="emit('login')"><LogIn :size="17" />管理员登录</button>
    </div>
    <button class="menu-btn" aria-label="菜单" @click="mobileNav = !mobileNav">
      <X v-if="mobileNav" /><Menu v-else />
    </button>
  </header>
</template>
