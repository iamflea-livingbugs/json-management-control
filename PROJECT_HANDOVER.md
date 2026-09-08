# json-management-control 项目交接文档

## 基本信息
- **项目位置**：`D:\_Program\MyOpenSource\json-management-control`
- **项目类型**：通用 JSON 管理编辑工具（支持结构化数据编辑、多语言、树形导航）
- **许可协议**：Mulan PSL v2

## 启动方式
```bash
cd "D:\_Program\MyOpenSource\json-management-control"
npx vite          # 开发服务器，默认 http://localhost:5173
```
需要 Node.js 18+。Vite 自动处理热更新（HMR），修改代码后页面自动刷新。

---

## 项目结构

```
json-management-control/
├── index.html              ← HTML 入口（Vue 挂载点）
├── vite.config.js          ← Vite 配置
├── vitest.config.js        ← 测试配置
├── jsconfig.json           ← JS 路径/语法配置
├── package.json
├── css/
│   └── style.css           ← 全部样式（CSS 变量主题系统）
├── components/             ← Vue 组件
│   ├── App.vue             ← 根组件，渲染整个布局
│   ├── base/               ← 基础 UI 组件（不涉及业务逻辑）
│   │   ├── Modal.vue       ← 通用模态框
│   │   ├── ConfirmDialog.vue ← 确认对话框
│   │   ├── AppButton.vue   ← 通用按钮
│   │   └── useDialog.js    ← 弹窗组合式函数（createApp 动态方式）
│   ├── base_reusable/      ← 可复用组件（基于 base，有业务逻辑）
│   │   ├── useObjectAdd.js ← 添加属性统一组合式函数
│   │   ├── useCreateDialog.js ← 新建 JSON 弹窗 + 模板选择器
│   │   ├── TemplateTree.vue   ← 模板树形选择
│   │   ├── TemplateDetail.vue ← 模板字段明细
│   │   ├── TemplatePicker.vue ← 模板选择器
│   │   ├── TemplateEditor.vue ← 模板编辑弹窗（Vue 化完成）
│   │   ├── LabelManager.vue   ← 字段标签管理弹窗（Vue 化完成）
│   │   ├── ColumnFieldNode.vue ← 显示列配置字段树（递归，顶层勾选/子键展开查看）
│   │   └── NewStructDialog.vue ← 新建结构类型弹窗（Vue 化完成）
│   ├── layout/             ← 页面布局组件
│   │   ├── useSplitters.js ← 分隔条拖拽逻辑（composable）
│   │   ├── layout_main-area/      ← 主编辑区组件（按左中右分栏）
│   │   │   ├── L-side/     ← 左栏：大纲树
│   │   │   │   ├── ActivityBar.vue ← 活动栏
│   │   │   │   ├── OutlineView.vue ← 大纲视图
│   │   │   │   ├── StatsPanel.vue  ← 统计面板
│   │   │   │   └── TreeNode.vue    ← 树节点（递归组件）
│   │   │   ├── M-side/     ← 中栏：编辑区
│   │   │   │   ├── PanelCenter.vue  ← Tab 容器（表单/章节/JSON）
│   │   │   │   ├── FormEditor.vue   ← 表单编辑器
│   │   │   │   ├── FormField.vue    ← 表单字段（支持 i18n/复制/删除）
│   │   │   │   ├── OptionsEditor.vue← 选项编辑器
│   │   │   │   ├── ActionEditor.vue ← 动作编辑器
│   │   │   │   ├── ChapterView.vue  ← 章节列表视图（Vue 组件化完成）
│   │   │   │   └── JsonEditor.vue   ← JSON 源码编辑器
│   │   │   └── R-side/     ← 右栏：JSON 预览
│   │   │       └── PanelRight.vue   ← 右侧 JSON 预览面板
│   │   └── layout_toolbar/ ← 工具栏组件
│   │       └── AutoSaveIndicator.vue ← 自动保存状态指示
│   └── Settings/
│       └── SettingsPanel.vue ← 设置面板
├── stores/
│   ├── storyStore.js       ← Pinia 唯一数据源：数据 CRUD、路径导航、导出、变更通知
│   └── storyStore.test.js  ← store 单元测试
├── js/
│   ├── main.js             ← 入口：启动加载 + 拖放绑定 + 自动保存注册
│   ├── logic/              ← 纯数据层（不依赖 UI）
│   │   ├── logic-storyTypes.js   ← 数据模型、模板读写、结构类型系统
│   │   ├── logic-storyIO.js      ← 文件导入/导出、拖放绑定
│   │   ├── logic-autoSave.js     ← 自动保存核心逻辑（防抖 + 心跳 + 状态通知）
│   │   ├── logic-migration.js    ← localStorage 三层结构 key 定义 + 数据迁移
│   │   ├── logic-localFile.js    ← File System Access API 本地文件打开/保存（Chromium 系）
│   │   └── logic-localFile.test.js ← 本地文件读写单元测试
├── config/
│   └── template-content.json     ← 空白章节/节点/选项结构 + 默认模板
├── fonts/                       ← 字体文件（仓耳与墨 W04 + FiraCode）
├── lib/
│   └── atom-one-dark.min.css     ← 高亮主题样式
├── docs/                        ← 设计文档
│   ├── design/                   ← 功能设计文档
│   ├── system-analysis/          ← 系统分析
│   ├── architecture/             ← 架构文档
│   └── deploy-report.md          ← 部署记录
├── .github/workflows/deploy.yml ← GitHub Pages 自动部署（测试 + 构建 + 发布）
└── LICENSE                       ← Mulan PSL v2
```

