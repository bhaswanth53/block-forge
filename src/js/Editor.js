import Sortable from 'sortablejs';

/**
 * Editor  <block-editor>
 * ----------------------
 * Optional orchestrator element. Blocks are IDENTICAL inside or outside it —
 * the editor is purely a visual shell (toolbar, drag-to-reorder, Save All).
 *
 * Block discovery — two mechanisms, both work simultaneously:
 *   1. Direct children: any <text-block> or <code-block> placed inside
 *      <block-editor> in the HTML are discovered and moved into the list.
 *   2. editor-id attr: blocks anywhere on the page with editor-id="main"
 *      self-register by calling editor._registerBlock(this) on connect.
 *
 * Attributes:
 *   id   — required when using the editor-id mechanism on remote blocks
 *
 * Usage:
 *   <!-- Direct children -->
 *   <block-editor>
 *     <text-block block-id="1" content="<p>Hello</p>"></text-block>
 *     <code-block block-id="2" language="js" content="console.log('hi')"></code-block>
 *   </block-editor>
 *
 *   <!-- Remote blocks -->
 *   <text-block editor-id="main" block-id="1" content="<p>Hello</p>"></text-block>
 *   <block-editor id="main"></block-editor>
 *
 *   <!-- Programmatic -->
 *   const editor = document.querySelector('block-editor');
 *   editor.load([{ id: 1, type: 'text', raw: '<p>Hello</p>' }]);
 *   editor.onSave(block => console.log(block));
 *   editor.onSaveAll(blocks => console.log(blocks));
 */
export class Editor extends HTMLElement {

  // ── Browser lifecycle ───────────────────────────────────────────────────

  connectedCallback() {
    this._onSaveCb = null;
    this._onSaveAllCb = null;
    this._idCounter = 0;
    this._uid = Math.random().toString(36).slice(2, 7);

    // Collect any block children declared in HTML before we replace innerHTML.
    // We do this BEFORE _buildShell() wipes innerHTML.
    const preloaded = [...this.querySelectorAll(':scope > text-block, :scope > code-block')];

    this._buildShell();
    this._initSortable();

    // Move pre-declared children into the managed list
    preloaded.forEach(el => this._adoptBlock(el));

    // MutationObserver — catches blocks added to the editor's innerHTML
    // dynamically after mount (framework rendering, JS injection, etc.)
    this._childObserver = new MutationObserver(mutations => {
      mutations.forEach(m => {
        m.addedNodes.forEach(node => {
          if (this._isBlock(node) && node.parentElement !== this._listEl) {
            this._adoptBlock(node);
          }
        });
      });
      this._refreshCount();
    });
    this._childObserver.observe(this, { childList: true, subtree: false });

    this._refreshCount();
  }

  disconnectedCallback() {
    this._childObserver?.disconnect();
    this._sortable?.destroy();
  }

  // ── Public callback API ─────────────────────────────────────────────────

  /**
   * Fired when any block inside this editor is saved.
   * @param {(data: BlockData) => void} cb
   * @returns {this}
   */
  onSave(cb) { this._onSaveCb = cb; return this; }

  /**
   * Fired when Save All toolbar button is clicked.
   * @param {(data: BlockData[]) => void} cb
   * @returns {this}
   */
  onSaveAll(cb) { this._onSaveAllCb = cb; return this; }

  // ── Public API ──────────────────────────────────────────────────────────

  /**
   * Load blocks from a JSON array (e.g. a DB response).
   * Creates and appends block elements for each item.
   *
   * @param {Array<{ id?, type, label?, language?, content?, raw? }>} blockArray
   * @returns {this}
   */
  load(blockArray) {
    blockArray.forEach(item => {
      const id = item.id ?? ++this._idCounter;
      if (typeof id === 'number' && id >= this._idCounter) {
        this._idCounter = id + 1;
      }

      const el = this._createBlockEl(item.type, id);
      if (item.label) el.setAttribute('label', item.label);
      if (item.language) el.setAttribute('language', item.language);

      // Prefer raw for editor (avoids re-parsing prv-cb HTML),
      // fall back to content if raw is not stored separately.
      const src = item.raw ?? item.content ?? '';
      if (src) el.setAttribute('content', src);

      this._listEl.appendChild(el);
    });

    this._refreshCount();
    return this;
  }

  /**
   * Returns the current state of all blocks in DOM order.
   * Does not trigger any callbacks or status changes.
   * @returns {BlockData[]}
   */
  getAll() {
    return [...this._listEl.querySelectorAll('text-block, code-block')]
      .map((el, i) => ({ ...el.blockData, order: i + 1 }));
  }

  /**
   * Programmatically add a new empty block and open it in edit mode.
   * @param {'text' | 'code'} type
   * @returns {HTMLElement} the new block element
   */
  addBlock(type) {
    this._removeEmptyState();
    const id = ++this._idCounter;
    const el = this._createBlockEl(type, id);
    this._listEl.appendChild(el);
    setTimeout(() => el.setMode('edit'), 30);
    this._refreshCount();
    return el;
  }

  // ── _registerBlock — called by blocks with editor-id attr ───────────────

  /**
   * Called by a block's connectedCallback when it has an editor-id attribute
   * matching this editor's id. Moves the block into the managed list.
   * @param {HTMLElement} blockEl
   */
  _registerBlock(blockEl) {
    if (blockEl.closest('.bf-blocks-list') === this._listEl) return; // already inside
    this._adoptBlock(blockEl);
    this._refreshCount();
  }

