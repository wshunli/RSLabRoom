<script setup lang="ts">
import { DoorOpen, MapPin, Phone, Users } from '@lucide/vue'
import { adminStore } from '../../stores/admin'
</script>

<template>
  <section class="admin-main">
    <div class="admin-title">
      <div><span class="kicker">ROOM MANAGEMENT</span><h1>机房管理</h1><p>共 {{ adminStore.rooms.length }} 间机房，展示机房基本信息与管理人员联系方式。</p></div>
      <span class="date-card"><DoorOpen /><b>{{ adminStore.rooms.length }} 间机房</b><small>实验教学中心</small></span>
    </div>

    <section class="room-management-grid">
      <article v-for="room in adminStore.rooms" :key="room.id" class="managed-room-card">
        <div class="managed-room-head">
          <span class="managed-room-id">{{ String(room.id).padStart(2, '0') }}</span>
          <div>
            <h2>{{ room.name }}</h2>
            <p><MapPin :size="13" />{{ room.building || '—' }}</p>
          </div>
          <span class="room-capacity"><Users :size="14" />{{ room.seats }} 座</span>
        </div>
        <div class="managed-room-body">
          <span class="room-owner">{{ room.audience }}</span>
          <p :class="['room-intro', { muted: !room.intro }]">{{ room.intro || '暂无简介信息' }}</p>
          <div class="room-contact">
            <span><Phone :size="14" />管理员：{{ room.administrator || '—' }}</span>
            <span><Phone :size="14" />电话：{{ room.phone || '—' }}</span>
          </div>
        </div>
      </article>
      <p v-if="!adminStore.rooms.length" class="empty" style="grid-column:1/-1">暂无机房数据</p>
    </section>
  </section>
</template>
