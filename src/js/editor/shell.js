export default class Editorhell {
    static getHtml(uid) {
        return `
            <div class="be-toolbar-left">
                <span class="be-brand">Block<em>Ed</em></span>
                <span class="be-block-count" id="be-count-${uid}">0 blocks</span>
            </div>
            <div class="be-toolbar-right">
                <button class="be-btn be-btn-outline" id="be-export-${uid}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="7,10 12,15 17,10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Export
                </button>
                <button class="be-btn be-btn-primary" id="be-saveall-${uid}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                    <polyline points="17,21 17,13 7,13 7,21"/>
                    <polyline points="7,3 7,8 15,8"/>
                </svg>
                Save All
                </button>
            </div>
        `;
    }
}