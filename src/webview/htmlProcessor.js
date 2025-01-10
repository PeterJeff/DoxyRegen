function processHtml(html, baseUri) {
    // Remove any existing CSP meta tags to avoid conflicts
    html = html.replace(/<meta[^>]*Content-Security-Policy[^>]*>/g, '');

    // Add script to remove default styles
    const removeStyles = `
        <script>
            function removeDefaultStyles() {
                document.getElementById('_defaultStyles')?.remove();
            }
            // Try immediately
            removeDefaultStyles();
            // Try again after a delay to catch late injection
            setTimeout(removeDefaultStyles, 100);
        </script>
    `;
    html = html.replace('</head>', `${removeStyles}</head>`);

    // Add CSP meta tag with properly encoded URIs
    const csp = `<meta http-equiv="Content-Security-Policy" 
        content="default-src 'self' ${baseUri} vscode-webview-resource: https://*.vscode-cdn.net data: blob:; 
        img-src 'self' ${baseUri} vscode-webview-resource: https://*.vscode-cdn.net data: blob:; 
        script-src 'self' ${baseUri} vscode-webview-resource: https://*.vscode-cdn.net 'unsafe-inline' 'unsafe-eval'; 
        style-src 'self' ${baseUri} vscode-webview-resource: https://*.vscode-cdn.net 'unsafe-inline';
        connect-src 'self' ${baseUri} vscode-webview-resource: https://*.vscode-cdn.net;">`;
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

module.exports = {
    processHtml
};
