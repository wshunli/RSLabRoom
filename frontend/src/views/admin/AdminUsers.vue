<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Users } from '@lucide/vue'
import { api } from '../../api'

const managedUsers = ref<Array<{ id: number; username: string }>>([])

onMounted(async () => {
  try {
    managedUsers.value = await api.getUsers()
  } catch { /* ignore */ }
})
</script>

<template>
  <section class="admin-main">
    <div class="admin-title">
      <div><span class="kicker">USER MANAGEMENT</span><h1>用户管理</h1><p>共 {{ managedUsers.length }} 个管理员账号。</p></div>
      <span class="date-card"><Users /><b>{{ managedUsers.length }} 个账号</b><small>管理员</small></span>
    </div>

    <section class="panel approval-panel">
      <div class="approval-table-wrap">
        <table class="approval-table user-table">
          <thead><tr><th>ID</th><th>账号</th><th>角色</th></tr></thead>
          <tbody>
            <tr v-for="user in managedUsers" :key="user.id">
              <td class="request-id">{{ user.id }}</td>
              <td><strong>{{ user.username }}</strong></td>
              <td>管理员</td>
            </tr>
            <tr v-if="!managedUsers.length"><td colspan="3" class="approval-empty">暂无账号记录</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>
