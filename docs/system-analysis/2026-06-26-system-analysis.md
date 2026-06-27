# 系统分析文档：JSON 通用编辑器

> 版本: 1.0  
> 日期: 2026-06-26  
> 范围: 全系统架构、模块职责、数据流、配置系统、已知问题

---

## 1. 架构总览

### 1.1 分层设计

系统采用严格的分层架构，**logic 层不依赖 UI 层**，UI 层只通过 barrel.js 暴露的接口与 logic 层通信。

```
┌─────────────────────────────────────────────────────┐
│                    UI 视图层                          │
│  ui-init.js  ui-storyTree.js  ui-editorForm.js      │
│  ui-chapterView.js  ui-settingsPanel.js  ...        │
│  ui-createDialog.js  ui-modalDialog.js              │
├─────────────────────────────────────────────────────┤
│                   barrel.js (导出中枢)               │
├──────────────────┬──────────────────────────────────┤
│  Logic 数据层     │  外部依赖                        │
│  logic-storyTypes │  highlight.js (语法高亮)         │
│  logic-storyStore │  FiraCode / 仓耳与墨字体         │
│  logic-storyIO   │  localStorage（持久化）           │
└──────────────────┴──────────────────────────────────┘
```

### 1.2 依赖方向

```
main.js
  └─ barrel.js
       ├─ logic-storyTypes.js  ← 零依赖（纯工具函数）
       ├─ logic-storyStore.js  ← 依赖 logic-storyTypes
       ├─ logic-storyIO.js     ← 零依赖
       ├─ ui-init.js           ← 依赖全部 logic + 各 UI 模块
       ├─ ui-storyTree.js      ← 零依赖（纯 DOM 操作）
       ├─ ui-editorForm.js     ← 依赖 logic-storyTypes + store
       ├─ ui-chapterView.js    ← 依赖 logic-storyTypes + store
       ├─ ui-createDialog.js   ← 依赖 logic-storyTypes
       ├─ ui-storyTemplateUI.js← 依赖 logic-storyTypes + store
       ├─ ui-labelManager.js   ← 依赖 logic-storyTypes + store
       ├─ ui-settingsPanel.js  ← 依赖 logic-storyTypes + store + ui-modalDialog
       └─ ui-modalDialog.js    ← 零依赖（纯 DOM 操作）
```

### 1.3 数据流

```
用户操作 → store._emit() → onChange 监听器 → renderAll()
                                                  ├─ renderTreeNode
                                                  ├─ renderEditor
                                                  ├─ renderChapterView
                                                  └─ renderJSONPreview
```

所有数据变更走 **单向流**：用户操作 → store 方法修改数据 → `_emit()` 通知 → 各渲染函数重绘。

---

## 2. 核心数据结构

### 2.1 Chapter（章节/根对象）

编辑器以"章节"作为顶层数据单元，实际是任意 JSON 对象。

```typescript
interface Chapter {
  meta?: {            // 元数据
    name: string      // 章节名，默认 "Untitled"
    author?: string
    description?: string
  }
  content?: Node[]    // 对话节点数组（剧情编辑器遗留概念）
  // 任意其他字段...
  [key: string]: unknown
}
```

### 2.2 Node（节点）

对话节点的默认结构（由模板定义）：

```typescript
interface Node {
  id: string                     // 唯一标识符
  speaker?: I18nText             // 说话人（多语言）
  text?: I18nText               // 对话文本（多语言）
  headimage?: string            // 头像
  room?: string                 // 场景
  bgm?: string                  // 背景音乐
  next?: string                 // 跳转目标 ID
  transition?: string           // 转场效果
  fx?: string                   // 特效
  cg?: string                   // CG 图片
  voice?: string                // 语音
  dialog?: string               // 对话模式
  animation?: string            // 动画
  loop?: string                 // 循环
  goNext?: string               // 自动跳转
  indenpent?: string            // 独立节点标记
  signal?: string               // 信号
  roomHotspot?: string          // 场景热点
  options?: Option[]            // 选项分支
  [key: string]: unknown        // 可扩展
}
```

### 2.3 I18nText（多语言文本）

```typescript
interface I18nText {
  zh: string    // 中文
  en: string    // 英文
  // 可动态扩展更多语言
  [lang: string]: string
}
```

由结构类型系统中的 `i18n` 类型定义，默认字段为 `['zh', 'en']`，可在设置面板新增语言。

