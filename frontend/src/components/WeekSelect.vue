<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { CalendarDays, ChevronDown } from '@lucide/vue'

const props = withDefaults(defineProps<{
  modelValue: number
  label?: string
  prefix?: string
  totalWeeks?: number
  options?: number[]
  currentWeek?: number
}>(), {
  label: '',
  prefix: '',
  totalWeeks: 0,
  options: undefined,
  currentWeek: 0,
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const open = ref(false)
const root = ref<HTMLElement | null>(null)

const weeks = computed(() => {
  if (props.options?.length) return [...props.options].sort((a, b) => a - b)
  return Array.from({ length: props.totalWeeks || 0 }, (_, i) => i + 1)
})

function closeOnOutsideClick(event: MouseEvent) {
  const target = event.target
  if (target instanceof Node && root.value?.contains(target)) return
  open.value = false
}

function selectWeek(week: number) {
  emit('update:modelValue', week)
  open.value = false
}

onMounted(() => {
  document.addEventListener('click', closeOnOutsideClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', closeOnOutsideClick)
})
</script>

<template>
  <div ref="root" class="week-select-field">
    <span v-if="label">{{ label }}</span>
    <button
      type="button"
      class="week-current"
      aria-haspopup="listbox"
      :aria-expanded="open"
      @click="open = !open"
    >
      <CalendarDays :size="17" />
      <template v-if="prefix">{{ prefix }}</template>
      <b>第 {{ modelValue }} 周</b>
      <ChevronDown :size="14" class="week-caret" :class="{ open }" />
    </button>
    <template v-if="open">
      <div class="week-pop" role="listbox" aria-label="选择教学周">
        <div class="week-pop-grid">
          <button
            v-for="week in weeks"
            :key="week"
            type="button"
            role="option"
            :aria-selected="week === modelValue"
            :class="{ active: week === modelValue, current: week === currentWeek }"
            :title="week === currentWeek ? '本周' : ''"
            @click="selectWeek(week)"
          >{{ week }}</button>
        </div>
      </div>
    </template>
  </div>
</template>
