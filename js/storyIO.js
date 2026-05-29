// ==========================================
// storyIO.js — JSON 导入 / 导出
// ==========================================

// ---------- 导入 ----------
export function importJSON(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target.result);
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

// ---------- 导出 ----------
export function exportJSON(chapter) {
    const jsonStr = JSON.stringify(chapter, null, 4);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (chapter.meta?.name || 'chapter') + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ---------- 拖放文件加载 ----------
export function setupDropZone(el, onLoad) {
    el.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (e.dataTransfer.types.includes('Files')) {
            el.classList.add('drop-active');
        }
    });
    el.addEventListener('dragleave', () => {
        el.classList.remove('drop-active');
    });
    el.addEventListener('drop', (e) => {
        e.preventDefault();
        el.classList.remove('drop-active');
        if (!e.dataTransfer.files.length) return; // 内部拖拽，忽略
        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith('.json')) {
            importJSON(file).then(onLoad).catch(err => alert(err.message));
        } else {
            alert('请拖入 .json 文件');
        }
    });
}

// ---------- 文件选择按钮 ----------
export function setupFilePicker(btnEl, onLoad) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.style.display = 'none';
    document.body.appendChild(input);

    btnEl.addEventListener('click', () => input.click());
    input.addEventListener('change', () => {
        const file = input.files[0];
        if (file) {
            importJSON(file).then(onLoad).catch(err => alert(err.message));
        }
        input.value = '';
    });
}
