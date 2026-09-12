/**
 * logic-columnConfig.test.js — 显示列配置的字段签名与按签名存取
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  signatureOfFields,
  buildSignature,
  loadColumnConfigs,
  saveColumnConfigs,
  getColumnConfig
} from './logic-columnConfig.js'

beforeEach(() => {
  localStorage.clear()
})

describe('signatureOfFields', () => {
  it('字段顺序不同但集合相同 → 签名一致', () => {
    expect(signatureOfFields(['a', 'b'])).toBe(signatureOfFields(['b', 'a']))
  })

  it('字段集合不同 → 签名不同', () => {
    expect(signatureOfFields(['a', 'b'])).not.toBe(signatureOfFields(['a', 'c']))
  })

  it('重复字段不影响签名', () => {
    expect(signatureOfFields(['a', 'a', 'b'])).toBe(signatureOfFields(['b', 'a']))
  })

  it('空字段集 → 空字符串', () => {
    expect(signatureOfFields([])).toBe('')
  })
})

describe('buildSignature', () => {
  it('带模式前缀', () => {
    expect(buildSignature('arr', ['a'])).toBe('arr:' + signatureOfFields(['a']))
    expect(buildSignature('obj', ['a'])).toBe('obj:' + signatureOfFields(['a']))
  })

  it('同字段集不同模式 → 签名不同（防止 arr/obj 配置串用）', () => {
    expect(buildSignature('arr', ['a', 'b'])).not.toBe(buildSignature('obj', ['a', 'b']))
  })

  it('空字段集 → 仅含模式前缀', () => {
    expect(buildSignature('obj', [])).toBe('obj:')
  })
})

describe('loadColumnConfigs / saveColumnConfigs', () => {
  it('无存储 → 返回空表', () => {
    expect(loadColumnConfigs()).toEqual({})
  })

  it('保存合法前缀配置后可整体读回', () => {
    const configs = { 'arr:sigA': { cols: ['a'], expand: {} } }
    saveColumnConfigs(configs)
    expect(loadColumnConfigs()).toEqual(configs)
  })

  it('损坏 JSON → 返回空表（不抛错）', () => {
    localStorage.setItem('storyeditor_chapter_cols', '{not json')
    expect(loadColumnConfigs()).toEqual({})
  })

  it('旧版全局 {cols, expand} 格式 → 视为无配置', () => {
    localStorage.setItem(
      'storyeditor_chapter_cols',
      JSON.stringify({ cols: ['speaker'], expand: {} })
    )
    expect(loadColumnConfigs()).toEqual({})
  })

  it('旧版 string[] 格式 → 视为无配置', () => {
    localStorage.setItem('storyeditor_chapter_cols', JSON.stringify(['speaker', 'text']))
    expect(loadColumnConfigs()).toEqual({})
  })

  it('无前缀签名（v2 早期格式）→ 读取时过滤，下次保存即清除', () => {
    localStorage.setItem(
      'storyeditor_chapter_cols',
      JSON.stringify({
        version: 2,
        configs: {
          bareSig: { cols: ['x'], expand: {} },
          'arr:sigA': { cols: ['a'], expand: {} }
        }
      })
    )
    expect(loadColumnConfigs()).toEqual({ 'arr:sigA': { cols: ['a'], expand: {} } })
  })
})

describe('getColumnConfig', () => {
  it('命中签名 → 返回对应配置副本', () => {
    saveColumnConfigs({ 'arr:sigA': { cols: ['a'], expand: { a: true } } })
    expect(getColumnConfig(loadColumnConfigs(), 'arr:sigA'))
      .toEqual({ cols: ['a'], expand: { a: true } })
  })

  it('未命中签名 → null（调用方据此显示全部字段）', () => {
    expect(getColumnConfig({}, 'arr:sigX')).toBeNull()
  })

  it('空签名 / 仅模式前缀（当前列表无字段）→ null', () => {
    expect(getColumnConfig({}, '')).toBeNull()
    expect(getColumnConfig({}, 'obj:')).toBeNull()
    expect(getColumnConfig({}, 'arr:')).toBeNull()
  })

  it('返回值是副本，修改不影响存储表', () => {
    saveColumnConfigs({ 'arr:sigA': { cols: ['a'], expand: {} } })
    const got = getColumnConfig(loadColumnConfigs(), 'arr:sigA')
    got.cols.push('b')
    expect(loadColumnConfigs()['arr:sigA'].cols).toEqual(['a'])
  })
})
