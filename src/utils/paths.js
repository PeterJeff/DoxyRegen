const vscode = require('vscode');
const path = require('path');

function resolveToAbsolutePath(relativePath) {
    if (path.isAbsolute(relativePath)) {
        return relativePath;
    }
    return path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, relativePath);
}

function getWorkspacePath() {
    return vscode.workspace.workspaceFolders?.[0].uri.fsPath;
}

module.exports = {
    resolveToAbsolutePath,
    getWorkspacePath
};
