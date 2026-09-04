# JSON Management Control 通用 JSON 管理编辑器

可视化编辑和管理 JSON 数据，支持多语言字段、树形结构导航、实时预览，适用于任何嵌套 JSON 的编辑场景。

## 功能一览

### 核心编辑能力

- **多视图编辑** — 表单视图（字段级拆分编辑）、JSON 视图（语法高亮源码编辑）、列表视图（表格化批量编辑），Tab 切换
- **树形结构导航** — 从 JSON 根节点逐层展开，点击任意路径直接定位编辑，支持搜索筛选
- **实时 JSON 预览** — 右侧面板实时同步高亮显示，支持格式化、语法校验
- **路径定位联动** — 点击树节点或路径标签，预览面板自动滚动并选中对应值区域

### 结构类型系统

- **三种匹配方式** — 属性检测（struct）、键名通配（glob）、路径匹配（path），自动为匹配对象补齐缺失字段
- **多语言支持** — 通过 struct 类型动态管理语言字段，添加新语言后自动补充到所有匹配对象
- **字段标记（📋/🔧）** — 树节点旁显示模板标记，快速区分已匹配模板节点与自定义属性节点

### 数据操作

- **节点模板** — 按上下文（如 content / option 等）独立模板，自由定制字段默认值，新建节点自动套用
- **属性管理** — 表单内直接新增 / 删除 / 重命名属性，数组/对象模式统一处理
- **添加属性统一 API** — 树形面板 / 表单 / 列表三处共用 `useObjectAdd` 组合式函数，含重名检测，数组模式可选类型
- **字段标签管理** — 双击字段名自定义显示别名，全局统一管理
- **导入 / 导出** — 导入本地 JSON 文件，导出清洗后的纯净 JSON
- **拖放导入** — 直接将 `.json` 文件拖入窗口加载
- **自动保存** — 定时持久化到 localStorage，刷新或崩溃后自动恢复

### 界面与主题

- **色彩方案** — 内置暗色 / 深海蓝 / 森林绿 / 浅色四套主题，可保存到 localStorage
- **标签颜色模式** — 字段别名支持"跟随主题"或"按类型着色"（str 蓝 / i18n 紫 / arr 绿 / obj 橙 / num 黄 / nil 红）
- **编辑器元数据** — 文件名、标签等编辑态元数据与 JSON 数据隔离存储，不污染数据本身

## 快速使用

1. 安装依赖：`npm install`
2. 启动开发服务器：`npx vite`（或 `npm run dev`）
3. 浏览器打开 http://localhost:5173
4. 点击"导入 JSON"或直接拖入 `.json` 文件加载数据
5. 左侧树形面板逐层展开，点击节点定位编辑
6. 中间面板 Tab 切换：表单模式编辑字段 / JSON 模式直接编辑源码 / 列表模式批量操作
7. 右侧面板实时预览完整 JSON
8. 右上角 ⚙️ 设置面板管理色彩方案、字体大小、语言列表、结构类型
9. 编辑完成后：「💾 保存」写回已打开的本地文件；「另存为」存到新位置；「⬇️ 下载 JSON」下载副本

## 结构类型系统

结构类型（Struct System）是本编辑器的核心抽象，用于在数据树中按规则定位对象并统一维护字段。

### 匹配方式

| 方式 | 说明 | 示例 |
|:----:|:----|:-----|
| `struct` | 对象含有指定属性键（marker）即匹配 | marker=`zh` → `{ "zh": "...", "en": "..." }` |
| `glob` | 键名路径匹配 Glob 通配模式 | `**.name` → 任意层级的 name 字段 |
| `path` | 路径精确或通配匹配 | `data.*.items` |

### 匹配语法（glob / path）

- `**` — 匹配零个或多个路径段
- `*` — 匹配任意一个路径段
- 字面量 — 精确匹配

### 使用场景

- **多语言文本**（内置 i18n 类型）：匹配含 `zh` 键的对象，保证 `zh`、`en` 等语言字段存在
- **自定义结构**：如标记特定类型的数据对象，统一添加额外控制字段
- **通配批量维护**：对特定路径模式下的所有对象统一补齐字段

在 ⚙️ 设置面板 → 结构类型管理中可新建、编辑、删除结构类型，实时预览匹配效果。

## 项目结构

