# StoryEditor 剧情对话编辑器

可视化编辑 JSON 格式对话剧本，支持多语言、树形导航、实时预览，专为游戏剧情设计。

## 功能

- **结构类型系统** — 支持三种匹配方式（属性检测 struct / 键名通配 glob / 路径匹配 path），自动为匹配对象补齐缺失字段，统一管理多语言等结构化数据
- **树形导航** — 从 JSON 根节点逐层展开，点击任意路径直接定位编辑，支持搜索筛选
- **双模式编辑** — 表单模式（按字段拆分多语言输入框）和 JSON 模式（带语法高亮的镜像编辑器），Tab 切换
- **多语言支持** — 通过结构类型系统动态管理语言字段，添加新语言后自动补充到所有匹配对象
- **章节列表视图** — 表格化展示对话数组，支持列配置、行内快速编辑，i18n 字段按语言自动展开
- **选项系统** — 可视化编辑选项分支，支持 actions（命令 + 参数）
- **节点模板** — 按上下文（content / option / action 等）独立模板，自由定制字段，新建节点自动套用
- **实时 JSON 预览** — 右侧面板实时同步高亮显示，支持格式化、语法校验
- **路径定位** — 点击树节点，预览面板自动滚动并选中对应值区域
- **搜索筛选** — 树形面板搜索过滤，支持一键清空
- **动态表单** — 对象属性自动遍历，嵌套值摘要 + 跳转
- **属性管理** — 表单内直接新增 / 删除属性，不影响原始 JSON
- **字段标签管理** — 双击字段名自定义显示别名，全局统一管理
- **色彩方案** — 内置暗色 / 深海蓝 / 森林绿 / 浅色四套主题，可保存到 localStorage
- **标签颜色模式** — 字段别名支持"跟随主题"或"按类型着色"（str 蓝 / i18n 紫 / arr 绿 / obj 橙 / num 黄 / nil 红）
- **导入 / 导出** — 导入本地 JSON 文件，导出清洗后的 JSON
- **拖放导入** — 直接将 .json 文件拖入窗口加载

## 使用

1. 在浏览器中打开 index.html（需要本地 HTTP 服务器，如 `python -m http.server 8080`）
2. 点击"导入 JSON"或直接拖入 .json 文件加载对话剧本
3. 左侧树形面板逐层展开，点击节点
4. 中间面板 Tab 切换：表单模式编辑字段 / JSON 模式直接编辑源码 / 章节列表模式
5. 右侧面板实时预览完整 JSON，支持格式化
6. 右上角 ⚙️ 设置面板管理色彩方案、字体大小、语言列表、结构类型
7. 编辑完成后点击"导出 JSON"

## 结构类型系统

结构类型（Struct System）是本编辑器的核心抽象，用于在数据树中按规则定位对象并统一维护字段。

### 匹配方式

| 方式 | 说明 | 示例 |
|:----:|:----|:-----|
| `struct` | 对象含有指定属性键（marker）即匹配 | marker=`zh` → `{ "zh": "...", "en": "..." }` |
| `glob` | 键名路径匹配 Glob 通配模式 | `**.speaker` → 任意层级的 speaker 字段 |
| `path` | 路径精确或通配匹配 | `content.*.options` |

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
StoryEditor/
├── index.html              ← HTML 入口
├── layout.html             ← 页面布局（与 JS 分离）
├── css/
│   └── style.css           ← 全部样式（CSS 变量主题系统）
├── js/
│   ├── main.js             ← 入口：启动加载 + 拖放绑定
│   ├── barrel.js           ← 统一导出中枢
│   ├── logic/              ← 纯数据层（不依赖 UI）
│   │   ├── logic-storyTypes.js   ← 数据模型、模板读写、结构类型系统
│   │   ├── logic-storyStore.js   ← 数据管理：CRUD、路径导航、导出
│   │   └── logic-storyIO.js      ← 文件导入/导出、拖放绑定
│   └── ui/                 ← 视图层（依赖 logic/）
│       ├── ui-init.js            ← 主界面初始化、树形搜索、事件绑定
│       ├── ui-storyTree.js       ← 树形导航面板
│       ├── ui-editorForm.js      ← 表单编辑器（中栏表单模式）
│       ├── ui-chapterView.js     ← 章节列表视图（数组行内编辑）
│       ├── ui-createDialog.js    ← 新建节点/章节弹窗
│       ├── ui-storyTemplateUI.js ← 模板编辑弹窗
│       ├── ui-labelManager.js    ← 字段标签管理弹窗
│       ├── ui-settingsPanel.js   ← 设置面板（色彩方案、字体、结构类型管理）
│       └── ui-modalDialog.js     ← 通用模态组件（弹窗、确认、提示）
├── config/
│   ├── template-content.json     ← 空白章节/节点/选项结构 + 默认模板
│   └── template-contexts.json    ← 模板上下文配置
├── fonts/                       ← 字体文件（仓耳与墨 W04 + FiraCode）
├── lib/
│   └── highlight.min.js          ← JSON 语法高亮
├── LICENSE                       ← Mulan PSL v2
├── README.md
└── PROJECT_HANDOVER.md
```

## 依赖层级

```
main.js → barrel.js → logic/    ← 纯数据，不依赖 UI
                     → ui/       ← 依赖 logic/，不反向依赖
- logic/ 层：纯数据模型、CRUD 操作、结构类型系统、文件 IO
- ui/ 层：界面渲染、事件绑定、交互反馈
- barrel.js：唯一同时引用 logic/ 和 ui/ 的中转文件
```

## 持久化存储（localStorage）

| Key | 用途 |
|-----|------|
| `storyeditor_templates` | 用户自定义模板字段（覆盖默认） |
| `storyeditor_deleted_templates` | 已删除的默认模板键名列表 |
| `storyeditor_template_keys` | 模板自动增长键名配置 |
| `storyeditor_labels` | 字段显示别名 |
| `storyeditor_settings` | 色彩方案、字体大小、标签颜色模式 |
| `storyeditor_chapter_cols` | 章节视图的列配置 |
| `storyeditor_structs` | 结构类型定义（匹配规则 + 字段列表） |

## 技术栈

- 原生 JavaScript (ES Module)
- Highlight.js — JSON 语法高亮
- 纯 CSS — CSS 变量主题系统、flex/grid 布局、可拖拽分栏
- localStorage — 模板、标签、结构类型、设置持久化

## 许可

[Mulan PSL v2](https://license.coscl.org.cn/MulanPSL2)