### 架构概览

当前采用 **Vue 3 + Pinia 单一数据源架构**：

- **App.vue** 通过 `createApp(App).mount('#app')` 渲染整个布局，替代了原先的 layout.html
- **Pinia Store**（`stores/storyStore.js`）为应用唯一数据源，集数据 CRUD、路径导航、导出、变更通知于一身，不再依赖外部 class
- **Vue 组件** 通过 Composition API 的 `useStoryStore()` 响应式访问数据
- **原生 JS** 与 Vue 组件共用同一个 Pinia Store，通过 `onChange()` 订阅变更
- 原 `js/logic/logic-storyStore.js` 已删除，其逻辑（含 `duplicateEntry` 复制 API）全部并入 Pinia Store

数据流：
```
原生 JS / Vue 组件操作 → storyStore.xxx() → dataVersion++ / curJson 新引用 → 响应式更新 + onChange 通知
```

---

## 核心概念

### 1. 数据结构
章节 JSON 格式：
```json
{
  "meta": { "name": "章节名", "customField": "" },
  "content": [
    {
      "id": "0",
      "speaker": { "zh": "角色名", "en": "" },
      "text": { "zh": "对话文本", "en": "English" },
      "headimage": "",
      "room": "",
      "bgm": "",
      "next": "",
      "voice": "",
      "options": [
        {
          "text": { "zh": "选项", "en": "" },
          "next": "1",
          "showif": {},
          "actions": []
        }
      ]
    }
  ]
}
```

### 2. 模板系统

| 上下文 | 用途 | 匹配路径 |
|:------:|:----:|:--------:|
| meta | 章节元数据 | `meta` |
| content | 对话节点 | `content` |
| option | 选项 | `content.*.options` |
| action | 动作命令 | `*.actions` |
| default | 兜底 | `*` |

### 3. 三栏布局
- **左栏**：树形导航 + 路径搜索
- **中栏**：选中节点的表单编辑 / JSON 镜像编辑（Tab 切换）
- **右栏**：完整 JSON 高亮预览 + 实时错误校验

### 4. Vue 渐进式迁移策略

当前状态：Vue 3 统领全部界面，原生 JS 仅剩纯数据层（logic/）。

