<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Check, Mail, Save, Send } from '@lucide/vue'
import { api } from '../../api'

const settings = ref({
  startYear: new Date().getFullYear(), startMonth: 1, startDay: 1 as number | null,
  semesterWeeks: 1, contactName: '', contactPhone: '',
  smtpEnabled: false, smtpHost: '', smtpPort: 465, smtpSecure: true,
  smtpUser: '', smtpPassword: '', smtpPasswordSet: false, smtpFrom: '', adminEmail: '', siteUrl: '',
})
const saved = ref(false)
const testing = ref(false)

async function save() {
  saved.value = false
  try { await api.updateSettings(settings.value); saved.value = true }
  catch (err) { alert(err instanceof Error ? err.message : '保存失败') }
}

async function test() {
  testing.value = true
  try {
    await api.updateSettings(settings.value)
    await api.testEmail()
    saved.value = true
    alert('测试邮件已发送，请检查管理员邮箱。')
  } catch (err) { alert(err instanceof Error ? err.message : '测试邮件发送失败') }
  finally { testing.value = false }
}

onMounted(async () => {
  try { const value = await api.getSettings(); settings.value = { ...value, startDay: value.startDay } }
  catch { /* 由保存操作显示具体错误 */ }
})
</script>

<template>
  <section class="admin-main settings-page">
    <div class="admin-title">
      <div><span class="kicker">EMAIL NOTIFICATION</span><h1>邮件通知</h1><p>配置 SMTP 服务，在有人提交申请后通知管理员。</p></div>
      <span class="date-card"><Mail /><b>通知设置</b><small>SMTP 邮件</small></span>
    </div>
    <form class="panel settings-form" @submit.prevent="save">
      <div class="settings-section-head"><Mail /><div><h2>SMTP 配置</h2><p>推荐使用邮箱服务商提供的 SMTP 授权码，而不是登录密码。</p></div></div>
      <div class="setting-row"><label for="smtpEnabled">启用邮件通知</label><label class="setting-check"><input id="smtpEnabled" v-model="settings.smtpEnabled" type="checkbox"> 启用</label></div>
      <div class="setting-row"><label for="smtpHost">SMTP 服务器</label><input id="smtpHost" v-model.trim="settings.smtpHost" type="text" placeholder="smtp.example.com" :required="settings.smtpEnabled"></div>
      <div class="setting-row"><label for="smtpPort">SMTP 端口</label><input id="smtpPort" v-model.number="settings.smtpPort" type="number" min="1" max="65535" required></div>
      <div class="setting-row"><label for="smtpSecure">连接加密</label><label class="setting-check"><input id="smtpSecure" v-model="settings.smtpSecure" type="checkbox"> SSL/TLS（通常用于 465 端口）</label></div>
      <div class="setting-row"><label for="smtpUser">SMTP 用户名</label><input id="smtpUser" v-model.trim="settings.smtpUser" type="text" autocomplete="username"></div>
      <div class="setting-row"><label for="smtpPassword">SMTP 密码/授权码</label><div><input id="smtpPassword" v-model="settings.smtpPassword" class="setting-full-input" type="password" autocomplete="new-password" :placeholder="settings.smtpPasswordSet ? '已设置，留空则不修改' : '请输入密码或授权码'"><small class="setting-help">后台不会回显已保存的密码。</small></div></div>
      <div class="setting-row"><label for="smtpFrom">发件人</label><input id="smtpFrom" v-model.trim="settings.smtpFrom" type="text" placeholder="机房预约系统 &lt;notice@example.com&gt;"></div>
      <div class="setting-row"><label for="adminEmail">管理员邮箱</label><input id="adminEmail" v-model.trim="settings.adminEmail" type="email" placeholder="admin@example.com" :required="settings.smtpEnabled"></div>
      <div class="setting-row"><label for="siteUrl">系统访问地址</label><div><input id="siteUrl" v-model.trim="settings.siteUrl" class="setting-full-input" type="url" placeholder="https://room.example.com" :required="settings.smtpEnabled"><small class="setting-help">用于生成邮件中的安全审批链接，请填写外部可访问的完整地址。</small></div></div>
      <div class="settings-footer">
        <span v-if="saved" class="settings-saved"><Check />设置已保存</span>
        <button class="secondary settings-test" type="button" :disabled="testing" @click="test"><Send />{{ testing ? '发送中…' : '保存并发送测试邮件' }}</button>
        <button class="primary" type="submit"><Save />保存配置</button>
      </div>
    </form>
  </section>
</template>
