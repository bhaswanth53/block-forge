# BlockForge

A lightweight, embeddable block-based editor built with Quill JS and CodeMirror. Add any number of text or code blocks to a page, reorder them by dragging, and save each block individually as HTML output.

---

## Features

- **Text blocks** — rich text editing powered by Quill JS (headings, bold, italic, lists, links, blockquote)
- **Code blocks** — syntax-highlighted code editor powered by CodeMirror with language switching
- **Drag to reorder** — reorder blocks via a drag handle, order is reflected in save callbacks
- **Per-block save** — save individual blocks via callback, returns HTML output
- **Save all** — save all blocks at once as a JSON array
- **Pre-load from JSON** — restore blocks on page load from your database records, including custom IDs
- **HTML output** — text blocks return Quill HTML; code blocks return highlight.js-parsed HTML in the `prv-cb` format
- **Export** — download all block outputs as a single `.html` file

---

## Installation

### npm

```bash
npm install @bhaswanth53/block-forge
```

### CDN / plain `<script>` tag

```html
<link rel="stylesheet" href="dist/block-forge.css" />
<script src="dist/block-forge.umd.js"></script>
```

---

## Usage

### With a bundler (Vite, Webpack, Rollup, etc.)

Import the class and its styles in your JS entry file:

```js
import BlockEditor from '@bhaswanth53/block-forge';
import '@bhaswanth53/block-forge/css';

const editor = new BlockEditor("#editor-container");
```

Add the required markup to your HTML:

```html
<!-- Editor mount point -->
<div id="editor-container"></div>

<!-- Toast notifications (place anywhere in <body>) -->
<div class="be-toast-box" id="be-global-toasts"></div>
```

#### React

```jsx
import { useEffect, useRef } from 'react';
import BlockEditor from 'block-forge';
import 'block-forge/dist/block-forge.css';

export default function Editor() {
  const editorRef = useRef(null);

  useEffect(() => {
    const editor = new BlockEditor("#editor-container");

    editor.onSave((block) => {
      console.log("Saved block ::", block);
    });

    editor.onSaveAll((blocks) => {
      console.log("All blocks ::", blocks);
    });

    // Cleanup not required — editor has no destroy method
  }, []);

  return (
    <>
      <div id="editor-container" ref={editorRef}></div>
      <div className="be-toast-box" id="be-global-toasts"></div>
    </>
  );
}
```

#### Vue

```vue
<template>
  <div id="editor-container"></div>
  <div class="be-toast-box" id="be-global-toasts"></div>
</template>

<script setup>
import { onMounted } from 'vue';
import BlockEditor from 'block-forge';
import 'block-forge/dist/block-forge.css';

onMounted(() => {
  const editor = new BlockEditor("#editor-container");

  editor.onSave((block) => {
    console.log("Saved block ::", block);
  });
});
</script>
```

---

### Without a bundler (plain `<script>` tag)

```html
<link rel="stylesheet" href="node_modules/block-forge/dist/block-forge.css" />

<div id="editor-container"></div>
<div class="be-toast-box" id="be-global-toasts"></div>

<script src="node_modules/block-forge/dist/block-forge.umd.js"></script>
<script>
  const editor = new BlockEditor("#editor-container");

  editor.onSave((block) => {
    console.log("Block id    ::", block.id);
    console.log("Block type  ::", block.type);
    console.log("Block order ::", block.order);
    console.log("Block output::", block.content);
  });
</script>
```

---

## API

### `new BlockEditor(selector)`

Creates and mounts the editor inside the element matching `selector`.

```js
const editor = new BlockEditor("#editor-container");
```

---

### `editor.onSave(callback)`

Fires when the **Save** button on an individual block is clicked.

```js
editor.onSave((block) => {
  console.log("Block id    ::", block.id);
  console.log("Block type  ::", block.type);    // "text" | "code"
  console.log("Block order ::", block.order);   // 1-based position in DOM
  console.log("Block label ::", block.label);   // value of the label input
  console.log("Block output::", block.content); // HTML string
});
```