**已完成：**
- [x] `App.vue` 统领布局，通过 `createApp(App).mount('#app')` 渲染整个页面
- [x] Pinia Store（`stores/storyStore.js`）作为应用唯一数据源，集 CRUD、路径导航、导出、变更通知于一身
- [x] 布局组件：`PanelRight.vue`、`OutlineView.vue`、`TreeNode.vue`
- [x] 编辑组件：`PanelCenter.vue`、`JsonEditor.vue`、`FormEditor.vue`、`FormField.vue`、`OptionsEditor.vue`、`ActionEditor.vue`
- [x] 基础组件：`Modal.vue`、`ConfirmDialog.vue`、`useDialog.js`、`useObjectAdd.js`
- [x] 章节视图 Vue 化：`ChapterView.vue` 替代 `ui-chapterView.js`
- [x] 添加属性统一 API：大纲 / 表单 / 章节三处共用 `useObjectAdd` 组合式函数
- [x] 模板标记功能（📋 已应用模板 / 🔧 普通节点）
- [x] 清理废弃文件：`layout.html`、`ui-editorForm.js`、`ui-storyTree.js` 及全部遗留 .html 片段已删除
- [x] **组件目录重组**：按 base / base_reusable / layout (L-side/M-side/R-side) / layout_toolbar 分层归类
- [x] **复制功能共享 API**：`storyStore.duplicateEntry(path)` 统一数组/对象的复制逻辑
- [x] **声明式 Modal**：模板选择弹窗从动态 `createApp` 改为声明式 `<Modal>` 组件
- [x] **Pinia 单一数据源重构**：删除 `js/logic/logic-storyStore.js`，数据逻辑全部并入 Pinia Store，移除双数据源 sync 桥接
- [x] **交互修复**：表单双击编辑状态驱动化（FormField.vue）；根字段删除失焦自动恢复修复（PanelRight.vue）

**原生模块 Vue 化收尾（v0.09 完成）：**
- [x] 标签管理器（`LabelManager.vue` 替代 `ui-labelManager.js`）
- [x] 模板编辑器（`TemplateEditor.vue` 替代 `ui-storyTemplateUI.js`）

---

## 技术栈

| 技术 | 用途 |
|------|------|
| Vite 8 | 开发服务器 + 构建 |
| Vue 3.5 (Composition API) | UI 层渐进式迁移 |
| Pinia 3 | Vue 状态管理（应用唯一数据源） |
| Bootstrap 5 | CSS 栅格/flex 工具类（仅布局；JS 已移除） |
| Highlight.js | JSON 语法高亮（npm 包） |
| CSS 变量 | 四套主题色系统（纯 CSS，`sass` 依赖仅残留未使用） |
| Vitest 4 | 单元测试（TDD 红-绿-重构流程） |
| happy-dom | 测试用假浏览器环境 |

## 依赖包

| 包名 | 用途 |
|------|------|
| `vue` | Vue 3 运行时 |
| `pinia` | Vue 状态管理 |
| `bootstrap` | CSS 栅格/flex 工具类（仅布局，JS 已移除） |
| `sass` (dev) | 残留依赖，实际样式为纯 CSS，未使用 |
| `vitest` (dev) | 测试运行器 |
| `@vue/test-utils` (dev) | Vue 组件测试辅助 |
| `happy-dom` (dev) | 假浏览器 DOM 环境 |

---

## 重要改动记录

### v0.16 — 章节视图显示列完善 + 显示列配置树形化
- [x] **显示列功能完善**（`ChapterView.vue` + `style.css`）：
  - **响应式修复**：列配置由"读 localStorage 的无依赖 computed"改为响应式 ref，保存后列表即时刷新（原实现保存后不生效）
  - **对话框 Vue 化**：原生 `innerHTML` 拼接 → 声明式 `<Modal>`（字段别名 + 全选/清空 + 空态提示 + 草稿机制，取消丢弃）
  - **三态语义**：未配置=自动显示数据实际存在的全部字段；显式选择=只显示所选；显式清空=不显示任何列（不再写死默认 `['text']`）
  - **列表表头**：列标题行（数组模式=说话人、对象模式=属性），i18n 字段附加语言小标签与输入框对齐
  - **speaker 列纳入配置**：行标识列不再固定显示，可勾选/清空（含头像 Badge 联动）；placeholder 跟随别名而非写死"说话人"
- [x] **别名角标**：设置过字段标签的字段显示 🔖（章节列表头 + 表单字段），未设置不提供默认标签
- [x] **消除硬编码 i18n 判断**：新增 `getI18nMarker()`（读结构类型配置的 marker，默认 zh），`isI18nObj` / ChapterView / FormField / TemplateEditor 共 4 处写死 `'zh'` 的判断统一改为读配置；新增 `hasFieldLabel()`
- [x] **显示列设置树形视图**（新增 `ColumnFieldNode.vue`）：
  - 递归字段树：顶层字段 checkbox 勾选作为列；对象/数组可展开查看内部结构（数组→索引项→对象可再展开），子键仅供查看不参与勾选
  - **零语义判断**：不预设"多语言/文本"等分类，纯按值结构展示（别名 + 值摘要 `{ N 个属性 }` / `[ N 项 ]`）
  - **修复编译错误**：`v-model` 绑 prop 导致 Vue 编译报错（整页白屏），改 `:checked` + `@change` + `emit('toggle')` 由父组件维护勾选数组
