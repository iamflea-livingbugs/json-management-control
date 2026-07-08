/**
 * useObjectAdd.js — 添加属性弹窗组合式函数
 *
 * 封装 showObjectAddDialog 的完整流程：
 * 弹窗输入 → 重名检测 → 写入 Pinia
 *
 * 供 ChapterView 和 OutlineView 共用
 */

import { showObjectAddDialog, showAlert } from '../base/useDialog.js'

/**
 * 弹出添加属性对话框
 *
 * @param {import('../../stores/storyStore.js').useStoryStore} storyStore - Pinia Store 实例
 * @param {string|string[]} parentPath - 父对象的路径
 * @param {Object} [options] - 配置选项
 * @param {Object} [options.templates] - 可选模板字典，用于匹配模板键名
 * @param {boolean} [options.isArrayItem=false] - 是否为数组模式（无 key）
 * @returns {Promise<boolean>} 是否成功添加
 */
export async function useObjectAdd(storyStore, parentPath, options = {}) {
  const { templates, isArrayItem = false } = options

  const result = await showObjectAddDialog(
    isArrayItem ? '选择要添加的元素类型' : '请输入新属性名',
    !isArrayItem,    // showKey：数组模式不显示 key 输入
    true             // showType：两种模式都显示类型选择
  )
  if (!result) return false

  if (isArrayItem) {
    // 数组模式：直接按类型添加元素
    const defaultValue = result.type === 'number'
      ? 0
      : result.type === 'array'
        ? []
        : result.type === 'object'
          ? {}
          : ''
    // 取当前路径的父对象
    const parent = storyStore.getByPath(parentPath)
    if (Array.isArray(parent)) {
      const idx = parent.length
      storyStore.setByPath([...parentPath, String(idx)], defaultValue)
    }
    return true
  }

  // ===== 对象模式 =====
  if (!result.key) return false

  // 获取父对象
  const parent = storyStore.getByPath(parentPath)

  // 检查属性是否已存在
  if (parent && typeof parent === 'object' && result.key in parent) {
    await showAlert('属性 "' + result.key + '" 已存在，请使用其他名称')
    return false
  }

  // 检查是否匹配模板键名
  if (templates && result.key in templates) {
    const templateValue = JSON.parse(JSON.stringify(templates[result.key]))
    delete templateValue.id
    storyStore.addObjectProperty(parentPath, result.key, templateValue)
    return true
  }

  // 根据类型生成默认值
  const defaultValue = result.type === 'number'
    ? 0
    : result.type === 'array'
      ? []
      : result.type === 'object'
        ? {}
        : ''

  // 写入数据
  storyStore.addObjectProperty(parentPath, result.key, defaultValue)
  return true
}