### 2.4 Option（选项分支）

```typescript
interface Option {
  text: I18nText      // 选项文本
  next?: string       // 跳转 ID
  showif?: Record<string, unknown>  // 显示条件
  actions?: Action[]  // 动作命令列表
}
```

### 2.5 Action（动作命令）

```typescript
interface Action {
  cmd: string           // 命令名称
  params: unknown[]     // 参数列表
}
```

---

## 3. Logic 层详解

### 3.1 logic-storyTypes.js

**职责**：数据模型定义、模板管理、结构类型系统、标签管理、工具函数。

**核心导出函数：**

| 函数 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `createChapter(name)` | `string` | `Chapter` | 从配置创建新章节对象 |
| `createBlankChapter(name)` | `string` | `{}` | 创建空白对象 |
| `createNodeFromTemplate(ctx, id)` | `string`, `string` | `Node` | 按上下文模板创建节点 |
| `createOption(text, next)` | `I18nText`, `string` | `Option` | 创建选项对象 |
| `loadContentConfig()` | 无 | `Promise` | 异步加载 config/template-content.json |
| `loadTemplates()` | 无 | `Object` | 从 localStorage 读取模板（与默认合并） |
| `loadEffectiveTemplates()` | 无 | `Object` | 读取有效模板（排除已删除项） |
| `saveTemplates(tpls, deleted)` | `Object`, `string[]` | 无 | 保存模板到 localStorage |
| `saveTemplate(ctx, tpl)` | `string`, `Object` | 无 | 保存单个上下文模板 |
| `loadTemplateKeys()` | 无 | `Object` | 读取模板键名模式 |
| `saveTemplateKeys(keys)` | `Object` | 无 | 保存模板键名模式 |
| `resolveTemplateContext(path)` | `string[]` | `string` | 根据路径匹配上下文 |
| `getContextsConfig()` | 无 | `Object` | 获取所有上下文配置 |
| `getContextKeys()` | 无 | `string[]` | 获取上下文键名列表 |
| `loadStructs()` | 无 | `StructDef[]` | 加载结构类型定义 |
| `saveStructs(structs)` | `StructDef[]` | 无 | 保存结构类型定义 |
| `syncStruct(obj, structDef)` | `Object`, `StructDef` | 无 | 为匹配对象补齐字段 |
| `syncAllStructs(obj)` | `Object` | 无 | 为所有结构类型补齐字段 |
| `findMatchingValues(obj, def)` | `Object`, `StructDef` | `{path, value}[]` | 查找所有匹配的结构 |
| `addStructField(id, field, chapter)` | `string`, `string`, `Object` | 无 | 添加结构字段并同步 |
| `removeStructField(id, field, chapter)` | `string`, `string`, `Object` | 无 | 删除结构字段 |
| `deleteStruct(id, chapter)` | `string`, `Object` | 无 | 删除整个结构类型 |
| `getLanguages()` | 无 | `string[]` | 获取语言列表 |
| `saveLanguages(langs)` | `string[]` | 无 | 保存语言列表 |
| `addLanguage(lang, chapter)` | `string`, `Object` | 无 | 添加语言并同步 |
| `getFieldLabel(key)` | `string` | `string` | 获取字段显示别名 |
| `saveLabel(key, label)` | `string`, `string` | 无 | 保存字段别名 |
| `isEmpty(val)` | `any` | `boolean` | 判断空值 |

**结构类型系统（Struct System）：**

三种匹配方式：
- **struct**：检测对象是否含有指定 marker 键
- **glob**：键名通配匹配（支持 `**`、`*`）
- **path**：路径通配匹配

**持久化键：**
- `storyeditor_templates` — 模板数据
- `storyeditor_deleted_templates` — 已删除模板列表
- `storyeditor_template_keys` — 模板键名模式
- `storyeditor_structs` — 结构类型定义
- `storyeditor_labels` — 字段别名

### 3.2 logic-storyStore.js

**职责**：数据 CRUD 管理、路径导航、导出、状态通知。

**类 StoryStore：**

