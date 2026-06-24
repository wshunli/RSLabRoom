<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import AppHeader from './components/AppHeader.vue'
import AdminLogin from './components/AdminLogin.vue'
import UserPortal from './views/UserPortal.vue'
import AdminPortal from './views/AdminPortal.vue'
import GuidePortal from './views/GuidePortal.vue'
import type { AdminUser, PortalMode } from './types'

const mode = ref<PortalMode>('user')
const mobileNav = ref(false)
const showAdminLogin = ref(false)
const admin = ref<AdminUser | null>(readAdminSession())
if (admin.value) mode.value = 'admin'

// 只有同时存在登录信息与有效 token 才视为已登录，避免“有会话无 token”的半登录状态。
function readAdminSession(): AdminUser | null {
  const value = sessionStorage.getItem('room-admin')
  const token = sessionStorage.getItem('room-admin-token')
  if (!value || !token) {
    sessionStorage.removeItem('room-admin')
    sessionStorage.removeItem('room-admin-token')
    return null
  }
  try {
    return JSON.parse(value) as AdminUser
  } catch {
    sessionStorage.removeItem('room-admin')
    return null
  }
}

// token 失效（后端重启或过期）时，任一管理端请求返回 401 会触发此事件：清理会话并回到登录。
function handleUnauthorized() {
  handleLogout()
  showAdminLogin.value = true
}
onMounted(() => window.addEventListener('admin-unauthorized', handleUnauthorized))
onUnmounted(() => window.removeEventListener('admin-unauthorized', handleUnauthorized))

function openAdminLogin() {
  showAdminLogin.value = true
  mobileNav.value = false
}

function handleLogin(user: AdminUser) {
  admin.value = user
  sessionStorage.setItem('room-admin', JSON.stringify(user))
  showAdminLogin.value = false
  mode.value = 'admin'
}

function handleLogout() {
  admin.value = null
  sessionStorage.removeItem('room-admin')
  sessionStorage.removeItem('room-admin-token')
  mode.value = 'user'
}
</script>

<template>
  <div class="app-shell">
    <AppHeader
      v-model:mode="mode"
      v-model:mobile-nav="mobileNav"
      :admin="admin"
      @login="openAdminLogin"
      @logout="handleLogout"
    />
    <UserPortal v-if="mode === 'user'" />
    <GuidePortal v-else-if="mode === 'guide'" />
    <AdminPortal v-else-if="admin" :admin="admin" @logout="handleLogout" />
    <footer>
      <span>© 2026 武汉大学遥感信息工程学院实验教学中心</span>
      <span>服务电话：027-6877 0000</span>
    </footer>
    <AdminLogin v-if="showAdminLogin" @close="showAdminLogin = false" @success="handleLogin" />
  </div>
</template>
