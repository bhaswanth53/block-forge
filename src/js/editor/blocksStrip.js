export default class BlockStrip {
    static getHtml() {
        return `
            <button class="be-add-btn add-text">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                    <path d="M4 6h16M4 12h16M4 18h7"/>
                </svg>
                Text Block
            </button>
            <button class="be-add-btn add-code">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                    <polyline points="16,18 22,12 16,6"/>
                    <polyline points="8,6 2,12 8,18"/>
                </svg>
                Code Block
            </button>
        `;
    }
}