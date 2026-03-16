import Sortable from 'sortablejs';
import Quill from "quill";
import CodeMirror from "codemirror";
import hljs from "highlight.js";
import EditorShell from "./editor/shell.js";
import BlockStrip from "./editor/blocksStrip.js";
import DefaultBlock from "./blocks/DefaultBlock.js";
import { LANGUAGES } from "./utils/variables.js";
import Code from "./blocks/Code.js";
import UI from "./editor/UI.js";

export default class BlockEditor {
    constructor(selector) {
        this.mountPoint = document.querySelector(selector);
        this.blocks = [];
        this.idCounter = 0;

        this._onSaveCallback = null;
        this._onSaveAllCallback = null;

        this._uid = Math.random().toString(36).slice(2, 7);

        this._buildShell();
        this._initDragAndDrop();
        // this._showEmptyState();
        this._refreshBlockCount();
    }

    onSave(callback) {
        this._onSaveCallback = callback;
        return this;
    }

    onSaveAll(callback) {
        this._onSaveAllCallback = callback;
        return this;
    }

    load(blockArray) {
        blockArray.forEach((item) => {
            const block = this._insertBlock(
                item.type, 
                item.language || 'javascript', 
                item.label || '', 
                Number(item.id) || null
            );

            setTimeout(() => {
                const source = item.raw ?? item.content;
                if (!source) return;

                switch (item.type) {
                    case "text": {
                        if (block.quill) {
                            block.quill.clipboard.dangerouslyPasteHTML(source);
                        }
                        break;
                    }

                    case "code": {
                        if (block.cm) {
                            block.cm.setValue(source);
                        }
                        break;
                    }

                    default:
                        break;
                }
            }, 80);
        });
        return this;
    }

    getAll() {
        const totalBlocks = this._getBlockInDomOrder();
        const allBlocks = totalBlocks.map((block, index) => {
            return {
                id: block.id,
                type: block.type,
                order: index + 1,
                label: this._readLabel(block.id),
                language: block.type === "code" ? block.language : null,
                content: this._buildHtmlOutput(block),
                raw: this._buildRawOutput(block)
            };
        });
        return allBlocks;
    }

    _buildShell() {
        // Toolbar
        this.toolbar = document.createElement("div");
        this.toolbar.className = "be-toolbar";
        this.toolbar.innerHTML = EditorShell.getHtml(this._uid);

        // Blocks list
        this.listEl = document.createElement("div");
        this.listEl.className = "be-blocks-list";

        // Block strip
        this.addStrip = document.createElement("div");
        this.addStrip.className = "be-add-strip";
        this.addStrip.innerHTML = BlockStrip.getHtml();

        this.mountPoint.appendChild(this.toolbar);
        this.mountPoint.appendChild(this.listEl);
        this.mountPoint.appendChild(this.addStrip);

        // Button events
        this.toolbar.querySelector(`#be-saveall-${this._uid}`)
            .addEventListener("click", () => this._handleSaveAll());

        this.toolbar.querySelector(`#be-export-${this._uid}`)
            .addEventListener("click", () => this._handleExport());

        this.addStrip.querySelector(".add-text")
            .addEventListener("click", () => this._addBlock("text"));

        this.addStrip.querySelector(".add-code")
            .addEventListener("click", () => this._addBlock("code"));
    }

    _initDragAndDrop() {
        Sortable.create(this.listEl, {
            handle: '.be-drag-handle',
            animation: 160,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            onEnd: () => this._refreshBlockCount()
        });
    }

    _addBlock(type) {
        this._removeEmptyState();
        const block = this._insertBlock(type, 'javascript', '');

        setTimeout(() => {
            if (type === 'text' && block.quill) {
                block.quill.focus();
            }

            if (type === 'code' && block.cm) {
                block.cm.focus();
            }
        }, 120);

        return block;
    }

    _insertBlock(type, language, label, id = null) {
        let blockId = id;
        if (id === null) {
            blockId = ++this.idCounter;
        }
        const block = {
            id: blockId,
            type,
            language,
            quill: null,
            cm: null
        };
        this.blocks.push(block);

        const el = this._renderBlockElement(block, label);
        this.listEl.appendChild(el);

        setTimeout(() => {
            if (type === 'text') {
                this._mountQuill(block, el);
            } else {
                this._mountCodeMirror(block, el);
            }
        }, 20);

        this._refreshBlockCount();
        return block;
    }

    _renderBlockElement(block, label = '') {
        const { id, type } = block;
        const isCode = type === 'code';

        const languageOptions = LANGUAGES.map((lang) => `<option value="${lang.value}" ${lang.value === block.language ? 'selected' : ''}>${lang.label}</option>`).join('');
        
        const el = document.createElement("div");
        el.className = "be-block";
        el.dataset.blockId = id;
        el.innerHTML = DefaultBlock.getHtml({
            isCode,
            id,
            label,
            block
        });

        this._wireBlockEvents(el);
        return el;
    }

