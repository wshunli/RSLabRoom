<script setup lang="ts">
import { ref } from 'vue'
import AppHeader from './components/AppHeader.vue'
import UserPortal from './views/UserPortal.vue'
import AdminPortal from './views/AdminPortal.vue'
import type { PortalMode } from './types'

const mode = ref<PortalMode>('user')
const mobileNav = ref(false)
</script>

<template>
  <div class="app-shell">
    <AppHeader v-model:mode="mode" v-model:mobile-nav="mobileNav" />
    <UserPortal v-if="mode === 'user'" />
    <AdminPortal v-else />
    <footer>
      <span>© 2026 武汉大学遥感信息工程学院实验教学中心</span>
      <span>服务电话：027-6877 0000</span>
    </footer>
  </div>
</template>