```
json-management-control/
├── index.html              ← HTML 入口（Vue 挂载点）
├── vite.config.js          ← Vite 配置
├── package.json
├── css/
│   └── style.css           ← 全部样式（CSS 变量主题系统）
├── components/             ← Vue 组件
│   ├── App.vue             ← 根组件，渲染整个布局
│   ├── base/               ← 通用基础组件
│   │   ├── Modal.vue       ← 通用模态框
│   │   ├── ConfirmDialog.vue ← 确认对话框
│   │   ├── useDialog.js    ← 弹窗组合式函数
│   │   └── useObjectAdd.js ← 添加属性统一组合式函数
│   ├── base_reusable/      ← 可复用模板/新增组件
│   │   ├── TemplateTree.vue
│   │   ├── TemplateDetail.vue
│   │   ├── TemplatePicker.vue
│   │   ├── TemplateEditor.vue ← 模板编辑弹窗
│   │   ├── LabelManager.vue   ← 字段标签管理弹窗
│   │   └── useCreateDialog.js
│   ├── Settings/
│   │   └── SettingsPanel.vue ← 设置面板
│   └── layout/             ← 页面布局
│       ├── layout_toolbar/
│       │   └── AutoSaveIndicator.vue ← 自动保存状态指示
│       └── layout_main-area/
│           ├── L-side/     ← 左侧（活动栏 + 树形大纲）
│           │   ├── ActivityBar.vue
│           │   ├── OutlineView.vue
│           │   └── TreeNode.vue
│           ├── M-side/     ← 中间（编辑区）
│           │   ├── PanelCenter.vue
│           │   ├── JsonEditor.vue
│           │   ├── FormEditor.vue
│           │   ├── FormField.vue
│           │   ├── OptionsEditor.vue
│           │   ├── ActionEditor.vue
│           │   └── ChapterView.vue
│           └── R-side/     ← 右侧（JSON 预览）
│               └── PanelRight.vue
├── stores/
│   └── storyStore.js       ← Pinia 唯一数据源：数据 CRUD、路径导航、导出、变更通知（原 logic-storyStore.js 逻辑已并入）
├── js/
│   ├── main.js             ← 入口：启动加载 + 拖放绑定 + 自动保存注册
│   ├── logic/              ← 纯数据层（不依赖 UI）
│   │   ├── logic-storyTypes.js   ← 数据模型、模板读写、结构类型系统
│   │   ├── logic-storyIO.js      ← 文件导入/导出、拖放绑定
│   │   ├── logic-autoSave.js     ← 自动保存核心逻辑（防抖 + 心跳 + 状态通知）
│   │   ├── logic-migration.js    ← localStorage 三层结构 key 定义 + 数据迁移
│   │   └── logic-localFile.js    ← File System Access API 本地文件打开/保存（Chromium 系）
├── config/
│   └── template-content.json     ← 默认节点/选项结构 + 模板
├── fonts/                       ← 字体文件（仓耳与墨 W04 + FiraCode）
├── lib/
│   └── atom-one-dark.min.css     ← 高亮主题样式
└── LICENSE                       ← Mulan PSL v2
```

## 依赖层级

```
main.js → logic/ + stores/ + components    ← 直接 import，无中转
- logic/ 层：纯数据模型、CRUD 操作、结构类型系统、文件 IO、自动保存、数据迁移
- components/：Vue 组件，通过 Vite 编译，import logic/ 与 stores/
- stores/：Pinia Store，应用唯一数据源（数据 CRUD、路径导航、变更通知）
```

## 架构概览

当前采用 **Vue 3 + Pinia 单一数据源架构**：

- **App.vue** 渲染整个布局，替代了原先的 layout.html
- **Pinia Store**（`stores/storyStore.js`）为应用唯一数据源，集数据 CRUD、路径导航、导出、变更通知于一身
- **Vue 组件** 通过 Composition API 的 `useStoryStore()` 响应式访问数据
- **原生 JS** 与 Vue 组件共用同一个 Pinia Store，通过 `onChange()` 订阅变更通知
- 原 `js/logic/logic-storyStore.js` 已删除，其逻辑全部并入 Pinia Store

### 数据流

```
原生 JS / Vue 组件操作 → storyStore.xxx() → dataVersion++ / 新引用 → 响应式更新 + onChange 通知
```

## 持久化存储（localStorage）

