<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { Pencil, Plus, Trash2, Users, X } from '@lucide/vue'
import { api, type ManagedUser } from '../../api'

const managedUsers = ref<ManagedUser[]>([])
const loading = ref(false)
const error = ref('')
const editing = ref<string | null>(null)
const showForm = ref(false)
const form = reactive({ username: '', password: '' })

async function loadUsers() {
  loading.value = true
  error.value = ''
  try { managedUsers.value = await api.getUsers() }
  catch (err) { error.value = err instanceof Error ? err.message : '加载失败' }
  finally { loading.value = false }
}

function openCreate() {
  editing.value = null
  Object.assign(form, { username: '', password: '' })
  showForm.value = true
}

function openEdit(user: ManagedUser) {
  editing.value = user.username
  Object.assign(form, { username: user.username, password: '' })
  showForm.value = true
}

async function saveUser() {
  error.value = ''
  try {
    if (editing.value) await api.updateUser(editing.value, { username: form.username, ...(form.password ? { password: form.password } : {}) })
    else await api.createUser(form)
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
          <thead><tr><th>账号</th><th>角色</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="user in managedUsers" :key="user.id">
              <td><strong>{{ user.username }}</strong></td><td>{{ user.role }}</td>
              <td><div class="approval-actions"><button @click="openEdit(user)"><Pencil />编辑</button><button class="delete" @click="removeUser(user)"><Trash2 />删除</button></div></td>
            </tr>
            <tr v-if="!loading && !managedUsers.length"><td colspan="3" class="approval-empty">暂无账号记录</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-if="showForm" class="crud-overlay" @click.self="showForm = false">
      <form class="crud-dialog" @submit.prevent="saveUser">
        <div class="crud-dialog-head"><div><h2>{{ editing ? '编辑用户' : '新增用户' }}</h2><p>{{ editing ? '不填写密码则保持原密码。' : '创建新的后台管理员账号。' }}</p></div><button type="button" class="icon-btn" @click="showForm = false"><X /></button></div>
        <label>账号<input v-model.trim="form.username" maxlength="20" required></label>
        <label>密码<input v-model="form.password" type="password" maxlength="200" :required="!editing" :placeholder="editing ? '留空表示不修改' : '请输入密码'"></label>
        <div class="crud-dialog-actions"><button type="button" class="secondary" @click="showForm = false">取消</button><button class="primary" type="submit">保存</button></div>
      </form>
    </div>
  </section>
</template>
