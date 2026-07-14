<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Bell, Building2, LogIn, LogOut, Menu, X } from '@lucide/vue'
import type { AdminUser } from '../types'
import { adminStore } from '../stores/admin'

const props = defineProps<{ admin: AdminUser | null }>()
const emit = defineEmits<{ login: []; logout: [] }>()

const mobileNav = defineModel<boolean>('mobileNav', { required: true })
const router = useRouter()
const route = useRoute()

const currentMode = computed(() => {
  const name = route.name as string
  if (name === 'user') return 'user'
  if (name === 'guide') return 'guide'
  if (name?.startsWith('admin')) return 'admin'
  return 'user'
})

function navigateTo(name: string) {
  router.push({ name })
  mobileNav.value = false
}

function handleAdminClick() {
  mobileNav.value = false
  emit('login')
}

function handleLogout() {
  mobileNav.value = false
  emit('logout')
}

watch(
  () => props.admin,
  (admin) => {
    if (admin) adminStore.loadPending()
    else adminStore.pendingTotal = 0
  },
  { immediate: true },
)
</script>

<template>
  <header class="topbar">
    <div class="brand-mark"><Building2 :size="24" /></div>
    <div class="brand-copy"><strong>机房预约与管理系统</strong><span>武汉大学遥感信息工程学院实验教学中心</span></div>
    <nav :class="{ open: mobileNav }">
      <button :class="{ active: currentMode === 'user' }" @click="navigateTo('user')">预约大厅</button>
      <button :class="{ active: currentMode === 'guide' }" @click="navigateTo('guide')">使用指南</button>
      <button v-if="admin" :class="{ active: currentMode === 'admin' }" @click="navigateTo('admin-approval')">管理后台</button>
      <a href="https://ygxxgcxy.whu.edu.cn/oldhall/" target="_blank" rel="noopener noreferrer">返回旧版</a>
      <button v-if="admin" class="mobile-session" @click="handleLogout"><LogOut :size="17" />退出登录</button>
      <button v-else class="mobile-login" @click="handleAdminClick"><LogIn :size="17" />管理员登录</button>
    </nav>
    <div class="top-actions">
      <template v-if="admin">
        <button class="icon-btn" aria-label="通知"><Bell :size="19" /><i v-if="adminStore.pendingTotal > 0" /></button>
        <span class="avatar">{{ admin.displayName[0] }}</span><span class="user-name">{{ admin.displayName }}</span>
        <button class="session-btn" @click="emit('logout')"><LogOut :size="16" />退出</button>
      </template>
      <button v-else class="login-btn" @click="handleAdminClick"><LogIn :size="17" />管理员登录</button>
    </div>
    <button class="menu-btn" aria-label="菜单" @click="mobileNav = !mobileNav">
      <X v-if="mobileNav" /><Menu v-else />
    </button>
  </header>
</template>

<style scoped>
.topbar nav a {
  border: 0;
  background: none;
  color: #65736d;
  font: inherit;
  font-weight: 600;
  position: relative;
  text-decoration: none;
  height: 100%;
  display: flex;
  align-items: center;
}

.topbar nav a:hover {
  color: var(--green);
}

@media (max-width: 800px) {
  .topbar nav a {
    padding: 10px;
    text-align: center;
  }
}
</style>