  // ── Shell ────────────────────────────────────────────────────────────────

  _buildShell() {
    const saveAllId = `bf-saveall-${this._uid}`;
    const countId = `bf-count-${this._uid}`;

    this.innerHTML = `
      <div class="bf-editor-root">
        <div class="bf-toolbar">
          <div style="display:flex;align-items:center;gap:8px">
            <span class="bf-brand-inner">Block<span>Forge</span></span>
            <span class="bf-count" id="${countId}">0 blocks</span>
          </div>
          <div class="bf-toolbar-right">
            <button class="bf-btn bf-btn-ghost" id="${saveAllId}">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                <polyline points="17,21 17,13 7,13 7,21"/>
                <polyline points="7,3 7,8 15,8"/>
              </svg>
              Save All
            </button>
          </div>
        </div>

        <div class="bf-blocks-list"></div>

        <div class="bf-add-strip">
          <button class="bf-add-btn bf-add-text">¶ Text Block</button>
          <button class="bf-add-btn bf-add-code">&lt;/&gt; Code Block</button>
        </div>
      </div>`;

    this._listEl = this.querySelector('.bf-blocks-list');
    this._countEl = this.querySelector(`#${countId}`);

    // Toolbar buttons
    this.querySelector(`#${saveAllId}`)
      .addEventListener('click', () => this._handleSaveAll());
    this.querySelector('.bf-add-text')
      .addEventListener('click', () => this.addBlock('text'));
    this.querySelector('.bf-add-code')
      .addEventListener('click', () => this.addBlock('code'));

    // Listen for bubbling block:save events from all blocks in this list.
    // Because blocks are identical whether inside or outside an editor,
    // this is purely additive — the block's own onSave callback fires first.
    this._listEl.addEventListener('block:save', e => {
      const all = this.getAll();
      const block = all.find(b => b.id === e.detail.id) || e.detail;
      this._onSaveCb?.(block);
      this._toast(`Block #${block.id} saved`);
    });

    // Refresh count when any block is deleted
    this._listEl.addEventListener('block:delete', () => {
      setTimeout(() => this._refreshCount(), 200);
    });
  }

  // ── Sortable ─────────────────────────────────────────────────────────────

  _initSortable() {
    this._sortable = Sortable.create(this._listEl, {
      handle: '.bf-drag-handle',
      animation: 150,
      ghostClass: 'sortable-ghost',
      onEnd: () => this._refreshCount(),
    });
  }

  // ── Save All ─────────────────────────────────────────────────────────────

  _handleSaveAll() {
    const all = this.getAll();
    if (!all.length) { this._toast('No blocks to save'); return; }
    this._onSaveAllCb?.(all);
    this._toast(`Saved ${all.length} block${all.length !== 1 ? 's' : ''}`);
  }

  // ── Block adoption ────────────────────────────────────────────────────────

  /**
   * Moves a block element into the managed list and ensures it has an id.
   * Safe to call multiple times on the same element (idempotent).
   */
  _adoptBlock(el) {
    // Assign an id if missing
    if (!el.getAttribute('block-id') && !el.getAttribute('id')) {
      el.setAttribute('block-id', ++this._idCounter);
    } else {
      const id = Number(el.getAttribute('block-id') || el.getAttribute('id'));
      if (!isNaN(id) && id >= this._idCounter) this._idCounter = id + 1;
    }

    this._removeEmptyState();
    this._listEl.appendChild(el);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  _createBlockEl(type, id) {
    const tag = type === 'code' ? 'code-block' : 'text-block';
    const el = document.createElement(tag);
    el.setAttribute('block-id', id);
    return el;
  }

  _isBlock(node) {
    if (node.nodeType !== 1) return false;
    const tag = node.tagName?.toLowerCase();
    return tag === 'text-block' || tag === 'code-block';
  }

  _showEmptyState() {
    if (this._listEl.querySelector('.bf-empty')) return;
    const el = document.createElement('div');
    el.className = 'bf-empty';
    el.innerHTML = '<h3>No blocks yet</h3><p>Add a text or code block to get started</p>';
    this._listEl.appendChild(el);
  }

  _removeEmptyState() {
    this._listEl.querySelector('.bf-empty')?.remove();
  }

  _refreshCount() {
    const n = this._listEl.querySelectorAll('text-block, code-block').length;
    if (this._countEl) {
      this._countEl.textContent = `${n} block${n !== 1 ? 's' : ''}`;
    }
    n === 0 ? this._showEmptyState() : this._removeEmptyState();
  }

  _toast(msg) {
    // Uses a global toast container placed anywhere in body with id="be-global-toasts"
    // Falls back gracefully if the container isn't present
    let box = document.getElementById('be-global-toasts');
    if (!box) {
      box = document.createElement('div');
      box.id = 'be-global-toasts';
      box.style.cssText = 'position:fixed;bottom:20px;right:20px;display:flex;flex-direction:column;gap:6px;z-index:9999;';
      document.body.appendChild(box);
    }
    const t = document.createElement('div');
    t.className = 'toast-item';
    t.innerHTML = `<span style="color:var(--accent);font-weight:600;">✓</span> ${msg}`;
    box.appendChild(t);
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transition = 'opacity 0.18s';
      setTimeout(() => t.remove(), 200);
    }, 2500);
  }
}

customElements.define('block-editor', Editor);