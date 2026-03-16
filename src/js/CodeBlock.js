import { BlockBase } from './BlockBase.js';
import CodeMirror from "codemirror";
import hljs from "highlight.js";

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript', cmMode: 'javascript' },
  { value: 'typescript', label: 'TypeScript', cmMode: 'javascript' },
  { value: 'python',     label: 'Python',     cmMode: 'python'     },
  { value: 'html',       label: 'HTML',       cmMode: 'htmlmixed'  },
  { value: 'css',        label: 'CSS',        cmMode: 'css'        },
  { value: 'java',       label: 'Java',       cmMode: 'clike'      },
  { value: 'cpp',        label: 'C++',        cmMode: 'clike'      },
  { value: 'bash',       label: 'Bash',       cmMode: 'shell'      },
  { value: 'plaintext',  label: 'Plain Text', cmMode: null         },
];

/**
 * CodeBlock  <code-block>
 * -----------------------
 * Code editing block powered by CodeMirror 5 + highlight.js.
 * Preview renders a syntax-highlighted prv-cb HTML block.
 * Edit mode mounts a full CodeMirror editor.
 *
 * Attributes:
 *   block-id   — unique identifier
 *   content    — raw code string or prv-cb HTML (auto-extracted)
 *   language   — language value (default: javascript)
 *   label      — optional label
 *   editor-id  — ID of a <block-editor> to register with
 */
export class CodeBlock extends BlockBase {

  static get observedAttributes() {
    return ['content', 'language', 'label', 'block-id', 'editor-id'];
  }

  // ── Init ────────────────────────────────────────────────────────────────

  _init() {
    this._language = this.getAttribute('language') || 'javascript';
    this._label    = this.getAttribute('label')    || '';
    this._raw      = this._extractRaw(this.getAttribute('content') || '');
    this._cm       = null;
  }

  _onAttrChange(name, val) {
    if (name === 'language') {
      this._language = val || 'javascript';
      // Update CodeMirror mode live without full re-render
      if (this._cm) {
        const def = this._langDef(this._language);
        this._cm.setOption('mode', def?.cmMode || null);
      }
    }
    if (name === 'content' && this._mode !== 'edit') {
      this._raw = this._extractRaw(val || '');
    }
    if (name === 'label') this._label = val || '';
  }

  // ── blockData ────────────────────────────────────────────────────────────

  get blockData() {
    const raw = (this._mode === 'edit' && this._cm)
      ? this._cm.getValue()
      : this._raw;

    return {
      id:       this._resolveId(),
      type:     'code',
      order:    this._getOrder(),
      label:    this._label,
      language: this._language,
      content:  this._buildHtml(raw, this._language),
      raw,
    };
  }

  // ── Render ───────────────────────────────────────────────────────────────

  _render() {
    // Snapshot and clear stale CM reference before replacing innerHTML
    if (this._mode === 'edit' && this._cm) {
      this._raw = this._cm.getValue();
      this._cm  = null;
    }

    const isEdit   = this._mode === 'edit';
    const langOpts = LANGUAGES.map(l =>
      `<option value="${l.value}"${l.value === this._language ? ' selected' : ''}>${l.label}</option>`
    ).join('');
    const preview  = this._buildHtml(this._raw, this._language);

    this.innerHTML = `
      <div class="bf-block bf-code-block${isEdit ? ' is-editing' : ''}">
        <div class="bf-block-header">
          ${this._dragHandleHtml}
          <span class="bf-type-badge badge-code">&lt;/&gt; code</span>
          <select class="bf-lang-select">${langOpts}</select>
          <input
            class="bf-label-input"
            type="text"
            placeholder="Label this block…"
            value="${this._escAttr(this._label)}"
          />
          ${this._controlsHtml()}
        </div>
        <div class="bf-block-body">
          ${isEdit
            ? `<div class="bf-code-body">
                 <textarea class="bf-cm-mount"></textarea>
               </div>`
            : `<div class="bf-preview-content bf-code-preview">
                 ${preview
                   || '<span class="bf-empty-hint">Empty — click edit to add code</span>'}
               </div>`
          }
        </div>
      </div>`;

    this._wireControls();

    // Language select — capture CM value before attribute change triggers re-render
    this.querySelector('.bf-lang-select')
      ?.addEventListener('change', e => {
        if (this._cm) this._raw = this._cm.getValue();
        this.setAttribute('language', e.target.value);
      });

    // Re-mount CodeMirror if this was a mid-edit re-render
    if (isEdit) {
      this._afterEditRender();
    }
  }

  // ── Mount CodeMirror after render ────────────────────────────────────────

  _afterEditRender() {
    setTimeout(() => {
      const ta = this.querySelector('.bf-cm-mount');
      if (!ta || this._cm) return;

      const def = this._langDef(this._language);
      this._cm  = CodeMirror.fromTextArea(ta, {
        mode:           def?.cmMode || null,
        lineNumbers:    true,
        indentUnit:     2,
        tabSize:        2,
        indentWithTabs: false,
      });

      if (this._raw) this._cm.setValue(this._raw);

      this._cm.on('change', () => this._setStatus('changed'));
      this._cm.refresh();
      this._cm.focus();
    }, 20);
  }

  // ── Snapshot before preview ──────────────────────────────────────────────

  _snapshotBeforePreview() {
    if (this._cm) {
      this._raw = this._cm.getValue();
      this._cm  = null;
    }
  }

  _onDestroy() { this._cm = null; }

  // ── Save ─────────────────────────────────────────────────────────────────

  _save() {
    if (this._cm) this._raw = this._cm.getValue();
    this._setStatus('saved');
    this._fireBlockSave();
  }

  // ── HTML output builder ──────────────────────────────────────────────────

  _buildHtml(raw, lang) {
    if (!raw) return '';
    const safeLang = lang || 'plaintext';
    let highlighted;
    try {
      highlighted = safeLang === 'plaintext'
        ? hljs.highlightAuto(raw).value
        : hljs.highlight(raw, { language: safeLang, ignoreIllegals: true }).value;
    } catch (_) {
      highlighted = hljs.highlightAuto(raw).value;
    }
    return `<div class="prv-cb">` +
             `<div class="prv-cb-h"><span>${safeLang}</span></div>` +
             `<pre><code class="hljs language-${safeLang}">${highlighted}</code></pre>` +
           `</div>`;
  }

  // ── Extract raw code from any content format ─────────────────────────────

  _extractRaw(content) {
    if (!content) return '';
    if (!content.includes('<')) return content;       // already plain
    if (content.includes('prv-cb')) {
      const tmp  = document.createElement('div');
      tmp.innerHTML = content;
      const code = tmp.querySelector('code');
      return code ? code.innerText : content;         // innerText decodes &lt; etc.
    }
    return content.replace(/<[^>]*>/g, '');           // strip unknown tags
  }

  _langDef(value) {
    return LANGUAGES.find(l => l.value === value) || null;
  }
}

customElements.define('code-block', CodeBlock);