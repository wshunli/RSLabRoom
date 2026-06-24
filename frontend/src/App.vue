<script setup lang="ts">
import { ref } from 'vue'
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

function readAdminSession(): AdminUser | null {
  const value = sessionStorage.getItem('room-admin')
  if (!value) return null

  try {
    return JSON.parse(value) as AdminUser
  } catch {
    sessionStorage.removeItem('room-admin')
    return null
  }
}

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
