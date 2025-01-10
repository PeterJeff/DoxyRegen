const vscode = require('vscode');
const path = require('path');
const { spawn } = require('child_process');
const { ensureDirectoryExists } = require('../utils/fileSystem');
const { getDoxygenConfig, getOutputPaths, findTargetHtmlFile } = require('./config');
const { openHtmlInPreview, showErrorInPanel } = require('../webview/panel');

let outputChannel;

function initialize(channel) {
    outputChannel = channel;
}

async function runDoxygen(filePath) {
    const config = getDoxygenConfig();
    
    if (!config.doxyfilePath) {
        vscode.window.showErrorMessage('Doxyfile path not configured. Please set doxyRefresh.doxyfilePath in settings.');
        return;
    }
    
    outputChannel.clear();
    outputChannel.show();
    outputChannel.appendLine('Running Doxygen...');
    
    try {
        const { outputDir, htmlDir } = getOutputPaths(config.doxyfilePath, config.outputDirectory);
        
        if (outputDir) {
            try {
                await ensureDirectoryExists(outputDir);
                await ensureDirectoryExists(htmlDir);
                outputChannel.appendLine(`Ensured directories exist: ${outputDir} and ${htmlDir}`);
            } catch (err) {
                if (err.code !== 'FileExists') {
                    outputChannel.appendLine(`Warning: Failed to create directories: ${err.message}`);
                }
            }
        }
        
        outputChannel.appendLine(`Using Doxyfile: ${config.doxyfilePath}`);
        if (filePath) {
            outputChannel.appendLine(`Documenting specific file: ${filePath}`);
        } else {
            outputChannel.appendLine('Using INPUT settings from Doxyfile');
        }
        if (config.outputDirectory) {
            outputChannel.appendLine(`Output directory override: ${config.outputDirectory}`);
        }

        let command = `(type "${config.doxyfilePath}"`;
        
        if (filePath) {
            const normalizedPath = path.normalize(filePath);
            outputChannel.appendLine(`Setting INPUT to: ${normalizedPath}`);
            command += ` & echo INPUT=${normalizedPath}`;
        }
        
        if (config.outputDirectory) {
            const normalizedPath = path.normalize(config.outputDirectory);
            outputChannel.appendLine(`Setting OUTPUT_DIRECTORY to: ${normalizedPath}`);
            command += ` & echo OUTPUT_DIRECTORY=${normalizedPath}`;
        }
        
        command += `) | "${config.doxygenPath}" -`;
        outputChannel.appendLine(`Executing command: ${command}`);
        
        const doxygen = spawn(command, [], { 
            shell: true,
            cwd: vscode.workspace.workspaceFolders[0].uri.fsPath 
        });
        
        let doxygenOutput = '';
        
        doxygen.stdout.on('data', (data) => {
            const output = data.toString();
            doxygenOutput += output;
            outputChannel.append(output);
        });
        
        doxygen.stderr.on('data', (data) => {
            const output = data.toString();
            doxygenOutput += output;
            outputChannel.append(output);
            
            if (output.toLowerCase().includes('error')) {
                outputChannel.appendLine('Error detected in Doxygen output');
            }
            if (output.toLowerCase().includes('no input files')) {
                outputChannel.appendLine('Warning: No input files specified or found');
            }
            if (output.toLowerCase().includes('permission denied')) {
                outputChannel.appendLine('Warning: Permission issues detected');
            }
        });
        
        doxygen.on('close', (code) => {
            if (code === 0) {
                outputChannel.appendLine('Doxygen completed successfully.');
                if (doxygenOutput.includes('warning')) {
                    outputChannel.appendLine('Note: Warnings were generated during documentation creation');
                }
                showDoxygenOutput(filePath, config.doxyfilePath);
            } else {
                outputChannel.appendLine(`Doxygen process exited with code ${code}`);
                const lastLines = doxygenOutput.split('\n').slice(-5).join('\n');
                outputChannel.appendLine('Last few lines of output:');
                outputChannel.appendLine(lastLines);
                vscode.window.showErrorMessage('Doxygen generation failed. Check the output for details.');
            }
        });
    } catch (error) {
        outputChannel.appendLine(`Error running Doxygen: ${error.message}`);
        if (error.code === 'ENOENT') {
            vscode.window.showErrorMessage('Doxygen not found. Please ensure Doxygen is installed and either in PATH or configured in settings.');
        } else {
            vscode.window.showErrorMessage('Failed to run Doxygen. Check if the path is correct and you have necessary permissions.');
        }
    }
}

function showDoxygenOutput(filePath, doxyfilePath) {
    try {
        const config = getDoxygenConfig();
        const { htmlDir } = getOutputPaths(doxyfilePath, config.outputDirectory);
        const targetFile = findTargetHtmlFile(htmlDir, filePath);

        if (targetFile && require('fs').existsSync(targetFile)) {
            openHtmlInPreview(targetFile);
        } else {
            outputChannel.appendLine(`No HTML files found in ${htmlDir}`);
            if (filePath) {
                outputChannel.appendLine(`Expected file: ${path.join(htmlDir, path.basename(filePath, path.extname(filePath)) + '.html')}`);
            }
            outputChannel.appendLine(`Expected index: ${path.join(htmlDir, 'index.html')}`);
            
            showErrorInPanel(`
                <h1>Doxygen Output</h1>
                <p>Documentation has been generated in: ${htmlDir}</p>
                ${filePath ? `<p>Generated for file: ${filePath}</p>` : ''}
                <p>Note: No HTML files were found in the output directory. This could mean:</p>
                <ul>
                    <li>The documentation generation failed (check the output log)</li>
                    <li>The output directory setting is incorrect</li>
                    <li>The HTML_OUTPUT setting in Doxyfile needs to be checked</li>
                </ul>
            `);
        }
    } catch (error) {
        console.error('Error showing doxygen output:', error);
        showErrorInPanel(`Failed to load documentation: ${error.message}`);
    }
}

module.exports = {
    initialize,
    runDoxygen
};