| Key | 用途 |
|-----|------|
| `storyeditor_templates` | 用户自定义模板字段（覆盖默认） |
| `storyeditor_deleted_templates` | 已删除的默认模板键名列表 |
| `storyeditor_template_keys` | 模板自动增长键名配置 |
| `storyeditor_labels` | 字段显示别名 |
| `storyeditor_settings` | 色彩方案、字体大小、标签颜色模式 |
| `storyeditor_editor_meta` | 编辑器元数据（文件名等，独立于 JSON 数据） |
| `storyeditor_structs` | 结构类型定义（匹配规则 + 字段列表） |

## 技术栈

- Vite 8 — 开发服务器与构建工具
- Vue 3.5（Composition API + `<script setup>`）— UI 层
- Pinia 3 — Vue 状态管理（应用唯一数据源）
- Naive UI — 基础组件库（按钮、弹窗等）
- Bootstrap 5 — 布局与基础交互（CSS + JS 完整引入）
- Highlight.js — JSON 语法高亮（npm 包）
- 原生 JavaScript (ES Module) — 核心逻辑
- CSS 变量主题系统 — 四套色彩方案
- localStorage — 模板、标签、结构类型、设置持久化

## 改动记录

### v0.13 — 移除 barrel.js 导出中枢

- [x] **删除 `js/barrel.js`**：此前仅 main.js 一个调用方，中转无意义
- [x] **main.js 直接 import**：`useStoryStore` / `loadContentConfig` / `io` / `showAlert` 改为从源模块直接引入
- [x] **移除 store Proxy**：原 barrel.js 用 Proxy 包装 Pinia store 供原生 JS 使用（历史遗留），现改为惰性 getter `store()` 在 Pinia 就绪后调用
- [x] **依赖层级简化**：`main.js → logic/ + stores/ + components`，无中转层

### v0.12 — 彻底清空 js/ui/ 原生层

- [x] **新建结构类型弹窗 Vue 化**：新增 `components/base_reusable/NewStructDialog.vue`（替代原生 `openNewStructDialog`），含匹配方式切换 + 实时预览 + 创建同步
- [x] **分隔条迁移**：原 `ui-init.js` 的 `initSplitters` 迁为 `components/layout/useSplitters.js`（Vue composable，App.vue 挂载）
- [x] **删除 ui-init.js / ui-settingsPanel.js**：设置加载（主题应用）本就被 SettingsPanel.vue `onMounted` 覆盖，属死代码；main.js / barrel.js 清理引用
- [x] **`js/ui/` 目录删除**：原生视图层彻底移除，所有界面逻辑已全部由 Vue 组件承担

### v0.11 — 工具栏 Vue 化 + 全局样式入口统一

- [x] **工具栏 5 按钮迁入 App.vue**：新建/导入/保存/另存为/下载 改 Vue `@click`，消除 `id` 隔空握手
- [x] **文件名输入框 Vue 化**：`:value` + `@input` 响应式绑定，外部变更自动回流
- [x] **ui-init.js 职责收缩**：仅剩分隔条 + 设置加载，`initUI()` 改无参
- [x] **全局样式统一入口**：bootstrap css/js、style.css 从 ui-init.js 移入 main.js 单一引入

### v0.10 — File System Access API 本地文件读写

- [x] **新增 `js/logic/logic-localFile.js`**：能力检测、打开/保存/另存为、句柄状态管理（纯逻辑层，可单测）
- [x] **📥 导入**：优先通过 `showOpenFilePicker` 打开本地 `.json` 并记住句柄，文件名自动同步到输入框与自动保存
- [x] **💾 保存 / 另存为**：拆分为两个显式操作——「保存」覆盖写回当前关联文件（写前重新申请读写权限，解决刷新后权限回收；无关联时明确提示，不静默）；「另存为」存到新位置并记住新句柄
- [x] **⬇️ 下载恢复纯下载**：下载副本，不触碰文件关联（消除原"有句柄就静默写回"的隐式行为；按钮文案"导出 JSON"→"下载 JSON"）
- [x] **降级**：Firefox/Safari 等不支持 FSA 的浏览器自动回落传统文件选择 + 下载，不破坏原有功能
- [x] **文档真源迁移**：打开本地文件后，磁盘文件成为文档真源，localStorage 自动保存保留为崩溃兜底
- [x] 新增 9 个单元测试（35/35 通过）；端到端验证打开→文件名联动→编辑→写回全链路
- [x] **修复 bug**：端到端测试发现 `applyFileName` 调用漏传 `store` 参数导致文件名不更新，已修复