    _wireBlockEvents(el) {
        el.addEventListener("click", (e) => {
            const btn = e.target.closest("[data-action]");
            if (!btn) return;

            const action = btn.dataset.action;
            const id = Number(btn.dataset.id);

            if (action === "save") {
                this._handleSave(id);
            }

            if (action === "delete") {
                this._handleDelete(id);
            }

            if (action === "preview") {
                this.handleTogglePreview(id);
            }
        });

        el.addEventListener("change", (e) => {
            const sel = e.target.closest('[data-action="lang"]');
            if (!sel) return;

            const id = Number(sel.dataset.id);
            const block = this._findBlock(id);
            if (!block) return;

            block.language = sel.value;
            const langDef = LANGUAGES.find(l => l.value === block.language);
            if (block.cm) {
                block.cm.setOption("mode", langDef?.cmMode || null);
            }
            this._markChanged(id);
        });
    }

    _mountQuill(block, el) {
        const mountPoint = el.querySelector(`[data-quill="${block.id}"]`);
        if (!mountPoint) return;

        block.quill = new Quill(mountPoint, {
            theme: 'snow',
            placeholder: "Start writing here...",
            modules: {
                toolbar: [
                    [{
                        header: [1, 2, 3, false]
                    }],
                    [
                        'bold',
                        'italic',
                        'underline',
                        'strike'
                    ],
                    [
                        { list: 'ordered' },
                        { list: 'bullet' }
                    ],
                    ['blockquote', 'link'],
                    ['clean']
                ]
            }
        });

        block.quill.on("text-change", () => this._markChanged(block.id));

        const body = el.querySelector(`[data-body="${block.id}"]`);
        body.addEventListener("focusin", () => el.classList.add("is-focused"));
        body.addEventListener("focusout", () => el.classList.remove("is-focused"));
    }

    _mountCodeMirror(block, el) {
        const textarea = el.querySelector(`[data-cm="${block.id}"]`);
        if (!textarea) return;

        const langDef = LANGUAGES.find(l => l.value === block.language);

        block.cm = CodeMirror.fromTextArea(textarea, {
            mode: langDef?.cmMode || null,
            lineNumbers: true,
            indentUnit: 2,
            tabSize: 2,
            indentWithTabs: false,
            lineWrapping: false,
        });

        block.cm.on("change", () => this._markChanged(block.id));
        block.cm.on("focus", () => el.classList.add("is-focused"));
        block.cm.on("blur", () => el.classList.remove("is-focused"));
    }

    _handleSave(id) {
        const block = this._findBlock(id);
        if (!block) return;

        const result = {
            id: id,
            type: block.type,
            order: this._getBlockOrder(id),
            label: this._readLabel(id),
            language: block.type === "code" ? block.language : null,
            content: this._buildHtmlOutput(block),
            raw: this._buildRawOutput(block)
        };

        this._setStatus(id, "saved");

        const previewPanel = this.listEl.querySelector(`[data-preview-panel="${id}"]`);
        if (previewPanel?.classList.contains("is-open")) {
            this._writePreviewContent(id, result.content);
        }

        if (this._onSaveCallback) {
            this._onSaveCallback(result);
        }

        this._toast(`Block #${id} saved`);
        return result;
    }

    _handleSaveAll() {
        if (this.blocks.length === 0) {
            this._toast("No blocks to save");
            return;
        }

        const allBlocks = this.getAll();
        allBlocks.forEach(b => this._setStatus(b.id, "saved"));

        if (this._onSaveAllCallback) {
            this._onSaveAllCallback(allBlocks);
        }

        this._toast(`Saved ${allBlocks.length} blocks`);
        return allBlocks;
    }

    _handleExport() {
        if (this.blocks.length === 0) {
            this._toast("Nothing to export");
            return;
        }

        const html = this.getAll().map(b => 
            `<!-- Block ${b.order} | id=${b.id} | type=${b.type} | label="${b.label}" -->\n${b.content}`
        ).join('\n\n');

        const blob = new Blob([html], {
            type: "text/html"
        });
        const url = URL.createObjectURL(blob);
        Object.assign(document.createElement("a"), {
            href: url,
            download: "blocks.html"
        }).click();

        URL.revokeObjectURL(url);
        this._toast("Exported as blocks.html");
    }

