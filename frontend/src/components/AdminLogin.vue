<script setup lang="ts">
import { ref } from 'vue'
import { Building2, LockKeyhole, UserRound, X } from '@lucide/vue'
import type { AdminUser } from '../types'

const emit = defineEmits<{ close: []; success: [user: AdminUser] }>()
const username = ref('')
const password = ref('')
const error = ref('')

function submit() {
  error.value = ''
  if (!username.value.trim() || !password.value) {
    error.value = '请输入管理员账号和密码'
    return
  }

  // 当前项目尚未接入后端认证，保留登录表单交互供 API 接入。
  emit('success', { username: username.value.trim(), displayName: username.value.trim() })
}
</script>

<template>
  <div class="login-overlay" @click.self="emit('close')">
    <section class="login-card" role="dialog" aria-modal="true" aria-labelledby="login-title">
      <button class="login-close" aria-label="关闭" @click="emit('close')"><X /></button>
      <span class="login-mark"><Building2 /></span>
      <span class="kicker">ADMIN ACCESS</span>
      <h2 id="login-title">管理员登录</h2>
      <p>管理工作台仅对实验教学中心管理员开放。</p>
      <form @submit.prevent="submit">
        <label>管理员账号<span><UserRound /><input v-model="username" autocomplete="username" autofocus placeholder="请输入管理员账号"></span></label>
        <label>密码<span><LockKeyhole /><input v-model="password" type="password" autocomplete="current-password" placeholder="请输入密码"></span></label>
        <p v-if="error" class="login-error">{{ error }}</p>
        <button class="primary" type="submit">登录并进入工作台</button>
      </form>
      <small>游客无需登录，可直接查看机房并提交预约。</small>
    </section>
  </div>
</template>
