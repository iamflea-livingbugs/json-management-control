// ==========================================
// configDialog.js — 配置编辑弹窗（上下文配置）
// ==========================================

import { getContextsConfig, saveConfigToLocal, exportConfigJSON } from '../logic/logic-storyTypes.js';
import { store } from '../logic/logic-storyStore.js';
import { showAlert, makeModalDraggable } from './ui-modalDialog.js';

const $ = (sel) => document.querySelector(sel);

export function openConfigEditor() {
    const existing = document.getElementById('modal-config-editor');
    if (existing) { existing.classList.add('open'); return; }

    const config = getContextsConfig();
    const jsonStr = JSON.stringify(config, null, 4);

    const modal = document.createElement('div');
    modal.id = 'modal-config-editor';
    modal.className = 'modal-overlay';
    modal.innerHTML = `<div class="modal-box" style="width:600px">
        <div class="modal-header"><h2>⚙️ 模板上下文配置</h2><button class="modal-close" id="btn-config-close">✕</button></div>
        <div style="padding:8px 16px 0;font-size:0.75rem;color:var(--text-dim)">编辑 JSON 后点"保存"</div>
        <div style="display:grid;height:350px;margin:0;background:#0a0a1a;border-top:1px solid var(--border)">
            <pre id="config-json-code" style="grid-area:1/1;overflow:auto;padding:10px 12px;margin:0;font-family:var(--font-mono);font-size:0.875rem;line-height:1.5;background:transparent;white-space:pre-wrap;word-wrap:break-word;pointer-events:none"></pre>
            <textarea id="config-json-editor" spellcheck="false" style="grid-area:1/1;overflow:auto;padding:10px 12px;font-family:var(--font-mono);font-size:0.875rem;line-height:1.5;color:transparent;caret-color:#fff;background:transparent;border:none;outline:none;resize:none;white-space:pre-wrap;word-wrap:break-word;z-index:1"></textarea>
        </div>
        <div class="modal-footer">
            <button class="btn btn-sm" id="btn-config-export">💾 导出文件</button>
            <button class="btn btn-sm btn-primary" id="btn-config-save">✅ 保存</button>
            <button class="btn btn-sm" id="btn-config-close-bottom">关闭</button>
        </div></div>`;

    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('open'));
    makeModalDraggable(modal);

    const hlCode = document.getElementById('config-json-code');
    const editor = document.getElementById('config-json-editor');
    if (editor && hlCode) {
        editor.value = jsonStr;
        hlCode.textContent = jsonStr;
        if (window.hljs) { try { hlCode.innerHTML = window.hljs.highlight(jsonStr, { language: 'json' }).value; } catch (e) {} }
        editor.addEventListener('input', () => {
            hlCode.textContent = editor.value;
            if (window.hljs) { try { hlCode.innerHTML = window.hljs.highlight(editor.value, { language: 'json' }).value; } catch (e) {} }
        });
        editor.addEventListener('scroll', () => {
            hlCode.scrollTop = editor.scrollTop;
            hlCode.scrollLeft = editor.scrollLeft;
        });
        editor.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = editor.selectionStart;
                const end = editor.selectionEnd;
                editor.value = editor.value.substring(0, start) + '    ' + editor.value.substring(end);
                editor.selectionStart = editor.selectionEnd = start + 4;
            }
        });
    }

    document.getElementById('btn-config-save').addEventListener('click', () => {
        try { saveConfigToLocal(JSON.parse(editor.value)); modal.classList.remove('open'); store._emit(); }
        catch (e) { showAlert('JSON 格式有误：' + e.message); }
    });

    document.getElementById('btn-config-export').addEventListener('click', () => {
        try { JSON.parse(editor.value); exportConfigJSON(); }
        catch (e) { showAlert('JSON 格式有误'); }
    });

    const close = () => { modal.classList.remove('open'); setTimeout(() => { if (modal.parentNode) modal.parentNode.removeChild(modal); }, 200); };
    document.getElementById('btn-config-close').addEventListener('click', close);
    document.getElementById('btn-config-close-bottom').addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
}