- [x] **cursor 修复**：全局 `input { cursor: text }` 误伤勾选框，`.col-tree-check` 恢复手型

### v0.15 — 移除 Naive UI + 章节视图面包屑增强
- [x] **移除 naive-ui**：全站仅使用 1 个 `n-button`（AppButton 封装）+ 1 个 `n-config-provider`（设置面板主题桥接），性价比极低，整体移除
  - `main.js` 删除全量 `app.use(naive)` 注册；`AppButton.vue` 改为原生 `<button class="my-btn">`，type/size 映射到 `my-btn-primary / my-btn-success / my-btn-sm`
  - `SettingsPanel.vue` 删除 `<n-config-provider>` 包裹 + `naiveTheme` 桥接层（主题系统从 3 层降到 2 层：CSS 变量 + themes 对象）
  - `FormEditor.vue` 的 `<n-space>` ×2 替换为原生 div + flex
  - **补缺失样式**：`.my-btn-success` 此前从未定义（绿色按钮靠 naive 渲染撑起），现补进 style.css 复用 `--success` 变量
  - `package.json` 移除依赖，`npm install` 清理 20 个包；测试 35/35 通过，浏览器实测无 `.n-button` 残留
- [x] **移除 bootstrap JS 死代码**：删除 `import 'bootstrap'`（全站无 `data-bs-*` / `new bootstrap.*`），保留 CSS 栅格/flex 工具类
- [x] **章节视图面包屑增强**（`ChapterView.vue` + `style.css`）：
  - 路径 >3 段自动截断（`content → 0 → nested → …`），单段过长按字符省略
  - hover 显示完整路径气泡（半透明阴影边框）；点击复制到剪贴板
  - 复制内容用**点号分隔**（如 `content.0.nested.a`），便于直接粘贴搜索
  - 复制成功底部 toast 通知 + 面包屑短暂高亮；复制采用同步 `execCommand`（用户手势内）保证剪贴板写入，失败才回退 Clipboard API

### v0.14 — 文档对齐实际代码
- [x] **结构树补全**：补齐 `NewStructDialog.vue`、`StatsPanel.vue`、`useSplitters.js`、`TemplateTree`/`TemplateDetail`/`TemplatePicker`、测试文件、`.github/`、`docs/`、`jsconfig.json`
- [x] **删除过时项**：移除不存在的 `config/template-contexts.json`、已删的 `lib/highlight.min.js`
- [x] **技术栈对齐**：SCSS 描述修正为"残留依赖未使用"（实际样式为纯 CSS）
- [x] **待实现清单对齐**：移除已实现的"自动保存"，统一为撤销/重做、数据校验 Schema 等高优先级项

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
- [x] **工具栏 5 按钮迁入 App.vue**：新建/导入/保存/另存为/下载 由原生 `addEventListener` 改为 Vue `@click`（`onCreate/onImport/onSave/onSaveAs/onDownload`），消除 `id` 隔空握手
- [x] **文件名输入框 Vue 化**：`:value` + `@input` 响应式绑定，外部变更（导入/恢复/拖放）经 computed 自动回流
- [x] **ui-init.js 职责收缩**：仅剩分隔条 + 设置加载，`initUI()` 改无参（不再依赖 store/io）
- [x] **全局样式统一入口**：bootstrap css/js、style.css 从 ui-init.js 移入 main.js 单一引入，消除重复 import 隐患
- [x] **降级导入重写**：非 FSA 浏览器改用动态 `input[type=file]` + `importJSON`（替代原 `setupFilePicker` 绑定），并同步更新文件名