### v0.09 — 原生模块 Vue 化收尾

- [x] **模板编辑器 Vue 化**：`LabelManager.vue`、`TemplateEditor.vue` 替代 `ui-storyTemplateUI.js` / `ui-labelManager.js`，由 App.vue 通过 `v-model:visible` 声明式控制
- [x] **Modal 增强**：新增 `esc-closable` prop，模板编辑器在嵌套确认弹窗打开时抑制 ESC，避免底层弹窗误关
- [x] **清理**：删除 `ui-storyTemplateUI.js`、`ui-labelManager.js`、`ui-modalDialog.js`（含 `makeModalDraggable`），`ui-init.js` / `barrel.js` 移除旧绑定
- [x] 行为保持一致：标签管理（实时保存）、模板编辑（内存草稿 + 脏状态关闭确认 + 上下文切换 + JSON 高亮镜像）

### v0.08.1 (代码清理 + 文档对齐)

- [x] 删除死代码：`js/ui/ui-chapterView.js`（旧版原生章节视图，已被 `ChapterView.vue` 替代）、`lib/highlight.min.js`（已被 npm 包替代）
- [x] 移除 `barrel.js` 中无引用的 `renderCurJsonView` 导出
- [x] README 结构树、技术栈与实际代码对齐（删除不存在的 `config/template-contexts.json`、SCSS 描述，修正重复条目）

### v0.08 (Pinia 单一数据源重构 + 交互修复)

**Pinia 唯一数据源**
- 删除 `js/logic/logic-storyStore.js`，数据 CRUD、路径导航、导出、变更通知全部并入 `stores/storyStore.js`
- 移除 `logic-storyStore` 与 Pinia 双数据源间的 `sync()` 桥接机制，消除手动同步
- 原生 JS 与 Vue 组件共用同一个 Pinia Store，通过 `onChange()` 订阅变更
- 移除约 14 个未使用的冗余方法，精简 store 接口

**交互 bug 修复**
- 修复表单行双击编辑失焦后无法再次编辑：`FormField.vue` 由手动 DOM 替换改为 Vue 状态驱动（`editingLabel` 控制 label/input 切换）
- 修复删除根级别字段（meta/content）后 JSON 编辑器失焦自动恢复：`PanelRight.vue` 根数据写入由 `loadCurJson`（触发规范化补全）改为 `setByPath([], parsed)` 直接写入

### v0.07 — 组件目录结构化 + 共享复制 API + 测试框架
- [x] **组件目录重组**：按 HTML 物理布局将组件归入 base / base_reusable / layout/L-side / layout/M-side / layout/R-side / layout_toolbar
- [x] **复制功能共享 API**：`storyStore.duplicateEntry(path)` 统一数组 push 和对象键名生成，ChapterView 和 FormField 共用
- [x] **Vitest 测试框架搭建**：引入 vitest + happy-dom，配置 `vitest.config.js`
- [x] **纯逻辑层 TDD**：为 `duplicateEntry` 编写 8 个单元测试（数组/对象/键名递增/深拷贝隔离/边界情况），先红后绿
- [x] **声明式 Modal 替代动态 createApp**：模板选择弹窗改为 `<Modal>` 声明式组件，使用 `v-for` / `v-model`
- [x] **清理死代码**：删除 `addEntry` 函数和未使用 import
- [x] **修复事件冒泡 bug**：复制按钮 `@click.stop` + `@dblclick.stop` 防止触发 `dblclick` 切到表单 Tab

### v0.06 — 章节视图 Vue 化 + Bootstrap 完整引入 + 添加属性统一 API
- [x] 章节列表视图（`ChapterView.vue`）Vue 组件化，替代原生 `ui-chapterView.js`
- [x] 列配置弹窗：选择可见字段，持久化到 localStorage
- [x] 复制行功能：深拷贝节点（含子结构），自动生成新 id 或键名
- [x] 新增条目弹窗：模板选择 + 基础类型选择（对象/字符串/数字/数组）
- [x] 自定义属性统一 API：大纲 / 表单 / 章节三处共用 `useObjectAdd` 组合式函数
- [x] 重名检测、数组模式可选类型、模板匹配
- [x] Bootstrap 5 完整引入（CSS + JS），替换 grid-only 导入
- [x] 项目自定义 CSS 类名加 `my-` 前缀，与 Bootstrap 隔离
- [x] 清理全部遗留 .html 片段
- [x] 修复弹窗 Enter 键确认（Teleport 导致的查找范围问题）
- [x] 修复表单视图及时刷新（`currentValue` 依赖 `renderKey` 强制重算）

