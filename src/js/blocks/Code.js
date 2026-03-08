export default class Code {
    static getHtml({ lang, highlighted }) {
        return `
            <div class="prv-cb">
                <div class="prv-cb-h">
                    <span>${lang}</span>
                </div>
                <pre>
                    <code class="hljs language-${lang}">${highlighted}</code>
                </pre>
            </div>`;
    }
}