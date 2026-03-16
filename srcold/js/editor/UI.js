export default class UI {
    static getEmptyStateHtml() {
        return `
            <div class="be-empty-icon">✦</div>
            <h3>No blocks yet</h3>
            <p>Add a text or code block to get started</p>
        `;
    }

    static getIntroHtml() {
        return `
            <h3>Add a text or code block to get started</h3>
        `;
    }
}