### v0.05 — 自动保存 + localStorage 三层结构整理
- [x] 自动保存：防抖 10s + 心跳兜底 60s，状态通知（idle/saving/saved/error）
- [x] localStorage 数据迁移：`logic-migration.js` 定义三层结构 key（config/schema/document）并迁移旧 key
- [x] 编辑器元数据（文件名等）独立存储，不污染 JSON 数据

### v0.04 (Vue 渐进式迁移完成)

**阶段 1：App.vue 替代 layout.html**
- 创建 `components/App.vue`，渲染整个布局
- `index.html` 简化为仅保留 `<div id="app">` 挂载点
- 废弃 `layout.html` 文件

**阶段 2：Pinia Store 桥接**
- 新建 `stores/storyStore.js`，包装原生 StoryStore
- Vue 组件通过 `useStoryStore()` 响应式访问数据
- 原生 store 通过 `_emit()` → `sync()` 机制同步到 Pinia

**阶段 3：核心组件 Vue 化**
- 布局组件：`PanelRight.vue`、`OutlineView.vue`、`TreeNode.vue`
- 编辑组件：`PanelCenter.vue`、`JsonEditor.vue`、`FormEditor.vue`、`FormField.vue`、`OptionsEditor.vue`、`ActionEditor.vue`
- 基础组件：`Modal.vue`、`ConfirmDialog.vue`、`useDialog.js`、`useCreateDialog.js`

**阶段 4：清理废弃文件**
- 删除 `layout.html`
- 删除 `js/ui/ui-editorForm.js`、`js/ui/ui-storyTree.js`
- `ui-modalDialog.js` 精简为仅保留 `makeModalDraggable`

### v0.03

- 章节列表视图：表格化展示对话数组，支持列配置、行内快速编辑，i18n 字段按语言自动展开
- 列配置持久化到 localStorage
- 设置面板 Vue 组件化

### v0.02

- 结构类型系统：struct / glob / path 三种匹配方式
- 多语言管理：动态添加语言字段
- 设置面板：色彩方案、字体大小、语言列表、结构类型管理
- 标签颜色模式：跟随主题 / 按类型着色
- 选项系统：可视化编辑选项分支，支持 actions
- 字段标签管理：双击字段名自定义显示别名

### v0.01

- 初始版本：导入 / 导出 JSON
- 树形导航：从根节点逐层展开
- 双模式编辑：表单模式 + JSON 模式
- 实时 JSON 预览
- 节点模板：按上下文独立模板
- 四套色彩方案

## 未来待实现的功能

### 🔴 高优先级

- **撤销 / 重做（Undo/Redo）** — 操作历史栈，支持 Ctrl+Z / Ctrl+Shift+Z，任何编辑操作可逆
- **数据校验与 Schema 支持** — 导入 JSON Schema 进行校验，必填字段检测、类型检查、引用完整性验证

### 🟡 中优先级

- **键盘快捷键** — Ctrl+S 导出、Ctrl+F 搜索、Delete 删除节点、Ctrl+N 新建节点等
- **多文件管理** — 多标签页同时编辑多个 JSON 文件，支持切换和对比
- **统计面板** — 侧栏统计视图，展示节点数量、字段分布、数据类型统计等
- **自定义样式组件化** — 用 Bootstrap / Naive UI 组件逐步替换自定义 CSS（按钮、弹窗、表单控件等）
- **编辑器元数据扩展** — 允许用户将任意 JSON 属性与编辑器元数据进行双向绑定

### 🟢 低优先级

- **可视化流程图** — 图形化展示节点间引用关系，适合有向无环图结构
- **查找替换** — 跨整个 JSON 批量查找和替换文本内容
- **右键上下文菜单** — 树节点右键菜单（复制路径、删除节点、展开/折叠全部等）
- **剪贴板操作** — Ctrl+C 复制节点、Ctrl+V 粘贴节点、Ctrl+X 剪切节点
- **拖拽排序** — 拖拽行/节点到目标位置，支持排序和跨层级移动

## 许可

[Mulan PSL v2](https://license.coscl.org.cn/MulanPSL2)
