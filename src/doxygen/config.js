const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { resolveToAbsolutePath } = require('../utils/paths');

function findDoxygenInPath() {
    try {
        // Try 'where doxygen' on Windows or 'which doxygen' on Unix
        const cmd = process.platform === 'win32' ? 'where doxygen' : 'which doxygen';
        const result = execSync(cmd, { encoding: 'utf8' }).trim();
        return result.split('\n')[0]; // Take first result if multiple are found
    } catch (error) {
        return null;
    }
}

function getDoxygenConfig() {
    const config = vscode.workspace.getConfiguration('DoxyRegen');
    const doxygenPath = config.get('doxygenPath');
    const doxyfilePath = resolveToAbsolutePath(config.get('doxyfilePath'));
    const outputDirectory = config.get('outputDirectory');
    const watchPatterns = config.get('watchPatterns');
    
    // If no path configured, try to find doxygen in PATH
    if (!doxygenPath) {
        const pathDoxygen = findDoxygenInPath();
        if (pathDoxygen) {
            // This part looks like nonsense to me.  We don't want to try and update doxygen config display values while we are tying to use it
            updateDoxygenPathDescription(pathDoxygen);
            return {
                doxygenPath: pathDoxygen,
                doxyfilePath,
                outputDirectory,
                watchPatterns
            };
        } else {
            vscode.window.showErrorMessage('Doxygen not found in PATH. Please install Doxygen or configure DoxyRegen.doxygenPath.');
            return {
                doxygenPath: 'doxygen', // Set a default that will fail with a clear error if doxygen isn't available
                doxyfilePath,
                outputDirectory,
                watchPatterns
            };
        }
    }

    return {
        doxygenPath,
        doxyfilePath,
        outputDirectory,
        watchPatterns
    };
}

// Separate function to handle configuration updates
async function updateDoxygenPathDescription(pathDoxygen) {
    try {
        const configSection = vscode.workspace.getConfiguration('DoxyRegen');
        const configTarget = vscode.ConfigurationTarget.Global;
        
        const configUpdate = {
            ...configSection.inspect('doxygenPath'),
            markdownDescription: `Optional path to the Doxygen executable. If not set, will use doxygen from PATH.\n\n**Currently found at:** \`${pathDoxygen}\``,
        };
        
        await vscode.workspace.getConfiguration().update(
            'DoxyRegen.doxygenPath',
            configSection.get('doxygenPath'),
            configTarget,
            configUpdate
        );
    } catch (error) {
        console.error('Failed to update configuration description:', error);
    }
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
