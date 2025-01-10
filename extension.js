/*
TODO: Remaining improvements needed:
1. Add path validation for doxygen executable and doxyfile
   - Check if files exist before attempting to run
   - Show clear error messages for missing files
2. Improve error handling for common doxygen issues
   - Handle missing dependencies
   - Better reporting of syntax errors in doxyfile
3. Add workspace path resolution
   - Handle relative paths better
   - Support multi-root workspaces
4. Improve webview panel
   - Add reload button
   - Better CSS styling for error messages
   - Show doxygen warnings inline
5. Add status bar integration
   - Show documentation generation progress
   - Quick access to output panel
*/

const vscode = require('vscode');
const path = require('path');
const { spawn } = require('child_process');

let outputChannel;
let fileWatcher;
let doxygenPanel;

function activate(context) {
    outputChannel = vscode.window.createOutputChannel("DoxyRefresh");
    
    // Register the refresh command
    let refreshCommand = vscode.commands.registerCommand('doxyRefresh.refresh', () => {
        runDoxygen(null);
    });

    let openInPreviewCommand = vscode.commands.registerCommand('doxyRefresh.openInPreview', (uri) => {
        if (!uri) {
            vscode.window.showErrorMessage('No file selected');
            return;
        }
        openHtmlInPreview(uri.fsPath);
    });
    
    // Get configuration
    const config = vscode.workspace.getConfiguration('doxyRefresh');
    const patterns = config.get('watchPatterns');
    
    // Setup file watcher
    if (vscode.workspace.workspaceFolders) {
        const watcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(vscode.workspace.workspaceFolders[0], "{" + patterns.join(',') + "}")
        );
        
        watcher.onDidChange((uri) => {
            runDoxygen(uri.fsPath);
        });
        
        fileWatcher = watcher;
    }
    
    context.subscriptions.push(refreshCommand, openInPreviewCommand);
    context.subscriptions.push(outputChannel);
    if (fileWatcher) {
        context.subscriptions.push(fileWatcher);
    }
}

function deactivate() {
    if (fileWatcher) {
        fileWatcher.dispose();
    }
    if (doxygenPanel) {
        doxygenPanel.dispose();
    }
}

async function runDoxygen(filePath) {
    const config = vscode.workspace.getConfiguration('doxyRefresh');
    const doxygenPath = config.get('doxygenPath') || path.join(__dirname, 'doxygen', 'doxygen.exe');
    // doxyfilePath points to the Doxygen configuration file (Doxyfile) that contains settings
    // like OUTPUT_DIRECTORY and HTML_OUTPUT which determine where docs are generated
    const doxyfilePath = path.isAbsolute(config.get('doxyfilePath'))
        ? config.get('doxyfilePath')
        : path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, config.get('doxyfilePath'));
    
    if (!doxyfilePath) {
        vscode.window.showErrorMessage('Doxyfile path not configured. Please set doxyRefresh.doxyfilePath in settings.');
        return;
    }
    
    outputChannel.clear();
    outputChannel.show();
    outputChannel.appendLine('Running Doxygen...');
    
    try {
        const outputDirectory = config.get('outputDirectory');
        
        if (outputDirectory) {
            const fullOutputPath = path.isAbsolute(outputDirectory) 
                ? outputDirectory 
                : path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, outputDirectory);
            
            const htmlPath = path.join(fullOutputPath, 'html');
            
            try {
                await vscode.workspace.fs.createDirectory(vscode.Uri.file(fullOutputPath));
                await vscode.workspace.fs.createDirectory(vscode.Uri.file(htmlPath));
                outputChannel.appendLine(`Ensured directories exist: ${fullOutputPath} and ${htmlPath}`);
            } catch (err) {
                if (err.code !== 'FileExists') {
                    outputChannel.appendLine(`Warning: Failed to create directories: ${err.message}`);
                }
            }
        }
        
        outputChannel.appendLine(`Using Doxyfile: ${doxyfilePath}`);
        if (filePath) {
            outputChannel.appendLine(`Documenting specific file: ${filePath}`);
        } else {
            outputChannel.appendLine('Using INPUT settings from Doxyfile');
        }
        if (outputDirectory) {
            outputChannel.appendLine(`Output directory override: ${outputDirectory}`);
        }

        let command = `(type "${doxyfilePath}"`;
        
        if (filePath) {
            const normalizedPath = path.normalize(filePath);
            outputChannel.appendLine(`Setting INPUT to: ${normalizedPath}`);
            command += ` & echo INPUT=${normalizedPath}`;
        }
        
        if (outputDirectory) {
            const normalizedPath = path.isAbsolute(outputDirectory)
                ? path.normalize(outputDirectory)
                : path.normalize(path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, outputDirectory));
            outputChannel.appendLine(`Setting OUTPUT_DIRECTORY to: ${normalizedPath}`);
            command += ` & echo OUTPUT_DIRECTORY=${normalizedPath}`;
        }
        
        command += `) | "${doxygenPath}" -`;
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
                showDoxygenOutput(filePath, doxyfilePath);
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
        vscode.window.showErrorMessage('Failed to run Doxygen. Check if the path is correct.');
    }
}

