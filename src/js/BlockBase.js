/**
 * BlockBase
 * ---------
 * Shared base class for all block web components.
 * Provides:
 *   - Callback API:  onSave / onDelete / onEdit / onPreview  (all chainable)
 *   - Mode system:   setMode('edit' | 'preview')
 *   - Event firing:  block:save, block:delete  (bubble through DOM)
 *   - Status badge:  saved / unsaved
 *   - Shared icons and header HTML helpers
 *
 * Subclasses must implement:
 *   _init()                  — read attributes, initialise private state
 *   _onAttrChange(name, val) — react to observed attribute changes
 *   _render()                — set this.innerHTML for current mode
 *   _afterEditRender()       — mount editor lib (Quill / CodeMirror) after render
 *   _snapshotBeforePreview() — copy editor value into _content / _raw before unmount
 *   _onDestroy()             — nullify editor instance references
 *   get blockData()          — return full { id, type, order, label, language, content, raw }
 *
 * Subclasses must NOT override connectedCallback / disconnectedCallback /
 * attributeChangedCallback directly — use the hooks above instead.
 */
export class BlockBase extends HTMLElement {

  // ── Browser lifecycle ───────────────────────────────────────────────────

  connectedCallback() {
    // Callbacks — set via .onSave(fn) etc., never via attributes
    this._onSaveCb = null;
    this._onDeleteCb = null;
    this._onEditCb = null;
    this._onPreviewCb = null;
    this._statusTimer = null;

    // Current mode — always starts as preview
    this._mode = 'preview';

    // Let subclass read attributes and initialise its own state
    this._init();

    // Initial render
    this._render();

    // Self-register into an editor if editor-id attr is present.
    // We defer one tick so the editor element has time to connect first.
    const editorId = this.getAttribute('editor-id');
    if (editorId) {
      setTimeout(() => this._registerWithEditor(editorId), 0);
    }
  }