| 方法 | 参数 | 说明 |
|------|------|------|
| `loadChapter(json)` | `Object` | 加载 JSON 数据（规范化 + 结构补齐） |
| `newChapter(json)` | `Object` | 替换当前数据（无规范化） |
| `addNode(ctx, path)` | `string`, `string[]` | 在路径下用模板新建内容 |
| `duplicateNode(id)` | `string` | 复制节点 |
| `deleteNode(id)` | `string` | 删除节点 |
| `updateNode(id, patch)` | `string`, `Object` | 更新节点字段 |
| `updateNodeField(id, field, zh, en)` | `string`, `string`, `string`, `string` | 更新多语言字段 |
| `moveNode(from, to)` | `number`, `number` | 移动节点位置 |
| `addOption(nodeId)` | `string` | 添加选项 |
| `addAction(nodeId, optIdx)` | `string`, `number` | 添加动作 |
| `selectNode(id)` | `string` | 选中节点 |
| `selectPath(path)` | `string[]` | 选中路径 |
| `getByPath(path)` | `string[]` | 按路径取值 |
| `setByPath(path, value)` | `string[]`, `any` | 按路径设值 |
| `deleteAt(path)` | `string[]` | 按路径删除 |
| `addObjectProperty(path, key, val)` | `string[]`, `string`, `any` | 给对象添加属性 |
| `addArrayItem(path)` | `string[]` | 给数组添加元素 |
| `toCleanJSON()` | 无 | 导出清洗后的 JSON（移除空值） |
| `getFilteredNodes()` | 无 | 获取过滤后的节点列表 |
| `_emit()` | 无 | 触发变更通知 |

**状态属性：**

| 属性 | 类型 | 说明 |
|------|------|------|
| `chapter` | `Object` | 当前编辑的 JSON 数据 |
| `currentPath` | `string[]` | 当前选中路径 |
| `selectedId` | `string\|null` | 选中节点 ID |
| `filters` | `Record<string, string>` | 搜索过滤条件 |
| `_dataVersion` | `number` | 数据版本号（用于渲染优化） |

**核心算法（_normalizeNode）：**

加载 JSON 时遍历 `content` 数组，对每个节点：
1. 用 content 模板填充默认字段
2. 将 `speaker` 和 `text` 从字符串升级为多语言对象
3. 遍历 options 做相同处理
4. 同步所有结构类型定义的缺失字段

**导出清洗（toCleanJSON）：**

递归遍历数据树，移除所有空字符串、null、undefined 值以及空对象/空数组，仅保留有效数据。

### 3.3 logic-storyIO.js

**职责**：文件导入导出、拖放绑定。

| 函数 | 参数 | 说明 |
|------|------|------|
| `importJSON(file)` | `File` | 异步读取并解析 JSON 文件 |
| `exportJSON(json, filename)` | `Object`, `string` | 创建下载链接导出 JSON |
| `setupFilePicker(btn, onLoad, onError)` | `Element`, `function`, `function` | 绑定文件选择按钮 |
| `setupDropZone(el, onLoad, onError)` | `Element`, `function`, `function` | 绑定拖放区域 |

---

## 4. UI 层详解

### 4.1 ui-init.js（主入口）

**职责**：加载布局 HTML、初始化工具栏/活动栏/Tab、调度渲染、事件绑定。

**渲染调度：**

使用版本号对比，避免不必要的重复渲染：
- `_editorVersion`：当前路径 + 字段数量组合的版本号
- `_jsonTabVersion`：当前值 JSON 长度的版本号
- `_prevDataVersion`：store 数据版本号

**事件绑定清单：**

| 元素 | 事件 | 处理 |
|------|------|------|
| `#btn-import` | click | 打开文件选择器 |
| `#btn-export` | click | 导出清洗后 JSON |
| `#btn-add-node` | click | 显示新建弹窗（空白/模板） |
| `#btn-edit-template` | click | 打开模板编辑弹窗 |
| `#btn-label-manager` | click | 打开标签管理弹窗 |
| `#chapter-name` | input | 更新章节名 |
| `#tab-form/chapter/json` | click | 切换编辑模式 |
| `.activity-btn` | click | 切换侧面板视图 |
| `#tree-search` | input | 树形搜索 |
| `#json-editor` | input/blur | JSON 实时编辑 |
| `#path-editor-center` | input/blur | 中间 JSON Tab 编辑 |
| `.splitter` | mousedown | 面板拖拽调整宽度 |

### 4.2 ui-storyTree.js（树形导航）

**职责**：递归渲染 JSON 树结构，支持展开/折叠、选中高亮、搜索定位。

**模块级状态：**
- `_expandedPaths: Set<string>` — 已展开的路径集合（跨渲染保持）

