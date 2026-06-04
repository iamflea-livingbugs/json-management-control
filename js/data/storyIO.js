// ==========================================
// storyIO.js — JSON 文件导入 / 导出
// ==========================================

// 导入：从 File 对象读取并解析 JSON 对话剧本
// 返回 Promise<json>；格式校验不通过则 reject
export function importJSON(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target.result);
                // 校验：必须包含 content 数组
                if (!json.content || !Array.isArray(json.content)) {
                    reject(new Error('格式错误：缺少 content 数组'));
                    return;
                }
                resolve(json);
            } catch (err) {
                reject(new Error('JSON 解析失败：' + err.message));
            }
        };
        reader.onerror = () => reject(new Error('文件读取失败'));
        reader.readAsText(file);
    });
}

// 导出：将当前章节数据格式化为 JSON 并触发浏览器下载
export function exportJSON(chapter) {
    const jsonStr = JSON.stringify(chapter, null, 4);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // 下载文件名默认取章节名
    a.download = (chapter.meta?.name || 'chapter') + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 拖放区域设置：将 DOM 元素设为可拖放目标
// el: 拖放目标元素；onLoad: 拖入成功后的回调
export function setupDropZone(el, onLoad) {
    el.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (e.dataTransfer.types.includes('Files')) el.classList.add('drop-active');
    });
    el.addEventListener('dragleave', () => el.classList.remove('drop-active'));
    el.addEventListener('drop', (e) => {
        e.preventDefault();
        el.classList.remove('drop-active');
        if (!e.dataTransfer.files.length) return;
        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith('.json')) importJSON(file).then(onLoad).catch(err => alert(err.message));
        else alert('请拖入 .json 文件');
    });
}

// 文件选择器设置：为按钮绑定隐藏的 <input type="file">
export function setupFilePicker(btnEl, onLoad) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.style.display = 'none';
    document.body.appendChild(input);
    btnEl.addEventListener('click', () => input.click());
    input.addEventListener('change', () => {
        const file = input.files[0];
        if (file) importJSON(file).then(onLoad).catch(err => alert(err.message));
        input.value = '';
    });
}