  disconnectedCallback() {
    this._onDestroy();
    clearTimeout(this._statusTimer);
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal || !this.isConnected) return;
    this._onAttrChange(name, newVal);
    this._render();
  }

  // ── Public callback API ─────────────────────────────────────────────────
  // All methods return `this` for chaining:
  //   block.onSave(fn).onDelete(fn).onPreview(fn)

  /**
   * Fired when user clicks Save on the block.
   * @param {(data: BlockData) => void} cb
   */
  onSave(cb) { this._onSaveCb = cb; return this; }

  /**
   * Fired when user clicks Delete.
   * @param {(data: { id }) => void} cb
   */
  onDelete(cb) { this._onDeleteCb = cb; return this; }

  /**
   * Fired when block switches to edit mode.
   * @param {(data: BlockData) => void} cb
   */
  onEdit(cb) { this._onEditCb = cb; return this; }

  /**
   * Fired when block switches to preview mode.
   * @param {(data: BlockData) => void} cb
   */
  onPreview(cb) { this._onPreviewCb = cb; return this; }

  // ── Mode API ────────────────────────────────────────────────────────────

  /**
   * Switch block between 'preview' and 'edit' modes.
   * Automatically snapshots content before leaving edit mode.
   * @param {'preview' | 'edit'} newMode
   */
  setMode(newMode) {
    if (newMode === this._mode) return;

    if (newMode === 'preview') {
      this._snapshotBeforePreview();
    }

    this._mode = newMode;
    this._render();

    if (newMode === 'edit') {
      this._afterEditRender();
      this._onEditCb?.(this.blockData);
    }

    if (newMode === 'preview') {
      this._onPreviewCb?.(this.blockData);
    }
  }

  // ── blockData — subclass must implement ────────────────────────────────

  /**
   * Returns the full block data snapshot.
   * @returns {BlockData}
   */
  get blockData() {
    throw new Error(`${this.tagName}: blockData getter not implemented`);
  }

  // ── Internal event firing ───────────────────────────────────────────────

  _fireBlockSave() {
    const data = this.blockData;
    this._onSaveCb?.(data);
    // Bubbles through DOM so Editor and any parent can catch it
    this.dispatchEvent(new CustomEvent('block:save', {
      bubbles: true,
      composed: true,
      detail: data,
    }));
  }

  _fireBlockDelete() {
    const data = { id: this._resolveId() };
    this._onDeleteCb?.(data);
    this.dispatchEvent(new CustomEvent('block:delete', {
      bubbles: true,
      composed: true,
      detail: data,
    }));
  }

  // ── Delete with animation ───────────────────────────────────────────────

  _deleteBlock() {
    this._fireBlockDelete();
    this.style.transition = 'opacity 0.15s, transform 0.15s';
    this.style.opacity = '0';
    this.style.transform = 'scale(0.97)';
    setTimeout(() => this.remove(), 160);
  }

  // ── Status badge ────────────────────────────────────────────────────────

  _setStatus(state) {
    const el = this.querySelector('.bf-save-status');
    if (!el) return;
    el.textContent = state === 'saved' ? 'saved' : 'unsaved';
    el.className = `bf-save-status visible ${state === 'saved' ? 'is-saved' : 'is-changed'}`;
    if (state === 'saved') {
      clearTimeout(this._statusTimer);
      this._statusTimer = setTimeout(() => el.classList.remove('visible'), 2200);
    }
  }

  // ── Editor self-registration ────────────────────────────────────────────

  _registerWithEditor(editorId) {
    const editor = document.getElementById(editorId);
    if (!editor || typeof editor._registerBlock !== 'function') return;
    editor._registerBlock(this);
  }

  // ── Shared header HTML helpers ──────────────────────────────────────────

  get _dragHandleHtml() {
    return `<div class="bf-drag-handle" title="Drag to reorder">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="9"  cy="5"  r="1.6"/>
        <circle cx="15" cy="5"  r="1.6"/>
        <circle cx="9"  cy="12" r="1.6"/>
        <circle cx="15" cy="12" r="1.6"/>
        <circle cx="9"  cy="19" r="1.6"/>
        <circle cx="15" cy="19" r="1.6"/>
      </svg>
    </div>`;
  }

  _controlsHtml() {
    const isEdit = this._mode === 'edit';
    return `
      <div class="bf-block-controls">
        <span class="bf-save-status"></span>
        ${isEdit
        ? `<button class="bf-icon-btn btn-preview" title="Preview">
               <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                 <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                 <circle cx="12" cy="12" r="3"/>
               </svg>
             </button>
             <button class="bf-icon-btn btn-save" title="Save">
               <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                 <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                 <polyline points="17,21 17,13 7,13 7,21"/>
                 <polyline points="7,3 7,8 15,8"/>
               </svg>
             </button>`
        : `<button class="bf-icon-btn btn-edit" title="Edit">
               <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                 <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                 <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
               </svg>
             </button>`
      }
        <button class="bf-icon-btn btn-delete" title="Delete">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3,6 5,6 21,6"/>
            <path d="M19,6l-1,14a2,2,0 01-2,2H8a2,2,0 01-2-2L5,6"/>
            <path d="M10,11v6M14,11v6"/>
            <path d="M9,6V4a1,1,0 011-1h4a1,1,0 011,1v2"/>
          </svg>
        </button>
      </div>`;
  }

  // ── Wire shared controls ────────────────────────────────────────────────
  // Call this at the end of every _render() so buttons are always live.

  _wireControls() {
    this.querySelector('.btn-edit')
      ?.addEventListener('click', () => this.setMode('edit'));
    this.querySelector('.btn-preview')
      ?.addEventListener('click', () => this.setMode('preview'));
    this.querySelector('.btn-save')
      ?.addEventListener('click', () => this._save());
    this.querySelector('.btn-delete')
      ?.addEventListener('click', () => this._deleteBlock());
    this.querySelector('.bf-label-input')
      ?.addEventListener('input', e => { this._label = e.target.value; });
  }

  // ── Utility ─────────────────────────────────────────────────────────────

  _resolveId() {
    // Priority: block-id attr → id attr → null
    const v = this.getAttribute('block-id') || this.getAttribute('id');
    if (!v) return null;
    return isNaN(v) ? v : Number(v);
  }

  _getOrder() {
    // Works whether block is inside editor or standalone in any container
    const list = this.closest('.bf-blocks-list') || this.parentElement;
    if (!list) return 1;
    return [...list.querySelectorAll('text-block, code-block')].indexOf(this) + 1;
  }

  _escAttr(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  }

  // ── Hooks — subclasses override these ───────────────────────────────────

  _init() {} // read attributes, initialise private state
  _onAttrChange(name, val) {} // react to observed attribute changes
  _render() {} // set this.innerHTML
  _afterEditRender() {} // mount Quill / CodeMirror after render
  _snapshotBeforePreview() {} // snapshot editor value before switching
  _onDestroy() {} // nullify editor instance refs
  _save() {} // snapshot + _setStatus('saved') + _fireBlockSave()
}