**渲染策略：**
- 深度遍历：按 `renderNode → renderObject/renderArray/renderPrimitive` 分发
- 根节点默认展开，其余路径依赖 `_expandedPaths`
- 渲染前清理 `_expandedPaths` 中已不存在的路径

**操作按钮：**
- 🔍 — 将路径填充到搜索框
- ＋ — 添加子项（对象/数组节点显示）
- ✕ — 删除节点

### 4.3 ui-editorForm.js（表单编辑器）

**职责**：以表单方式展示 JSON 字段，支持行内编辑、类型标签显示、属性增删、标签改名。

**字段类型识别：**

| 条件 | 类型标签 | 渲染方式 |
|------|---------|---------|
| `'zh' in v` | i18n | 多语言输入框组 |
| `Array.isArray(v)` | arr[N] | 摘要预览 + 跳转按钮 |
| `typeof v === 'object'` | obj{N} | 摘要预览 + 跳转按钮 |
| `typeof v === 'number'` | num | 右对齐输入框 |
| `v === null/undefined` | nil | 灰色斜体输入框 |
| 其他 | str | 普通输入框 |

**选项（options）渲染：**
- 当路径为 `content/<id>` 且节点有 options 时，渲染选项编辑区
- 每个选项：多语言文本输入 + next 跳转 + actions 列表
- 支持增删选项和动作

**标签改名（双击）：**
- 双击字段名 → 替换为输入框 → 输入新键名 → 自动重命名并更新 store

### 4.4 ui-chapterView.js（章节列表视图）

**职责**：以表格形式展示数组/对象数据，支持行内编辑、列配置。

**关键能力：**
- 数组模式下按索引渲染行，对象模式下按 key 渲染行
- i18n 字段按语言拆分为多列
- 列配置可自定义（localStorage 持久化）
- 说话人生成固定颜色圆标
- 双击行跳转到完整编辑

### 4.5 ui-settingsPanel.js（设置面板）

**职责**：色彩方案、字体大小、语言管理、结构类型管理。

**功能列表：**

| 板块 | 功能 | 持久化键 |
|------|------|---------|
| 字体大小 | 滑块 12-24px | `storyeditor_settings` |
| 色彩方案 | 暗色/深海蓝/森林绿/浅色 | `storyeditor_settings` |
| 标签颜色模式 | 跟随主题/按类型着色 | `storyeditor_settings` |
| 语言管理 | 增删语言（通过结构类型） | `storyeditor_structs` |
| 结构类型管理 | CRUD、字段管理 | `storyeditor_structs` |

### 4.6 ui-modalDialog.js（通用模态框）

**职责**：替代浏览器原生弹窗，提供统一的模态组件。

**导出函数：**

| 函数 | 说明 |
|------|------|
| `showAlert(msg)` | 信息提示 |
| `showConfirm(msg)` | 确认弹窗（返回 boolean） |
| `showPrompt(msg, default)` | 输入弹窗（返回 string\|null） |
| `showObjectAddDialog()` | 添加对象属性弹窗 |
| `makeModalDraggable(modal)` | 为模态框启用拖拽 |

### 4.7 ui-storyTemplateUI.js（模板编辑弹窗）

**职责**：编辑各上下文的模板，支持字段增删、JSON 直接编辑、键名模式配置。

**编辑模式：**
- 表单模式：按字段逐行编辑，支持类型标签
- JSON 模式：带语法高亮的文本编辑器，失焦时解析同步

**未保存修改保护：** `_dirty` 标记，关闭时提示保存。

### 4.8 ui-createDialog.js（新建弹窗）

**职责**：新建章节/节点时弹出选择。

**两个入口：**
1. 新建章节弹窗：空白 JSON vs 模板创建
2. 模板选择器（showTemplatePicker）：列出可用上下文模板

---

## 5. 配置系统

### 5.1 config/template-content.json

定义默认数据结构和模板的 JSON 文件。加载失败时回退到 `logic-storyTypes.js` 中的 `HARDCODED_CONTENT` 硬编码常量。

```json
{
  "chapter": { "meta": {}, "content": [] },       // 章节默认结构
  "node": { "id": "", "speaker": {...}, ... },    // 节点默认字段
  "option": { "text": {...}, "next": "", ... },   // 选项默认字段
  "templates": { "meta": {...}, "content": {...}, "option": {...}, "action": {...}, "default": {} }
}
```

### 5.2 config/template-contexts.json

