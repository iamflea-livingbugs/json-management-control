<template>
  <!--
    ============================================================
    AppButton.vue — 通用按钮组件
    ============================================================
    【使用示例】
    <AppButton type="primary" size="sm" @click="handleClick">按钮文字</AppButton>
    <AppButton type="success"><b>确定</b></AppButton>
    <AppButton type="default" size="lg" :is-disabled="true">禁用的按钮</AppButton>

    【实现说明】
    基于自定义 .my-btn 样式体系，不依赖任何 UI 组件库。
    type / size 通过 :class 映射为对应的 my-btn 变体类。
    -->

  <button class="my-btn" :class="btnClass" :disabled="isDisabled" @click="$emit('click', $event)">
    <slot />
  </button>
</template>

<script setup>
import { computed } from 'vue'

// ----- defineProps: 声明组件可以接收的属性 -----
const props = defineProps({
  type: { type: String, default: 'default' },
  // type 可选值:
  //   'default' → 普通灰色按钮（仅 .my-btn）
  //   'primary' → 主色（accent 红），用于确定/确认
  //   'success' → 绿色成功按钮（.my-btn-success）
  //   'danger'  → 红色警告（复用 accent 色）
  //   示例: <AppButton type="primary" />

  size: { type: String, default: 'md' },
  // size 可选值:
  //   'sm' → 小号按钮（.my-btn-sm）
  //   'md' / 'lg' → 不额外加尺寸类
  //   示例: <AppButton size="sm" />

  isDisabled: { type: [Boolean,String], default: false }
  // 是否禁用。true 时按钮不可点击（原生 disabled 属性）
})

// ----- defineEmits: 声明组件可以触发的事件 -----
defineEmits(['click'])

// ----- computed: type / size → my-btn 变体类 -----
const btnClass = computed(() => {
  const typeMap = {
    default: '',
    primary: 'my-btn-primary',
    success: 'my-btn-success',
    danger: 'my-btn-primary' // danger 语义 = 红色警告，复用 accent 主色
  }
  const sizeMap = { sm: 'my-btn-sm' }
  const classList = []
  if (typeMap[props.type]) classList.push(typeMap[props.type])
  if (sizeMap[props.size]) classList.push(sizeMap[props.size])
  return classList
})

const isDisabled = computed(() => {
  if (typeof props.isDisabled === 'boolean') return props.isDisabled
  if (typeof props.isDisabled === 'string') return props.isDisabled === 'true'
  return false
})
</script>
