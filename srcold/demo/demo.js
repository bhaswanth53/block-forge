import BlockEditor from "../js/main.js";

const editor = new BlockEditor("#editor-container");

editor.onSave((block) => {
    console.group(`💾 Block Saved`);
    console.log("Block id    ::", block.id);
    console.log("Block type  ::", block.type);
    console.log("Block order ::", block.order);
    console.log("Block label ::", block.label);
    console.log("Block output::", block.content);
    console.groupEnd();
});

// Called when the Save All button is clicked — receives full array
editor.onSaveAll((blocks) => {
    console.group(`💾 Save All — ${blocks.length} block(s)`);
    console.table(blocks.map(b => ({ id: b.id, type: b.type, order: b.order, label: b.label })));
    console.log("Full JSON ::", blocks);
    console.groupEnd();
});

// Pre-load blocks on page init from a JSON array
editor.load([
    {
        type: 'text',
        label: 'Introduction',
        content: '<h2>Welcome to BlockEd</h2><p>Each block is independently editable and saves its content as HTML. Drag the <strong>⠿ handle</strong> to reorder blocks.</p>',
    },
    {
        type: 'code',
        label: 'Quick start',
        language: 'javascript',
        content: 'const editor = new BlockEditor("#editor-container");\n\neditor.onSave((block) => {\n  console.log("Block id    ::", block.id);\n  console.log("Block type  ::", block.type);\n  console.log("Block order ::", block.order);\n  console.log("Block output::", block.content);\n});\n\neditor.onSaveAll((blocks) => {\n  console.log("All blocks ::", blocks);\n});',
    },
]);