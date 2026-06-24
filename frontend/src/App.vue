<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from './components/AppHeader.vue'
import AdminLogin from './components/AdminLogin.vue'
import type { AdminUser } from './types'

const router = useRouter()

const mobileNav = ref(false)
const showAdminLogin = ref(false)
const admin = ref<AdminUser | null>(readAdminSession())

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

function handleUnauthorized() {
  handleLogout()
  showAdminLogin.value = true
  router.push({ name: 'user' })
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
  router.push({ name: 'admin-approval' })
}

function handleLogout() {
  admin.value = null
  sessionStorage.removeItem('room-admin')
  sessionStorage.removeItem('room-admin-token')
  router.push({ name: 'user' })
}
</script>

<template>
  <div class="app-shell">
    <AppHeader
      :mobile-nav="mobileNav"
      :admin="admin"
      @update:mobile-nav="(v: boolean) => mobileNav = v"
      @login="openAdminLogin"
      @logout="handleLogout"
    />
    <router-view />
    <footer>
      <span>© 2026 武汉大学遥感信息工程学院实验教学中心</span>
      <span>服务电话：027-6877 0000</span>
    </footer>
    <AdminLogin v-if="showAdminLogin" @close="showAdminLogin = false" @success="handleLogin" />
  </div>
</template>
