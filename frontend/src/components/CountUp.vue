<script setup lang="ts">
// 数字从 0 滚动增长到目标值的动效组件。
// - auto 为真时（默认），首次渲染及目标值变化时自动播放，用于后台概览的指标加载。
// - 通过 ref 暴露 play()，父组件可在 hover 等交互时重新触发，用于首页悬停。
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  value: number
  duration?: number
  decimals?: number
  auto?: boolean
}>(), { duration: 900, decimals: -1, auto: true })

const display = ref(0)
let raf = 0

// 缓出曲线：起步快、收尾平缓，数字增长更有“落定”感。
const ease = (t: number) => 1 - Math.pow(1 - t, 3)

// 目标为整数时保留 0 位小数，否则按 decimals（默认 1 位）。
const fractionDigits = computed(() => {
  if (props.decimals >= 0) return props.decimals
  return Number.isInteger(props.value) ? 0 : 1
})

const text = computed(() => display.value.toFixed(fractionDigits.value))

function play(from = 0, to = props.value) {
  cancelAnimationFrame(raf)
  if (to === from) { display.value = to; return }
  const start = performance.now()
  const step = (now: number) => {
    const t = Math.min((now - start) / props.duration, 1)
    display.value = from + (to - from) * ease(t)
    if (t < 1) raf = requestAnimationFrame(step)
    else display.value = to
  }
  raf = requestAnimationFrame(step)
}

onMounted(() => { if (props.auto) play() })
watch(() => props.value, (v) => { if (props.auto) play(0, v) })
onUnmounted(() => cancelAnimationFrame(raf))

defineExpose({ play })
</script>

<template>
  <span class="count-up">{{ text }}</span>
</template>