### v0.10 — File System Access API 本地文件读写
- [x] **新增 `js/logic/logic-localFile.js`**：能力检测（`isFileSystemAccessSupported`）、打开（`openLocalJsonFile`）、覆盖写回（`saveLocalJsonFile`）、另存为（`saveLocalJsonFileAs`）、会话句柄状态
- [x] **📥 导入优先 FSA**：`showOpenFilePicker` 打开本地 .json，记住句柄；文件名同步输入框 + 自动保存 + store
- [x] **💾 保存（覆盖写回）**：显式按钮，写回当前关联文件（含 `requestPermission` 处理刷新后权限回收）；无关联文件时明确提示，绝不静默
- [x] **另存为**：显式按钮，`showSaveFilePicker` 保存到新位置，成功后记住新句柄供「保存」直接写回
- [x] **⬇️ 下载恢复纯下载**：下载副本，不触碰文件关联（消除原"有句柄就静默写回"的隐式行为；按钮文案"导出 JSON"→"下载 JSON"）
- [x] **降级兼容**：Firefox/Safari 自动回落 `setupFilePicker` + `exportJSON`，原有行为不变
- [x] **测试**：新增 9 个单测（mock FileSystemHandle，覆盖能力检测/打开/写回/另存为/句柄状态），35/35 通过
- [x] **修复**：端到端验证发现 `applyFileName(store, name)` 调用漏传 store 导致文件名不更新，已修复

### v0.09 — 原生模块 Vue 化收尾
- [x] **标签管理器 Vue 化**：`LabelManager.vue` 替代 `ui-labelManager.js`，打开时从 `loadLabels()` 刷新，增删改实时保存并 `_emit()` 通知
- [x] **模板编辑器 Vue 化**：`TemplateEditor.vue` 替代 `ui-storyTemplateUI.js`，保留内存草稿 + 脏状态关闭确认 + 上下文切换 + JSON 高亮镜像
- [x] **Modal 增强**：新增 `esc-closable` prop，嵌套确认弹窗打开时置 false 抑制底层 ESC 关闭
- [x] **App.vue 声明式接入**：两个按钮改 `@click` 驱动 `v-model:visible`，移除旧 `id` 绑定
- [x] **清理**：删除 `ui-storyTemplateUI.js`、`ui-labelManager.js`、`ui-modalDialog.js`（含 `makeModalDraggable`），`ui-init.js` / `barrel.js` 移除对应导出

### v0.08 — Pinia 单一数据源重构 + 交互修复
- [x] **Pinia 唯一数据源**：删除 `js/logic/logic-storyStore.js`，数据 CRUD、路径导航、导出、变更通知全部并入 `stores/storyStore.js`
- [x] **移除双数据源 sync 桥接**：不再需要 `_emit()` → `sync()` 手动同步，原生 JS 与 Vue 组件共用同一 Pinia Store
- [x] **精简冗余方法**：移除约 14 个未使用的冗余方法，精简 store 接口（保留 `duplicateEntry` 复制 API）
- [x] **修复表单双击编辑 bug**：`FormField.vue` 由手动 DOM 替换改为 Vue 状态驱动（`editingLabel` 控制 label/input 切换），解决失焦后无法再次编辑
- [x] **修复根字段删除自动恢复 bug**：`PanelRight.vue` 根数据写入由 `loadCurJson`（触发规范化补全）改为 `setByPath([], parsed)` 直接写入

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
- [x] 历史记录

### v0.04 — Vue 渐进式迁移 + Pinia 桥接
- [x] **阶段 1：`App.vue` 替代 `layout.html`**
  - 创建 `components/App.vue`，渲染整个布局
  - `index.html` 简化为仅保留 `<div id="app">` 挂载点
  - 废弃 `layout.html` 文件
- [x] **阶段 2：Pinia Store 桥接**
  - 新建 `stores/storyStore.js`，包装原生 StoryStore
  - Vue 组件通过 `useStoryStore()` 响应式访问数据
  - 原生 store 通过 `_emit()` → `sync()` 机制同步到 Pinia
- [x] **阶段 3：核心组件 Vue 化**
  - 布局组件：`PanelRight.vue`、`OutlineView.vue`、`TreeNode.vue`
  - 编辑组件：`PanelCenter.vue`、`JsonEditor.vue`、`FormEditor.vue`、`FormField.vue`、`OptionsEditor.vue`、`ActionEditor.vue`
  - 基础组件：`Modal.vue`、`ConfirmDialog.vue`、`useDialog.js`、`useCreateDialog.js`
