const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const { getSubdirectories } = require('../utils/fileSystem');
const { processHtml } = require('./htmlProcessor');

let doxygenPanel;

function setupWebviewPanel(htmlPath, title) {
    const htmlDir = path.dirname(htmlPath);
    const resourceDirs = getSubdirectories(htmlDir);

    if (doxygenPanel) {
        doxygenPanel.dispose();
    }

    doxygenPanel = vscode.window.createWebviewPanel(
        'doxygenOutput',
        title,
        vscode.ViewColumn.Two,
        {
            enableScripts: true,
            localResourceRoots: resourceDirs.map(dir => vscode.Uri.file(dir)),
            retainContextWhenHidden: true,
            enableFindWidget: true,
            enableDefaultStyles: false
        }
    );

    return doxygenPanel;
}

function openHtmlInPreview(htmlPath) {
    try {
        const panel = setupWebviewPanel(htmlPath, path.basename(htmlPath));
        let html = fs.readFileSync(htmlPath, 'utf8');
        const baseUri = panel.webview.asWebviewUri(vscode.Uri.file(path.dirname(htmlPath)));
        
        html = processHtml(html, baseUri);
        panel.webview.html = html;
    } catch (error) {
        console.error('Error showing HTML file:', error);
        vscode.window.showErrorMessage(`Failed to open HTML file: ${error.message}`);
        if (doxygenPanel) {
            doxygenPanel.webview.html = `
                <html><body>
                    <h1>Error</h1>
                    <p>Failed to load HTML file: ${error.message}</p>
                </body></html>
            `;
        }
    }
}

function showErrorInPanel(message) {
    if (doxygenPanel) {
        doxygenPanel.webview.html = `
            <html><body>
                <h1>Error</h1>
                <p>${message}</p>
            </body></html>
        `;
    }
}

module.exports = {
    openHtmlInPreview,
    showErrorInPanel,
    dispose: () => {
        if (doxygenPanel) {
            doxygenPanel.dispose();
        }
    }
};
