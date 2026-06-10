// ==========================================
// storyIO.js — JSON 文件导入 / 导出
// ==========================================

import { showAlert } from '../ui/view-modalDialog.js';

export function importJSON(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target.result);
                if (!json) { reject(new Error('JSON 为空')); return; }
                resolve(json);
            } catch (err) { reject(new Error('JSON 格式解析失败：' + err.message)); }
        };
        reader.onerror = () => reject(new Error('文件读取失败'));
        reader.readAsText(file);
    });
}

export function exportJSON(json, filename = 'chapter.json') {
    const blob = new Blob([JSON.stringify(json, null, 4)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
}

export function setupFilePicker(btn, onLoad) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', () => {
        const file = input.files[0];
        if (!file) return;
        importJSON(file).then(onLoad).catch(err => showAlert(err.message));
        input.value = '';
    });
    btn.addEventListener('click', () => input.click());
}

export function setupDropZone(el, onLoad) {
    el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('drop-active'); });
    el.addEventListener('dragleave', () => el.classList.remove('drop-active'));
    el.addEventListener('drop', (e) => {
        e.preventDefault();
        el.classList.remove('drop-active');
        const file = e.dataTransfer.files[0];
        if (!file || !file.name.endsWith('.json')) { showAlert('请拖入 .json 文件'); return; }
        importJSON(file).then(onLoad).catch(err => showAlert(err.message));
    });
}
