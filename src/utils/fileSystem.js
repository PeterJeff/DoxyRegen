const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

async function ensureDirectoryExists(dirPath) {
    try {
        await vscode.workspace.fs.createDirectory(vscode.Uri.file(dirPath));
        return true;
    } catch (err) {
        if (err.code !== 'FileExists') {
            throw err;
        }
        return true;
    }
}

function getSubdirectories(dir) {
    const subdirs = [dir];
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory()) {
                const fullPath = path.join(dir, entry.name);
                subdirs.push(fullPath);
            }
        }
    } catch (error) {
        console.error(`Error reading directory ${dir}:`, error);
    }
    return subdirs;
}

module.exports = {
    ensureDirectoryExists,
    getSubdirectories
};