    _handleDelete(id) {
        const idx = this.blocks.findIndex(b => b.id === id);
        if (idx === -1) return;

        this.blocks.splice(idx, 1);

        const el = this.listEl.querySelector(`[data-block-id="${id}"]`);
        if (el) {
            el.style.cssText = 'opacity:0; transform:scale(0.97); transition:all 0.15s ease;';
            setTimeout(() => {
                el.remove();
                this._showEmptyState();
                this._refreshBlockCount();
            }, 160);
        }
    }

    _handleTogglePreview(id) {
        const panel = this.listEl.querySelector(`[data-preview-panel="${id}"]`);
        if (!panel) return;

        const nowOpen = !panel.classList.contains("is-open");
        panel.classList.toggle("is-open", nowOpen);

        if (nowOpen) {
            const block = this._findBlock(id);
            const content = this._buildHtmlOutput(block);
            this._writePreviewContent(id, content);
        }
    }

    _writePreviewContent(id, html) {
        const target = this.listEl.querySelector(`[data-preview-content="${id}"]`);
        if (target) {
            target.innerHTML = html;
        }
    }

    _buildHtmlOutput(block) {
        switch (block.type) {
            case "text": {
                return block.quill ? block.quill.root.innerHTML : "";
            }

            case "code": {
                if (!block.cm) return "";

                const rawCode = block.cm.getValue();
                const lang = block.language || "plaintext";

                let highlighted;
                try {
                    highlighted = (lang === "plaintext")
                        ? hljs.highlightAuto(rawCode).value
                        : hljs.highlight(rawCode, {
                            language: this._mapToHljsLang(lang),
                            ignoreIllegals: true
                        }).value;
                } catch (_) {
                    highlighted = hljs.highlightAuto(rawCode).value;
                }

                return Code.getHtml({ lang, highlighted });
            }

            default:
                return "";
        }
    }

    _buildRawOutput(block) {
        switch (block.type) {
            case 'text':
                return block.quill ? block.quill.root.innerHTML : '';

            case 'code':
                return block.cm ? block.cm.getValue() : '';

            default:
                return '';
        }
    }

    _mapToHljsLang(lang) {
        const overrides = {
            cpp: "cpp",
            bash: "bash",
            typescript: "typescript"
        };

        return overrides[lang] || lang;
    }

    _markChanged(id) {
        const el = this.listEl.querySelector(`[data-action="status"][data-id="${id}"]`);
        if (!el) return;

        el.textContent = 'unsaved';
        el.className = 'be-save-status visible is-changed';
        clearTimeout(el._timer);
    }

    _setStatus(id, state) {
        const el = this.listEl.querySelector(`[data-action="status"][data-id="${id}"]`);
        if (!el) return;

        if (state === 'saved') {
            el.textContent = 'saved';
            el.className = 'be-save-status visible is-saved';
            clearTimeout(el._timer);
            el._timer = setTimeout(() => el.classList.remove('visible'), 2200);
        } else {
            el.textContent = 'unsaved';
            el.className = 'be-save-status visible is-changed';
        }
    }

    _getBlockInDomOrder() {
        const domEls = [...this.listEl.querySelectorAll(".be-block")];
        return domEls.map(el => this._findBlock(Number(el.dataset.blockId))).filter(Boolean);
    }

    _getBlockOrder(id) {
        const ordered = this._getBlockInDomOrder();
        const idx = ordered.findIndex(b => b.id === id);
        return idx === -1 ? null : idx + 1;
    }

    _findBlock(id) {
        return this.blocks.find(b => b.id === id) || null;
    }

    _readLabel(id) {
        const input = this.listEl.querySelector(`[data-action="label"][data-id="${id}"]`);
        return input ? input.value.trim() : '';
    }

    _showEmptyState() {
        this._removeEmptyState();
        if (this.blocks.length === 0) {
            const el = document.createElement('div');
            el.id = 'be-empty';
            el.className = 'be-empty';
            el.innerHTML = UI.getIntroHtml();

            this.listEl.appendChild(el);
        }
    }

    _removeEmptyState() {
        this.listEl.querySelector("#be-empty")?.remove();
    }

    _refreshBlockCount() {
        const el = this.mountPoint.querySelector(`#be-count-${this._uid}`);
        if (el) {
            el.textContent = `${this.blocks.length} block${this.blocks.length !== 1 ? 's' : ''}`;
        }
    }

    _toast(message) {
        const box = document.getElementById('be-global-toasts');
        if (!box) return;
        const t = document.createElement('div');
        t.className = 'be-toast toast-success';
        t.textContent = message;
        box.appendChild(t);
        setTimeout(() => {
            t.style.cssText = 'opacity:0; transform:translateY(6px); transition:all 0.18s ease;';
            setTimeout(() => t.remove(), 200);
        }, 2500);
    }
}