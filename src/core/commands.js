const vscode = require('vscode');
const { runDoxygen } = require('../doxygen/executor');
const { openHtmlInPreview } = require('../webview/panel');

function registerCommands(context) {
    // Register the refresh command
    const refreshCommand = vscode.commands.registerCommand('DoxyRegen.refresh', () => {
        runDoxygen(null);
    });

    // Register the preview command
    const openInPreviewCommand = vscode.commands.registerCommand('DoxyRegen.openInPreview', (uri) => {
        if (!uri) {
            vscode.window.showErrorMessage('No file selected');
            return;
        }
        openHtmlInPreview(uri.fsPath);
    });

    // Add commands to subscriptions
    context.subscriptions.push(refreshCommand, openInPreviewCommand);
}

module.exports = {
    registerCommands
};
