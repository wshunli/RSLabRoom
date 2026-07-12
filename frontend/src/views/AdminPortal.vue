<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  CalendarDays, CircleHelp, DoorOpen,
  LayoutDashboard, ListChecks, LogOut, Mail, Settings2, Users,
} from '@lucide/vue'
import { adminStore } from '../stores/admin'

defineProps<{ admin: { displayName: string } }>()
const emit = defineEmits<{ logout: [] }>()

const router = useRouter()
const route = useRoute()

const active = computed(() => {
  const name = route.name as string
  return name.replace('admin-', '')
})

const navigation = computed(() => [
  { name: '概览', icon: LayoutDashboard, route: 'admin-dashboard' },
  { name: '申请审批', icon: ListChecks, route: 'admin-approval', badge: adminStore.pendingTotal },
  { name: '机房排期', icon: CalendarDays, route: 'admin-schedule' },
  { name: '机房管理', icon: DoorOpen, route: 'admin-rooms' },
  { name: '用户管理', icon: Users, route: 'admin-users' },
  { name: '邮件通知', icon: Mail, route: 'admin-mail-settings' },
  { name: '系统设置', icon: Settings2, route: 'admin-settings' },
])

function navigate(name: string) {
  router.push({ name })
}

onMounted(() => {
  adminStore.loadRooms()
})
</script>

<template>
  <div class="admin-layout">
    <aside class="admin-side">
      <div class="admin-label">管理后台</div>
      <button
        v-for="item in navigation"
        :key="item.name"
        :class="{ active: active === item.route.replace('admin-', '') }"
        @click="navigate(item.route)"
      >
        <component :is="item.icon" :size="18" />{{ item.name }}<b v-if="item.badge">{{ item.badge }}</b>
      </button>
      <div class="side-bottom">
        <button><CircleHelp :size="18" />帮助与反馈</button>
        <button @click="emit('logout')"><LogOut :size="18" />退出管理端</button>
      </div>
    </aside>

    <router-view />
  </div>
</template>