定义各模板上下文的显示名、描述和匹配规则。

```json
{
  "meta":    { "label": "元数据", "match": "meta" },
  "content": { "label": "对话",   "match": "content" },
  "option":  { "label": "选项",   "match": "content.*.options" },
  "action":  { "label": "动作",   "match": "*.actions" },
  "default": { "label": "默认",   "match": "*" }
}
```

---

## 6. 状态持久化

### localStorage 键总表

| 键 | 用途 | 数据结构 |
|---|------|---------|
| `storyeditor_settings` | 字体、主题、标签颜色模式 | `{ theme: string, fontSize: number, labelColor: 'default'\|'type' }` |
| `storyeditor_templates` | 用户自定义模板 | `{ [ctx]: object }` |
| `storyeditor_deleted_templates` | 已删除模板列表 | `string[]` |
| `storyeditor_template_keys` | 模板键名模式 | `{ [ctx]: string }` |
| `storyeditor_structs` | 结构类型定义 | `StructDef[]` |
| `storyeditor_labels` | 字段显示别名 | `{ [fieldKey]: string }` |
| `storyeditor_chapter_cols` | 章节列表列配置 | `string[]` |

### 颜色主题预设

| 主题 ID | 显示名 | 特点 |
|---------|--------|------|
| dark | 暗色默认 | 深蓝紫背景，红色强调 |
| ocean | 深海蓝 | 深蓝背景，蓝色强调 |
| forest | 森林绿 | 深绿背景，绿色强调 |
| light | 浅色 | 白色背景，红色强调 |

---

## 7. 当前已知问题

### 7.1 架构问题

| 问题 | 描述 | 影响 |
|------|------|------|
| **content 硬编码** | `store.chapter.content` 在整个代码中出现十余处，与"通用 JSON 编辑器"定位矛盾 | 影响非对话数据的编辑流程 |
| **模板上下文名称偏游戏** | meta/content/option/action 等命名来自游戏剧情场景 | 通用场景下用户难以理解 |
| **addNode 默认路径** | 底部按钮的 "新建" 依赖模板选择器，未选模板时静默失败 | 用户体验割裂 |
| `_normalizeNode` **假设 speaker/text 结构** | 强绑定 i18n 多语言结构 | 非对话 JSON 会被意外改写 |
| `createBlankChapter()` **返回 `{}` 有副作用** | 空对象无法在 content 路径新建节点，用户迷惑 |

### 7.2 性能问题

| 问题 | 描述 | 影响 |
|------|------|------|
| **全量重渲染** | 任何数据变更都触发树形面板、表单编辑器、JSON 预览的完整重建 | 大 JSON 文件（>500 节点）有明显卡顿 |
| **无虚拟滚动** | 树形面板和章节列表都是全量渲染 | 同上 |
| **JSON 预览全量重绘** | 每次变更都重新序列化 + 高亮整个数据 | 大文件时的冗余计算 |

### 7.3 工程问题

| 问题 | 描述 |
|------|------|
| **命名不一致** | 文件名用 `logic-` 和 `ui-` 前缀，但函数名和变量名中英文混搭 |
| **模板与上下文概念重叠** | `config/template-content.json` 和 `config/template-contexts.json` 职责边界模糊 |
| **版本号 / 迁移机制缺失** | localStorage 数据无版本号，无法处理向前兼容 |
| **统计面板未实现** | `data-view="stats"` 挂载了但无实际内容 |

---

## 8. 数据流图

```
[用户操作]
    │
    ├─ 工具栏按钮 → io.setupFilePicker / io.exportJSON / showCreateDialog
    │
    ├─ 树形面板点击 → store.selectPath → _emit()
    │
    ├─ 表单编辑 → Object.assign(node, patch) → _emit()
    │
    ├─ JSON 编辑 → store.setByPath → _emit()
    │
    └─ 设置面板 → localStorage.setItem / applySettings → 直接修改 CSS 变量
                        │
                        ▼
                 store._emit()
                        │
                        ▼
              onChange 监听器（ui-init 注册）
                        │
                        ▼
                  renderAll(store)
                    ├─ renderTreePanel → 重建树形 DOM
                    ├─ renderEditor → 重建表单 DOM
                    ├─ updateJSONTabContent → 更新中间 JSON
                    ├─ renderJSONPreview → 更新右侧预览
                    └─ navigateJSONToPath → 滚动到当前位置
```
