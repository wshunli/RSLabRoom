<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { CalendarDays, Check, Phone, Save, Settings2 } from '@lucide/vue'
import { api } from '../../api'

const systemSettings = ref({
  startYear: new Date().getFullYear(),
  startMonth: 1,
  startDay: 1 as number | null,
  semesterWeeks: 0,
  contactName: '',
  contactPhone: '',
  smtpEnabled: false, smtpHost: '', smtpPort: 465, smtpSecure: true,
  smtpUser: '', smtpPassword: '', smtpPasswordSet: false, smtpFrom: '', adminEmail: '', siteUrl: '',
})
const settingsSaved = ref(false)

async function saveSystemSettings() {
  settingsSaved.value = false
  try {
    await api.updateSettings(systemSettings.value)
    settingsSaved.value = true
  } catch (err) {
    alert(err instanceof Error ? err.message : '保存失败')
  }
}

onMounted(async () => {
  try {
    const s = await api.getSettings()
    systemSettings.value = { ...s, startDay: s.startDay }
  } catch { /* ignore */ }
})
</script>

<template>
  <section class="admin-main settings-page">
    <div class="admin-title">
      <div><span class="kicker">SYSTEM SETTINGS</span><h1>系统设置</h1><p>配置当前学期和预约大厅首页的联系信息。</p></div>
      <span class="date-card"><Settings2 /><b>基础设置</b><small>管理后台</small></span>
    </div>

    <form class="panel settings-form" @submit.prevent="saveSystemSettings">
      <div class="settings-section-head"><CalendarDays /><div><h2>学期设置</h2><p>用于生成机房预约日历和教学周信息。</p></div></div>
      <div class="setting-row">
        <label>设置开学时间</label>
        <div class="date-fields">
          <span><input v-model.number="systemSettings.startYear" type="number" min="2000" max="2100" required>年</span>
          <span><input v-model.number="systemSettings.startMonth" type="number" min="1" max="12" required>月</span>
          <span><input v-model.number="systemSettings.startDay" type="number" min="1" max="31" required>日</span>
        </div>
      </div>
      <div class="setting-row">
        <label for="semesterWeeks">设置本学期周数</label>
        <div class="setting-suffix"><input id="semesterWeeks" v-model.number="systemSettings.semesterWeeks" type="number" min="1" max="30" required><span>周</span></div>
      </div>

      <div class="settings-divider" />
      <div class="settings-section-head"><Phone /><div><h2>首页联系信息</h2><p>联系方式将展示在预约大厅首页。</p></div></div>
      <div class="setting-row">
        <label for="contactName">设置首页联系人姓名</label>
        <input id="contactName" v-model.trim="systemSettings.contactName" type="text" required>
      </div>
      <div class="setting-row">
        <label for="contactPhone">设置首页联系人电话</label>
        <input id="contactPhone" v-model.trim="systemSettings.contactPhone" type="tel" required>
      </div>

      <div class="settings-footer">
        <span v-if="settingsSaved" class="settings-saved"><Check />设置已保存</span>
        <button class="primary" type="submit"><Save />提交修改</button>
      </div>
    </form>
  </section>
</template>
