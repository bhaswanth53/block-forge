import { LANGUAGES } from "../utils/variables.js";

export default class DefaultBlock {
    static getHtml({ isCode, id, label, block }) {
        const languageOptions = LANGUAGES.map((lang) => `<option value="${lang.value}" ${lang.value === block.language ? 'selected' : ''}>${lang.label}</option>`).join('');
        
        return `
            <div class="be-block-header">
                <div class="be-drag-handle" title="Drag to reorder">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="9"  cy="5"  r="1.6"/>
                        <circle cx="15" cy="5"  r="1.6"/>
                        <circle cx="9"  cy="12" r="1.6"/>
                        <circle cx="15" cy="12" r="1.6"/>
                        <circle cx="9"  cy="19" r="1.6"/>
                        <circle cx="15" cy="19" r="1.6"/>
                    </svg>
                </div>

                <span class="be-type-badge ${isCode ? 'badge-code' : 'badge-text'}">
                    ${isCode ? '&lt;/&gt; code' : '&para; text'}
                </span>

                ${isCode ? `<select class="be-lang-select" data-action="lang" data-id="${id}">${languageOptions}</select>` : ''}

                <input
                    class="be-label-input"
                    type="text"
                    placeholder="Label this block…"
                    value="${label}"
                    data-action="label"
                    data-id="${id}"
                />

                <div class="be-block-controls">
                    <span class="be-save-status" data-action="status" data-id="${id}"></span>

                    <button type="button" class="be-icon-btn" data-action="preview" data-id="${id}" title="Toggle output preview">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                    </button>

                    <button type="button" class="be-icon-btn btn-save" data-action="save" data-id="${id}" title="Save this block">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                            <polyline points="17,21 17,13 7,13 7,21"/>
                            <polyline points="7,3 7,8 15,8"/>
                        </svg>
                    </button>

                    <button type="button" class="be-icon-btn btn-delete" data-action="delete" data-id="${id}" title="Delete this block">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3,6 5,6 21,6"/>
                            <path d="M19,6l-1,14a2,2,0,01-2,2H8a2,2,0,01-2-2L5,6"/>
                            <path d="M10,11v6M14,11v6"/>
                            <path d="M9,6V4a1,1,0,011-1h4a1,1,0,011,1v2"/>
                        </svg>
                    </button>
                </div>
            </div>

            <!-- Editor mount point -->
            <div class="be-block-body" data-body="${id}">
                ${isCode
                    ? `<div class="be-code-body"><textarea data-cm="${id}"></textarea></div>`
                    : `<div class="be-text-body"><div data-quill="${id}"></div></div>`
                }
            </div>

            <!-- Output preview panel (hidden by default) -->
            <div class="be-preview-panel" data-preview-panel="${id}">
                <div class="be-preview-header">
                    <span>output preview</span>
                    <button type="button" class="be-icon-btn" data-action="preview" data-id="${id}" title="Close" style="width:18px;height:18px;font-size:11px">✕</button>
                </div>
                <div class="be-preview-content" data-preview-content="${id}"></div>
            </div>
        `;
    }
}