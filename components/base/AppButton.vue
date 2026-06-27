<template>
  <!--
    ============================================================
    AppButton.vue — 通用按钮组件
    ============================================================
    【使用示例】
    <AppButton type="primary" size="sm" @click="handleClick">按钮文字</AppButton>
    <AppButton type="success"><b>确定</b></AppButton>
    <AppButton type="default" size="lg" :is-disabled="true">禁用的按钮</AppButton>

    【Vue 特性说明】
    :class          → 动态绑定 class（":" 是 v-bind: 的简写）
                      这里根据属性计算要应用的 CSS 类名
    :disabled       → 动态绑定 disabled 属性，true 时按钮禁用
    @click          → 绑定点击事件（"@" 是 v-on: 的简写）
                      等价于原生 addEventListener('click', ...)
    $emit('click')  → 触发父组件绑定的 @click 事件
    <slot />        → 插槽，父组件写在标签之间的内容会渲染到这里
                      比如 <AppButton>确定</AppButton> → "确定" 出现在 <slot /> 位置
    -->

  <n-button :size="naiveSize" :type="naiveType" :disabled="isDisabled" @click="$emit('click', $event)">
    <slot />
  </n-button>
</template>

<script setup>
// ============================================================
// Vue 3 Composition API 说明
// ============================================================
// <script setup>        → Vue 3 的语法糖，比 options API 更简洁
//                          不用写 export default { setup() { ... } }
//                          顶层的 import/const/function 自动暴露给模板
//
// import { computed }   → 计算属性：依赖的值变化时自动重新计算
// defineProps           → 定义组件接收的属性（类似函数的参数声明）
// defineEmits           → 定义组件可以触发的事件
//
// props                 → 接收到的属性对象，props.xxx 读取传入的值
// 模板里可以直接使用 script setup 里的变量和函数
// ============================================================

import { computed } from 'vue'
import { NButton } from 'naive-ui'

// ----- defineProps: 声明组件可以接收的属性 -----
// 父组件通过 <AppButton type="primary" size="sm" is-disabled /> 传入
// 注意: HTML 中用 is-disabled（连字符），props 定义中用 isDisabled（驼峰），Vue 会自动转换
// 这里定义每个属性的类型、默认值
const props = defineProps({
  type: { type: String, default: 'default' },
  // type 可选值:
  //   'default' → 普通灰色按钮，应用 .btn 类
  //   'primary' → 红色主题按钮，应用 .btn .btn-primary 类
  //   'success' → 绿色成功按钮，应用 .btn .btn-success 类
  //   'danger'  → 红色警告按钮，应用 .btn .btn-danger 类
  //   示例: <AppButton type="primary" />

  size: { type: String, default: 'md' },
  // size 可选值:
  //   'sm' → 小按钮，额外应用 .btn-sm 类
  //   'md' → 中等大小，不加尺寸类
  //   'lg' → 大按钮，额外应用 .btn-lg 类
  //   示例: <AppButton size="sm" />

  isDisabled: { type: [Boolean,String], default: false }
  // 是否禁用。true 时按钮不可点击
  // isDisabled = true → <button disabled>（原生 HTML disabled 属性）
  // isDisabled = false → 正常可点击
  // 示例: <AppButton :is-disabled="true" /> 或 <AppButton :is-disabled="isSaving" />
})

// ----- defineEmits: 声明组件可以触发的事件 -----
// 父组件通过 @click="handleClick" 监听
// 当按钮被点击时，调用 $emit('click') 触发父组件的 @click
defineEmits(['click'])

// ----- computed: Naive UI 属性映射 -----
// 把自定义的 type / size 转成 Naive UI NButton 接受的 props
const naiveType = computed(() => {
  // type 映射: success → success, primary → primary, default → default, danger → error
  const map = { default: 'default', primary: 'primary', success: 'success', danger: 'error' }
  return map[props.type] || 'default'
})

const naiveSize = computed(() => {
  // size 映射: sm → small, md → medium, lg → large
  const map = { sm: 'small', md: 'medium', lg: 'large' }
  return map[props.size] || 'medium'
})

const isDisabled = computed(() => {
  if(typeof props.isDisabled === 'boolean'){
    return props.isDisabled
  } else if(typeof props.isDisabled === 'string'){
    if(props.isDisabled === 'true'){
      return true
    } else if(props.isDisabled === 'false'){
      return false
    } else {
      return false
    }
  }
  return false
})
</script>
