# StoryEditor — 剧情对话编辑器

可视化编辑 JSON 格式对话剧本，支持多语言、树形导航、实时预览，专为游戏剧情设计。

![预览截图](https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=dark%20theme%20JSON%20editor%20interface%20with%20three%20panels%20tree%20navigation%20form%20editor%20and%20JSON%20preview%20Chinese%20game%20dialogue%20editor&image_size=landscape_16_9)

## 功能

- **树形导航** — 从 JSON 根节点逐层展开，点击任意路径直接定位编辑
- **双模式编辑** — 表单模式（按字段拆分双语输入框）和 JSON 模式（带语法高亮的镜像编辑器），Tab 切换
- **多语言支持** — 每个文本字段内置 `{zh, en}` 双语组，实时输入
- **选项系统** — 可视化编辑选项分支，支持 actions（命令 + 参数）
- **节点模板** — content / option / action 各层级独立模板，自由定制字段，新建节点自动套用
- **实时 JSON 预览** — 右侧面板实时同步高亮显示，双击/高亮镜像编辑，支持格式化
- **路径定位** — 点击树节点，JSON 面板自动滚动并选中对应值区域
- **搜索筛选** — 按路径或键名搜索树节点，🔍 按钮一键填充路径前缀
- **动态表单** — 对象属性自动遍历，简单值→输入框，嵌套值→摘要+跳转按钮
- **属性管理** — 表单内直接新增/删除属性，不影响原始 JSON
- **导入/导出** — 导入本地 JSON 文件，导出清洗后的 JSON
- **双击改名** — 字段标签支持双击自定义名称（存 localStorage）

## 使用

1. 在浏览器中打开 `index.html`
2. 点击"导入 JSON"加载对话剧本文件
3. 左侧树形面板逐层展开，点击节点
4. 中间面板表单模式编辑字段，或切到 JSON 模式直接编辑源码
5. 右侧面板实时预览完整 JSON，支持格式化
6. 编辑完成后点击"导出 JSON"

## 技术栈

- 原生 JavaScript (ES Module)
- Highlight.js — JSON 语法高亮
- 纯 CSS — 暗色主题，flex 布局，可拖拽分栏
- localStorage — 标签别名、节点模板持久化

## 项目结构

```
StoryEditor/
├── index.html              # 入口
├── css/
│   └── style.css           # 样式
├── js/
│   ├── main.js             # 应用入口、初始化
│   ├── storyTypes.js       # 数据模型、常量、模板
│   ├── storyStore.js       # 数据管理、CRUD、筛选
│   ├── storyTree.js        # 树形导航渲染
│   ├── storyUI.js          # UI 渲染、事件绑定
│   ├── storyIO.js          # 文件导入/导出
│   └── dragDrop.js         # 拖拽排序（预留）
└── lib/
    ├── highlight.min.js
    └── atom-one-dark.min.css
```

## 许可

MIT
