# StoryEditor 项目交接文档

## 基本信息
- **项目位置**：`E:\_MyGame\_MyGame Construct\_Constcut 《幻梦奇境》\StoryEditor`
- **项目类型**：剧情对话 JSON 编辑器（纯前端，无依赖）
- **许可协议**：Mulan PSL v2

## 启动方式
```bash
cd "E:\_MyGame\_MyGame Construct_Constcut 《幻梦奇境》\StoryEditor"
python -m http.server 8080
```
访问 `http://localhost:8080/`

---

## 项目结构

| 文件/目录 | 用途 |
|-----------|------|
| `index.html` | HTML 入口 |
| `css/style.css` | 样式文件（含字体配置） |
| `js/main.js` | 入口脚本，初始化 store 和 UI |
| `js/storyStore.js` | 数据管理：加载/保存/路径操作 |
| `js/storyUI.js` | 界面渲染：树形导航、表单编辑、JSON 编辑器 |
| `js/storyTree.js` | 左侧树形结构渲染 |
| `js/storyTypes.js` | 数据模型、模板系统（content/option/action/meta） |
| `fonts/` | 字体文件（未提交到 git） |
| `lib/` | highlight.js（语法高亮） |
| `LICENSE` | Mulan PSL v2 许可证 |
| `README.md` | 项目说明文档 |

---

## 核心概念

### 1. 数据结构
章节 JSON 格式：
```json
{
  "meta": { "name": "章节名" },
  "content": [
    {
      "type": "dialog",
      "speaker": "角色名",
      "text": { "zh": "中文", "en": "English" },
      "actions": [],
      "options": [
        { "text": "选项1", "target": "下一节点" }
      ]
    }
  ]
}
```

### 2. 模板系统
在 `storyTypes.js` 中定义四类模板：
- `content` — 对话节点模板
- `option` — 选项模板
- `action` — 动作模板
- `meta` — 章节元数据模板（可自定义字段）

模板可通过「📋 编辑模板」按钮编辑，新建章节时自动应用。

### 3. 三栏布局
- **左栏**：树形导航 + 搜索功能
- **中栏**：选中节点的路径感知的 JSON 镜像编辑
- **右栏**：完整 JSON 编辑器 + 高亮

### 4. 搜索功能
- 左上角搜索框
- 输入 key 名称全局搜索
- 可用 `content.key` 限定搜索范围
- 搜索按钮可快速定位当前属性的 key

---

## 字体配置（已添加）

在 `css/style.css` 中配置：

```css
/* 仓耳与墨W04 - 普通文字 */
@font-face {
    font-family: '仓耳与墨W04';
    src: url('../fonts/仓耳与墨W04.ttf') format('truetype');
}

/* FiraCode - 代码/JSON */
@font-face {
    font-family: 'FiraCode';
    src: url('../fonts/FiraCode-Regular.woff2') format('woff2');
    font-weight: 400;
}

:root {
    --font-family: '仓耳与墨W04', 'Segoe UI', 'Microsoft YaHei', sans-serif;
    --font-mono: 'FiraCode', 'Consolas', 'Courier New', monospace;
    --font-size-base: 16px;
}
```

字体文件位于 `fonts/` 目录：
- `仓耳与墨W04.ttf`
- `FiraCode-Regular.woff2`
- `FiraCode-Medium.woff2`
- `FiraCode-Bold.woff2`

⚠️ `fonts/` 目录未 git add，需要手动添加

---

## 重要改动记录

### 已完成
1. ✅ 修复 root 节点点击无显示（`storyUI.js` 539-541行）
2. ✅ 添加 meta 模板可编辑功能
3. ✅ 添加字体配置（FiraCode + 仓耳与墨）
4. ✅ 基础字号调整为 16px
5. ✅ 控件继承字体（button/input/select/textarea）
6. ✅ 代码编辑器统一使用 FiraCode

### 注意事项
1. ⚠️ `fonts/` 目录未提交到 git（字体文件较大）
2. ⚠️ CSS 字体大小目前仍是硬编码 px 值，可考虑改用 em 单位
3. ⚠️ `storyTypes.js` 和 `storyUI.js` 有未提交的改动

---

## Git 状态
```bash
git status
# Untracked: fonts/
# Modified: css/style.css, js/storyTypes.js, js/storyUI.js, README.md
```

---

## 常用操作
- **导入 JSON**：`📂 导入` 按钮
- **导出 JSON**：`💾 导出` 按钮
- **新建章节**：点空白页或 `➕ 新建 JSON`
- **编辑模板**：点 `📋 编辑模板`，切换模板上下文下拉框
- **清空搜索**：搜索框留空或点清除按钮

---

## 待优化项
1. CSS 字体大小统一改用 em/rem 单位
2. 提交 fonts/ 目录到 git（或用 .gitignore）
3. 添加更多模板类型
4. 添加撤销/重做功能
