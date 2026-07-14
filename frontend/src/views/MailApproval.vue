<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { CheckCircle2, MailCheck, XCircle } from '@lucide/vue'
import { api } from '../api'

const route = useRoute()
const token = String(route.params.token || '')
const application = ref<Awaited<ReturnType<typeof api.getMailApproval>> | null>(null)
const error = ref('')
const approving = ref(false)
const rejecting = ref(false)

onMounted(async () => {
  try { application.value = await api.getMailApproval(token) }
  catch (err) { error.value = err instanceof Error ? err.message : '审批链接无效' }
})

async function approve() {
  approving.value = true
  try {
    await api.approveByMail(token)
    if (application.value) application.value.state = 'approved'
  } catch (err) { error.value = err instanceof Error ? err.message : '审批失败' }
  finally { approving.value = false }
}

async function reject() {
  rejecting.value = true
  try {
    await api.rejectByMail(token)
    if (application.value) application.value.state = 'rejected'
  } catch (err) { error.value = err instanceof Error ? err.message : '驳回失败' }
  finally { rejecting.value = false }
}
</script>

<template>
  <main class="mail-approval-page">
    <section class="panel mail-approval-card">
      <div class="mail-approval-head"><MailCheck /><div><span class="kicker">APPLICATION APPROVAL</span><h1>机房借用申请</h1></div></div>
      <p v-if="error" class="form-message error">{{ error }}</p>
      <template v-else-if="application">
        <dl class="mail-approval-details">
          <div><dt>申请人</dt><dd>{{ application.applicant }}（{{ application.phone }}）</dd></div>
          <div><dt>课程/用途</dt><dd>{{ application.courseName }}</dd></div>
          <div><dt>使用人数</dt><dd>{{ application.people }} 人</dd></div>
          <div><dt>预约时段</dt><dd><span v-for="item in application.detailList" :key="item">{{ item }}</span></dd></div>
          <div v-if="application.remarks"><dt>备注</dt><dd>{{ application.remarks }}</dd></div>
        </dl>
        <div v-if="application.state === 'approved'" class="mail-approved"><CheckCircle2 />该申请已通过</div>
        <div v-else-if="application.state === 'pending'" class="mail-approval-actions">
          <button class="primary mail-approve-button" type="button" :disabled="approving || rejecting" @click="approve">{{ approving ? '处理中…' : '确认通过申请' }}</button>
          <button class="reject mail-reject-button" type="button" :disabled="approving || rejecting" @click="reject"><XCircle :size="17" />{{ rejecting ? '处理中…' : '驳回申请' }}</button>
        </div>
        <p v-else-if="application.state === 'rejected'" class="form-message error">该申请已被驳回，无法通过此链接审批。</p>
        <p v-else class="form-message error">该申请已被删除，无法继续审批。</p>
      </template>
      <p v-else>正在加载申请信息…</p>
    </section>
  </main>
</template>
