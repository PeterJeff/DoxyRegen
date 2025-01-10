const vscode = require('vscode');
const { registerCommands } = require('./commands');
const { initialize: initializeExecutor, runDoxygen } = require('../doxygen/executor');
const { dispose: disposePanel } = require('../webview/panel');
const { getDoxygenConfig } = require('../doxygen/config');

let outputChannel;
let fileWatcher;

function activate(context) {
    // Initialize output channel
    outputChannel = vscode.window.createOutputChannel("DoxyRefresh");
    initializeExecutor(outputChannel);
    
    // Register commands
    registerCommands(context);
    
    // Setup file watcher
    setupFileWatcher(context);
    
    // Add output channel to subscriptions
    context.subscriptions.push(outputChannel);
}

function setupFileWatcher(context) {
    if (vscode.workspace.workspaceFolders) {
        const config = getDoxygenConfig();
        const patterns = config.watchPatterns;
        
        const watcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(vscode.workspace.workspaceFolders[0], "{" + patterns.join(',') + "}")
        );
        
        watcher.onDidChange((uri) => {
            runDoxygen(uri.fsPath);
        });
        
        fileWatcher = watcher;
        context.subscriptions.push(fileWatcher);
    }
}

function deactivate() {
    if (fileWatcher) {
        fileWatcher.dispose();
    }
    disposePanel();
}

module.exports = {
    activate,
    deactivate
};
