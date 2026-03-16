import { BlockBase } from './BlockBase.js';
import Quill from "quill";

/**
 * TextBlock  <text-block>
 * -----------------------
 * Rich text block powered by Quill JS.
 * Preview mode renders stored HTML.
 * Edit mode mounts a Quill Snow editor.
 *
 * Attributes:
 *   block-id   — unique identifier (number or string)
 *   content    — initial HTML content string
 *   label      — optional label shown in header
 *   editor-id  — ID of a <block-editor> element to register with
 */
export class TextBlock extends BlockBase {

  static get observedAttributes() {
    return ['content', 'label', 'block-id', 'editor-id'];
  }

  // ── Init ────────────────────────────────────────────────────────────────

  _init() {
    this._content = this.getAttribute('content') || '';
    this._label = this.getAttribute('label') || '';
    this._quill = null;
  }

  _onAttrChange(name, val) {
    if (name === 'content' && this._mode !== 'edit') {
      this._content = val || '';
    }
    if (name === 'label') this._label = val || '';
  }

  // ── blockData ────────────────────────────────────────────────────────────

  get blockData() {
    const html = (this._mode === 'edit' && this._quill)
      ? this._quill.root.innerHTML
      : this._content;

    return {
      id: this._resolveId(),
      type: 'text',
      order: this._getOrder(),
      label: this._label,
      language: null,
      content: html,
      raw: html,
    };
  }

  // ── Render ───────────────────────────────────────────────────────────────

  _render() {
    // If a label-change re-render fires while in edit mode, snapshot
    // the live Quill value first so content isn't lost, then clear the
    // stale reference (the DOM node is about to be replaced by innerHTML).
    if (this._mode === 'edit' && this._quill) {
      this._content = this._quill.root.innerHTML;
      this._quill = null;
    }

    const isEdit = this._mode === 'edit';
    this.innerHTML = `
      <div class="bf-block bf-text-block${isEdit ? ' is-editing' : ''}">
        <div class="bf-block-header">
          ${this._dragHandleHtml}
          <span class="bf-type-badge badge-text">¶ text</span>
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
        ? `<div class="bf-text-body">
                 <div class="bf-quill-mount"></div>
               </div>`
        : `<div class="bf-preview-content bf-text-preview">
                 ${this._content
        || '<span class="bf-empty-hint">Empty — click edit to start writing</span>'}
               </div>`
      }
        </div>
      </div>`;

    this._wireControls();

    // If we just re-rendered while in edit mode (e.g. label changed),
    // re-mount Quill immediately since we cleared the reference above.
    if (isEdit) {
      this._afterEditRender();
    }
  }

  // ── Mount Quill after render ─────────────────────────────────────────────

  _afterEditRender() {
    setTimeout(() => {
      const mount = this.querySelector('.bf-quill-mount');
      // Guard: mount point must exist and Quill must not already be mounted
      if (!mount || this._quill) return;

      this._quill = new Quill(mount, {
        theme: 'snow',
        placeholder: 'Start writing here…',
        modules: {
          toolbar: [
            [{ header: [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['blockquote', 'link'],
            ['clean'],
          ],
        },
      });

      if (this._content) {
        this._quill.clipboard.dangerouslyPasteHTML(this._content);
      }

      this._quill.on('text-change', () => this._setStatus('changed'));
      this._quill.focus();
    }, 20);
  }

  // ── Snapshot before switching to preview ────────────────────────────────

  _snapshotBeforePreview() {
    if (this._quill) {
      this._content = this._quill.root.innerHTML;
      this._quill = null;
    }
  }

  _onDestroy() { this._quill = null; }

  // ── Save ─────────────────────────────────────────────────────────────────

  _save() {
    if (this._quill) this._content = this._quill.root.innerHTML;
    this._setStatus('saved');
    this._fireBlockSave();
  }
}

customElements.define('text-block', TextBlock);