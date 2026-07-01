// ==========================================
// useCreateDialog.js — Vue 新建弹窗 & 模板选择器
// API 与原生 ui-createDialog.js 兼容
// ==========================================
import { createApp, h, ref } from 'vue'
import Modal from './Modal.vue'
import { getContextKeys, getContextsConfig } from '../../js/logic/logic-storyTypes.js'

/**
 * 打开新建选择弹窗（回调式 API）
 */
export function showCreateDialog(options) {
  const {
    title = '新建',
    blankLabel = '空白 JSON',
    blankDesc = '最简结构，无多余字段',
    templateLabel = '模板创建',
    templateDesc = '使用当前配置的模板结构',
    onBlank,
    onTemplate,
    onCancel
  } = options

  const visible = ref(true)

  const app = createApp({
    render() {
      return h(Modal, {
        visible: visible.value,
        title,
        width: '480px',
        'onUpdate:visible': () => close()
      }, {
        default: () => h('div', { class: 'create-choices' }, [
          h('div', {
            class: 'create-choice-card',
            onClick: () => { close(); if (onBlank) onBlank() }
          }, [
            h('div', { class: 'create-choice-icon' }, '📄'),
            h('div', { class: 'create-choice-label' }, blankLabel),
            h('div', { class: 'create-choice-desc' }, blankDesc)
          ]),
          h('div', {
            class: 'create-choice-card',
            onClick: () => { close(); if (onTemplate) onTemplate() }
          }, [
            h('div', { class: 'create-choice-icon' }, '📋'),
            h('div', { class: 'create-choice-label' }, templateLabel),
            h('div', { class: 'create-choice-desc' }, templateDesc)
          ])
        ]),
        footer: () => h('div', { style: 'display:flex;gap:8px;justify-content:flex-end' },
          h('button', { class: 'btn btn-sm', onClick: () => { close(); if (onCancel) onCancel() } }, '取消')
        )
      })
    }
  })

  const container = document.createElement('div')
  document.body.appendChild(container)
  app.mount(container)

  function close() {
    if (!visible.value) return
    visible.value = false
    setTimeout(() => {
      app.unmount()
      if (container.parentNode) container.parentNode.removeChild(container)
    }, 200)
  }
}

/**
 * 显示模板上下文选择弹窗（Promise API）
 */
export function showTemplatePicker() {
  return new Promise((resolve) => {
    const visible = ref(true)
    const ctxKeys = getContextKeys()
    const ctxConfig = getContextsConfig()

    const app = createApp({
      render() {
        return h(Modal, {
          visible: visible.value,
          title: '选择模板',
          width: '480px',
          'onUpdate:visible': () => close(null)
        }, {
          default: () => {
            const cards = ctxKeys.map(k => {
              const cfg = ctxConfig[k] || {}
              return h('div', {
                class: 'create-choice-card',
                style: 'width:auto;flex:1;min-width:120px',
                onClick: () => close(k)
              }, [
                h('div', { class: 'create-choice-label' }, cfg.label || k),
                h('div', { class: 'create-choice-desc', style: 'font-size:0.75rem' }, cfg.description || '')
              ])
            })
            return h('div', { class: 'create-choices', style: 'flex-wrap:wrap' }, cards)
          },
          footer: () => h('div', { style: 'display:flex;gap:8px;justify-content:flex-end' },
            h('button', { class: 'btn btn-sm', onClick: () => close(null) }, '取消')
          )
        })
      }
    })

    const container = document.createElement('div')
    document.body.appendChild(container)
    app.mount(container)

    function close(result) {
      if (!visible.value) return
      visible.value = false
      setTimeout(() => {
        app.unmount()
        if (container.parentNode) container.parentNode.removeChild(container)
        resolve(result)
      }, 200)
    }
  })
}