---

### `editor.onSaveAll(callback)`

Fires when the **Save All** toolbar button is clicked. Receives an array of all blocks in current DOM order.

```js
editor.onSaveAll((blocks) => {
  console.log("All blocks ::", blocks);
  // blocks → [{ id, type, order, label, content }, ...]
});
```

---

### `editor.load(blockArray)`

Pre-populates the editor from an array of block objects. Ideal for restoring saved state from a database on page load.

```js
editor.load([
  {
    id:      42,              // custom id from your DB (optional — auto-assigned if omitted)
    type:    "text",
    label:   "Introduction",
    content: "<h2>Hello</h2><p>World</p>",
  },
  {
    id:       43,
    type:     "code",
    label:    "Example",
    language: "javascript",   // see supported languages below
    content:  `console.log("Hello from BlockForge!");`,
  },
]);
```

> **Note:** For code blocks, pass the raw code string as `content` — not the rendered HTML. BlockForge will highlight it on load.

---

### `editor.getAll()`

Returns the current state of all blocks in DOM order without triggering any save callbacks.

```js
const snapshot = editor.getAll();
// → [{ id, type, order, label, content }, ...]
```

---

## Block Object Shape

Every callback and `getAll()` returns block objects with this shape:

| Field | Type | Description |
|---|---|---|
| `id` | `number \| string` | Block identifier — your custom DB id, or auto-incremented |
| `type` | `string` | `"text"` or `"code"` |
| `order` | `number` | 1-based position in the current DOM order |
| `label` | `string` | Value of the optional label input in the block header |
| `content` | `string` | HTML output (see output formats below) |

---

## Output Formats

### Text block

Returns standard Quill HTML:

```html
<h2>Hello</h2>
<p>This is <strong>bold</strong> and <em>italic</em>.</p>
```

### Code block

Returns highlight.js-parsed HTML in the `prv-cb` format:

```html
<div class="prv-cb">
  <div class="prv-cb-h"><span>javascript</span></div>
  <pre><code class="hljs language-javascript">
    <span class="hljs-variable language_">console</span>.<span class="hljs-title function_">log</span>(<span class="hljs-string">&quot;Hello&quot;</span>);
  </code></pre>
</div>
```

---

## Supported Languages

| Value | Label |
|---|---|
| `javascript` | JavaScript |
| `typescript` | TypeScript |
| `python` | Python |
| `html` | HTML |
| `css` | CSS |
| `java` | Java |
| `cpp` | C++ |
| `bash` | Bash |
| `plaintext` | Plain Text |

---

## Database Integration

Custom IDs let you map blocks directly to database records.

```js
// Load from DB on page init
const dbBlocks = await fetch('/api/blocks').then(r => r.json());
editor.load(dbBlocks);

// Update a single block on save
editor.onSave(async (block) => {
  await fetch(`/api/blocks/${block.id}`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      content: block.content,
      order:   block.order,
      label:   block.label,
    }),
  });
});

// Bulk save all blocks
editor.onSaveAll(async (blocks) => {
  await fetch('/api/blocks', {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(blocks),
  });
});
```

> **ID collision safety:** If you load blocks with custom numeric IDs, `idCounter` automatically advances past the highest loaded ID so any new blocks added by the user never clash with existing DB records.

---

## Building from Source

```bash
npm install
npm run build
```

Output:

```
dist/
├── block-forge.js        ← ESM bundle (for bundlers)
├── block-forge.umd.js    ← UMD bundle (for plain <script> tags)
└── block-forge.css       ← compiled styles
```

### Requirements

```bash
npm install --save-dev vite sass
```

---

## Project Structure

```
block-forge/
├── src/
│   ├── js/
│   │   ├── main.js          ← entry point (imports SCSS + exports BlockEditor)
│   │   └── BlockEditor.js   ← editor class
│   └── css/
│       └── main.scss        ← styles
├── dist/                    ← build output (gitignored)
├── index.html               ← demo page
├── vite.config.js
└── package.json
```

---

## License

MIT