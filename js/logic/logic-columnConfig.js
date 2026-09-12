/**
 * logic-columnConfig.js — 章节视图「显示列」配置
 *
 * 设计背景：
 * 旧版把列勾选存成一份全局配置（storyeditor_chapter_cols = { cols, expand }），
 * 导入结构不同的 JSON 后，新数据的真实字段被隐藏、旧字段名显示成空列。
 *
 * 现改为「按字段集签名分组」存储：
 *   {
 *     version: 2,
 *     configs: {
 *       [字段签名]: { cols: string[], expand: Record<string, boolean> }
 *     }
 *   }
 * - 字段集合相同的数据共享同一份列配置
 * - 字段集合变化（新文件 / 增删字段）→ 签名不命中 → 调用方显示全部字段
 */

/** localStorage 存储键（沿用旧键，值结构升级为 v2） */
export const CHAPTER_COLS_KEY = 'storyeditor_chapter_cols'

/** 合法签名前缀：arr=数组模式（横向列）/ obj=对象模式（纵向属性行） */
const SIGNATURE_PREFIXES = ['arr:', 'obj:']

/** 判断签名是否为本版本格式（用于丢弃旧版无前缀孤儿配置） */
function hasValidSignature(key) {
  return SIGNATURE_PREFIXES.some(prefix => key.startsWith(prefix))
}

/** 字段分隔符，使用正常字段名几乎不会出现的控制字符 */
const FIELD_SEP = '\u0001'

/**
 * 由字段名列表计算字段集签名（排序去重，不含模式前缀）
 *
 * @param {string[]} fieldNames - 当前列表所有行的字段名（并集即可）
 * @returns {string} 签名字符串；空字段集返回 ''
 */
export function signatureOfFields(fieldNames) {
  return [...new Set(fieldNames)].sort().join(FIELD_SEP)
}

/**
 * 构造带模式前缀的完整签名
 * 数组模式字段是「横向列」、对象模式字段是「纵向属性行」，
 * 即使字段名集合相同（如 content 数组与 content[0] 对象）配置也不能共享
 *
 * @param {'arr'|'obj'} mode - arr=数组模式 / obj=对象模式
 * @param {string[]} fieldNames - 字段名列表
 * @returns {string} 完整签名（如 'arr:speaker\x01text'）
 */
export function buildSignature(mode, fieldNames) {
  return `${mode}:${signatureOfFields(fieldNames)}`
}

/**
 * 读取全部按签名分组的列配置
 * 仅返回带合法模式前缀的条目；旧版全局格式（{cols, expand}、string[]、无前缀签名）一律忽略，
 * 下次任意保存时这些孤儿条目会随整体覆盖写被清除
 *
 * @returns {Object<string, {cols: string[], expand: Object}>} 签名 → 配置
 */
export function loadColumnConfigs() {
  try {
    const data = JSON.parse(localStorage.getItem(CHAPTER_COLS_KEY))
    if (data && data.version === 2 && data.configs && typeof data.configs === 'object') {
      return Object.fromEntries(
        Object.entries(data.configs).filter(([key]) => hasValidSignature(key))
      )
    }
    return {}
  } catch {
    return {}
  }
}

/**
 * 保存全部列配置（整体覆盖写）
 * @param {Object<string, {cols: string[], expand: Object}>} configs - 签名 → 配置
 */
export function saveColumnConfigs(configs) {
  localStorage.setItem(CHAPTER_COLS_KEY, JSON.stringify({ version: 2, configs }))
}

/**
 * 取某字段集签名对应的列配置
 * @param {Object} configs - loadColumnConfigs() 返回的配置表
 * @param {string} signature - 完整签名（buildSignature 产物）
 * @returns {{cols: string[], expand: Object}|null} 命中时返回配置副本；未命中或空字段集返回 null
 */
export function getColumnConfig(configs, signature) {
  // 仅含模式前缀（如 'obj:'）= 字段集为空，无可配置列
  if (!signature || SIGNATURE_PREFIXES.includes(signature)) return null
  const hit = configs[signature]
  if (!hit || !Array.isArray(hit.cols)) return null
  return { cols: [...hit.cols], expand: { ...(hit.expand || {}) } }
}