function setupWebviewPanel(htmlPath, title) {
    const htmlDir = path.dirname(htmlPath);
    
    // Create an array of all possible resource directories
    // Include all possible resource directories that Doxygen might use
    // Get all subdirectories recursively
    const getSubdirectories = (dir) => {
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
    };

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
            retainContextWhenHidden: true
        }
    );

    return doxygenPanel;
}

function processHtml(html, baseUri) {
    // Add CSP meta tag with broader permissions for dynamic loading
    const csp = `<meta http-equiv="Content-Security-Policy" 
        content="default-src 'self' ${baseUri} vscode-resource: data: blob:; 
        img-src ${baseUri} vscode-resource: data: blob: 'self'; 
        script-src ${baseUri} vscode-resource: 'unsafe-inline' 'unsafe-eval'; 
        style-src ${baseUri} vscode-resource: 'unsafe-inline';
        connect-src ${baseUri} vscode-resource: 'self';">`;
    html = html.replace('</head>', `${csp}</head>`);

    // Add base tag to help resolve relative paths
    const baseTag = `<base href="${baseUri}/">`;
    html = html.replace('</head>', `${baseTag}</head>`);

    // Handle all resource references
    const replacements = [
        // Link tags (CSS)
        {
            regex: /<link\s+[^>]*href="([^"]+)"[^>]*>/g,
            attr: 'href'
        },
        // Script tags
        {
            regex: /<script\s+[^>]*src="([^"]+)"[^>]*>/g,
            attr: 'src'
        },
        // Image tags
        {
            regex: /<img\s+[^>]*src="([^"]+)"[^>]*>/g,
            attr: 'src'
        },
        // Background images and other CSS url() references
        {
            regex: /url\(['"]?([^'")\s]+)['"]?\)/g,
            replacement: (match, url) => {
                if (!url.startsWith('http')) {
                    return `url('${baseUri}/${url}')`;
                }
                return match;
            }
        }
    ];

    replacements.forEach(({ regex, attr, replacement }) => {
        if (attr) {
            html = html.replace(regex, (match, url) => {
                if (!url.startsWith('http')) {
                    return match.replace(url, `${baseUri}/${url}`);
                }
                return match;
            });
        } else if (replacement) {
            html = html.replace(regex, replacement);
        }
    });

    return html;
}

function openHtmlInPreview(htmlPath) {
    try {
        const panel = setupWebviewPanel(htmlPath, path.basename(htmlPath));
        const fs = require('fs');
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

function showDoxygenOutput(filePath, doxyfilePath) {
    try {
        const fs = require('fs');
        const doxyfileContent = fs.readFileSync(doxyfilePath, 'utf8');
        const lines = doxyfileContent.split('\n');
        const config = vscode.workspace.getConfiguration('doxyRefresh');
        
        let htmlOutput = 'html';
        let outputDir = '';
        
        const configOutputDir = config.get('outputDirectory');
        if (configOutputDir) {
            outputDir = configOutputDir;
        } else {
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
        }
        
        const htmlDir = path.isAbsolute(outputDir)
            ? path.join(outputDir, htmlOutput)
            : path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, outputDir, htmlOutput);

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

        if (fs.existsSync(targetFile)) {
            openHtmlInPreview(targetFile);
        } else {
            outputChannel.appendLine(`No HTML files found in ${htmlDir}`);
            if (filePath) {
                outputChannel.appendLine(`Expected file: ${path.join(htmlDir, path.basename(filePath, path.extname(filePath)) + '.html')}`);
            }
            outputChannel.appendLine(`Expected index: ${path.join(htmlDir, 'index.html')}`);
            
            if (doxygenPanel) {
                doxygenPanel.webview.html = `
                    <html><body>
                        <h1>Doxygen Output</h1>
                        <p>Documentation has been generated in: ${htmlDir}</p>
                        ${filePath ? `<p>Generated for file: ${filePath}</p>` : ''}
                        <p>Note: No HTML files were found in the output directory. This could mean:</p>
                        <ul>
                            <li>The documentation generation failed (check the output log)</li>
                            <li>The output directory setting is incorrect</li>
                            <li>The HTML_OUTPUT setting in Doxyfile needs to be checked</li>
                        </ul>
                    </body></html>
                `;
            }
        }
    } catch (error) {
        console.error('Error showing doxygen output:', error);
        if (doxygenPanel) {
            doxygenPanel.webview.html = `
                <html><body>
                    <h1>Error</h1>
                    <p>Failed to load documentation: ${error.message}</p>
                </body></html>
            `;
        }
    }
}

module.exports = {
    activate,
    deactivate
};
