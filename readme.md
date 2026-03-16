# BlockForge

A block-based rich text and code editor built on native Web Components — no framework, zero overhead. Each block is a fully autonomous custom element that works standalone or inside the `<block-editor>` orchestrator.

---

## Table of Contents

- [Usage](#usage)
  - [Installation](#installation)
  - [Quick Start](#quick-start)
  - [Declarative Blocks](#declarative-blocks)
  - [Standalone Blocks](#standalone-blocks)
  - [Remote Blocks](#remote-blocks)
  - [Programmatic API](#programmatic-api)
  - [Block Data Shape](#block-data-shape)
  - [Output Formats](#output-formats)
  - [Database Integration](#database-integration)
- [Development](#development)
  - [Project Structure](#project-structure)
  - [Architecture](#architecture)
  - [Building](#building)
  - [Adding a New Block Type](#adding-a-new-block-type)
  - [BlockBase API Reference](#blockbase-api-reference)
  - [Editor API Reference](#editor-api-reference)

---

## Usage

### Installation

```bash
npm install @bhaswanth53/block-forge
```

### Quick Start

**With a bundler (Vite, Webpack, etc.)**

```js
import '@bhaswanth53/block-forge';
import '@bhaswanth53/block-forge/css';
```

**Plain `<script>` tag**

```html
<link rel="stylesheet" href="node_modules/@bhaswanth53/block-forge/dist/block-forge.css" />
<script src="node_modules/@bhaswanth53/block-forge/dist/block-forge.umd.js"></script>
```

Place a toast container anywhere in `<body>` (auto-created if missing):

```html
<div id="be-global-toasts"></div>
```

---

### Declarative Blocks

Place blocks as direct children of `<block-editor>`. They are discovered automatically on connect.

```html
<block-editor>
  <text-block
    block-id="1"
    label="Introduction"
    content="<h2>Hello</h2><p>World</p>"
  ></text-block>

  <code-block
    block-id="2"
    language="javascript"
    label="Example"
    content="console.log('hello')"
  ></code-block>
</block-editor>
```

Wire callbacks on the editor:

```js
const editor = document.querySelector('block-editor');

editor.onSave((block) => {
  console.log(block); // { id, type, order, label, language, content, raw }
});

editor.onSaveAll((blocks) => {
  console.log(blocks); // array of all block data in DOM order
});
```

---

### Standalone Blocks

Blocks work entirely without an editor — every callback and method is available directly on the element.

```html
<text-block block-id="42" content="<p>Standalone block</p>"></text-block>
<code-block block-id="43" language="python" content="print('hi')"></code-block>
```

```js
document.querySelector('text-block')
  .onSave((data) => console.log('saved', data))
  .onDelete((data) => console.log('deleted', data.id))
  .onEdit((data) => console.log('entered edit mode'))
  .onPreview((data) => console.log('entered preview mode'));

// Programmatic mode switching
document.querySelector('code-block').setMode('edit');
```

You can also listen for the bubbling `block:save` and `block:delete` events on any ancestor:

```js
document.addEventListener('block:save', (e) => {
  const data = e.detail; // full BlockData object
});
```

---

### Remote Blocks

Blocks outside the editor can opt in using the `editor-id` attribute. They self-register when they connect to the DOM.

```html
<!-- Block is physically outside the editor element -->
<text-block
  editor-id="main"
  block-id="1"
  content="<p>Remote block</p>"
></text-block>

<block-editor id="main"></block-editor>
```

This is useful when your page layout requires blocks and editor toolbar to be in different parts of the DOM.

---

### Programmatic API

#### `editor.load(blockArray)`

Populate the editor from a JSON array (e.g. a DB response):

```js
const editor = document.querySelector('block-editor');

editor.load([
  {
    id:      42,
    type:    'text',
    label:   'Introduction',
    raw:     '<h2>Hello</h2><p>World</p>',
  },
  {
    id:       43,
    type:     'code',
    language: 'python',
    label:    'Script',
    raw:      "print('hello')",
  },
]);
```

> **`raw` vs `content`:** Always pass `raw` when loading into the editor. If only `content` is available (e.g. older DB records), it falls back gracefully — `_extractRaw()` strips the `prv-cb` HTML and recovers the plain code string automatically.

#### `editor.getAll()`

Snapshot all blocks in current DOM order without triggering any callbacks:

```js
const blocks = editor.getAll();
// → [{ id, type, order, label, language, content, raw }, ...]
```

#### `editor.addBlock(type)`

Programmatically add a new block, opened immediately in edit mode:

```js
editor.addBlock('text'); // returns the new <text-block> element
editor.addBlock('code'); // returns the new <code-block> element
```

#### Block element methods

Available on any `text-block` or `code-block` element:

```js
const block = document.querySelector('text-block');

block.setMode('edit');      // switch to edit mode
block.setMode('preview');   // switch to preview mode

block.onSave(fn)            // called when Save is clicked
block.onDelete(fn)          // called when Delete is clicked
block.onEdit(fn)            // called when entering edit mode
block.onPreview(fn)         // called when entering preview mode

block.blockData             // current snapshot (getter)
```

---

### Block Attributes

#### `<text-block>`

| Attribute   | Type             | Description |
|-------------|------------------|-------------|
| `block-id`  | number \| string | Unique identifier returned in all callbacks |
| `content`   | HTML string      | Initial content. Pass the `raw` field from your DB. |
| `label`     | string           | Optional label shown in the block header |
| `editor-id` | string           | ID of a `<block-editor>` to self-register with |

#### `<code-block>`

| Attribute   | Type             | Description |
|-------------|------------------|-------------|
| `block-id`  | number \| string | Unique identifier |
| `content`   | string           | Raw code string or `prv-cb` HTML from DB |
| `language`  | string           | Default: `javascript`. See supported languages below. |
| `label`     | string           | Optional label |
| `editor-id` | string           | ID of a `<block-editor>` to self-register with |

#### Supported languages

`javascript` `typescript` `python` `html` `css` `java` `cpp` `bash` `plaintext`

---

### Block Data Shape

Every callback and `getAll()` returns objects of this shape:

```ts
type BlockData = {
  id:       number | string;   // value of block-id attribute
  type:     'text' | 'code';   // element type
  order:    number;            // 1-based position in current DOM order
  label:    string;            // value of the label input
  language: string | null;     // code blocks only; null for text blocks
  content:  string;            // HTML output  — store this in DB
  raw:      string;            // raw content  — pass back via load() to reload
}
```

---

### Output Formats

| Field     | TextBlock              | CodeBlock                  | Use for |
|-----------|------------------------|----------------------------|---------|
| `content` | Quill HTML             | `prv-cb` highlighted HTML  | Storing in DB, rendering on your site |
| `raw`     | Same as `content`      | Plain code string          | Reloading into the editor via `load()` |

**`prv-cb` format (code block HTML output):**

```html
<div class="prv-cb">
  <div class="prv-cb-h"><span>javascript</span></div>
  <pre><code class="hljs language-javascript">...highlighted code...</code></pre>
</div>
```

---

### Database Integration

```js
const editor = document.querySelector('block-editor');

// Restore from DB on page load
const rows = await fetch('/api/blocks').then(r => r.json());
editor.load(rows); // rows: [{ id, type, label, language, content, raw }]

// Save individual block
editor.onSave(async (block) => {
  await fetch(`/api/blocks/${block.id}`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      order:    block.order,
      label:    block.label,
      language: block.language,
      content:  block.content,  // HTML — render on your site
      raw:      block.raw,      // plain — reload into editor
    }),
  });
});

// Save all blocks at once
editor.onSaveAll(async (blocks) => {
  await fetch('/api/blocks/bulk', {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(blocks),
  });
});
```

> **ID collision safety:** `idCounter` always advances past the highest loaded ID. If you load blocks with IDs 42 and 43, any new blocks added by the user start from 44.

---

## Development

### Project Structure

```
src/
├── js/
│   ├── main.js       ← entry point — imports SCSS, registers elements, exports all
│   ├── BlockBase.js  ← shared base class all blocks extend
│   ├── TextBlock.js  ← <text-block> custom element
│   ├── CodeBlock.js  ← <code-block> custom element
│   └── Editor.js     ← <block-editor> orchestrator element
└── css/
    └── main.scss     ← all styles
```

---

### Architecture

**Two layers — blocks and editor are completely decoupled:**

```
┌─────────────────────────────────────────────────┐
│  <block-editor>                                  │
│  Editor.js — orchestrator                        │
│  • Toolbar (Save All, block count)               │
│  • Drag-to-reorder (SortableJS)                  │
│  • Discovers blocks via children + editor-id     │
│  • Listens for bubbling block:save events        │
│  • Exposes onSave / onSaveAll / load / getAll    │
│                                                  │
│  ┌─────────────────┐   ┌─────────────────────┐  │
│  │  <text-block>   │   │  <code-block>        │  │
│  │  TextBlock.js   │   │  CodeBlock.js        │  │
│  │  extends        │   │  extends             │  │
│  │  BlockBase.js   │   │  BlockBase.js        │  │
│  └─────────────────┘   └─────────────────────┘  │
└─────────────────────────────────────────────────┘

Blocks also work completely outside this hierarchy.
```

**`BlockBase.js` — the contract every block fulfils:**

- `connectedCallback` / `disconnectedCallback` / `attributeChangedCallback` — owned by BlockBase, never overridden by subclasses
- Mode system: `setMode('edit' | 'preview')` — calls `_snapshotBeforePreview()` then re-renders
- Callback API: `onSave` / `onDelete` / `onEdit` / `onPreview` — all chainable
- Event firing: `_fireBlockSave()` calls `_onSaveCb` then dispatches `block:save` (bubbles)
- Shared HTML: drag handle, edit/preview/save/delete icon buttons, status badge
- 7 lifecycle hooks subclasses implement: `_init`, `_onAttrChange`, `_render`, `_afterEditRender`, `_snapshotBeforePreview`, `_onDestroy`, `_save`

**Block discovery in `Editor.js`:**

1. **Direct children** — on `connectedCallback`, all `text-block` and `code-block` children are collected before `innerHTML` is replaced, then appended into `.bf-blocks-list`
2. **`editor-id` remote blocks** — on `connectedCallback`, any block with `editor-id="x"` calls `document.getElementById('x')._registerBlock(this)` after a 0ms defer
3. **MutationObserver** — watches the editor element for dynamically added block children after mount (framework rendering, async injection, etc.)

---

### Building

```bash
npm install
npm run build
```

Output:

```
dist/
├── block-forge.js       ← ESM bundle (for bundlers)
├── block-forge.umd.js   ← UMD bundle (for plain <script> tags)
└── block-forge.css      ← compiled styles
```

Dev server:

```bash
npm run dev
```

Publishing:

```bash
npm run build
npm publish
```

---

### Adding a New Block Type

#### 1. Create `src/js/YourBlock.js`

Extend `BlockBase` and implement the 7 hooks plus `blockData`:

```js
import { BlockBase } from './BlockBase.js';

export class ImageBlock extends BlockBase {

  // Declare which attributes trigger _onAttrChange + re-render
  static get observedAttributes() {
    return ['content', 'label', 'block-id', 'editor-id'];
  }

  // ── 1. _init — read attributes, initialise private state ──────────────
  _init() {
    this._content = this.getAttribute('content') || '';  // image URL or base64
    this._label   = this.getAttribute('label')   || '';
  }

  // ── 2. _onAttrChange — react to attribute changes ────────────────────
  _onAttrChange(name, val) {
    if (name === 'content' && this._mode !== 'edit') this._content = val || '';
    if (name === 'label')   this._label   = val || '';
  }

  // ── 3. blockData getter — must return full BlockData shape ────────────
  get blockData() {
    return {
      id:       this._resolveId(),
      type:     'image',
      order:    this._getOrder(),
      label:    this._label,
      language: null,
      content:  this._content,  // URL or base64
      raw:      this._content,  // same for images
    };
  }

  // ── 4. _render — set this.innerHTML for current mode ─────────────────
  _render() {
    const isEdit = this._mode === 'edit';
    this.innerHTML = `
      <div class="bf-block bf-image-block${isEdit ? ' is-editing' : ''}">
        <div class="bf-block-header">
          ${this._dragHandleHtml}
          <span class="bf-type-badge" style="background:#eff6ff;color:#1d4ed8">⎙ image</span>
          <input class="bf-label-input" type="text"
                 placeholder="Caption…"
                 value="${this._escAttr(this._label)}" />
          ${this._controlsHtml()}
        </div>
        <div class="bf-block-body" style="padding:16px">
          ${isEdit
            ? `<input class="img-url-input" type="url"
                 style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-family:var(--mono);font-size:12px"
                 placeholder="Paste image URL…"
                 value="${this._escAttr(this._content)}" />`
            : this._content
              ? `<img src="${this._escAttr(this._content)}" alt="${this._escAttr(this._label)}"
                      style="max-width:100%;border-radius:6px;display:block" />`
              : `<span class="bf-empty-hint">Empty — click edit to add image URL</span>`
          }
        </div>
      </div>`;

    this._wireControls();
    // Wire any block-specific controls beyond the shared set
    this.querySelector('.img-url-input')
      ?.addEventListener('input', e => { this._content = e.target.value; });
  }

  // ── 5. _afterEditRender — called after mode switches to 'edit' ────────
  // Mount complex editors here (Quill, CodeMirror, etc.)
  // For simple inputs rendered in _render(), nothing is needed.
  _afterEditRender() {}

  // ── 6. _snapshotBeforePreview — snapshot before leaving edit mode ─────
  _snapshotBeforePreview() {
    const input = this.querySelector('.img-url-input');
    if (input) this._content = input.value;
  }

  // ── 7. _onDestroy — nullify any editor instances ─────────────────────
  _onDestroy() {}

  // ── _save — snapshot + status + fire event ────────────────────────────
  _save() {
    const input = this.querySelector('.img-url-input');
    if (input) this._content = input.value;
    this._setStatus('saved');
    this._fireBlockSave();
  }
}

customElements.define('image-block', ImageBlock);
```

#### 2. Import in `src/js/main.js`

```js
import '../css/main.scss';
import { BlockBase } from './BlockBase.js';
import { TextBlock } from './TextBlock.js';
import { CodeBlock } from './CodeBlock.js';
import { Editor }    from './Editor.js';
import { ImageBlock } from './ImageBlock.js'; // ← add this

export { BlockBase, TextBlock, CodeBlock, Editor, ImageBlock };
export default Editor;
```

#### 3. Update `querySelectorAll` in `Editor.js`

In the three places that enumerate block types, add `image-block`:

```js
// In getAll():
[...this._listEl.querySelectorAll('text-block, code-block, image-block')]

// In _refreshCount():
this._listEl.querySelectorAll('text-block, code-block, image-block').length

// In _isBlock():
return tag === 'text-block' || tag === 'code-block' || tag === 'image-block';
```

#### 4. Add a button to the add-block strip in `Editor.js`

In `_buildShell()`, add a button inside `.bf-add-strip` and wire its click handler:

```js
// In the innerHTML template:
<button class="bf-add-btn bf-add-image">⎙ Image Block</button>

// In the event wiring below:
this.querySelector('.bf-add-image')
  .addEventListener('click', () => this.addBlock('image'));
```

Update `_createBlockEl()` to handle the new type:

```js
_createBlockEl(type, id) {
  const tagMap = {
    text:  'text-block',
    code:  'code-block',
    image: 'image-block',  // ← add this
  };
  const el = document.createElement(tagMap[type] || 'text-block');
  el.setAttribute('block-id', id);
  return el;
}
```

#### 5. Add styles in `src/css/main.scss`

```scss
.bf-image-block {
  // All existing .bf-block styles apply automatically.
  // Add image-specific overrides here.
}
```

> **CSS note:** No Shadow DOM is used, so all styles are global. Use the `.bf-image-block` class prefix to avoid collisions with the rest of the page.

#### 6. Rebuild

```bash
npm run build
npm publish
```

---

### BlockBase API Reference

#### Hooks (implement in subclasses)

| Hook | When called | What to do |
|------|-------------|------------|
| `_init()` | `connectedCallback` | Read attributes, initialise private state (`this._content`, `this._label`, etc.) |
| `_onAttrChange(name, val)` | Observed attribute changes | Update the corresponding private state variable. Guard with `if (this._mode !== 'edit')` where needed. |
| `_render()` | Mode changes, attribute changes | Set `this.innerHTML`. Call `this._wireControls()` at the end. |
| `_afterEditRender()` | After `_mode` switches to `'edit'` | Mount Quill / CodeMirror on the textarea/div created in `_render()`. Use a 20ms `setTimeout` to let DOM settle. |
| `_snapshotBeforePreview()` | Before `_mode` switches to `'preview'` | Read the live editor value into your private state (`this._content`, `this._raw`) and nullify the editor instance. |
| `_onDestroy()` | `disconnectedCallback` | Nullify editor instance references. |
| `_save()` | Save button click | Snapshot live value → `this._setStatus('saved')` → `this._fireBlockSave()`. |

#### Shared methods and properties

| Member | Type | Description |
|--------|------|-------------|
| `onSave(cb)` | method | Register save callback. Returns `this`. |
| `onDelete(cb)` | method | Register delete callback. Returns `this`. |
| `onEdit(cb)` | method | Register edit mode callback. Returns `this`. |
| `onPreview(cb)` | method | Register preview mode callback. Returns `this`. |
| `setMode(mode)` | method | Switch between `'edit'` and `'preview'`. |
| `blockData` | getter | Current block snapshot. Subclass must implement. |
| `_resolveId()` | helper | Reads `block-id` or `id` attribute, returns number or string. |
| `_getOrder()` | helper | 1-based position in nearest `.bf-blocks-list` or parent element. |
| `_setStatus(state)` | helper | Show `'saved'` or `'changed'` badge. Auto-hides after 2.2s if saved. |
| `_fireBlockSave()` | helper | Calls `_onSaveCb` then dispatches bubbling `block:save` CustomEvent. |
| `_fireBlockDelete()` | helper | Calls `_onDeleteCb` then dispatches bubbling `block:delete` CustomEvent. |
| `_deleteBlock()` | helper | Fires delete event + fade animation + removes element. |
| `_dragHandleHtml` | getter | SVG drag handle HTML string. |
| `_controlsHtml()` | method | Edit/preview/save/delete buttons HTML based on current mode. |
| `_wireControls()` | method | Attaches click listeners for all shared controls. Call at end of `_render()`. |
| `_escAttr(str)` | helper | Escapes `"` and `&` for safe use in HTML attribute values. |

---

### Editor API Reference

#### Public methods

| Method | Description |
|--------|-------------|
| `onSave(cb)` | Callback fired when any block is saved. Receives corrected `order`. Returns `this`. |
| `onSaveAll(cb)` | Callback fired when Save All is clicked. Receives array of all `BlockData`. Returns `this`. |
| `load(blockArray)` | Populate from JSON array. Each item: `{ id?, type, label?, language?, content?, raw? }`. Returns `this`. |
| `getAll()` | Returns `BlockData[]` in current DOM order. No callbacks fired. |
| `addBlock(type)` | Add a new empty block in edit mode. Returns the new element. |

#### Internal methods (reference for contributors)

| Method | Description |
|--------|-------------|
| `_buildShell()` | Replaces innerHTML with toolbar + list + add strip. Wires all button events. Attaches `block:save` and `block:delete` listeners on the list. |
| `_initSortable()` | Creates a SortableJS instance on `.bf-blocks-list` with `.bf-drag-handle` as the handle. |
| `_adoptBlock(el)` | Assigns a `block-id` if missing, advances `_idCounter`, appends to `.bf-blocks-list`. Idempotent. |
| `_registerBlock(el)` | Called by remote blocks (via `editor-id`). Calls `_adoptBlock`. |
| `_createBlockEl(type, id)` | Creates a `text-block` or `code-block` element with `block-id` set. |
| `_isBlock(node)` | Returns true if node is a `text-block` or `code-block` element. |
| `_refreshCount()` | Updates block count badge. Shows/hides empty state. |
| `_showEmptyState()` | Inserts `.bf-empty` placeholder into the list. |
| `_removeEmptyState()` | Removes `.bf-empty` placeholder. |
| `_toast(msg)` | Shows a toast notification. Auto-creates `#be-global-toasts` if not in DOM. |

---

## License

MIT