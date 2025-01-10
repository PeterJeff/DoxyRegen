# DoxyRegen VSCode Extension

This extension automatically runs Doxygen when configured files change and displays the output in VSCode.

Note: 98% of this code including this readme was written by Claude Sonnet 3.5 using Cline 🤖.
https://github.com/cline/cline

## Features

- Automatically runs Doxygen when monitored files change
- Configurable Doxygen executable path and output directory
- Configurable Doxyfile path
- Configurable file watch patterns
- Shows Doxygen output in a dedicated webview
- Integrated HTML documentation preview panel
- Context menu integration for opening HTML files in preview
- Manual refresh command for on-demand generation

## Requirements

- Visual Studio Code 1.85.0 or higher
- Doxygen installed (can be local to the project or system-wide)

## Extension Settings

This extension contributes the following settings:

* `DoxyRegen.doxygenPath`: Path to the Doxygen executable
* `DoxyRegen.doxyfilePath`: Path to the Doxyfile configuration file
* `DoxyRegen.watchPatterns`: Array of glob patterns for files to watch for changes (defaults to `["**/*.cpp", "**/*.h"]`)
* `DoxyRegen.outputDirectory`: Optional output directory for Doxygen documentation (if not set, uses the directory specified in Doxyfile)

## Usage

1. Install the extension
2. Configure the settings:
   - Set the path to your Doxygen executable (if not using the local copy)
   - Set the path to your Doxyfile
   - Configure which files to watch (defaults to *.cpp and *.h)
   - Optionally set a custom output directory
3. The extension will automatically run Doxygen when monitored files change
4. Use the available commands:
   - "Refresh Doxygen Documentation" to manually trigger documentation generation
   - "Open in Doxygen Preview" to view HTML documentation files in the integrated preview panel
   - Right-click HTML files to open them in the preview panel

## How It Works

- When a monitored file changes, the extension automatically runs Doxygen using your configuration
- The output is processed in two ways:
  - Error messages and warnings are shown in the output channel
  - Generated HTML documentation is displayed in an integrated preview panel

## Known Issues

- The extension currently assumes the Doxyfile is configured to generate HTML output
- The output viewer is basic and may need to be enhanced based on user feedback

## Release Notes

### 0.1.0

Initial release of DoxyRegen with core functionality:
- Automated file watching system for documentation updates
- Configurable Doxygen and Doxyfile paths with custom output directory support
- Customizable file watch patterns
- Integrated HTML documentation preview panel with context menu integration
- Output channel for logs and error messages
- Local Doxygen executable support for development
- Manual refresh command for on-demand documentation generation



## TODO: Remaining improvements needed:
1. Add path validation for doxygen executable and doxyfile
   - Check if files exist before attempting to run
   - Show clear error messages for missing files
   - Current setup tries to update setting displays while using doxygen, which is odd.
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
6. Incremental Updates without losing references
   - Doxygen itself doesn't have an incremental system, closest is Tagging
   - Experiment with using tagging to keep doxygen partially updated with cross-page references

