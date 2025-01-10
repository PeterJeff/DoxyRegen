# DoxyRefresh VSCode Extension

This extension automatically runs Doxygen when configured files change and displays the output in VSCode.

## Features

- Automatically runs Doxygen when monitored files change
- Configurable Doxygen executable path
- Configurable Doxyfile path
- Configurable file watch patterns
- Shows Doxygen output in a dedicated panel
- Manual refresh command available

## Requirements

- Visual Studio Code 1.85.0 or higher
- Doxygen installed (can be local to the project or system-wide)

## Extension Settings

This extension contributes the following settings:

* `doxyRefresh.doxygenPath`: Path to the Doxygen executable
* `doxyRefresh.doxyfilePath`: Path to the Doxyfile configuration file
* `doxyRefresh.watchPatterns`: Array of glob patterns for files to watch for changes (defaults to `["**/*.cpp", "**/*.h"]`)

## Usage

1. Install the extension
2. Configure the settings:
   - Set the path to your Doxygen executable (if not using the local copy)
   - Set the path to your Doxyfile
   - Configure which files to watch (defaults to *.cpp and *.h)
3. The extension will automatically run Doxygen when monitored files change
4. Use the "Refresh Doxygen Documentation" command to manually trigger documentation generation

## How It Works

- The extension watches for changes in the configured file patterns
- When a file changes, it automatically runs Doxygen using the specified configuration
- The Doxygen output is shown in both:
  - An output channel (for logs and error messages)
  - A webview panel (for viewing the generated documentation)
- If using a local Doxygen executable, it will look for it in the extension's `doxygen` directory

## Known Issues

- The extension currently assumes the Doxyfile is configured to generate HTML output
- The output viewer is basic and may need to be enhanced based on user feedback

## Release Notes

### 0.0.1

Initial release of DoxyRefresh:
- File watching system
- Configurable paths and patterns
- Output display in dedicated panel
- Local Doxygen support for debugging



## TODO: Remaining improvements needed:
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


### Additionally:   

Project Structure:
    src/core/ - Core extension functionality
    src/doxygen/ - Doxygen-specific logic
    src/webview/ - Preview panel functionality
    src/utils/ - Shared utilities
    test/ - Test files (excluded from package)
Code Organization:
    Modular design with clear separation of concerns
    Each module exports only what's needed
    Shared utilities prevent code duplication
Suggested Improvements:
    Add error handling middleware in utils
    Consider adding TypeScript for better type safety
    Add JSDoc comments for better documentation
    Consider adding a src/types/ directory for TypeScript/JSDoc type definitions
    Add unit tests in tests directories
    Add a CONTRIBUTING.md file to document the architecture
*/