// ==========================================
// useDialog.js — Vue 弹窗组合式函数
// 动态创建 Vue Modal 实例，返回 Promise
// API 与原生 ui-modalDialog.js 兼容
// ==========================================
import { createApp, h, ref, nextTick } from 'vue'
import Modal from './Modal.vue'

function esc(str) {
  if (!str) return ''
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * 动态弹窗基础函数
 * @param {object} opts - { title, bodyHTML, width, onMount }
 * @returns {Promise<any>}
 */
function createDialog(opts) {
  return new Promise((resolve) => {
    const visible = ref(true)
    let inputVal = ''
    let selectVal = 'string'

    const app = createApp({
      render() {
        return h(Modal, {
          visible: visible.value,
          title: opts.title || '提示',
          width: opts.width || '420px',
          'onUpdate:visible': () => close(null)
        }, {
          default: () => {
            if (opts.renderBody) {
              return opts.renderBody({
                h,
                onInput: (v) => { inputVal = v },
                onSelect: (v) => { selectVal = v },
                resolve
              })
            }
            return opts.bodyHTML ? h('div', { innerHTML: opts.bodyHTML }) : null
          },
          footer: () => {
            const buttons = opts.buttons || []
            return h('div', { style: 'display:flex;gap:8px;justify-content:flex-end' },
              buttons.map(b =>
                h('button', {
                  class: 'my-btn' + (b.primary ? ' my-btn-primary' : ''),
                  onClick: () => {
                    if (b.getValue) {
                      close(b.getValue(inputVal, selectVal))
                    } else if (b.value !== undefined) {
                      close(b.value)
                    } else {
                      close(b.returnNull ? null : true)
                    }
                  }
                }, b.label)
              )
            )
          }
        })
      }
    })

    const container = document.createElement('div')
    document.body.appendChild(container)
    app.mount(container)

    // 自动聚焦 & Enter 键确认
    if (opts.focusSelector) {
      nextTick(() => {
        const el = container.querySelector(opts.focusSelector)
        if (el) { el.focus(); if (el.select) el.select() }
      })
    }

    function onKeydown(e) {
      if (e.key === 'Enter') {
        const btn = document.querySelector('.my-modal-overlay.open .my-btn-primary')
        if (btn) btn.click()
      }
    }
    document.addEventListener('keydown', onKeydown)

    function close(val) {
      if (!visible.value) return
      visible.value = false
      document.removeEventListener('keydown', onKeydown)
      setTimeout(() => {
        app.unmount()
        if (container.parentNode) container.parentNode.removeChild(container)
        resolve(val)
      }, 200)
    }
  })
}

export { createDialog }

/**
 * 信息提示（替代 alert）
 */
export function showAlert(msg) {
  return createDialog({
    title: '提示',
    bodyHTML: `<div class="my-modal-msg">${esc(msg)}</div>`,
    buttons: [{ label: '确定', primary: true, value: undefined }]
  })
}

/**
 * 确认弹窗（替代 confirm）
 */
export function showConfirm(msg) {
  return createDialog({
    title: '确认',
    bodyHTML: `<div class="my-modal-msg">${esc(msg)}</div>`,
    buttons: [
      { label: '取消', value: false },
      { label: '确定', primary: true, value: true }
    ]
  })
}

/**
 * 输入弹窗（替代 prompt）
 */
export function showPrompt(msg, defaultValue = '') {
  return createDialog({
    title: '输入',
    width: '420px',
    focusSelector: '#modal-prompt-input',
    renderBody: ({ h, onInput }) => h('div', [
      h('div', { style: 'margin-bottom:8px' }, msg),
      h('input', {
        id: 'modal-prompt-input',
        class: 'my-input',
        attrs: { value: defaultValue },
        style: 'width:100%',
        onInput: (e) => onInput(e.target.value)
      })
    ]),
    buttons: [
      { label: '取消', returnNull: true },
      { label: '确定', primary: true, getValue: (val) => val || '' }
    ]
  })
}

/**
 * 添加属性弹窗
 */
export function showObjectAddDialog(msg = '请输入新属性名', showKey = true, showType = true) {
  return createDialog({
    title: showKey ? '添加属性' : '添加数组元素',
    width: '420px',
    focusSelector: showKey ? '#modal-obj-key' : '#modal-obj-type',
    renderBody: ({ h, onInput, onSelect }) => h('div', [
      h('div', { style: 'margin-bottom:8px' }, msg),
      showKey ? h('input', {
        id: 'modal-obj-key',
        class: 'my-input',
        attrs: { value: 'new_key' },
        style: 'width:100%;margin-bottom:6px',
        placeholder: '属性名',
        onInput: (e) => onInput(e.target.value)
      }) : null,
      showType ? h('select', {
        id: 'modal-obj-type',
        class: 'my-input-sm',
        style: 'width:100%',
        onChange: (e) => onSelect(e.target.value)
      }, [
        h('option', { value: 'string' }, '字符串 ""'),
        h('option', { value: 'number' }, '数字 0'),
        h('option', { value: 'array' }, '空数组 []'),
        h('option', { value: 'object' }, '空对象 {}')
      ]) : null
    ]),
    buttons: [
      { label: '取消', returnNull: true },
      {
        label: '确定', primary: true,
        getValue: (key, type) => (showKey && !key) ? null : { key, type }
      }
    ]
  })
}
