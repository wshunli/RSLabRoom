<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { Mail, Pencil, Phone, Plus, Trash2, Users, X } from '@lucide/vue'
import { api, type ManagedUser } from '../../api'

const managedUsers = ref<ManagedUser[]>([])
const loading = ref(false)
const error = ref('')
const editing = ref<string | null>(null)
const showForm = ref(false)
const form = reactive({ username: '', password: '', name: '', email: '', phone: '' })

async function loadUsers() {
  loading.value = true
  error.value = ''
  try { managedUsers.value = await api.getUsers() }
  catch (err) { error.value = err instanceof Error ? err.message : '加载失败' }
  finally { loading.value = false }
}

function openCreate() {
  editing.value = null
  Object.assign(form, { username: '', password: '', name: '', email: '', phone: '' })
  showForm.value = true
}

function openEdit(user: ManagedUser) {
  editing.value = user.username
  Object.assign(form, { username: user.username, password: '', name: user.name, email: user.email, phone: user.phone })
  showForm.value = true
}

async function saveUser() {
  error.value = ''
  const payload = {
    username: form.username,
    name: form.name,
    email: form.email,
    phone: form.phone,
    ...(form.password ? { password: form.password } : {}),
  }
  try {
    if (editing.value) await api.updateUser(editing.value, payload)
    else await api.createUser({ ...payload, password: form.password })
    showForm.value = false
    await loadUsers()
  } catch (err) { error.value = err instanceof Error ? err.message : '保存失败' }
}

async function removeUser(user: ManagedUser) {
  if (!confirm(`确定删除管理员“${user.username}”吗？`)) return
  try { await api.deleteUser(user.username); await loadUsers() }
  catch (err) { error.value = err instanceof Error ? err.message : '删除失败' }
}

onMounted(loadUsers)
</script>

<template>
  <section class="admin-main">
    <div class="admin-title">
      <div><span class="kicker">USER MANAGEMENT</span><h1>用户管理</h1><p>管理员账号的新增、查询、修改与删除。</p></div>
      <span class="date-card"><Users /><b>{{ managedUsers.length }} 个账号</b><small>管理员</small></span>
    </div>

    <section class="panel management-panel">
      <div class="panel-head management-head">
        <div><h2>管理员列表</h2><p>共 {{ managedUsers.length }} 条记录</p></div>
        <button class="primary compact" @click="openCreate"><Plus />新增用户</button>
      </div>
      <p v-if="error" class="form-message error">{{ error }}</p>
      <div class="approval-table-wrap">
        <table class="approval-table user-table">
          <thead><tr><th>账号</th><th>姓名</th><th>邮箱</th><th>手机号</th><th>角色</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="user in managedUsers" :key="user.id">
              <td data-label="账号"><strong>{{ user.username }}</strong></td>
              <td data-label="姓名">{{ user.name || '-' }}</td>
              <td data-label="邮箱"><span v-if="user.email" class="nowrap"><Mail :size="13" />{{ user.email }}</span><span v-else>-</span></td>
              <td data-label="手机号"><span v-if="user.phone" class="nowrap"><Phone :size="13" />{{ user.phone }}</span><span v-else>-</span></td>
              <td data-label="角色">{{ user.role }}</td>
              <td data-label="操作"><div class="approval-actions"><button @click="openEdit(user)"><Pencil />编辑</button><button class="delete" @click="removeUser(user)"><Trash2 />删除</button></div></td>
            </tr>
            <tr v-if="!loading && !managedUsers.length"><td colspan="6" class="approval-empty">暂无账号记录</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-if="showForm" class="crud-overlay" @click.self="showForm = false">
      <form class="crud-dialog" @submit.prevent="saveUser">
        <div class="crud-dialog-head"><div><h2>{{ editing ? '编辑用户' : '新增用户' }}</h2><p>{{ editing ? '不填写密码则保持原密码。' : '创建新的后台管理员账号。' }}</p></div><button type="button" class="icon-btn" @click="showForm = false"><X /></button></div>
        <div class="crud-form-grid">
          <label>账号<input v-model.trim="form.username" maxlength="20" autocomplete="username" required></label>
          <label>姓名<input v-model.trim="form.name" maxlength="50" autocomplete="name"></label>
          <label>邮箱<input v-model.trim="form.email" type="email" maxlength="100" autocomplete="email"></label>
          <label>手机号<input v-model.trim="form.phone" type="tel" maxlength="25" autocomplete="tel"></label>
          <label class="full">密码<input v-model="form.password" type="password" maxlength="200" autocomplete="new-password" :required="!editing" :placeholder="editing ? '留空表示不修改' : '请输入密码'"></label>
        </div>
        <div class="crud-dialog-actions"><button type="button" class="secondary" @click="showForm = false">取消</button><button class="primary" type="submit">保存</button></div>
      </form>
    </div>
  </section>
</template>