- [x] **模板标记**：树节点旁显示 📋/🔧 标记，区分已应用模板节点与普通节点
- [x] **阶段 4：清理废弃文件**
  - 删除 `layout.html`
  - 删除 `js/ui/ui-editorForm.js`、`js/ui/ui-storyTree.js`
  - `ui-modalDialog.js` 精简为仅保留 `makeModalDraggable`

### v0.03 — 章节列表视图 + 设置面板 Vue 化
- [x] 章节列表视图：表格化展示对话数组，支持列配置、行内快速编辑，i18n 字段按语言自动展开
- [x] 列配置持久化到 localStorage
- [x] 设置面板 Vue 组件化（`SettingsPanel.vue`）

### v0.02 — 结构类型系统
- [x] 结构类型系统：struct / glob / path 三种匹配方式
- [x] 多语言管理：动态添加语言字段
- [x] 设置面板：色彩方案、字体大小、语言列表、结构类型管理
- [x] 标签颜色模式：跟随主题 / 按类型着色
- [x] 选项系统：可视化编辑选项分支，支持 actions
- [x] 字段标签管理：双击字段名自定义显示别名

### v0.01 — 文件结构整改
- [x] 目录重构：扁平 → 三层 `logic/` / `ui/`
- [x] barrel 导出模式
- [x] HTML 分离到 `layout.html`
- [x] 配置系统 JSON 驱动

---

## 常用操作

| 操作 | 方式 |
|:----:|:----:|
| 启动开发 | `npx vite` → http://localhost:5173 |
| 导入 JSON | 工具栏「📥 导入 JSON」或拖拽文件到窗口 |
| 保存（覆盖写回） | 工具栏「💾 保存」（需先导入获得文件关联，无关联时明确提示）|
| 另存为 | 工具栏「另存为」（保存到新位置，成功后「保存」转写该文件）|
| 导出 JSON 副本 | 工具栏「⬇️ 下载 JSON」（下载副本，不影响原文件）|
| 新建空白 JSON | 工具栏「＋ 新建 JSON」|
| 编辑模板 | 工具栏「📋 编辑模板」|
| 编辑节点 | 左侧树形导航选中节点，中间表单编辑 |
| 格式化 JSON | 右侧面板「格式化」按钮 |

---

## 依赖层级

```
main.js             ← 入口：直接 import logic/ + stores/ + components，无中转层
logic/              ← 纯函数，0 依赖（数据模型、文件 IO、自动保存、数据迁移）
base/               ← 纯 UI 组件，0 业务依赖
base_reusable/      ← 依赖 base/ + logic/
components/layout/  ← Vue 页面布局组件，依赖 logic/ + base/ + base_reusable + Pinia
stores/             ← Pinia Store，应用唯一数据源（CRUD、路径导航、变更通知）
```

---

## 未来待实现的功能

### 🔴 高优先级

- **撤销 / 重做（Undo/Redo）** — 操作历史栈，支持 Ctrl+Z / Ctrl+Shift+Z
- **数据校验与 Schema 支持** — 导入 JSON Schema 进行校验，必填字段检测、类型检查、引用完整性验证

### 🟡 中优先级

- **键盘快捷键** — Ctrl+S 保存、Ctrl+F 搜索等
- **多文件管理** — 多标签页同时编辑多个 JSON 文件，支持切换和对比
- **统计面板** — 侧栏统计视图完善（节点数量、字段分布、数据类型统计）
- **自定义样式组件化** — 持续推进自定义 CSS 组件化（已移除 Naive UI，Bootstrap 仅保留栅格）
- **编辑器元数据扩展** — 允许用户将任意 JSON 属性与编辑器元数据进行双向绑定

### 🟢 低优先级

- **可视化流程图** — 图形化展示节点间引用关系
- **查找替换** — 跨整个 JSON 批量查找和替换文本内容
- **右键上下文菜单** — 树节点右键菜单（复制路径、删除节点、展开/折叠全部等）
- **剪贴板操作** — Ctrl+C 复制节点、Ctrl+V 粘贴节点、Ctrl+X 剪切节点
- **拖拽排序** — 拖拽行/节点到目标位置，支持排序和跨层级移动
