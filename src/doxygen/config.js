const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { resolveToAbsolutePath } = require('../utils/paths');

function getDoxygenConfig() {
    const config = vscode.workspace.getConfiguration('doxyRefresh');
    const doxygenPath = config.get('doxygenPath') || path.join(__dirname, 'doxygen', 'doxygen.exe');
    const doxyfilePath = resolveToAbsolutePath(config.get('doxyfilePath'));
    const outputDirectory = config.get('outputDirectory');
    const watchPatterns = config.get('watchPatterns');

    return {
        doxygenPath,
        doxyfilePath,
        outputDirectory,
        watchPatterns
    };
}

function parseDoxyfile(doxyfilePath) {
    const doxyfileContent = fs.readFileSync(doxyfilePath, 'utf8');
    const lines = doxyfileContent.split('\n');
    
    let htmlOutput = 'html';
    let outputDir = '';
    
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('HTML_OUTPUT')) {
            const match = trimmed.match(/HTML_OUTPUT\s*=\s*(.+)/);
            if (match) htmlOutput = match[1].trim();
        }
        else if (trimmed.startsWith('OUTPUT_DIRECTORY')) {
            const match = trimmed.match(/OUTPUT_DIRECTORY\s*=\s*(.+)/);
            if (match) outputDir = match[1].trim();
        }
    }

    return {
        htmlOutput,
        outputDir
    };
}

function getOutputPaths(doxyfilePath, configOutputDir) {
    const { htmlOutput, outputDir: doxyfileOutputDir } = parseDoxyfile(doxyfilePath);
    const outputDir = configOutputDir || doxyfileOutputDir;
    
    const htmlDir = resolveToAbsolutePath(
        path.join(outputDir, htmlOutput)
    );

    return {
        outputDir,
        htmlDir
    };
}

function findTargetHtmlFile(htmlDir, filePath) {
    let targetFile;
    if (filePath) {
        const fileName = path.basename(filePath, path.extname(filePath));
        targetFile = path.join(htmlDir, fileName + '.html');
        if (!fs.existsSync(targetFile)) {
            targetFile = path.join(htmlDir, 'index.html');
        }
    } else {
        targetFile = path.join(htmlDir, 'index.html');
    }
    return targetFile;
}

module.exports = {
    getDoxygenConfig,
    parseDoxyfile,
    getOutputPaths,
    findTargetHtmlFile
};
